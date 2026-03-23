import { Logger } from 'pino';
import { z } from 'zod';
type Dependencies = {
  logger: Logger;
};

export type GammaMarketApiClient = {
  scrapeResolvedMarkets: (data: {
    count: number;
    offset: number;
    asc: boolean;
  }) => Promise<z.infer<typeof MarketApiSchema>[]>;
};

const MarketApiSchema = z.object({
  id: z.string(),
  question: z.string(),
  description: z.string().nullable(),
  closed: z.boolean(),
});

async function handleResponse<TSchema extends z.ZodSchema>(
  response: Response,
  schema: TSchema,
  logger: Logger,
  responseErrorMessage: string,
): Promise<z.infer<TSchema>> {
  if (!response.ok || response.status !== 200) {
    logger.error(
      {
        response,
      },
      responseErrorMessage,
    );

    throw new Error(responseErrorMessage);
  }

  const data = await response.json();
  const parsed = await schema.safeParseAsync(data);
  if (!parsed.success) {
    logger.error(
      {
        data,
        error: parsed.error,
      },
      'Invalid response',
    );
    throw new Error('Invalid response');
  }

  return parsed.data;
}

function scrapeResolvedMarkets(
  deps: Dependencies,
): GammaMarketApiClient['scrapeResolvedMarkets'] {
  return async function (data) {
    const { count, offset, asc } = data;
    const { logger } = deps;
    const response = await fetch(
      `https://gamma-api.polymarket.com/markets?resolved=true&limit=${count}&offset=${offset}&asc=${asc}`,
    );
    const markets = await handleResponse(
      response,
      MarketApiSchema.array(),
      logger,
      'Failed to fetch resolved markets',
    );
    return markets;
  };
}

export const createGammaMarketApiClient = (deps: Dependencies) => {
  return {
    scrapeResolvedMarkets: scrapeResolvedMarkets(deps),
  };
};

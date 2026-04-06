import { Logger } from 'pino';
import { z } from 'zod';
import { handleResponse } from '../api.js';
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

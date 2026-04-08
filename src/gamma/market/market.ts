import { Logger } from 'pino';
import { z } from 'zod';

import { handleResponse } from '../api.js';
type Dependencies = {
  logger: Logger;
};

export type GammaMarketApiClient = {
  getMarketById: (conditionId: string) => Promise<GammaMarket | null>;
  scrapeResolvedMarkets: (data: {
    count: number;
    offset: number;
    asc: boolean;
  }) => Promise<ResolvedGammaMarket[]>;
};

const ResolvedMarketApiSchema = z.object({
  id: z.string(),
  question: z.string(),
  description: z.string().nullable(),
  closed: z.boolean(),
});

const MarketApiSchema = ResolvedMarketApiSchema.extend({
  conditionId: z.string(),
  outcomes: z.string(),
  endDate: z.string(),
  volume: z.string(),
  active: z.boolean(),
});

export type ResolvedGammaMarket = z.infer<typeof ResolvedMarketApiSchema>;
export type GammaMarket = z.infer<typeof MarketApiSchema>;

function getMarketById(
  deps: Dependencies,
): GammaMarketApiClient['getMarketById'] {
  return async function (conditionId) {
    const { logger } = deps;
    const response = await fetch(
      `https://gamma-api.polymarket.com/markets?condition_ids=${conditionId}`,
    );
    const markets = await handleResponse(
      response,
      MarketApiSchema.array(),
      logger,
      'Failed to fetch market by condition ID',
    );

    return markets[0] ?? null;
  };
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
      ResolvedMarketApiSchema.array(),
      logger,
      'Failed to fetch resolved markets',
    );
    return markets;
  };
}

export const createGammaMarketApiClient = (deps: Dependencies) => {
  return {
    getMarketById: getMarketById(deps),
    scrapeResolvedMarkets: scrapeResolvedMarkets(deps),
  };
};

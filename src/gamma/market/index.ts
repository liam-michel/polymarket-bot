import { Logger } from 'pino';

import { handleResponse } from '../../utils/api.js';
import {
  MarketApiSchema,
  ResolvedMarketApiSchema,
  ResolvedGammaMarket,
  GammaMarket,
} from './schemas.js';
import { Models } from '~/storage/models.js';

type Dependencies = {
  logger: Logger;
};

export type GammaMarketApiClient = {
  getMarketById: (data: { conditionId: string }) => Promise<GammaMarket | null>;
  scrapeResolvedMarkets: (data: {
    count: number;
    offset: number;
    asc: boolean;
  }) => Promise<ResolvedGammaMarket[]>;
  getMarketsByCategory: (data: {
    category: Models['Category'];
    count: number;
    offset: number;
    asc: boolean;
  }) => Promise<GammaMarket[]>;
};

function getMarketById(
  deps: Dependencies,
): GammaMarketApiClient['getMarketById'] {
  return async function (data) {
    const { conditionId } = data;
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

function getMarketsByCategory(
  deps: Dependencies,
): GammaMarketApiClient['getMarketsByCategory'] {
  return async function (data) {
    const { category, count, offset, asc } = data;
    const { logger } = deps;
    const response = await fetch(
      `https://gamma-api.polymarket.com/markets?category=${category}&limit=${count}&offset=${offset}&asc=${asc}`,
    );
    const markets = await handleResponse(
      response,
      MarketApiSchema.array(),
      logger,
      'Failed to fetch markets by category',
    );
    return markets;
  };
}

export const createGammaMarketApiClient = (
  deps: Dependencies,
): GammaMarketApiClient => {
  return {
    getMarketById: getMarketById(deps),
    scrapeResolvedMarkets: scrapeResolvedMarkets(deps),
    getMarketsByCategory: getMarketsByCategory(deps),
  };
};

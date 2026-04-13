import { Logger } from 'pino';
import { z } from 'zod';

import { handleResponse } from '../api.js';
import { Models } from '~/storage/models.js';

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
  getMarketsByCategory: (data: {
    category: Models['Category'];
    count: number;
    offset: number;
    asc: boolean;
  }) => Promise<GammaMarket[]>;
};

const outcomesSchema = z.string().transform((s, ctx) => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(s);
  } catch {
    ctx.addIssue({ code: 'custom', message: 'outcomes is not valid JSON' });
    return z.NEVER;
  }
  const isValid =
    Array.isArray(parsed) &&
    parsed.length === 2 &&
    ((parsed[0] === 'Yes' && parsed[1] === 'No') ||
      (parsed[0] === 'True' && parsed[1] === 'False'));
  if (!isValid) {
    ctx.addIssue({
      code: 'custom',
      message: 'outcomes must be ["Yes","No"] or ["True","False"]',
    });
    return z.NEVER;
  }
  return parsed as ['Yes', 'No'] | ['True', 'False'];
});

export type Outcomes = z.infer<typeof outcomesSchema>;

const ResolvedMarketApiSchema = z.object({
  id: z.string(),
  question: z.string(),
  category: Models.Category.nullable().catch(null),
  description: z.string().nullable(),
  closed: z.boolean(),
});

const MarketApiSchema = ResolvedMarketApiSchema.extend({
  conditionId: z.string(),
  outcomes: outcomesSchema,
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

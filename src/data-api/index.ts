import type { Logger } from 'pino';

import {
  DataApiTrade,
  DataApiTradeSchema,
  LeaderboardEntry,
  LeaderboardEntrySchema,
  OrderByLeaderboard,
  TimePeriod,
} from './schemas.js';
import { Models } from '~/storage/models.js';
import { handleResponse } from '~/utils/api.js';

type Dependencies = {
  logger: Logger;
};

export type DataApiClient = {
  getLeaderboard: (data: {
    limit: number;
    offset: number;
    category?: Models['Category'];
    timePeriod?: TimePeriod;
    orderBy?: OrderByLeaderboard;
  }) => Promise<LeaderboardEntry[]>;
  getTrades: (data: {
    user?: string;
    market?: string[];
    limit: number;
    offset: number;
    takerOnly?: boolean;
    side?: 'BUY' | 'SELL';
    filterType?: 'CASH' | 'TOKENS';
    filterAmount?: number;
  }) => Promise<DataApiTrade[]>;
};

function getLeaderboard(deps: Dependencies): DataApiClient['getLeaderboard'] {
  return async function (data) {
    const { logger } = deps;
    const { limit, offset, category, timePeriod, orderBy } = data;
    const response = await fetch(
      `https://data-api.polymarket.com/v1/leaderboard?category=${category}&timePeriod=${timePeriod}&orderBy=${orderBy}&limit=${limit}&offset=${offset}`,
    );
    return handleResponse(
      response,
      LeaderboardEntrySchema.array(),
      logger,
      'Failed to fetch leaderboard entries',
    );
  };
}

function getTrades(deps: Dependencies): DataApiClient['getTrades'] {
  return async function (data) {
    const { logger } = deps;
    const {
      user,
      market,
      limit = 100,
      offset = 0,
      takerOnly = true,
      side,
      filterType,
      filterAmount,
    } = data;

    const params = new URLSearchParams();
    if (user) params.set('user', user);
    if (market?.length) params.set('market', market.join(','));
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    params.set('takerOnly', String(takerOnly));
    if (side) params.set('side', side);
    if (filterType) params.set('filterType', filterType);
    if (filterAmount !== undefined)
      params.set('filterAmount', String(filterAmount));

    const response = await fetch(
      `https://data-api.polymarket.com/trades?${params.toString()}`,
    );
    return handleResponse(
      response,
      DataApiTradeSchema.array(),
      logger,
      'Failed to fetch trades',
    );
  };
}

export function createDataApiClient(deps: Dependencies): DataApiClient {
  return {
    getLeaderboard: getLeaderboard(deps),
    getTrades: getTrades(deps),
  };
}

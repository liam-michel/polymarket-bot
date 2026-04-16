import type { Logger } from 'pino';
import * as td from 'testdouble';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { createDataApiClient } from '~/data-api/index.js';

const logger = td.object<Logger>();
let dataApiClient: ReturnType<typeof createDataApiClient>;

beforeEach(() => {
  td.reset();
  dataApiClient = createDataApiClient({ logger });
  global.fetch = td.function<typeof fetch>();
});

afterEach(() => {
  td.reset();
  Reflect.deleteProperty(global, 'fetch');
});

const validLeaderboardEntry = {
  rank: '1',
  proxyWallet: '0x492442eab586f242b53bda933fd5de859c8a3782',
  xUsername: 'trader1',
  vol: 719136.65,
  pnl: 373493.89,
};

const validTrade = {
  proxyWallet: '0xe7e0257fa4f76989fb6670bcd53a1b05b800a433',
  side: 'BUY',
  asset: '49381942807896411152538542774068503989550475264282514759941760458040201330791',
  conditionId: '0xa948cba5f5f97ed0cd8732b66244cdebe834f896611ddfc04414ffcc9b226861',
  size: 164.6051,
  price: 0.7,
  timestamp: 1776335160,
  outcome: 'Tatjana Maria',
  outcomeIndex: 1,
  transactionHash: '0x3ae97d4f0473d6027a7f86486b0e438222ab6a794ff69e6e1d9881a6b159dfde',
};

describe('getLeaderboard', () => {
  it('should fetch leaderboard entries', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => [validLeaderboardEntry],
    } as Response;
    td.when(global.fetch(td.matchers.anything())).thenResolve(mockResponse);

    const entries = await dataApiClient.getLeaderboard({
      limit: 25,
      offset: 0,
      timePeriod: 'DAY',
      orderBy: 'PNL',
    });

    td.verify(
      global.fetch(
        'https://data-api.polymarket.com/v1/leaderboard?category=undefined&timePeriod=DAY&orderBy=PNL&limit=25&offset=0',
      ),
      { times: 1 },
    );
    expect(entries).toEqual([validLeaderboardEntry]);
    td.verify(
      logger.error(td.matchers.anything(), 'Failed to fetch leaderboard entries'),
      { times: 0 },
    );
  });

  it('should log an error if the response is not ok', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response;
    td.when(global.fetch(td.matchers.anything())).thenResolve(mockResponse);

    await expect(
      dataApiClient.getLeaderboard({ limit: 25, offset: 0 }),
    ).rejects.toThrow('Failed to fetch leaderboard entries');
    td.verify(
      logger.error({ response: mockResponse }, 'Failed to fetch leaderboard entries'),
      { times: 1 },
    );
  });

  it('should reject entries with invalid proxy wallet', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => [{ ...validLeaderboardEntry, proxyWallet: 'not-an-address' }],
    } as Response;
    td.when(global.fetch(td.matchers.anything())).thenResolve(mockResponse);

    await expect(
      dataApiClient.getLeaderboard({ limit: 25, offset: 0 }),
    ).rejects.toThrow('Invalid response');
    td.verify(logger.error(td.matchers.anything(), 'Invalid response'), { times: 1 });
  });

  it('should reject entries with non-numeric rank', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => [{ ...validLeaderboardEntry, rank: 'one' }],
    } as Response;
    td.when(global.fetch(td.matchers.anything())).thenResolve(mockResponse);

    await expect(
      dataApiClient.getLeaderboard({ limit: 25, offset: 0 }),
    ).rejects.toThrow('Invalid response');
    td.verify(logger.error(td.matchers.anything(), 'Invalid response'), { times: 1 });
  });
});

describe('getTrades', () => {
  it('should fetch trades with default params', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => [validTrade],
    } as Response;
    td.when(global.fetch(td.matchers.anything())).thenResolve(mockResponse);

    const trades = await dataApiClient.getTrades({ limit: 100, offset: 0 });

    td.verify(
      global.fetch(
        'https://data-api.polymarket.com/trades?limit=100&offset=0&takerOnly=true',
      ),
      { times: 1 },
    );
    expect(trades).toEqual([validTrade]);
    td.verify(
      logger.error(td.matchers.anything(), 'Failed to fetch trades'),
      { times: 0 },
    );
  });

  it('should include user param when provided', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => [validTrade],
    } as Response;
    td.when(global.fetch(td.matchers.anything())).thenResolve(mockResponse);

    await dataApiClient.getTrades({
      user: '0xe7e0257fa4f76989fb6670bcd53a1b05b800a433',
      limit: 100,
      offset: 0,
    });

    td.verify(
      global.fetch(
        'https://data-api.polymarket.com/trades?user=0xe7e0257fa4f76989fb6670bcd53a1b05b800a433&limit=100&offset=0&takerOnly=true',
      ),
      { times: 1 },
    );
  });

  it('should include market param when provided', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => [validTrade],
    } as Response;
    td.when(global.fetch(td.matchers.anything())).thenResolve(mockResponse);

    await dataApiClient.getTrades({
      market: [
        '0xa948cba5f5f97ed0cd8732b66244cdebe834f896611ddfc04414ffcc9b226861',
        '0x9c1a953fe92c8357f1b646ba25d983aa83e90c525992db14fb726fa895cb5763',
      ],
      limit: 100,
      offset: 0,
    });

    td.verify(
      global.fetch(
        'https://data-api.polymarket.com/trades?market=0xa948cba5f5f97ed0cd8732b66244cdebe834f896611ddfc04414ffcc9b226861%2C0x9c1a953fe92c8357f1b646ba25d983aa83e90c525992db14fb726fa895cb5763&limit=100&offset=0&takerOnly=true',
      ),
      { times: 1 },
    );
  });

  it('should log an error if the response is not ok', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response;
    td.when(global.fetch(td.matchers.anything())).thenResolve(mockResponse);

    await expect(
      dataApiClient.getTrades({ limit: 100, offset: 0 }),
    ).rejects.toThrow('Failed to fetch trades');
    td.verify(
      logger.error({ response: mockResponse }, 'Failed to fetch trades'),
      { times: 1 },
    );
  });

  it('should reject trades with invalid proxy wallet', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => [{ ...validTrade, proxyWallet: 'not-an-address' }],
    } as Response;
    td.when(global.fetch(td.matchers.anything())).thenResolve(mockResponse);

    await expect(
      dataApiClient.getTrades({ limit: 100, offset: 0 }),
    ).rejects.toThrow('Invalid response');
    td.verify(logger.error(td.matchers.anything(), 'Invalid response'), { times: 1 });
  });

  it('should reject trades with invalid side', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => [{ ...validTrade, side: 'HOLD' }],
    } as Response;
    td.when(global.fetch(td.matchers.anything())).thenResolve(mockResponse);

    await expect(
      dataApiClient.getTrades({ limit: 100, offset: 0 }),
    ).rejects.toThrow('Invalid response');
    td.verify(logger.error(td.matchers.anything(), 'Invalid response'), { times: 1 });
  });
});

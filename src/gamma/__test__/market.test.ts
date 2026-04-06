//unit tests for market.ts
import type { Logger } from 'pino';
import * as td from 'testdouble';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { createGammaMarketApiClient } from '~/gamma/market/market.js';

const logger = td.object<Logger>();
let gammaApiClient: ReturnType<typeof createGammaMarketApiClient>;

beforeEach(() => {
  td.reset();
  gammaApiClient = createGammaMarketApiClient({ logger });
  global.fetch = td.function<typeof fetch>();
});

afterEach(() => {
  td.reset();
  Reflect.deleteProperty(global, 'fetch');
});

describe('scrapeResolvedMarkets', () => {
  it('should fetch resolved markets', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => [
        {
          id: '1',
          question: 'Will it rain tomorrow?',
          description: null,
          closed: true,
        },
      ],
    } as Response;
    td.when(global.fetch(td.matchers.anything())).thenResolve(mockResponse);

    const markets = await gammaApiClient.scrapeResolvedMarkets({
      count: 1,
      offset: 0,
      asc: true,
    });
    td.verify(
      global.fetch(
        'https://gamma-api.polymarket.com/markets?resolved=true&limit=1&offset=0&asc=true',
      ),
      { times: 1 },
    );
    expect(markets).toEqual([
      {
        id: '1',
        question: 'Will it rain tomorrow?',
        description: null,
        closed: true,
      },
    ]);
    //verify that handleresponse is called with the correct parameters
    td.verify(
      logger.error(td.matchers.anything(), 'Failed to fetch resolved markets'),
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
      gammaApiClient.scrapeResolvedMarkets({
        count: 1,
        offset: 0,
        asc: true,
      }),
    ).rejects.toThrow('Failed to fetch resolved markets');
    td.verify(
      logger.error(
        {
          response: mockResponse,
        },
        'Failed to fetch resolved markets',
      ),
      { times: 1 },
    );
  });
});

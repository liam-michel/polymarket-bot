import type { Command } from 'commander';
import { Decimal } from 'decimal.js';
import type { Logger } from 'pino';
import * as td from 'testdouble';
import { beforeEach, describe, expect, it } from 'vitest';

import { App, initializeApp } from '~/app.js';
import { markets } from '~/cli/commands/market.js';
import type {
  GammaMarket,
  GammaMarketApiClient,
} from '~/gamma/market/market.js';
import { createServices, createTransactionRunner } from '~/services/index.js';
import type { Storage } from '~/storage/index.js';
import type { MarketStorage } from '~/storage/market.js';

type UpsertMarketRequest = Parameters<MarketStorage['upsertMarket']>[0];

const testMarket = {
  condition_id: 'condition-123',
  question: 'Will this command work?',
  category: 'Politics' as const,
  outcome_a: 'Yes',
  outcome_b: 'No',
  status: 'ACTIVE' as const,
  outcome: null,
  closes_at: new Date('2026-04-10T12:00:00.000Z'),
  resolved_at: null,
  volume_usd: new Decimal('1234.56'),
  created_at: new Date('2026-04-01T12:00:00.000Z'),
  updated_at: new Date('2026-04-02T12:00:00.000Z'),
};
const testGammaMarket: GammaMarket = {
  id: 'gamma-market-123',
  conditionId: 'condition-123',
  question: 'Will this command work?',
  category: 'Politics',
  description: null,
  outcomes: '["Yes","No"]',
  endDate: '2026-04-10T12:00:00.000Z',
  volume: '1234.56',
  active: true,
  closed: false,
};
const testResolvedGammaMarket = {
  id: 'gamma-resolved-123',
  question: 'Did this resolve?',
  category: 'Politics' as const,
  description: null,
  closed: true,
};
const storage = td.object<Storage>();
const logger = td.object<Logger>();
const gammaApiClient = td.object<GammaMarketApiClient>();
let app: App;
describe('markets command', () => {
  beforeEach(() => {
    td.reset();
    const services = createServices(storage, gammaApiClient);
    const withTransaction = createTransactionRunner(storage, gammaApiClient);
    app = initializeApp({
      storage,
      logger,
      gammaApiClient,
      services,
      withTransaction,
    });
  });

  const configureCommandTree = (command: Command) => {
    command.exitOverride();
    command.configureOutput({
      writeOut: () => undefined,
      writeErr: () => undefined,
    });

    for (const subcommand of command.commands) {
      configureCommandTree(subcommand);
    }

    return command;
  };

  const createCommandUnderTest = () => {
    return configureCommandTree(markets(app));
  };

  it('fetches a market by condition ID', async () => {
    let requestedConditionId: string | undefined;
    td.when(storage.market.getMarketById(td.matchers.isA(String))).thenDo(
      (conditionId: string) => {
        requestedConditionId = conditionId;
        return Promise.resolve(testMarket);
      },
    );

    await createCommandUnderTest().parseAsync(['get', 'condition-123'], {
      from: 'user',
    });

    expect(requestedConditionId).toBe('condition-123');
    td.verify(
      logger.info({ result: testMarket }, 'Market fetched successfully'),
    );
  });

  it('fails when the market does not exist', async () => {
    let requestedConditionId: string | undefined;
    td.when(storage.market.getMarketById(td.matchers.isA(String))).thenDo(
      (conditionId: string) => {
        requestedConditionId = conditionId;
        return Promise.resolve(null);
      },
    );

    await expect(
      createCommandUnderTest().parseAsync(['get', 'missing-market'], {
        from: 'user',
      }),
    ).rejects.toThrow(
      'Market with condition ID "missing-market" was not found',
    );

    expect(requestedConditionId).toBe('missing-market');
  });

  it('requires a condition ID argument', async () => {
    await expect(
      createCommandUnderTest().parseAsync(['get'], {
        from: 'user',
      }),
    ).rejects.toMatchObject({
      code: 'commander.missingArgument',
    });
  });

  it('imports a market from Gamma by condition ID', async () => {
    let requestedConditionId: string | undefined;
    let request: UpsertMarketRequest | undefined;

    td.when(gammaApiClient.getMarketById(td.matchers.isA(String))).thenDo(
      (conditionId: string) => {
        requestedConditionId = conditionId;
        return Promise.resolve(testGammaMarket);
      },
    );
    td.when(storage.market.upsertMarket(td.matchers.anything())).thenDo(
      (input: UpsertMarketRequest) => {
        request = input;
        return Promise.resolve(testMarket);
      },
    );

    await createCommandUnderTest().parseAsync(['import', 'condition-123'], {
      from: 'user',
    });

    expect(requestedConditionId).toBe('condition-123');
    expect(request).toEqual({
      condition_id: 'condition-123',
      question: 'Will this command work?',
      category: null,
      outcome_a: 'Yes',
      outcome_b: 'No',
      status: 'ACTIVE',
      outcome: null,
      closes_at: new Date('2026-04-10T12:00:00.000Z'),
      resolved_at: null,
      volume_usd: '1234.56',
    });
    td.verify(
      logger.info({ result: testMarket }, 'Market imported successfully'),
    );
  });
  it('should throw when a malformed market is returned from Gamma', async () => {
    td.when(gammaApiClient.getMarketById(td.matchers.isA(String))).thenResolve({
      id: 1,
      conditionId: 'condition-123',
      question: 'Will this command work?',
      category: 'Politics',
      description: null,
      outcomes: 'not-a-valid-json',
      endDate: '2026-04-10T12:00:00.000Z',
      volume: '1234.56',
      active: true,
      closed: false,
    } as unknown as any);

    await expect(
      createCommandUnderTest().parseAsync(['import', 'condition-123'], {
        from: 'user',
      }),
    ).rejects.toThrow('Unexpected token');
  });

  it('fails when Gamma does not return the market to import', async () => {
    td.when(gammaApiClient.getMarketById('missing-market')).thenResolve(null);

    await expect(
      createCommandUnderTest().parseAsync(['import', 'missing-market'], {
        from: 'user',
      }),
    ).rejects.toThrow(
      'Market with condition ID "missing-market" was not found in Gamma',
    );
  });

  it('requires a condition ID argument for import', async () => {
    await expect(
      createCommandUnderTest().parseAsync(['import'], {
        from: 'user',
      }),
    ).rejects.toMatchObject({
      code: 'commander.missingArgument',
    });
  });

  it('lists markets from storage', async () => {
    td.when(storage.market.listMarkets()).thenResolve([testMarket]);

    await createCommandUnderTest().parseAsync(['list-markets'], {
      from: 'user',
    });

    td.verify(
      logger.info({ result: [testMarket] }, 'Markets listed successfully'),
    );
  });

  it('lists resolved markets from the Gamma API', async () => {
    let requestedArgs:
      | { count: number; offset: number; asc: boolean }
      | undefined;

    td.when(
      gammaApiClient.scrapeResolvedMarkets(td.matchers.anything()),
    ).thenDo((args: { count: number; offset: number; asc: boolean }) => {
      requestedArgs = args;
      return Promise.resolve([testResolvedGammaMarket]);
    });

    await createCommandUnderTest().parseAsync(
      ['list-resolved-markets', '--count', '5', '--offset', '10'],
      { from: 'user' },
    );

    expect(requestedArgs).toEqual({ count: 5, offset: 10, asc: false });
    td.verify(
      logger.info(
        { result: [testResolvedGammaMarket] },
        'Resolved markets listed successfully',
      ),
    );
  });

  it('lists markets by category from the Gamma API', async () => {
    let requestedArgs:
      | { category: string; count: number; offset: number; asc: boolean }
      | undefined;

    td.when(gammaApiClient.getMarketsByCategory(td.matchers.anything())).thenDo(
      (args: {
        category: string;
        count: number;
        offset: number;
        asc: boolean;
      }) => {
        requestedArgs = args;
        return Promise.resolve([testGammaMarket]);
      },
    );

    await createCommandUnderTest().parseAsync(
      [
        'list-markets-by-category',
        'Politics',
        '--count',
        '20',
        '--offset',
        '5',
      ],
      { from: 'user' },
    );

    expect(requestedArgs).toEqual({
      category: 'Politics',
      count: 20,
      offset: 5,
      asc: false,
    });
    td.verify(
      logger.info(
        { result: [testGammaMarket] },
        'Markets by category listed successfully',
      ),
    );
  });

  it('requires a category argument for list-markets-by-category', async () => {
    await expect(
      createCommandUnderTest().parseAsync(['list-markets-by-category'], {
        from: 'user',
      }),
    ).rejects.toMatchObject({
      code: 'commander.missingArgument',
    });
  });

  it('rejects an invalid category for list-markets-by-category', async () => {
    await expect(
      createCommandUnderTest().parseAsync(
        ['list-markets-by-category', 'NotARealCategory'],
        { from: 'user' },
      ),
    ).rejects.toThrow();
  });
});

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
import type { Storage } from '~/storage/index.js';
import type { MarketStorage } from '~/storage/market.js';

type UpsertMarketRequest = Parameters<MarketStorage['upsertMarket']>[0];

const testMarket = {
  condition_id: 'condition-123',
  question: 'Will this command work?',
  category: 'testing',
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
  description: null,
  outcomes: '["Yes","No"]',
  endDate: '2026-04-10T12:00:00.000Z',
  volume: '1234.56',
  active: true,
  closed: false,
};
const storage = td.object<Storage>();
const logger = td.object<Logger>();
const gammaApiClient = td.object<GammaMarketApiClient>();
let app: App;
describe('markets command', () => {
  beforeEach(() => {
    td.reset();
    app = initializeApp({ storage, logger, gammaApiClient });
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
});

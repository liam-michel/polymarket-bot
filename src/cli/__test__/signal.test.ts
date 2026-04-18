import type { Command } from 'commander';
import { Decimal } from 'decimal.js';
import type { Logger } from 'pino';
import * as td from 'testdouble';
import { beforeEach, describe, expect, it } from 'vitest';

import { App, initializeApp } from '~/app.js';
import { signal } from '~/cli/commands/signal.js';
import { isCommandErrorLogged } from '~/cli/errors.js';
import { GammaMarketApiClient } from '~/gamma/market/market.js';
import { createServices, createTransactionRunner } from '~/services/index.js';
import type { Storage } from '~/storage/index.js';
import type { Models } from '~/storage/models.js';
import type { SignalStorage } from '~/storage/signal.js';

type CreateSignalRequest = Parameters<SignalStorage['createSignal']>[0];

const testSignal: Models['Signal'] = {
  id: '1',
  wallet: '0xabc',
  condition_id: 'condition-123',
  signal_type: 'MANUAL' as const,
  side: 'BUY' as const,
  outcome_index: 0,
  price: new Decimal('0.55'),
  confidence: new Decimal('0.75'),
  dry_run: true,
  executed: false,
  executed_at: null,
  notes: null,
  created_at: new Date('2026-04-10T12:00:00.000Z'),
};
const storage = td.object<Storage>();
const logger = td.object<Logger>();
const gammaApiClient = td.object<GammaMarketApiClient>();

let app: App;

describe('signal command', () => {
  beforeEach(() => {
    td.reset();
    const services = createServices({ repo: storage, gammaApiClient });
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
    return configureCommandTree(signal(app));
  };

  it('creates a signal', async () => {
    let request: CreateSignalRequest | undefined;

    td.when(storage.signal.createSignal(td.matchers.anything())).thenDo(
      (input: CreateSignalRequest) => {
        request = input;
        return Promise.resolve(testSignal);
      },
    );

    await createCommandUnderTest().parseAsync(
      ['create', '0xabc', 'condition-123', 'BUY', '0', '0.550000', '0.7500'],
      {
        from: 'user',
      },
    );

    expect(request).toEqual({
      wallet: '0xabc',
      condition_id: 'condition-123',
      signal_type: 'MANUAL',
      side: 'BUY',
      outcome_index: 0,
      price: '0.55',
      confidence: '0.75',
      dry_run: true,
      notes: undefined,
    });
    td.verify(
      logger.info({ result: testSignal }, 'Signal created successfully'),
    );
  });

  it('rejects an invalid outcome index', async () => {
    await expect(
      createCommandUnderTest().parseAsync(
        ['create', '0xabc', 'condition-123', 'BUY', '2', '0.550000', '0.7500'],
        {
          from: 'user',
        },
      ),
    ).rejects.toThrow(
      'Invalid outcome index "2": outcome index must be 0 or 1',
    );
  });

  it('rejects an invalid confidence value', async () => {
    await expect(
      createCommandUnderTest().parseAsync(
        ['create', '0xabc', 'condition-123', 'BUY', '0', '0.550000', '1.5000'],
        {
          from: 'user',
        },
      ),
    ).rejects.toThrow(
      'Invalid confidence "1.5000": confidence must be between 0 and 1',
    );

    td.verify(
      logger.error(
        td.matchers.contains({
          wallet: '0xabc',
          conditionId: 'condition-123',
        }),
        'Failed to create signal',
      ),
    );
  });

  it('lists signals with filters', async () => {
    let request: Parameters<SignalStorage['listSignals']>[0];

    td.when(storage.signal.listSignals(td.matchers.anything())).thenDo(
      (input: Parameters<SignalStorage['listSignals']>[0]) => {
        request = input;
        return Promise.resolve([testSignal]);
      },
    );

    await createCommandUnderTest().parseAsync(
      [
        'list',
        '--wallet',
        '0xabc',
        '--market',
        'condition-123',
        '--type',
        'MANUAL',
        '--executed',
        'false',
      ],
      {
        from: 'user',
      },
    );

    expect(request).toEqual({
      wallet: '0xabc',
      condition_id: 'condition-123',
      signal_type: 'MANUAL',
      executed: false,
    });
    td.verify(
      logger.info({ result: [testSignal] }, 'Signals listed successfully'),
    );
  });

  it('gets a signal by id', async () => {
    td.when(storage.signal.getSignalById('1')).thenResolve(testSignal);

    await createCommandUnderTest().parseAsync(['get', '1'], {
      from: 'user',
    });

    td.verify(
      logger.info({ result: testSignal }, 'Signal fetched successfully'),
    );
  });

  it('fails when getting a missing signal', async () => {
    td.when(storage.signal.getSignalById('99')).thenResolve(null);

    await expect(
      createCommandUnderTest().parseAsync(['get', '99'], {
        from: 'user',
      }),
    ).rejects.toThrow('Signal with ID "99" was not found');

    td.verify(
      logger.error(
        td.matchers.contains({ signalId: '99' }),
        'Failed to get signal',
      ),
    );
  });

  it('rejects an invalid signal id', async () => {
    let caughtError: unknown;

    try {
      await createCommandUnderTest().parseAsync(['get', '0'], {
        from: 'user',
      });
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(Error);
    expect(
      caughtError instanceof Error ? caughtError.message : String(caughtError),
    ).toBe('Signal ID must be a positive integer');
    expect(isCommandErrorLogged(caughtError)).toBe(true);

    td.verify(
      logger.error(
        td.matchers.contains({ signalId: '0' }),
        'Failed to get signal',
      ),
    );
  });

  it('marks a signal executed', async () => {
    const executedSignal: Models['Signal'] = {
      ...testSignal,
      executed: true,
      executed_at: new Date('2026-04-10T12:05:00.000Z'),
      notes: 'Executed manually',
    };
    let request:
      | {
          id?: string;
          notes?: string;
        }
      | undefined;

    td.when(
      storage.signal.markSignalExecuted(
        td.matchers.isA(String),
        td.matchers.anything(),
      ),
    ).thenDo((id: string, notes?: string) => {
      request = { id, notes };
      return Promise.resolve(executedSignal);
    });

    await createCommandUnderTest().parseAsync(
      ['mark-executed', '1', '--notes', 'Executed manually'],
      {
        from: 'user',
      },
    );

    expect(request).toEqual({
      id: '1',
      notes: 'Executed manually',
    });
    td.verify(
      logger.info(
        { result: executedSignal },
        'Signal marked executed successfully',
      ),
    );
  });

  it('fails when marking a missing signal executed', async () => {
    td.when(storage.signal.markSignalExecuted('99', undefined)).thenResolve(
      null,
    );

    await expect(
      createCommandUnderTest().parseAsync(['mark-executed', '99'], {
        from: 'user',
      }),
    ).rejects.toThrow('Signal with ID "99" was not found');
  });

  it('fails when marking an already executed signal', async () => {
    td.when(storage.signal.markSignalExecuted('1', undefined)).thenReject(
      new Error('Signal with ID "1" has already been marked executed'),
    );

    await expect(
      createCommandUnderTest().parseAsync(['mark-executed', '1'], {
        from: 'user',
      }),
    ).rejects.toThrow('Signal with ID "1" has already been marked executed');

    td.verify(
      logger.error(
        td.matchers.contains({ signalId: '1' }),
        'Failed to mark signal executed',
      ),
    );
  });

  it('rejects whitespace-only notes when creating a signal', async () => {
    await expect(
      createCommandUnderTest().parseAsync(
        [
          'create',
          '0xabc',
          'condition-123',
          'BUY',
          '0',
          '0.550000',
          '0.7500',
          '--notes',
          '   ',
        ],
        {
          from: 'user',
        },
      ),
    ).rejects.toThrow('Notes must not be empty');
  });

  it('rejects whitespace-only notes when marking a signal executed', async () => {
    await expect(
      createCommandUnderTest().parseAsync(
        ['mark-executed', '1', '--notes', '   '],
        {
          from: 'user',
        },
      ),
    ).rejects.toThrow('Notes must not be empty');

    td.verify(
      logger.error(
        td.matchers.contains({ signalId: '1', notes: undefined }),
        'Failed to mark signal executed',
      ),
    );
  });
});

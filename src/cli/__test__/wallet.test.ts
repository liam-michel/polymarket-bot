import type { Command } from 'commander';
import { Decimal } from 'decimal.js';
import type { Logger } from 'pino';
import * as td from 'testdouble';
import { beforeEach, describe, expect, it } from 'vitest';

import { App, initializeApp } from '~/app.js';
import { wallet } from '~/cli/commands/wallet.js';
import { GammaMarketApiClient } from '~/gamma/market/market.js';
import { createServices, createTransactionRunner } from '~/services/index.js';
import type { Storage } from '~/storage/index.js';
import type { WalletStorage } from '~/storage/wallet.js';

type AddWalletRequest = Parameters<WalletStorage['addWallet']>[0];

const testWalletEntry = {
  wallet: '0xabc',
  reason: 'high signal trader',
  score: new Decimal('1.2500'),
  active: true,
  added_at: new Date('2026-04-01T12:00:00.000Z'),
  removed_at: null,
};
const storage = td.object<Storage>();
const logger = td.object<Logger>();
const gammaApiClient = td.object<GammaMarketApiClient>();
let app: App;
describe('wallet command', () => {
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
    return configureCommandTree(wallet(app));
  };

  it('lists active watched wallets', async () => {
    td.when(storage.wallet.listWallets()).thenResolve([testWalletEntry]);

    await createCommandUnderTest().parseAsync(['list'], {
      from: 'user',
    });

    td.verify(
      logger.info({ result: [testWalletEntry] }, 'Wallets listed successfully'),
    );
  });

  it('adds a watched wallet', async () => {
    let request: AddWalletRequest | undefined;

    td.when(
      storage.wallet.addWallet(td.matchers.contains({ wallet: '0xabc' })),
    ).thenDo((input: AddWalletRequest) => {
      request = input;
      return Promise.resolve(testWalletEntry);
    });

    await createCommandUnderTest().parseAsync(
      ['add', '0xabc', 'high signal trader', '1.2500'],
      {
        from: 'user',
      },
    );

    expect(request).toEqual({
      wallet: '0xabc',
      reason: 'high signal trader',
      score: '1.25',
    });
    td.verify(
      logger.info({ result: testWalletEntry }, 'Wallet added successfully'),
    );
  });

  it('requires the add command score argument', async () => {
    await expect(
      createCommandUnderTest().parseAsync(
        ['add', '0xabc', 'high signal trader'],
        {
          from: 'user',
        },
      ),
    ).rejects.toMatchObject({
      code: 'commander.missingArgument',
    });
  });

  it('rejects an invalid score value', async () => {
    await expect(
      createCommandUnderTest().parseAsync(
        ['add', '0xabc', 'high signal trader', 'wat'],
        {
          from: 'user',
        },
      ),
    ).rejects.toThrow('Invalid score "wat"');
  });

  it('rejects a non-finite score value', async () => {
    await expect(
      createCommandUnderTest().parseAsync(
        ['add', '0xabc', 'high signal trader', 'Infinity'],
        {
          from: 'user',
        },
      ),
    ).rejects.toThrow(
      'Invalid score "Infinity": score must be a finite decimal number',
    );
  });

  it('rejects a score with too many decimal places', async () => {
    await expect(
      createCommandUnderTest().parseAsync(
        ['add', '0xabc', 'high signal trader', '1.23456'],
        {
          from: 'user',
        },
      ),
    ).rejects.toThrow(
      'Invalid score "1.23456": score must have no more than 4 decimal places',
    );
  });

  it('rejects a score that exceeds DECIMAL(10,4)', async () => {
    await expect(
      createCommandUnderTest().parseAsync(
        ['add', '0xabc', 'high signal trader', '1000000'],
        {
          from: 'user',
        },
      ),
    ).rejects.toThrow(
      'Invalid score "1000000": score must fit within DECIMAL(10,4)',
    );
  });

  it('rejects an empty reason', async () => {
    await expect(
      createCommandUnderTest().parseAsync(['add', '0xabc', '', '1.2500'], {
        from: 'user',
      }),
    ).rejects.toThrow('Reason is required');
  });

  it('removes an active watched wallet', async () => {
    let requestedWallet: string | undefined;
    const removedEntry = {
      ...testWalletEntry,
      active: false,
      removed_at: new Date('2026-04-03T12:00:00.000Z'),
    };

    td.when(storage.wallet.removeWallet(td.matchers.isA(String))).thenDo(
      (wallet: string) => {
        requestedWallet = wallet;
        return Promise.resolve(removedEntry);
      },
    );

    await createCommandUnderTest().parseAsync(['remove', '0xabc'], {
      from: 'user',
    });

    expect(requestedWallet).toBe('0xabc');
    td.verify(
      logger.info({ result: removedEntry }, 'Wallet removed successfully'),
    );
  });

  it('fails when removing a wallet that is not active', async () => {
    td.when(storage.wallet.removeWallet('0xmissing')).thenResolve(null);

    await expect(
      createCommandUnderTest().parseAsync(['remove', '0xmissing'], {
        from: 'user',
      }),
    ).rejects.toThrow('Wallet "0xmissing" was not found in the watchlist');
  });
});

import type { Command } from 'commander';
import { Decimal } from 'decimal.js';
import type { Logger } from 'pino';
import * as td from 'testdouble';
import { beforeEach, describe, expect, it } from 'vitest';

import { initializeApp, type App } from '~/app.js';
import { watchlist } from '~/cli/commands/watchlist.js';
import type { Storage } from '~/storage/index.js';
import type { MarketStorage } from '~/storage/market.js';
import type { WatchlistStorage } from '~/storage/watchlist.js';

type AddWatchlistRequest = Parameters<WatchlistStorage['addToWatchlist']>[0];

const testWatchlistEntry = {
  wallet: '0xabc',
  reason: 'high signal trader',
  score: new Decimal('1.2500'),
  active: true,
  added_at: new Date('2026-04-01T12:00:00.000Z'),
  removed_at: null,
};

describe('watchlist command', () => {
  let app: App;
  let logger: Logger;
  let marketStorage: MarketStorage;
  let watchlistStorage: WatchlistStorage;

  beforeEach(() => {
    td.reset();

    marketStorage = {
      listMarkets: td.function<MarketStorage['listMarkets']>(),
      getMarketById: td.function<MarketStorage['getMarketById']>(),
    };

    watchlistStorage = {
      listWatchlist: td.function<WatchlistStorage['listWatchlist']>(),
      addToWatchlist: td.function<WatchlistStorage['addToWatchlist']>(),
      removeFromWatchlist:
        td.function<WatchlistStorage['removeFromWatchlist']>(),
    };

    const storage: Storage = {
      market: marketStorage,
      watchlist: watchlistStorage,
      transaction: td.function<Storage['transaction']>(),
    };

    logger = td.object<Logger>();
    app = initializeApp({ storage, logger });
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
    return configureCommandTree(watchlist(app));
  };

  it('lists active watchlist entries', async () => {
    td.when(watchlistStorage.listWatchlist()).thenResolve([testWatchlistEntry]);

    await createCommandUnderTest().parseAsync(['list'], {
      from: 'user',
    });

    td.verify(
      logger.info(
        { result: [testWatchlistEntry] },
        'Watchlist listed successfully',
      ),
    );
  });

  it('adds a wallet to the watchlist', async () => {
    let request: AddWatchlistRequest | undefined;

    td.when(
      watchlistStorage.addToWatchlist(
        td.matchers.contains({ wallet: '0xabc' }),
      ),
    ).thenDo((input: AddWatchlistRequest) => {
      request = input;
      return Promise.resolve(testWatchlistEntry);
    });

    await createCommandUnderTest().parseAsync(
      ['add', '0xabc', '--reason', 'high signal trader', '--score', '1.2500'],
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
      logger.info(
        { result: testWatchlistEntry },
        'Watchlist entry added successfully',
      ),
    );
  });

  it('requires the add command score option', async () => {
    await expect(
      createCommandUnderTest().parseAsync(
        ['add', '0xabc', '--reason', 'high signal trader'],
        {
          from: 'user',
        },
      ),
    ).rejects.toMatchObject({
      code: 'commander.missingMandatoryOptionValue',
    });
  });

  it('rejects an invalid score value', async () => {
    await expect(
      createCommandUnderTest().parseAsync(
        ['add', '0xabc', '--reason', 'high signal trader', '--score', 'wat'],
        {
          from: 'user',
        },
      ),
    ).rejects.toThrow('Invalid score "wat"');
  });

  it('rejects a non-finite score value', async () => {
    await expect(
      createCommandUnderTest().parseAsync(
        [
          'add',
          '0xabc',
          '--reason',
          'high signal trader',
          '--score',
          'Infinity',
        ],
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
        [
          'add',
          '0xabc',
          '--reason',
          'high signal trader',
          '--score',
          '1.23456',
        ],
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
        [
          'add',
          '0xabc',
          '--reason',
          'high signal trader',
          '--score',
          '1000000',
        ],
        {
          from: 'user',
        },
      ),
    ).rejects.toThrow(
      'Invalid score "1000000": score must fit within DECIMAL(10,4)',
    );
  });

  it('removes an active watchlist entry', async () => {
    let requestedWallet: string | undefined;
    const removedEntry = {
      ...testWatchlistEntry,
      active: false,
      removed_at: new Date('2026-04-03T12:00:00.000Z'),
    };

    td.when(
      watchlistStorage.removeFromWatchlist(td.matchers.isA(String)),
    ).thenDo((wallet: string) => {
      requestedWallet = wallet;
      return Promise.resolve(removedEntry);
    });

    await createCommandUnderTest().parseAsync(['remove', '0xabc'], {
      from: 'user',
    });

    expect(requestedWallet).toBe('0xabc');
    td.verify(
      logger.info(
        { result: removedEntry },
        'Watchlist entry removed successfully',
      ),
    );
  });

  it('fails when removing a wallet that is not active', async () => {
    td.when(watchlistStorage.removeFromWatchlist('0xmissing')).thenResolve(
      null,
    );

    await expect(
      createCommandUnderTest().parseAsync(['remove', '0xmissing'], {
        from: 'user',
      }),
    ).rejects.toThrow('Watchlist entry for wallet "0xmissing" was not found');
  });
});

import { createCommand, InvalidArgumentError } from 'commander';
import { Decimal } from 'decimal.js';

import { type App, instruction } from '~/app.js';
import type { Storage } from '~/storage/index.js';

type WatchlistCommandStorage = Pick<Storage, 'watchlist'>;

function parseWatchlistScore(value: string) {
  try {
    return new Decimal(value).toString();
  } catch {
    throw new InvalidArgumentError(`Invalid score "${value}"`);
  }
}

const listWatchlist = <TStorage extends WatchlistCommandStorage>(
  app: App<TStorage>,
) =>
  createCommand('list')
    .description('List active watchlist entries')
    .action(async () => {
      const result = await app
        .execute(({ storage }) =>
          instruction(() => storage.watchlist.listWatchlist()),
        )
        .once();

      app.logger.info({ result }, 'Watchlist listed successfully');
    });

const addToWatchlist = <TStorage extends WatchlistCommandStorage>(
  app: App<TStorage>,
) =>
  createCommand('add')
    .description('Add or reactivate a wallet in the watchlist')
    .argument('<wallet>', 'Wallet address to watch')
    .requiredOption('--reason <reason>', 'Reason for adding the wallet')
    .requiredOption(
      '--score <score>',
      'Watchlist score as a decimal value',
      parseWatchlistScore,
    )
    .action(
      async (wallet: string, options: { reason: string; score: string }) => {
        const result = await app
          .execute(({ storage }) =>
            instruction(() =>
              storage.watchlist.addToWatchlist({
                wallet,
                reason: options.reason,
                score: options.score,
              }),
            ),
          )
          .once();

        app.logger.info({ result }, 'Watchlist entry added successfully');
      },
    );

const removeFromWatchlist = <TStorage extends WatchlistCommandStorage>(
  app: App<TStorage>,
) =>
  createCommand('remove')
    .description('Remove a wallet from the active watchlist')
    .argument('<wallet>', 'Wallet address to remove from the watchlist')
    .action(async (wallet: string) => {
      const result = await app
        .execute(({ storage }) =>
          instruction(() => storage.watchlist.removeFromWatchlist(wallet)),
        )
        .once();

      if (!result) {
        throw new Error(`Watchlist entry for wallet "${wallet}" was not found`);
      }

      app.logger.info({ result }, 'Watchlist entry removed successfully');
    });

export const watchlist = <TStorage extends WatchlistCommandStorage>(
  app: App<TStorage>,
) => {
  const parentCommand = createCommand('watchlist').description(
    'Commands related to tracked wallets',
  );

  parentCommand.addCommand(addToWatchlist(app));
  parentCommand.addCommand(listWatchlist(app));
  parentCommand.addCommand(removeFromWatchlist(app));

  return parentCommand;
};

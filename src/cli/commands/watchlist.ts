import { createCommand, InvalidArgumentError } from 'commander';
import { Decimal } from 'decimal.js';

import { App, instruction } from '~/app.js';

const WATCHLIST_SCORE_PRECISION = 10;
const WATCHLIST_SCORE_SCALE = 4;
const WATCHLIST_SCORE_MAX = new Decimal('999999.9999');

function parseWatchlistScore(value: string) {
  let score: Decimal;

  try {
    score = new Decimal(value);
  } catch {
    throw new InvalidArgumentError(`Invalid score "${value}"`);
  }

  if (!score.isFinite()) {
    throw new InvalidArgumentError(
      `Invalid score "${value}": score must be a finite decimal number`,
    );
  }

  if (score.decimalPlaces() > WATCHLIST_SCORE_SCALE) {
    throw new InvalidArgumentError(
      `Invalid score "${value}": score must have no more than ${WATCHLIST_SCORE_SCALE} decimal places`,
    );
  }

  if (score.abs().greaterThan(WATCHLIST_SCORE_MAX)) {
    throw new InvalidArgumentError(
      `Invalid score "${value}": score must fit within DECIMAL(${WATCHLIST_SCORE_PRECISION},${WATCHLIST_SCORE_SCALE})`,
    );
  }

  return score.toString();
}

const listWatchlist = (app: App) =>
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

const addToWatchlist = (app: App) =>
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

const removeFromWatchlist = (app: App) =>
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

export const watchlist = (app: App) => {
  const parentCommand = createCommand('watchlist').description(
    'Commands related to tracked wallets',
  );

  parentCommand.addCommand(addToWatchlist(app));
  parentCommand.addCommand(listWatchlist(app));
  parentCommand.addCommand(removeFromWatchlist(app));

  return parentCommand;
};

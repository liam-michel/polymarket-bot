import { createCommand, InvalidArgumentError } from 'commander';
import { Decimal } from 'decimal.js';
import { z } from 'zod';

import { App, instruction } from '~/app.js';

const WALLET_SCORE_PRECISION = 10;
const WALLET_SCORE_SCALE = 4;
const WALLET_SCORE_MAX = new Decimal('999999.9999');
const WALLET_ADD_INPUT = z.object({
  wallet: z.string().min(1, 'Wallet address is required'),
  reason: z.string().min(1, 'Reason is required'),
  score: z.string().min(1, 'Score is required'),
});

function parseWalletScore(value: string) {
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

  if (score.decimalPlaces() > WALLET_SCORE_SCALE) {
    throw new InvalidArgumentError(
      `Invalid score "${value}": score must have no more than ${WALLET_SCORE_SCALE} decimal places`,
    );
  }

  if (score.abs().greaterThan(WALLET_SCORE_MAX)) {
    throw new InvalidArgumentError(
      `Invalid score "${value}": score must fit within DECIMAL(${WALLET_SCORE_PRECISION},${WALLET_SCORE_SCALE})`,
    );
  }

  return score.toString();
}

function parseWalletAddInput(input: z.input<typeof WALLET_ADD_INPUT>) {
  const result = WALLET_ADD_INPUT.safeParse(input);

  if (!result.success) {
    throw new InvalidArgumentError(
      result.error.issues[0]?.message ?? 'Invalid input',
    );
  }

  return {
    wallet: result.data.wallet,
    reason: result.data.reason,
    score: parseWalletScore(result.data.score),
  };
}

const listWallets = (app: App) =>
  createCommand('list')
    .description('List active watched wallets')
    .action(async () => {
      const result = await app
        .execute(({ storage }) =>
          instruction(() => storage.wallet.listWallets()),
        )
        .once();

      app.logger.info({ result }, 'Wallets listed successfully');
    });

const addWallet = (app: App) =>
  createCommand('add')
    .description('Add or reactivate a watched wallet')
    .argument('<wallet>', 'Wallet address to watch')
    .argument('<reason>', 'Reason for adding the wallet')
    .argument('<score>', 'Wallet score as a decimal value')
    .action(async (wallet: string, reason: string, score: string) => {
      const input = parseWalletAddInput({
        wallet,
        reason,
        score,
      });

      const result = await app
        .execute(({ storage }) =>
          instruction(() => storage.wallet.addWallet(input)),
        )
        .once();

      app.logger.info({ result }, 'Wallet added successfully');
    });

const removeWallet = (app: App) =>
  createCommand('remove')
    .description('Remove a wallet from the active watchlist')
    .argument('<wallet>', 'Wallet address to remove')
    .action(async (wallet: string) => {
      const result = await app
        .execute(({ storage }) =>
          instruction(() => storage.wallet.removeWallet(wallet)),
        )
        .once();

      if (!result) {
        throw new Error(`Wallet "${wallet}" was not found in the watchlist`);
      }

      app.logger.info({ result }, 'Wallet removed successfully');
    });

export const wallet = (app: App) => {
  const parentCommand = createCommand('wallet').description(
    'Commands for managing watched wallets',
  );

  parentCommand.addCommand(addWallet(app));
  parentCommand.addCommand(listWallets(app));
  parentCommand.addCommand(removeWallet(app));

  return parentCommand;
};

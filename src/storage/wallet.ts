import { Models } from './models.js';
import type { KyselyDB } from './types.js';

export type CreateWalletInput = {
  wallet: string;
  reason: string;
  score: string;
};

export type WalletStorage = {
  listWallets: () => Promise<Models['Watchlist'][]>;
  addWallet: (input: CreateWalletInput) => Promise<Models['Watchlist']>;
  removeWallet: (wallet: string) => Promise<Models['Watchlist'] | null>;
};

function listWallets(db: KyselyDB): WalletStorage['listWallets'] {
  return async function () {
    const results = await db
      .selectFrom('watchlist')
      .where('active', '=', true)
      .where('removed_at', 'is', null)
      .selectAll()
      .orderBy('score', 'desc')
      .orderBy('added_at', 'desc')
      .execute();

    return results.map((result) => Models['Watchlist'].parse(result));
  };
}

function addWallet(db: KyselyDB): WalletStorage['addWallet'] {
  return async function ({ wallet, reason, score }) {
    const result = await db
      .insertInto('watchlist')
      .values({
        wallet,
        reason,
        score,
        active: true,
        removed_at: null,
      })
      .onConflict((conflict) =>
        conflict.column('wallet').doUpdateSet({
          reason,
          score,
          active: true,
          removed_at: null,
          added_at: new Date(),
        }),
      )
      .returningAll()
      .executeTakeFirstOrThrow();

    return Models['Watchlist'].parse(result);
  };
}

function removeWallet(db: KyselyDB): WalletStorage['removeWallet'] {
  return async function (wallet) {
    const result = await db
      .updateTable('watchlist')
      .set({
        active: false,
        removed_at: new Date(),
      })
      .where('wallet', '=', wallet)
      .where('active', '=', true)
      .where('removed_at', 'is', null)
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      return null;
    }

    return Models['Watchlist'].parse(result);
  };
}

export function createWalletStorage(db: KyselyDB): WalletStorage {
  return {
    addWallet: addWallet(db),
    listWallets: listWallets(db),
    removeWallet: removeWallet(db),
  };
}

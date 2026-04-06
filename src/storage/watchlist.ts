import { Models } from './models.js';
import type { KyselyDB } from './types.js';

export type CreateWatchlistInput = {
  wallet: string;
  reason: string;
  score: string;
};

export type WatchlistStorage = {
  listWatchlist: () => Promise<Models['Watchlist'][]>;
  addToWatchlist: (input: CreateWatchlistInput) => Promise<Models['Watchlist']>;
  removeFromWatchlist: (wallet: string) => Promise<Models['Watchlist'] | null>;
};

function listWatchlist(db: KyselyDB): WatchlistStorage['listWatchlist'] {
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

function addToWatchlist(db: KyselyDB): WatchlistStorage['addToWatchlist'] {
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
        }),
      )
      .returningAll()
      .executeTakeFirstOrThrow();

    return Models['Watchlist'].parse(result);
  };
}

function removeFromWatchlist(
  db: KyselyDB,
): WatchlistStorage['removeFromWatchlist'] {
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

export function createWatchlistStorage(db: KyselyDB): WatchlistStorage {
  return {
    addToWatchlist: addToWatchlist(db),
    listWatchlist: listWatchlist(db),
    removeFromWatchlist: removeFromWatchlist(db),
  };
}

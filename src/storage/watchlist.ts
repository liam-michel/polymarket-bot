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

type WatchlistRecord = {
  wallet: string;
  reason: string;
  score: string;
  active: boolean;
  added_at?: Date;
  removed_at?: Date | null;
  addedAt?: Date;
  removedAt?: Date | null;
};

function parseWatchlistRecord(record: WatchlistRecord) {
  return Models['Watchlist'].parse({
    ...record,
    added_at: record.added_at ?? record.addedAt,
    removed_at: record.removed_at ?? record.removedAt ?? null,
  });
}

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

    return results.map((result) =>
      parseWatchlistRecord(result as WatchlistRecord),
    );
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
          added_at: new Date(),
        }),
      )
      .returningAll()
      .executeTakeFirstOrThrow();

    return parseWatchlistRecord(result as WatchlistRecord);
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

    return parseWatchlistRecord(result as WatchlistRecord);
  };
}

export function createWatchlistStorage(db: KyselyDB): WatchlistStorage {
  return {
    addToWatchlist: addToWatchlist(db),
    listWatchlist: listWatchlist(db),
    removeFromWatchlist: removeFromWatchlist(db),
  };
}

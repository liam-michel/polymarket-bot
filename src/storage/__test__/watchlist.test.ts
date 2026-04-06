import { Decimal } from 'decimal.js';
import { describe, expect, it } from 'vitest';

import { createWatchlistStorage } from '~/storage/watchlist.js';

const activeWatchlistRow = {
  wallet: '0xabc',
  reason: 'high signal trader',
  score: '1.2500',
  active: true,
  added_at: new Date('2026-04-01T12:00:00.000Z'),
  removed_at: null,
};

const activeCamelCaseWatchlistRow = {
  wallet: '0xdef',
  reason: 'recently reactivated trader',
  score: '2.5000',
  active: true,
  addedAt: new Date('2026-04-04T12:00:00.000Z'),
  removedAt: null,
};

describe('createWatchlistStorage', () => {
  it('lists active watchlist entries ordered by score and added_at', async () => {
    const recorded = {
      orderBy: [] as Array<[string, 'asc' | 'desc']>,
      table: '',
      where: [] as Array<[string, string, boolean | null]>,
    };

    const builder = {
      where: (column: string, operator: string, value: boolean | null) => {
        recorded.where.push([column, operator, value]);
        return builder;
      },
      selectAll: () => builder,
      orderBy: (column: string, direction: 'asc' | 'desc') => {
        recorded.orderBy.push([column, direction]);
        return builder;
      },
      execute: async () => [activeWatchlistRow],
    };

    const db = {
      selectFrom: (table: string) => {
        recorded.table = table;
        return builder;
      },
    };

    const result = await createWatchlistStorage(db as never).listWatchlist();

    expect(recorded.table).toBe('watchlist');
    expect(recorded.where).toEqual([
      ['active', '=', true],
      ['removed_at', 'is', null],
    ]);
    expect(recorded.orderBy).toEqual([
      ['score', 'desc'],
      ['added_at', 'desc'],
    ]);
    expect(result).toEqual([
      {
        ...activeWatchlistRow,
        score: new Decimal('1.2500'),
      },
    ]);
  });

  it('parses camelCase watchlist rows returned by the DB layer', async () => {
    const builder = {
      where: () => builder,
      selectAll: () => builder,
      orderBy: () => builder,
      execute: async () => [activeCamelCaseWatchlistRow],
    };

    const db = {
      selectFrom: () => builder,
    };

    const result = await createWatchlistStorage(db as never).listWatchlist();

    expect(result).toEqual([
      {
        wallet: '0xdef',
        reason: 'recently reactivated trader',
        score: new Decimal('2.5000'),
        active: true,
        added_at: new Date('2026-04-04T12:00:00.000Z'),
        removed_at: null,
      },
    ]);
  });

  it('adds or reactivates a watchlist entry via upsert', async () => {
    const recorded: {
      conflictColumn?: string;
      table?: string;
      updateSet?: {
        reason: string;
        score: string;
        active: boolean;
        removed_at: null;
        added_at: Date;
      };
      values?: {
        wallet: string;
        reason: string;
        score: string;
        active: boolean;
        removed_at: null;
      };
    } = {};

    const conflictBuilder = {
      column: (column: string) => {
        recorded.conflictColumn = column;
        return {
          doUpdateSet: (updateSet: {
            reason: string;
            score: string;
            active: boolean;
            removed_at: null;
            added_at: Date;
          }) => {
            recorded.updateSet = updateSet;
            return updateSet;
          },
        };
      },
    };

    const insertBuilder = {
      values: (values: {
        wallet: string;
        reason: string;
        score: string;
        active: boolean;
        removed_at: null;
      }) => {
        recorded.values = values;
        return insertBuilder;
      },
      onConflict: (callback: (builder: typeof conflictBuilder) => unknown) => {
        callback(conflictBuilder);
        return insertBuilder;
      },
      returningAll: () => insertBuilder,
      executeTakeFirstOrThrow: async () => activeWatchlistRow,
    };

    const db = {
      insertInto: (table: string) => {
        recorded.table = table;
        return insertBuilder;
      },
    };

    const result = await createWatchlistStorage(db as never).addToWatchlist({
      wallet: '0xabc',
      reason: 'high signal trader',
      score: '1.2500',
    });

    expect(recorded.table).toBe('watchlist');
    expect(recorded.values).toEqual({
      wallet: '0xabc',
      reason: 'high signal trader',
      score: '1.2500',
      active: true,
      removed_at: null,
    });
    expect(recorded.conflictColumn).toBe('wallet');
    expect(recorded.updateSet).toMatchObject({
      reason: 'high signal trader',
      score: '1.2500',
      active: true,
      removed_at: null,
    });
    expect(recorded.updateSet?.added_at).toBeInstanceOf(Date);
    expect(result).toEqual({
      ...activeWatchlistRow,
      score: new Decimal('1.2500'),
    });
  });

  it('soft-removes an active watchlist entry', async () => {
    const recorded: {
      set?: {
        active: boolean;
        removed_at: Date;
      };
      table?: string;
      where: Array<[string, string, boolean | string | null]>;
    } = {
      where: [],
    };

    const removedAt = new Date('2026-04-03T12:00:00.000Z');
    const updatedRow = {
      ...activeWatchlistRow,
      active: false,
      removed_at: removedAt,
    };

    const updateBuilder = {
      set: (values: { active: boolean; removed_at: Date }) => {
        recorded.set = values;
        return updateBuilder;
      },
      where: (
        column: string,
        operator: string,
        value: boolean | string | null,
      ) => {
        recorded.where.push([column, operator, value]);
        return updateBuilder;
      },
      returningAll: () => updateBuilder,
      executeTakeFirst: async () => updatedRow,
    };

    const db = {
      updateTable: (table: string) => {
        recorded.table = table;
        return updateBuilder;
      },
    };

    const result = await createWatchlistStorage(
      db as never,
    ).removeFromWatchlist('0xabc');

    expect(recorded.table).toBe('watchlist');
    expect(recorded.set?.active).toBe(false);
    expect(recorded.set?.removed_at).toBeInstanceOf(Date);
    expect(recorded.where).toEqual([
      ['wallet', '=', '0xabc'],
      ['active', '=', true],
      ['removed_at', 'is', null],
    ]);
    expect(result).toEqual({
      ...updatedRow,
      score: new Decimal('1.2500'),
    });
  });

  it('returns null when removing a missing or inactive wallet', async () => {
    const updateBuilder = {
      set: () => updateBuilder,
      where: () => updateBuilder,
      returningAll: () => updateBuilder,
      executeTakeFirst: async () => undefined,
    };

    const db = {
      updateTable: () => updateBuilder,
    };

    const result = await createWatchlistStorage(
      db as never,
    ).removeFromWatchlist('0xmissing');

    expect(result).toBeNull();
  });
});

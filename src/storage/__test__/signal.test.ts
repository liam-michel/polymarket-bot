import { Decimal } from 'decimal.js';
import { describe, expect, it } from 'vitest';

import type { CreateSignalInput } from '~/storage/signal.js';
import { createSignalStorage } from '~/storage/signal.js';

type RawSignalRow = {
  id: string;
  wallet: string;
  condition_id: string;
  signal_type: 'COPY_TRADE' | 'PATTERN_MATCH' | 'MANUAL';
  side: 'BUY' | 'SELL';
  outcome_index: 0 | 1;
  price: string;
  confidence: string;
  dry_run: boolean;
  executed: boolean;
  executed_at: Date | null;
  notes: string | null;
  created_at: Date;
};

const signalRow: RawSignalRow = {
  id: '1',
  wallet: '0xabc',
  condition_id: 'condition-123',
  signal_type: 'MANUAL' as const,
  side: 'BUY' as const,
  outcome_index: 0 as const,
  price: '0.550000',
  confidence: '0.7500',
  dry_run: true,
  executed: false,
  executed_at: null,
  notes: null,
  created_at: new Date('2026-04-10T12:00:00.000Z'),
};

type SignalInsertValues = CreateSignalInput & {
  dry_run: boolean;
  executed: boolean;
  executed_at: null;
  notes: string | null;
};

type ExecutedSignalRow = RawSignalRow & {
  executed: true;
  executed_at: Date;
  notes: string | null;
};

describe('createSignalStorage', () => {
  it('creates a signal with defaults', async () => {
    const recorded: {
      table?: string;
      values?: SignalInsertValues;
    } = {};

    const insertBuilder = {
      values: (values: SignalInsertValues) => {
        recorded.values = values;
        return insertBuilder;
      },
      returningAll: () => insertBuilder,
      executeTakeFirstOrThrow: async () => signalRow,
    };

    const db = {
      insertInto: (table: string) => {
        recorded.table = table;
        return insertBuilder;
      },
    };

    const result = await createSignalStorage(db as never).createSignal({
      wallet: '0xabc',
      condition_id: 'condition-123',
      signal_type: 'MANUAL',
      side: 'BUY',
      outcome_index: 0,
      price: '0.55',
      confidence: '0.75',
    });

    expect(recorded.table).toBe('signals');
    expect(recorded.values).toEqual({
      wallet: '0xabc',
      condition_id: 'condition-123',
      signal_type: 'MANUAL',
      side: 'BUY',
      outcome_index: 0,
      price: '0.55',
      confidence: '0.75',
      dry_run: true,
      executed: false,
      executed_at: null,
      notes: null,
    });
    expect(result).toEqual({
      ...signalRow,
      price: new Decimal('0.550000'),
      confidence: new Decimal('0.7500'),
    });
  });

  it('lists signals with filters ordered by newest first', async () => {
    const recorded = {
      orderBy: [] as Array<[string, 'asc' | 'desc']>,
      table: '',
      where: [] as Array<[string, string, boolean | string]>,
    };

    const builder = {
      selectAll: () => builder,
      where: (column: string, operator: string, value: boolean | string) => {
        recorded.where.push([column, operator, value]);
        return builder;
      },
      orderBy: (column: string, direction: 'asc' | 'desc') => {
        recorded.orderBy.push([column, direction]);
        return builder;
      },
      execute: async () => [signalRow],
    };

    const db = {
      selectFrom: (table: string) => {
        recorded.table = table;
        return builder;
      },
    };

    const result = await createSignalStorage(db as never).listSignals({
      wallet: '0xabc',
      condition_id: 'condition-123',
      signal_type: 'MANUAL',
      executed: false,
    });

    expect(recorded.table).toBe('signals');
    expect(recorded.where).toEqual([
      ['wallet', '=', '0xabc'],
      ['condition_id', '=', 'condition-123'],
      ['signal_type', '=', 'MANUAL'],
      ['executed', '=', false],
    ]);
    expect(recorded.orderBy).toEqual([
      ['created_at', 'desc'],
      ['id', 'desc'],
    ]);
    expect(result).toEqual([
      {
        ...signalRow,
        price: new Decimal('0.550000'),
        confidence: new Decimal('0.7500'),
      },
    ]);
  });

  it('gets a signal by id', async () => {
    const recorded = {
      table: '',
      where: [] as Array<[string, string, string]>,
    };

    const builder = {
      where: (column: string, operator: string, value: string) => {
        recorded.where.push([column, operator, value]);
        return builder;
      },
      selectAll: () => builder,
      executeTakeFirst: async () => signalRow,
    };

    const db = {
      selectFrom: (table: string) => {
        recorded.table = table;
        return builder;
      },
    };

    const result = await createSignalStorage(db as never).getSignalById('1');

    expect(recorded.table).toBe('signals');
    expect(recorded.where).toEqual([['id', '=', '1']]);
    expect(result).toEqual({
      ...signalRow,
      price: new Decimal('0.550000'),
      confidence: new Decimal('0.7500'),
    });
  });

  it('returns null when getting a missing signal', async () => {
    const builder = {
      where: () => builder,
      selectAll: () => builder,
      executeTakeFirst: async () => undefined,
    };

    const db = {
      selectFrom: () => builder,
    };

    const result = await createSignalStorage(db as never).getSignalById('999');

    expect(result).toBeNull();
  });

  it('marks a signal executed and updates notes when provided', async () => {
    const recorded: {
      selectTable?: string;
      set?: {
        executed: boolean;
        executed_at: Date;
        notes?: string;
      };
      table?: string;
      selectWhere: Array<[string, string, string]>;
      where: Array<[string, string, boolean | string]>;
    } = {
      selectWhere: [],
      where: [],
    };

    const executedSignalRow: ExecutedSignalRow = {
      ...signalRow,
      executed: true,
      executed_at: new Date('2026-04-10T12:05:00.000Z'),
      notes: 'Executed manually',
    };

    const selectBuilder = {
      where: (column: string, operator: string, value: string) => {
        recorded.selectWhere.push([column, operator, value]);
        return selectBuilder;
      },
      selectAll: () => selectBuilder,
      executeTakeFirst: async () => signalRow,
    };

    const updateBuilder = {
      set: (values: {
        executed: boolean;
        executed_at: Date;
        notes?: string;
      }) => {
        recorded.set = values;
        return updateBuilder;
      },
      where: (column: string, operator: string, value: boolean | string) => {
        recorded.where.push([column, operator, value]);
        return updateBuilder;
      },
      returningAll: () => updateBuilder,
      executeTakeFirst: async () => executedSignalRow,
    };

    const db = {
      selectFrom: (table: string) => {
        recorded.selectTable = table;
        return selectBuilder;
      },
      updateTable: (table: string) => {
        recorded.table = table;
        return updateBuilder;
      },
    };

    const result = await createSignalStorage(db as never).markSignalExecuted(
      '1',
      'Executed manually',
    );

    expect(recorded.selectTable).toBe('signals');
    expect(recorded.selectWhere).toEqual([['id', '=', '1']]);
    expect(recorded.table).toBe('signals');
    expect(recorded.set).toMatchObject({
      executed: true,
      notes: 'Executed manually',
    });
    expect(recorded.set?.executed_at).toBeInstanceOf(Date);
    expect(recorded.where).toEqual([
      ['id', '=', '1'],
      ['executed', '=', false],
    ]);
    expect(result).toEqual({
      ...executedSignalRow,
      price: new Decimal('0.550000'),
      confidence: new Decimal('0.7500'),
    });
  });

  it('marks a signal executed without overwriting notes when omitted', async () => {
    const recorded: {
      selectTable?: string;
      selectWhere: Array<[string, string, string]>;
      set?: {
        executed: boolean;
        executed_at: Date;
      };
      table?: string;
      where: Array<[string, string, boolean | string]>;
    } = {
      selectWhere: [],
      where: [],
    };

    const selectBuilder = {
      where: (column: string, operator: string, value: string) => {
        recorded.selectWhere.push([column, operator, value]);
        return selectBuilder;
      },
      selectAll: () => selectBuilder,
      executeTakeFirst: async () => signalRow,
    };

    const updateBuilder = {
      set: (values: { executed: boolean; executed_at: Date }) => {
        recorded.set = values;
        return updateBuilder;
      },
      where: (column: string, operator: string, value: boolean | string) => {
        recorded.where.push([column, operator, value]);
        return updateBuilder;
      },
      returningAll: () => updateBuilder,
      executeTakeFirst: async () => ({
        ...signalRow,
        executed: true,
        executed_at: new Date('2026-04-10T12:05:00.000Z'),
      }),
    };

    const db = {
      selectFrom: (table: string) => {
        recorded.selectTable = table;
        return selectBuilder;
      },
      updateTable: (table: string) => {
        recorded.table = table;
        return updateBuilder;
      },
    };

    await createSignalStorage(db as never).markSignalExecuted('1');

    expect(recorded.selectTable).toBe('signals');
    expect(recorded.selectWhere).toEqual([['id', '=', '1']]);
    expect(recorded.table).toBe('signals');
    expect(recorded.set).toEqual({
      executed: true,
      executed_at: expect.any(Date),
    });
    expect(recorded.where).toEqual([
      ['id', '=', '1'],
      ['executed', '=', false],
    ]);
  });

  it('fails when marking an already executed signal', async () => {
    const recorded = {
      selectTable: '',
      selectWhere: [] as Array<[string, string, string]>,
    };

    const selectBuilder = {
      where: (column: string, operator: string, value: string) => {
        recorded.selectWhere.push([column, operator, value]);
        return selectBuilder;
      },
      selectAll: () => selectBuilder,
      executeTakeFirst: async () => ({
        ...signalRow,
        executed: true,
        executed_at: new Date('2026-04-10T12:05:00.000Z'),
        notes: 'Already executed',
      }),
    };

    const db = {
      selectFrom: (table: string) => {
        recorded.selectTable = table;
        return selectBuilder;
      },
      updateTable: () => {
        throw new Error('update should not be called');
      },
    };

    await expect(
      createSignalStorage(db as never).markSignalExecuted('1'),
    ).rejects.toThrow('Signal with ID "1" has already been marked executed');

    expect(recorded.selectTable).toBe('signals');
    expect(recorded.selectWhere).toEqual([['id', '=', '1']]);
  });

  it('returns null when marking a missing signal executed', async () => {
    const recorded = {
      selectTable: '',
      selectWhere: [] as Array<[string, string, string]>,
    };

    const selectBuilder = {
      where: (column: string, operator: string, value: string) => {
        recorded.selectWhere.push([column, operator, value]);
        return selectBuilder;
      },
      selectAll: () => selectBuilder,
      executeTakeFirst: async () => undefined,
    };

    const db = {
      selectFrom: (table: string) => {
        recorded.selectTable = table;
        return selectBuilder;
      },
      updateTable: () => {
        throw new Error('update should not be called');
      },
    };

    const result = await createSignalStorage(db as never).markSignalExecuted(
      '999',
    );

    expect(recorded.selectTable).toBe('signals');
    expect(recorded.selectWhere).toEqual([['id', '=', '999']]);
    expect(result).toBeNull();
  });

  it('wraps storage failures with contextual create errors', async () => {
    const insertBuilder = {
      values: () => insertBuilder,
      returningAll: () => insertBuilder,
      executeTakeFirstOrThrow: async () => {
        throw new Error('db offline');
      },
    };

    const db = {
      insertInto: () => insertBuilder,
    };

    await expect(
      createSignalStorage(db as never).createSignal({
        wallet: '0xabc',
        condition_id: 'condition-123',
        signal_type: 'MANUAL',
        side: 'BUY',
        outcome_index: 0,
        price: '0.55',
        confidence: '0.75',
      }),
    ).rejects.toThrow('Failed to create signal');
  });
});

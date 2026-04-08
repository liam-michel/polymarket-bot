import { Decimal } from 'decimal.js';
import { describe, expect, it } from 'vitest';

import { createMarketStorage } from '~/storage/market.js';

const marketRow = {
  condition_id: 'condition-123',
  question: 'Will this import work?',
  category: null,
  outcome_a: 'Yes',
  outcome_b: 'No',
  status: 'ACTIVE' as const,
  outcome: null,
  closes_at: new Date('2026-04-10T12:00:00.000Z'),
  resolved_at: null,
  volume_usd: '1234.56',
  created_at: new Date('2026-04-01T12:00:00.000Z'),
  updated_at: new Date('2026-04-02T12:00:00.000Z'),
};

describe('createMarketStorage', () => {
  it('upserts a market by condition_id', async () => {
    const recorded: {
      conflictColumn?: string;
      table?: string;
      updateSet?: {
        question: string;
        category: string | null;
        outcome_a: string;
        outcome_b: string;
        status: 'ACTIVE' | 'CLOSED' | 'RESOLVED';
        outcome: number | null;
        closes_at: Date;
        resolved_at: Date | null;
        volume_usd: string;
        updated_at: Date;
      };
      values?: {
        condition_id: string;
        question: string;
        category: string | null;
        outcome_a: string;
        outcome_b: string;
        status: 'ACTIVE' | 'CLOSED' | 'RESOLVED';
        outcome: number | null;
        closes_at: Date;
        resolved_at: Date | null;
        volume_usd: string;
        updated_at: Date;
      };
    } = {};

    const conflictBuilder = {
      column: (column: string) => {
        recorded.conflictColumn = column;
        return {
          doUpdateSet: (updateSet: {
            question: string;
            category: string | null;
            outcome_a: string;
            outcome_b: string;
            status: 'ACTIVE' | 'CLOSED' | 'RESOLVED';
            outcome: number | null;
            closes_at: Date;
            resolved_at: Date | null;
            volume_usd: string;
            updated_at: Date;
          }) => {
            recorded.updateSet = updateSet;
            return updateSet;
          },
        };
      },
    };

    const insertBuilder = {
      values: (values: {
        condition_id: string;
        question: string;
        category: string | null;
        outcome_a: string;
        outcome_b: string;
        status: 'ACTIVE' | 'CLOSED' | 'RESOLVED';
        outcome: number | null;
        closes_at: Date;
        resolved_at: Date | null;
        volume_usd: string;
        updated_at: Date;
      }) => {
        recorded.values = values;
        return insertBuilder;
      },
      onConflict: (callback: (builder: typeof conflictBuilder) => unknown) => {
        callback(conflictBuilder);
        return insertBuilder;
      },
      returningAll: () => insertBuilder,
      executeTakeFirstOrThrow: async () => marketRow,
    };

    const db = {
      insertInto: (table: string) => {
        recorded.table = table;
        return insertBuilder;
      },
    };

    const result = await createMarketStorage(db as never).upsertMarket({
      condition_id: 'condition-123',
      question: 'Will this import work?',
      category: null,
      outcome_a: 'Yes',
      outcome_b: 'No',
      status: 'ACTIVE',
      outcome: null,
      closes_at: new Date('2026-04-10T12:00:00.000Z'),
      resolved_at: null,
      volume_usd: '1234.56',
    });

    expect(recorded.table).toBe('markets');
    expect(recorded.values).toEqual({
      condition_id: 'condition-123',
      question: 'Will this import work?',
      category: null,
      outcome_a: 'Yes',
      outcome_b: 'No',
      status: 'ACTIVE',
      outcome: null,
      closes_at: new Date('2026-04-10T12:00:00.000Z'),
      resolved_at: null,
      volume_usd: '1234.56',
      updated_at: expect.any(Date),
    });
    expect(recorded.conflictColumn).toBe('condition_id');
    expect(recorded.updateSet).toEqual({
      question: 'Will this import work?',
      category: null,
      outcome_a: 'Yes',
      outcome_b: 'No',
      status: 'ACTIVE',
      outcome: null,
      closes_at: new Date('2026-04-10T12:00:00.000Z'),
      resolved_at: null,
      volume_usd: '1234.56',
      updated_at: expect.any(Date),
    });
    expect(result).toEqual({
      ...marketRow,
      volume_usd: new Decimal('1234.56'),
    });
  });
});

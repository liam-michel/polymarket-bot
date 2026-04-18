import { Models } from './models.js';
import type { KyselyDB } from './types.js';

type Signal = Models['Signal'];

export type CreateSignalInput = {
  wallet: string;
  condition_id: Signal['condition_id'];
  signal_type: Signal['signal_type'];
  side: Signal['side'];
  outcome_index: Signal['outcome_index'];
  price: string;
  confidence: string;
  dry_run?: boolean;
  notes?: string;
};

export type ListSignalsInput = {
  wallet?: Signal['wallet'];
  condition_id?: Signal['condition_id'];
  signal_type?: Signal['signal_type'];
  executed?: boolean;
};

export type SignalStorage = {
  createSignal: (input: CreateSignalInput) => Promise<Signal>;
  listSignals: (input?: ListSignalsInput) => Promise<Signal[]>;
  getSignalById: (id: string) => Promise<Signal | null>;
  markSignalExecuted: (id: string, notes?: string) => Promise<Signal | null>;
};

function createSignal(db: KyselyDB): SignalStorage['createSignal'] {
  return async function (input) {
    const result = await db
      .insertInto('signals')
      .values({
        wallet: input.wallet,
        condition_id: input.condition_id,
        signal_type: input.signal_type,
        side: input.side,
        outcome_index: input.outcome_index,
        price: input.price,
        confidence: input.confidence,
        dry_run: input.dry_run ?? true,
        executed: false,
        executed_at: null,
        notes: input.notes ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return Models.Signal.parse(result);
  };
}

function listSignals(db: KyselyDB): SignalStorage['listSignals'] {
  return async function (input = {}) {
    let query = db.selectFrom('signals').selectAll();

    if (input.wallet) {
      query = query.where('wallet', '=', input.wallet);
    }

    if (input.condition_id) {
      query = query.where('condition_id', '=', input.condition_id);
    }

    if (input.signal_type) {
      query = query.where('signal_type', '=', input.signal_type);
    }

    if (input.executed !== undefined) {
      query = query.where('executed', '=', input.executed);
    }

    const results = await query
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .execute();

    return Models.Signal.array().parse(results);
  };
}

function getSignalById(db: KyselyDB): SignalStorage['getSignalById'] {
  return async function (id) {
    const result = await db
      .selectFrom('signals')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst();

    if (!result) {
      return null;
    }

    return Models.Signal.parse(result);
  };
}

class SignalAlreadyExecutedError extends Error {
  constructor(id: string) {
    super(`Signal with ID "${id}" has already been marked executed`);
    this.name = 'SignalAlreadyExecutedError';
  }
}

function markSignalExecuted(db: KyselyDB): SignalStorage['markSignalExecuted'] {
  return async function (id, notes) {
    const result = await db
      .updateTable('signals')
      .set({
        executed: true,
        executed_at: new Date(),
        ...(notes === undefined ? {} : { notes }),
      })
      .where('id', '=', id)
      .where('executed', '=', false)
      .returningAll()
      .executeTakeFirst();

    if (result) {
      return Models.Signal.parse(result);
    }

    const existingSignal = await db
      .selectFrom('signals')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst();

    if (!existingSignal) {
      return null;
    }

    throw new SignalAlreadyExecutedError(id);
  };
}

export function createSignalStorage(db: KyselyDB): SignalStorage {
  return {
    createSignal: createSignal(db),
    listSignals: listSignals(db),
    getSignalById: getSignalById(db),
    markSignalExecuted: markSignalExecuted(db),
  };
}

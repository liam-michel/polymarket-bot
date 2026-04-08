import { Models } from './models.js';
import { KyselyDB } from './types.js';

export type MarketStorage = {
  listMarkets: () => Promise<Models['Market'][]>;
  getMarketById: (id: string) => Promise<Models['Market'] | null>;
  upsertMarket: (input: CreateMarketInput) => Promise<Models['Market']>;
};

export type CreateMarketInput = {
  condition_id: string;
  question: string;
  category: string | null;
  outcome_a: string;
  outcome_b: string;
  status: Models['Market']['status'];
  outcome: number | null;
  closes_at: Date;
  resolved_at: Date | null;
  volume_usd: string;
};

function listMarkets(db: KyselyDB): MarketStorage['listMarkets'] {
  return async function () {
    const results = await db.selectFrom('markets').selectAll().execute();
    return Models['Market'].array().parse(results);
  };
}

function getMarketById(db: KyselyDB): MarketStorage['getMarketById'] {
  return async function (id: string) {
    const result = await db
      .selectFrom('markets')
      .where('condition_id', '=', id)
      .selectAll()
      .executeTakeFirst();
    if (result) {
      return Models['Market'].parse(result);
    }
    return null;
  };
}

function upsertMarket(db: KyselyDB): MarketStorage['upsertMarket'] {
  return async function (input) {
    const updated_at = new Date();

    const result = await db
      .insertInto('markets')
      .values({
        ...input,
        updated_at,
      })
      .onConflict((conflict) =>
        conflict.column('condition_id').doUpdateSet({
          question: input.question,
          category: input.category,
          outcome_a: input.outcome_a,
          outcome_b: input.outcome_b,
          status: input.status,
          outcome: input.outcome,
          closes_at: input.closes_at,
          resolved_at: input.resolved_at,
          volume_usd: input.volume_usd,
          updated_at,
        }),
      )
      .returningAll()
      .executeTakeFirstOrThrow();

    return Models['Market'].parse(result);
  };
}

export function createMarketStorage(db: KyselyDB): MarketStorage {
  return {
    getMarketById: getMarketById(db),
    listMarkets: listMarkets(db),
    upsertMarket: upsertMarket(db),
  };
}

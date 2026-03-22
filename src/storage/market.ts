import { Models } from './models.js';
import { KyselyDB } from './types.js';

export type MarketStorage = {
  listMarkets: () => Promise<Models['Market'][]>;
  getMarketById: (id: string) => Promise<Models['Market'] | null>;
};

function listMarkets(db: KyselyDB): MarketStorage['listMarkets'] {
  return async function () {
    const results = await db.selectFrom('markets').selectAll().execute();
    return results.map((result) => Models['Market'].parse(result));
  };
}

function getMarketById(db: KyselyDB): MarketStorage['getMarketById'] {
  return async function (id: string) {
    const result = await db
      .selectFrom('markets')
      .where('condition_id', '=', id)
      .selectAll()
      .executeTakeFirst();
    return Models['Market'].parse(result) || null;
  };
}

export function createMarketStorage(db: KyselyDB): MarketStorage {
  return {
    getMarketById: getMarketById(db),
    listMarkets: listMarkets(db),
  };
}

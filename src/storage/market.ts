import { Models } from './models.js';
import { KyselyDB } from './types.js';

export type MarketStorage = {
  listMarkets: () => Promise<Models['Market'][]>;
  getMarketById: (id: string) => Promise<Models['Market'] | null>;
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

export function createMarketStorage(db: KyselyDB): MarketStorage {
  return {
    getMarketById: getMarketById(db),
    listMarkets: listMarkets(db),
  };
}

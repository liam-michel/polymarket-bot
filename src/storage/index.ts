import pg from 'pg';
import { PostgresDialect, CamelCasePlugin } from 'kysely';
import { Kysely } from 'kysely';
import assert from 'assert';
import { KyselyDB } from './types.js';
import { createMarketStorage, MarketStorage } from './market.js';
import * as generated from '~/__generated__/database.js';
export type Storage = {
  market: MarketStorage;
  transaction: <T>(
    callback: (repo: Readonly<Omit<Storage, 'transaction'>>) => Promise<T>,
  ) => Promise<T>;
};
export type Repo = Omit<Storage, 'transaction'>;

function wrapKyselyDb(db: KyselyDB) {
  return {
    market: createMarketStorage(db),
  };
}

function createPostgresConnection(connectionString: string) {
  const pool = new pg.Pool({
    connectionString,
    max: 10,
  });
  const dialect = new PostgresDialect({
    pool,
  });
  const db = new Kysely<generated.DB>({
    dialect,
    plugins: [new CamelCasePlugin()],
  });
  return {
    db,
    dialect,
    pool,
  };
}

async function checkPostgresConnection(pool: pg.Pool) {
  return pool
    .query('SELECT 1 AS one')
    .then(() => true)
    .catch(() => false);
}

export async function createStorage(
  connectionString: string,
): Promise<Storage> {
  const { db, pool } = createPostgresConnection(connectionString);
  const isConnected = await checkPostgresConnection(pool);
  assert(isConnected, 'Failed to connect to Postgres database');
  return {
    ...wrapKyselyDb(db),
    transaction: async <T>(
      callback: (repo: Repo) => Promise<T>,
    ): Promise<T> => {
      return db.transaction().execute(async (trx) => {
        return callback(wrapKyselyDb(trx));
      });
    },
  };
}

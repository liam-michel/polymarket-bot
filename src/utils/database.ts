import type { DB } from '../prisma/generated/kysely/types.js';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

export function createDB(connectionString: string) {
  return new Kysely<DB>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString,
      }),
    }),
  });
}

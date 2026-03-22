//file for creating all app dependencies and returning them for index.ts and others to use
import type { Logger } from 'pino';
import { Config, readConfig } from './utils/config.js';
import { createDB } from './utils/database.js';
import { createLogger } from './utils/logger.js';
import * as _ from 'radashi';
import type { DB } from '../prisma/generated/kysely/types.js';
import type { Kysely } from 'kysely';
export type AppConfig = {
  logger: Logger;
  storage: Kysely<DB>;
};

export const initializeAppWithConfig = ({
  DATABASE_URL,
}: Config): AppConfig => {
  const logger = createLogger();
  logger.info('Config loaded successfully');
  const postgresStorage = createDB(DATABASE_URL);
  logger.info('Database connection established successfully');

  return {
    logger,
    storage: postgresStorage,
  };
};

export async function initializeAppFromEnvironment() {
  //load env vars using schema validation and parse them into a config object
  const [err, config] = _.tryit(() => readConfig())();
  if (err) {
    throw new Error(`Failed to read configuration: ${err.message}`);
  }
  return initializeAppWithConfig(config);
}

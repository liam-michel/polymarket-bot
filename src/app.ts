//file for creating all app dependencies and returning them for index.ts and others to use
import { readConfig } from './utils/config.js';
import { createDB } from './utils/database.js';
import { createLogger } from './utils/logger.js';
import * as _ from 'radashi';

export type AppConfig = {
  DATABASE_URL: string;
};
export type App = ReturnType<typeof initializeAppWithConfig>;

export const initializeAppWithConfig = ({ DATABASE_URL }: AppConfig) => {
  const logger = createLogger();
  logger.info('Config loaded successfully');
  const postgresStorage = createDB(DATABASE_URL);
  logger.info('Database connection established successfully');

  return {
    logger,
    config: { DATABASE_URL },
    postgresStorage,
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

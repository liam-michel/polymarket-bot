//file for creating all app dependencies and returning them for index.ts and others to use
import type { Logger } from 'pino';
import * as _ from 'radashi';

import { createStorage, Storage } from './storage/index.js';
import { Config, readConfig } from './utils/config.js';
import { createLogger } from './utils/logger.js';

export type AppConfig = {
  logger: Logger;
  storage: Storage;
};

export const initializeAppWithConfig = async ({
  DATABASE_URL,
}: Config): Promise<AppConfig> => {
  const logger = createLogger();
  logger.info('Config loaded successfully');
  const storage = await createStorage(DATABASE_URL);
  return {
    logger,
    storage,
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

import { readConfig } from './utils/config.js';
import { createDB } from './utils/database.js';
import { createLogger } from './utils/logger.js';

const main = async () => {
  const logger = createLogger();
  //load the config
  const config = readConfig({ logger });
  logger.info('Config loaded successfully');
  const postgresStorage = createDB(config.postgresURL);
  logger.info('Database connection established successfully');

  logger.info('Starting bot...');
};

main();

import { createCommand } from 'commander';

import { AppConfig } from '~/app.js';

const listMarkets = (app: AppConfig) =>
  createCommand('list-markets')
    .description('List all markets in the database')
    .action(async () => {
      const { storage, logger } = app;
      logger.info('Listing markets...');
      const result = await storage.market.listMarkets();
      logger.info({ result }, 'Markets listed successfully');
    });

export const markets = (app: AppConfig) => {
  const parentCommand = createCommand('markets').description(
    'Commands related to markets',
  );
  parentCommand.addCommand(listMarkets(app));
  return parentCommand;
};

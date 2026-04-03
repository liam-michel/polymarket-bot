import { createCommand } from 'commander';

import { App, instruction } from '~/app.js';

const listMarkets = (app: App) =>
  createCommand('list-markets')
    .description('List all available markets')
    .action(async () => {
      const result = await app
        .execute(({ storage }) =>
          instruction(() => storage.market.listMarkets()),
        )
        .once();
      app.logger.info({ result }, 'Markets listed successfully');
    });

const getMarket = (app: App) =>
  createCommand('get')
    .description('Get a market by condition ID')
    .argument('<conditionId>', 'Market condition ID')
    .action(async (conditionId: string) => {
      const result = await app
        .execute(({ storage }) =>
          instruction(() => storage.market.getMarketById(conditionId)),
        )
        .once();

      if (!result) {
        throw new Error(
          `Market with condition ID "${conditionId}" was not found`,
        );
      }

      app.logger.info({ result }, 'Market fetched successfully');
    });

export const markets = (app: App) => {
  const parentCommand = createCommand('markets').description(
    'Commands related to markets',
  );
  parentCommand.addCommand(getMarket(app));
  parentCommand.addCommand(listMarkets(app));
  return parentCommand;
};

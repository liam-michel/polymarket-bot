import { createCommand } from 'commander';

import { type App, instruction } from '~/app.js';
import type { Storage } from '~/storage/index.js';

type MarketCommandStorage = Pick<Storage, 'market'>;

const listMarkets = <TStorage extends MarketCommandStorage>(
  app: App<TStorage>,
) =>
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

const getMarket = <TStorage extends MarketCommandStorage>(app: App<TStorage>) =>
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

export const markets = <TStorage extends MarketCommandStorage>(
  app: App<TStorage>,
) => {
  const parentCommand = createCommand('markets').description(
    'Commands related to markets',
  );
  parentCommand.addCommand(getMarket(app));
  parentCommand.addCommand(listMarkets(app));
  return parentCommand;
};

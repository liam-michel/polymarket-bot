import { createCommand, createOption } from 'commander';
import { z } from 'zod';

import { App, instruction } from '~/app.js';
import { Models } from '~/storage/models.js';

const listMarketSchema = z.object({
  count: z.number().int().positive().min(1),
  offset: z.number().int().nonnegative(),
  asc: z.boolean(),
});

const listMarketsByCategorySchema = listMarketSchema.extend({
  category: Models.Category,
});

const listMarketsByCategory = (app: App) =>
  createCommand('list-markets-by-category')
    .description('List markets by category from Gamma API')
    .argument('<category>', 'Market category')
    .addOption(
      createOption('--count <number>', 'Number of markets to fetch')
        .default(10)
        .argParser(Number),
    )
    .addOption(
      createOption('--offset <number>', 'Number of markets to skip')
        .default(0)
        .argParser(Number),
    )
    .addOption(
      createOption('--asc <boolean>', 'Sort markets in ascending order')
        .default(false)
        .argParser(Boolean),
    )
    .action(async (category, opts) => {
      const parsedArgs = listMarketsByCategorySchema.parse({
        ...opts,
        category,
      });
      const result = await app
        .execute(({ gammaApiClient }) =>
          instruction(() => gammaApiClient.getMarketsByCategory(parsedArgs)),
        )
        .once();
      app.logger.info({ result }, 'Markets by category listed successfully');
    });

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

const listResolvedMarkets = (app: App) =>
  createCommand('list-resolved-markets')
    .description('List resolved markets from Gamma API')
    .addOption(
      createOption('--count <number>', 'Number of resolved markets to fetch')
        .default(1)
        .argParser(Number),
    )
    .addOption(
      createOption('--offset <number>', 'Number of resolved markets to skip')
        .default(0)
        .argParser(Number),
    )
    .addOption(
      createOption('--asc <boolean>', 'Sort markets in ascending order')
        .default(false)
        .argParser(Boolean),
    )

    .action(async (opts) => {
      const parsedArgs = listMarketSchema.parse(opts);
      const result = await app
        .execute(({ gammaApiClient }) =>
          instruction(() => gammaApiClient.scrapeResolvedMarkets(parsedArgs)),
        )
        .once();
      app.logger.info({ result }, 'Resolved markets listed successfully');
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

const importMarket = (app: App) =>
  createCommand('import')
    .description('Import a market from Gamma by condition ID')
    .argument('<conditionId>', 'Market condition ID')
    .action(async (conditionId: string) => {
      const result = await app
        .execute(({ services }) =>
          instruction(() => services.market.importMarket(conditionId)),
        )
        .once();

      app.logger.info({ result }, 'Market imported successfully');
    });

export const markets = (app: App) => {
  const parentCommand = createCommand('markets').description(
    'Commands related to markets',
  );
  parentCommand.addCommand(getMarket(app));
  parentCommand.addCommand(importMarket(app));
  parentCommand.addCommand(listMarkets(app));
  parentCommand.addCommand(listResolvedMarkets(app));
  parentCommand.addCommand(listMarketsByCategory(app));
  return parentCommand;
};

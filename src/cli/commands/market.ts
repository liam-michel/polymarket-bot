import { createCommand, createOption } from 'commander';
import { z } from 'zod';

import { App, instruction } from '~/app.js';
import type { GammaMarket } from '~/gamma/market/market.js';
import type { CreateMarketInput } from '~/storage/market.js';
import { Models } from '~/storage/models.js';

const listMarketSchema = z.object({
  count: z.number().int().positive().min(1),
  offset: z.number().int().nonnegative(),
  asc: z.boolean(),
});

const listMarketsByCategorySchema = listMarketSchema.extend({
  category: Models.Category,
});
const marketOutcomesSchema = z.tuple([z.string(), z.string()]);

function parseMarketOutcomes(outcomes: string) {
  const parsedJson = JSON.parse(outcomes);
  const parsedOutcomes = marketOutcomesSchema.parse(parsedJson);

  return {
    outcome_a: parsedOutcomes[0],
    outcome_b: parsedOutcomes[1],
  };
}

function mapGammaMarketToCreateMarketInput(market: GammaMarket) {
  const { outcome_a, outcome_b } = parseMarketOutcomes(market.outcomes);

  return {
    condition_id: market.conditionId,
    question: market.question,
    category: null,
    outcome_a,
    outcome_b,
    status: market.closed ? 'CLOSED' : market.active ? 'ACTIVE' : 'CLOSED',
    outcome: null,
    closes_at: new Date(market.endDate),
    resolved_at: null,
    volume_usd: market.volume,
  } satisfies CreateMarketInput;
}

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
        .execute(({ gammaApiClient, storage }) =>
          instruction(async () => {
            const market = await gammaApiClient.getMarketById(conditionId);

            if (!market) {
              throw new Error(
                `Market with condition ID "${conditionId}" was not found in Gamma`,
              );
            }

            return storage.market.upsertMarket(
              mapGammaMarketToCreateMarketInput(market),
            );
          }),
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

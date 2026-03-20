import { App } from '../../app.js';
import { createCommand, createOption } from 'commander';
import { z } from 'zod';

const walletLimitSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(10),
});

const listWallets = (app: App) =>
  createCommand('list-wallets')
    .description('List all wallets in the database')
    .addOption(
      createOption(
        '-l, --limit <number>',
        'Limit the number of wallets returned',
      )
        .argParser((value) => {
          const parsed = walletLimitSchema.safeParse(value);
          if (!parsed.success) {
            throw new Error(
              `Invalid limit: "${value}". Must be a positive integer between 1 and 100.`,
            );
          }
          return parsed.data;
        })
        .default(10),
    )
    .action(async (options: z.infer<typeof walletLimitSchema>) => {
      const { limit } = options; // ✅ number
      //TODO: Do something inside here
    });

export const wallets = (app: App) => {
  const parentCommand = createCommand('wallets').description(
    'Commands related to wallets',
  );
  parentCommand.addCommand(listWallets(app));
  return parentCommand;
};

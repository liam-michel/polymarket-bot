import { createCommand } from 'commander';

import { App, instruction } from '~/app.js';

const listMarkets = (app: App) =>
  createCommand('list-markets').action(async () => {
    const result = await app
      .execute(({ storage }) => instruction(() => storage.market.listMarkets()))
      .once();
    app.logger.info({ result }, 'Markets listed successfully');
  });
export const markets = (app: App) => {
  const parentCommand = createCommand('markets').description(
    'Commands related to markets',
  );
  parentCommand.addCommand(listMarkets(app));
  return parentCommand;
};

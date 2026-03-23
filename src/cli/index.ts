import { createCommand } from 'commander';

import { type App, initializeAppFromEnvironment } from '../app.js';
import { markets } from './commands/market.js';
function getBeforeExitHandler({ logger }: App) {
  return async () => {
    logger.warn(
      'Uncaught error or unhandled promise rejection occurred, executing cleanup tasks',
    );
    //TODO add cleanup here (will be passed with logger)
    logger.warn('Cleanup tasks completed, exiting now');
    process.exit(1);
  };
}

async function main() {
  const app = await initializeAppFromEnvironment();
  const p = createCommand();
  const beforeExitHandler = getBeforeExitHandler(app);
  process.on('uncaughtException', beforeExitHandler);
  process.on('unhandledRejection', beforeExitHandler);
  // cleanup on graceful shutdown
  process.on('SIGINT', async () => {
    await app.cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await app.cleanup();
    process.exit(0);
  });

  //register commands
  p.addCommand(markets(app));
  await p
    .parseAsync(process.argv)
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      const errorMessage = err instanceof Error ? err.message : String(err);
      app.logger.error(`Error executing command: ${errorMessage}`);
      process.exit(1);
    });
}
await main();

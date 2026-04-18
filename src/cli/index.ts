import { createCommand } from 'commander';

import { type App, initializeAppFromEnvironment } from '../app.js';
import { markets } from './commands/market.js';
import { signal } from './commands/signal.js';
import { wallet } from './commands/wallet.js';

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
    try {
      await app.cleanup();
      process.exit(0);
    } catch (err) {
      app.logger.error(
        `Error during cleanup: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      process.exit(1);
    }
  });

  process.on('SIGTERM', async () => {
    try {
      await app.cleanup();
      process.exit(0);
    } catch (err) {
      app.logger.error(
        `Error during cleanup: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      process.exit(1);
    }
  });

  //register commands
  p.addCommand(markets(app));
  p.addCommand(signal(app));
  p.addCommand(wallet(app));

  try {
    await p.parseAsync(process.argv);
    process.exit(0);
  } catch {
    process.exit(1);
  }
}
await main();

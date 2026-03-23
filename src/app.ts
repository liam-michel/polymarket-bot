import type { Logger } from 'pino';
//file for creating all app dependencies and returning them for index.ts and others to use
import * as _ from 'radashi';
import { v6 as randomUUID } from 'uuid';

import {
  createGammaMarketApiClient,
  GammaMarketApiClient,
} from './gamma/market/api.js';
import { createStorage, type Storage } from './storage/index.js';
import { AppConfig, readConfig } from './utils/config.js';
import { createLogger } from './utils/logger.js';

type ErrorHandler = (error: Error) => Promise<void>;
type SuccessHandler<T> = (result: T) => Promise<void>;

type InstructionBuilder<T> = {
  onError: (handler: ErrorHandler) => InstructionBuilder<T>;
  onSuccess: (handler: SuccessHandler<T>) => InstructionBuilder<T>;
  build: () => InstructionResult<T>;
};

type InstructionResult<T> = {
  executor: () => Promise<T>;
  errorHandler?: ErrorHandler;
  successHandler?: SuccessHandler<T>;
};
type AppState = {
  errorHandlers: Record<string, ErrorHandler>;
};

export type AppDependencies = {
  storage: Storage;
  logger: Logger;
  gammaApiClient: GammaMarketApiClient;
};

export type AppInstruction<TOutput> = (
  deps: AppDependencies,
  operationId: string,
) => InstructionBuilder<TOutput>;

export function instruction<T>(
  executor: () => Promise<T>,
): InstructionBuilder<T> {
  let errorHandler: ErrorHandler | undefined;
  let successHandler: SuccessHandler<T> | undefined;

  const builder: InstructionBuilder<T> = {
    onError: (handler: ErrorHandler) => {
      errorHandler = handler;
      return builder;
    },
    onSuccess: (handler: SuccessHandler<T>) => {
      successHandler = handler;
      return builder;
    },
    build: () => ({
      executor,
      errorHandler,
      successHandler,
    }),
  };

  return builder;
}
type CancelCallback = () => void;

export type App = {
  execute: <TOutput>(instruction: AppInstruction<TOutput>) => {
    once: () => Promise<TOutput>;
    times: (times: number) => Promise<TOutput[]>;
    every: (intervalMs: number) => CancelCallback;
  };
  cleanup: () => Promise<void>;
  logger: Logger;
};

export function initializeApp(appDependencies: AppDependencies): App {
  const state: AppState = {
    errorHandlers: {},
  };

  const execute = <TOutput>(instruction: AppInstruction<TOutput>) => {
    const runInstruction = async (operationId: string): Promise<TOutput> => {
      const builder = instruction(appDependencies, operationId);
      const { executor, errorHandler, successHandler } = builder.build();

      if (errorHandler) {
        state.errorHandlers[operationId] = errorHandler;
      }

      try {
        const output = await executor();

        if (successHandler) {
          await successHandler(output);
        }

        delete state.errorHandlers[operationId];
        return output;
      } catch (error) {
        delete state.errorHandlers[operationId];

        if (errorHandler) {
          await errorHandler(error as Error);
        }

        throw error;
      }
    };

    return {
      once: async () => await runInstruction(randomUUID()),

      times: async (times: number) => {
        const results: TOutput[] = [];
        for (const _i of _.range(1, times)) {
          results.push(await runInstruction(randomUUID()));
        }
        return results;
      },

      every: (intervalMs: number) => {
        let cancelled = false;
        let timeoutId: NodeJS.Timeout | null = null;

        const run = async () => {
          try {
            await runInstruction(randomUUID());
          } catch (error) {
            appDependencies.logger.error(
              { error },
              'Error executing instruction',
            );
          }
        };

        const cancel = () => {
          cancelled = true;
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        };

        // Start the recurring execution
        const scheduleNext = () => {
          if (cancelled) return;
          // eslint-disable-next-line sonarjs/no-nested-functions
          timeoutId = setTimeout(async () => {
            await run();
            scheduleNext(); // Schedule the next execution after this one completes
          }, intervalMs);
        };

        scheduleNext(); // Start the recurring schedule (first execution will be after intervalMs)
        return cancel;
      },
    };
  };

  return {
    execute,
    logger: appDependencies.logger,
    cleanup: async () => {
      appDependencies.logger.info('Cleaning up...');
      await Promise.all(
        Object.values(state.errorHandlers).map((errorHandler) =>
          errorHandler(new Error('App cleanup')),
        ),
      );
      appDependencies.logger.info('Cleanup complete');
    },
  };
}

export const initializeAppWithConfig = async ({
  DATABASE_URL,
  LOG_LEVEL,
}: AppConfig) => {
  //create base logger for entire application, will be passed to all relevant deps for good logging
  const logger = createLogger(LOG_LEVEL);
  logger.info('Config loaded successfully');
  //create storage instancce
  const storage = await createStorage(DATABASE_URL);
  //GAMMA API client
  const gammaApiClient = createGammaMarketApiClient({ logger });
  return initializeApp({
    storage,
    logger,
    gammaApiClient,
  });
};

export async function initializeAppFromEnvironment() {
  //load env vars using schema validation and parse them into a config object
  const [err, config] = _.tryit(() => readConfig())();
  if (err) {
    throw new Error(`Failed to read configuration: ${err.message}`);
  }
  return initializeAppWithConfig(config);
}

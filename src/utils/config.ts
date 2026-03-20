import type { Logger } from 'pino';
import { z } from 'zod';
type ConfigDeps = {
  logger: Logger;
};

const Config = z.object({
  postgresURL: z.string(),
});

export function readConfig(deps: ConfigDeps) {
  const { logger } = deps;
  const env = Config.safeParse(process.env);
  if (!env.success) {
    logger.error('Invalid configuration');
    process.exit(1);
  }
  return env.data;
}

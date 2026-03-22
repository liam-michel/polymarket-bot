import { z } from 'zod';

const Config = z.object({
  DATABASE_URL: z.string(),
});

export function readConfig() {
  const env = Config.safeParse(process.env);
  if (!env.success) {
    throw new Error('Invalid configuration');
  }
  return env.data;
}

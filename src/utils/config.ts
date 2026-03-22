import { z } from 'zod';

const Config = z.object({
  DATABASE_URL: z.string(),
});

export type Config = z.infer<typeof Config>;

export function readConfig() {
  const env = Config.safeParse(process.env);
  if (!env.success) {
    throw new Error(
      env.error.issues.map((issue) => issue.message).join(', ') ||
        'Unknown configuration error',
    );
  }
  return env.data;
}

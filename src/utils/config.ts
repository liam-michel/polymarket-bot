import { z } from 'zod';

const AppConfig = z.object({
  DATABASE_URL: z.string(),
});

export type AppConfig = z.infer<typeof AppConfig>;

export function readConfig() {
  const env = AppConfig.safeParse(process.env);
  if (!env.success) {
    throw new Error(
      env.error.issues.map((issue) => issue.message).join(', ') ||
        'Unknown configuration error',
    );
  }
  return env.data;
}

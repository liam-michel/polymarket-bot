import { Logger } from 'pino';
import { z } from 'zod';

export async function handleResponse<TSchema extends z.ZodSchema>(
  response: Response,
  schema: TSchema,
  logger: Logger,
  responseErrorMessage: string,
): Promise<z.infer<TSchema>> {
  if (!response.ok || response.status !== 200) {
    logger.error(
      {
        response,
      },
      responseErrorMessage,
    );

    throw new Error(responseErrorMessage);
  }

  const data = await response.json();
  const parsed = await schema.safeParseAsync(data);
  if (!parsed.success) {
    logger.error(
      {
        data,
        error: parsed.error,
      },
      'Invalid response',
    );
    throw new Error('Invalid response');
  }

  return parsed.data;
}

import { z } from 'zod';

import { Models } from '~/storage/models.js';

export const outcomesSchema = z
  .string()
  .transform((s, ctx) => {
    try {
      return JSON.parse(s);
    } catch {
      ctx.addIssue({ code: 'custom', message: 'outcomes is not valid JSON' });
      return z.NEVER;
    }
  })
  .pipe(
    z.union([
      z.tuple([z.literal('Yes'), z.literal('No')]),
      z.tuple([z.literal('True'), z.literal('False')]),
    ]),
  );

export const clobTokenIdsSchema = z
  .string()
  .transform((s, ctx) => {
    try {
      return JSON.parse(s);
    } catch {
      ctx.addIssue({
        code: 'custom',
        message: 'clobTokenIds is not valid JSON',
      });
      return z.NEVER;
    }
  })
  .pipe(z.tuple([z.string().min(1), z.string().min(1)]));

export const ResolvedMarketApiSchema = z.object({
  id: z.string(),
  question: z.string(),
  category: Models.Category.nullish().transform((category) => category ?? null),
  description: z.string().nullable(),
  closed: z.boolean(),
});

export const MarketApiSchema = ResolvedMarketApiSchema.extend({
  conditionId: z.string(),
  outcomes: outcomesSchema,
  clobTokenIds: clobTokenIdsSchema,
  endDate: z.string(),
  volume: z.string(),
  active: z.boolean(),
});

export type Outcomes = z.infer<typeof outcomesSchema>;
export type ClobTokenIds = z.infer<typeof clobTokenIdsSchema>;
export type ResolvedGammaMarket = z.infer<typeof ResolvedMarketApiSchema>;
export type GammaMarket = z.infer<typeof MarketApiSchema>;

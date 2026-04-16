import { z } from 'zod';

const ethAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'must be a valid Ethereum address');
const conditionId = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, 'must be a valid condition ID');
const numericString = z
  .string()
  .regex(/^\d+(\.\d+)?$/, 'must be a numeric string');

export const timePeriodSchema = z.enum(['DAY', 'WEEK', 'MONTH', 'ALL']);

export const orderByLeaderboardSchema = z.enum(['PNL', 'VOL']);

export const LeaderboardEntrySchema = z.object({
  rank: numericString,
  proxyWallet: ethAddress,
  xUsername: z.string(),
  vol: z.number(),
  pnl: z.number(),
});

export const DataApiTradeSchema = z.object({
  proxyWallet: ethAddress,
  side: z.enum(['BUY', 'SELL']),
  asset: z.string().min(1),
  conditionId: conditionId,
  size: z.number(),
  price: z.number(),
  timestamp: z.number().int(),
  outcome: z.string(),
  outcomeIndex: z.number().int(),
  transactionHash: z.string(),
});

export type TimePeriod = z.infer<typeof timePeriodSchema>;
export type OrderByLeaderboard = z.infer<typeof orderByLeaderboardSchema>;
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;
export type DataApiTrade = z.infer<typeof DataApiTradeSchema>;

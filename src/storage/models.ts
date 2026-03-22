import { Decimal } from 'decimal.js';
import z from 'zod';
import * as generated from '~/__generated__/database.js';

const MarketStatus = z.enum(generated.MarketStatus);
const TradeSide = z.enum(generated.TradeSide);
const SignalType = z.enum(generated.SignalType);

const decimal = z.string().transform((val) => new Decimal(val));

const Market = z.object({
  conditionId: z.string(),
  question: z.string(),
  category: z.string().nullable(),
  outcomeA: z.string(),
  outcomeB: z.string(),
  status: MarketStatus,
  outcome: z.number().int().nullable(),
  closesAt: z.date(),
  resolvedAt: z.date().nullable(),
  volumeUsd: decimal,
  createdAt: z.date(),
  updatedAt: z.date(),
});

const Trade = z.object({
  fillId: z.string(),
  conditionId: z.string(),
  wallet: z.string(),
  side: TradeSide,
  outcomeIndex: z.number().int().refine((val) => val === 0 || val === 1, {
    message: 'outcomeIndex must be 0 or 1',
  }),
  price: decimal,
  size: decimal,
  usdValue: decimal,
  filledAt: z.date(),
  createdAt: z.date(),
});

const Position = z.object({
  id: z.number().int(),
  wallet: z.string(),
  conditionId: z.string(),
  outcomeIndex: z.number().int().refine((val) => val === 0 || val === 1, {
    message: 'outcomeIndex must be 0 or 1',
  }),
  size: decimal,
  avgEntry: decimal,
  currentPrice: decimal,
  unrealisedPnl: decimal,
  updatedAt: z.date(),
});

const TraderStats = z.object({
  wallet: z.string(),
  tradeCount: z.number().int(),
  resolvedTrades: z.number().int(),
  winCount: z.number().int(),
  winRate: decimal,
  realisedPnl: decimal,
  roi: decimal,
  avgEdge: decimal,
  score: decimal,
  firstTradeAt: z.date().nullable(),
  lastTradeAt: z.date().nullable(),
  updatedAt: z.date(),
});

const MarketPrice = z.object({
  id: z.string(),
  conditionId: z.string(),
  outcomeIndex: z.number().int(),
  price: decimal,
  capturedAt: z.date(),
});

const Watchlist = z.object({
  wallet: z.string(),
  reason: z.string(),
  score: decimal,
  active: z.boolean(),
  addedAt: z.date(),
  removedAt: z.date().nullable(),
});

const Signal = z.object({
  id: z.string(),
  wallet: z.string(),
  conditionId: z.string(),
  signalType: SignalType,
  side: TradeSide,
  outcomeIndex: z.number().int().refine((val) => val === 0 || val === 1, {
    message: 'outcomeIndex must be 0 or 1',
  }),
  price: decimal,
  confidence: decimal,
  dryRun: z.boolean(),
  executed: z.boolean(),
  executedAt: z.date().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
});

const IngestionCursor = z.object({
  key: z.string(),
  cursor: z.string(),
  updatedAt: z.date(),
});

export type Market = z.infer<typeof Market>;
export type Trade = z.infer<typeof Trade>;
export type Position = z.infer<typeof Position>;
export type TraderStats = z.infer<typeof TraderStats>;
export type MarketPrice = z.infer<typeof MarketPrice>;
export type Watchlist = z.infer<typeof Watchlist>;
export type Signal = z.infer<typeof Signal>;
export type IngestionCursor = z.infer<typeof IngestionCursor>;

export {
  Market,
  Trade,
  Position,
  TraderStats,
  MarketPrice,
  Watchlist,
  Signal,
  IngestionCursor,
};

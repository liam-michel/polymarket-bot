import { Decimal } from 'decimal.js';
import z from 'zod';
import * as generated from '~/__generated__/database.js';

const MarketStatus = z.enum(generated.MarketStatus);
const TradeSide = z.enum(generated.TradeSide);
const SignalType = z.enum(generated.SignalType);

const decimal = z.string().transform((val) => new Decimal(val));

const Market = z.object({
  condition_id: z.string(),
  question: z.string(),
  category: z.string().nullable(),
  outcome_a: z.string(),
  outcome_b: z.string(),
  status: MarketStatus,
  outcome: z.number().int().nullable(),
  closes_at: z.date(),
  resolved_at: z.date().nullable(),
  volume_usd: decimal,
  created_at: z.date(),
  updated_at: z.date(),
});

const Trade = z.object({
  fill_id: z.string(),
  condition_id: z.string(),
  wallet: z.string(),
  side: TradeSide,
  outcome_index: z
    .number()
    .int()
    .refine((val) => val === 0 || val === 1, {
      message: 'outcome_index must be 0 or 1',
    }),
  price: decimal,
  size: decimal,
  usd_value: decimal,
  filled_at: z.date(),
  created_at: z.date(),
});

const Position = z.object({
  id: z.number().int(),
  wallet: z.string(),
  condition_id: z.string(),
  outcome_index: z
    .number()
    .int()
    .refine((val) => val === 0 || val === 1, {
      message: 'outcome_index must be 0 or 1',
    }),
  size: decimal,
  avg_entry: decimal,
  current_price: decimal,
  unrealised_pnl: decimal,
  updated_at: z.date(),
});

const TraderStats = z.object({
  wallet: z.string(),
  trade_count: z.number().int(),
  resolved_trades: z.number().int(),
  win_count: z.number().int(),
  win_rate: decimal,
  realised_pnl: decimal,
  roi: decimal,
  avg_edge: decimal,
  score: decimal,
  first_trade_at: z.date().nullable(),
  last_trade_at: z.date().nullable(),
  updated_at: z.date(),
});

const MarketPrice = z.object({
  id: z.string(),
  condition_id: z.string(),
  outcome_index: z.number().int(),
  price: decimal,
  captured_at: z.date(),
});

const Watchlist = z.object({
  wallet: z.string(),
  reason: z.string(),
  score: decimal,
  active: z.boolean(),
  added_at: z.date(),
  removed_at: z.date().nullable(),
});

const Signal = z.object({
  id: z.string(),
  wallet: z.string(),
  condition_id: z.string(),
  signal_type: SignalType,
  side: TradeSide,
  outcome_index: z
    .number()
    .int()
    .refine((val) => val === 0 || val === 1, {
      message: 'outcome_index must be 0 or 1',
    }),
  price: decimal,
  confidence: decimal,
  dry_run: z.boolean(),
  executed: z.boolean(),
  executed_at: z.date().nullable(),
  notes: z.string().nullable(),
  created_at: z.date(),
});

const IngestionCursor = z.object({
  key: z.string(),
  cursor: z.string(),
  updated_at: z.date(),
});

export type Market = z.infer<typeof Market>;
export type Trade = z.infer<typeof Trade>;
export type Position = z.infer<typeof Position>;
export type TraderStats = z.infer<typeof TraderStats>;
export type MarketPrice = z.infer<typeof MarketPrice>;
export type Watchlist = z.infer<typeof Watchlist>;
export type Signal = z.infer<typeof Signal>;
export type IngestionCursor = z.infer<typeof IngestionCursor>;

export const Models = {
  Market,
  Trade,
  Position,
  TraderStats,
  MarketPrice,
  Watchlist,
  Signal,
  IngestionCursor,
};

export type Models = {
  [K in keyof typeof Models]: (typeof Models)[K] extends z.ZodSchema
    ? z.infer<(typeof Models)[K]>
    : (typeof Models)[K];
};
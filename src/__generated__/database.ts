import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export const MarketStatus = {
    ACTIVE: "ACTIVE",
    CLOSED: "CLOSED",
    RESOLVED: "RESOLVED"
} as const;
export type MarketStatus = (typeof MarketStatus)[keyof typeof MarketStatus];
export const TradeSide = {
    BUY: "BUY",
    SELL: "SELL"
} as const;
export type TradeSide = (typeof TradeSide)[keyof typeof TradeSide];
export const SignalType = {
    COPY_TRADE: "COPY_TRADE",
    PATTERN_MATCH: "PATTERN_MATCH",
    MANUAL: "MANUAL"
} as const;
export type SignalType = (typeof SignalType)[keyof typeof SignalType];
export type IngestionCursor = {
    key: string;
    cursor: string;
    updated_at: Timestamp;
};
export type Market = {
    condition_id: string;
    question: string;
    category: string | null;
    outcome_a: string;
    outcome_b: string;
    status: Generated<MarketStatus>;
    outcome: number | null;
    closes_at: Timestamp;
    resolved_at: Timestamp | null;
    volume_usd: Generated<string>;
    created_at: Generated<Timestamp>;
    updated_at: Timestamp;
};
export type MarketPrice = {
    id: Generated<string>;
    condition_id: string;
    outcome_index: number;
    price: string;
    captured_at: Timestamp;
};
export type Position = {
    id: Generated<number>;
    wallet: string;
    condition_id: string;
    outcome_index: number;
    size: string;
    avg_entry: string;
    current_price: string;
    unrealised_pnl: string;
    updated_at: Timestamp;
};
export type Signal = {
    id: Generated<string>;
    wallet: string;
    condition_id: string;
    signal_type: SignalType;
    side: TradeSide;
    outcome_index: number;
    price: string;
    confidence: string;
    dry_run: Generated<boolean>;
    executed: Generated<boolean>;
    executed_at: Timestamp | null;
    notes: string | null;
    created_at: Generated<Timestamp>;
};
export type Trade = {
    fill_id: string;
    condition_id: string;
    wallet: string;
    side: TradeSide;
    outcome_index: number;
    price: string;
    size: string;
    usd_value: string;
    filled_at: Timestamp;
    created_at: Generated<Timestamp>;
};
export type TraderStats = {
    wallet: string;
    trade_count: Generated<number>;
    resolved_trades: Generated<number>;
    win_count: Generated<number>;
    win_rate: Generated<string>;
    realised_pnl: Generated<string>;
    roi: Generated<string>;
    avg_edge: Generated<string>;
    score: Generated<string>;
    first_trade_at: Timestamp | null;
    last_trade_at: Timestamp | null;
    updated_at: Timestamp;
};
export type Watchlist = {
    wallet: string;
    reason: string;
    score: string;
    active: Generated<boolean>;
    added_at: Generated<Timestamp>;
    removed_at: Timestamp | null;
};
export type DB = {
    ingestion_cursors: IngestionCursor;
    market_prices: MarketPrice;
    markets: Market;
    positions: Position;
    signals: Signal;
    trader_stats: TraderStats;
    trades: Trade;
    watchlist: Watchlist;
};

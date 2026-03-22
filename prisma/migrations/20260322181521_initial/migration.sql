-- CreateEnum
CREATE TYPE "market_status" AS ENUM ('ACTIVE', 'CLOSED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "trade_side" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "signal_type" AS ENUM ('COPY_TRADE', 'PATTERN_MATCH', 'MANUAL');

-- CreateTable
CREATE TABLE "markets" (
    "condition_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "category" TEXT,
    "outcome_a" TEXT NOT NULL,
    "outcome_b" TEXT NOT NULL,
    "status" "market_status" NOT NULL DEFAULT 'ACTIVE',
    "outcome" INTEGER,
    "closes_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "volume_usd" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "markets_pkey" PRIMARY KEY ("condition_id")
);

-- CreateTable
CREATE TABLE "trades" (
    "fill_id" TEXT NOT NULL,
    "condition_id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "side" "trade_side" NOT NULL,
    "outcome_index" INTEGER NOT NULL,
    "price" DECIMAL(10,6) NOT NULL,
    "size" DECIMAL(18,6) NOT NULL,
    "usd_value" DECIMAL(18,2) NOT NULL,
    "filled_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("fill_id")
);

-- CreateTable
CREATE TABLE "positions" (
    "id" SERIAL NOT NULL,
    "wallet" TEXT NOT NULL,
    "condition_id" TEXT NOT NULL,
    "outcome_index" INTEGER NOT NULL,
    "size" DECIMAL(18,6) NOT NULL,
    "avg_entry" DECIMAL(10,6) NOT NULL,
    "current_price" DECIMAL(10,6) NOT NULL,
    "unrealised_pnl" DECIMAL(18,2) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trader_stats" (
    "wallet" TEXT NOT NULL,
    "trade_count" INTEGER NOT NULL DEFAULT 0,
    "resolved_trades" INTEGER NOT NULL DEFAULT 0,
    "win_count" INTEGER NOT NULL DEFAULT 0,
    "win_rate" DECIMAL(6,4) NOT NULL DEFAULT 0,
    "realised_pnl" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "roi" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "avg_edge" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "score" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "first_trade_at" TIMESTAMP(3),
    "last_trade_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trader_stats_pkey" PRIMARY KEY ("wallet")
);

-- CreateTable
CREATE TABLE "market_prices" (
    "id" BIGSERIAL NOT NULL,
    "condition_id" TEXT NOT NULL,
    "outcome_index" INTEGER NOT NULL,
    "price" DECIMAL(10,6) NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist" (
    "wallet" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "score" DECIMAL(10,4) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP(3),

    CONSTRAINT "watchlist_pkey" PRIMARY KEY ("wallet")
);

-- CreateTable
CREATE TABLE "signals" (
    "id" BIGSERIAL NOT NULL,
    "wallet" TEXT NOT NULL,
    "condition_id" TEXT NOT NULL,
    "signal_type" "signal_type" NOT NULL,
    "side" "trade_side" NOT NULL,
    "outcome_index" INTEGER NOT NULL,
    "price" DECIMAL(10,6) NOT NULL,
    "confidence" DECIMAL(6,4) NOT NULL,
    "dry_run" BOOLEAN NOT NULL DEFAULT true,
    "executed" BOOLEAN NOT NULL DEFAULT false,
    "executed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_cursors" (
    "key" TEXT NOT NULL,
    "cursor" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingestion_cursors_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "trades_wallet_idx" ON "trades"("wallet");

-- CreateIndex
CREATE INDEX "trades_condition_id_idx" ON "trades"("condition_id");

-- CreateIndex
CREATE INDEX "trades_filled_at_idx" ON "trades"("filled_at");

-- CreateIndex
CREATE INDEX "trades_wallet_filled_at_idx" ON "trades"("wallet", "filled_at");

-- CreateIndex
CREATE INDEX "positions_wallet_idx" ON "positions"("wallet");

-- CreateIndex
CREATE UNIQUE INDEX "positions_wallet_condition_id_outcome_index_key" ON "positions"("wallet", "condition_id", "outcome_index");

-- CreateIndex
CREATE INDEX "market_prices_condition_id_outcome_index_captured_at_idx" ON "market_prices"("condition_id", "outcome_index", "captured_at");

-- CreateIndex
CREATE INDEX "signals_wallet_idx" ON "signals"("wallet");

-- CreateIndex
CREATE INDEX "signals_created_at_idx" ON "signals"("created_at");

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_condition_id_fkey" FOREIGN KEY ("condition_id") REFERENCES "markets"("condition_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_condition_id_fkey" FOREIGN KEY ("condition_id") REFERENCES "markets"("condition_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_prices" ADD CONSTRAINT "market_prices_condition_id_fkey" FOREIGN KEY ("condition_id") REFERENCES "markets"("condition_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signals" ADD CONSTRAINT "signals_condition_id_fkey" FOREIGN KEY ("condition_id") REFERENCES "markets"("condition_id") ON DELETE RESTRICT ON UPDATE CASCADE;

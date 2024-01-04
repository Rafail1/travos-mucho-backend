-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "ActionTypes" AS ENUM ('SetBorders', 'SetOrderBook');

-- CreateTable
CREATE TABLE "OrderBookSnapshot" (
    "lastUpdateId" BIGINT NOT NULL,
    "symbol" TEXT NOT NULL,
    "E" TIMESTAMP(3) NOT NULL,
    "T" TIMESTAMP(3) NOT NULL,
    "bids" JSONB[],
    "asks" JSONB[]
);

-- CreateTable
CREATE TABLE "DepthUpdates" (
    "E" TIMESTAMP(3) NOT NULL,
    "s" TEXT NOT NULL,
    "b" JSONB NOT NULL,
    "a" JSONB NOT NULL,
    "u" BIGINT NOT NULL,
    "pu" BIGINT NOT NULL
);

-- CreateTable
CREATE TABLE "AggTrades" (
    "a" BIGINT NOT NULL,
    "E" TIMESTAMP(3) NOT NULL,
    "s" TEXT NOT NULL,
    "p" TEXT NOT NULL,
    "q" TEXT NOT NULL,
    "m" BOOLEAN NOT NULL
);

-- CreateTable
CREATE TABLE "Borders" (
    "s" TEXT NOT NULL,
    "E" TIMESTAMP(3) NOT NULL,
    "min" DOUBLE PRECISION NOT NULL,
    "max" DOUBLE PRECISION NOT NULL
);

-- CreateTable
CREATE TABLE "SharedAction" (
    "symbol" TEXT NOT NULL,
    "inProgress" BOOLEAN NOT NULL,
    "E" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderBookSnapshot_symbol_E_key" ON "OrderBookSnapshot"("symbol", "E");

-- CreateIndex
CREATE INDEX "DepthUpdates_s_E_idx" ON "DepthUpdates"("s", "E");

-- CreateIndex
CREATE UNIQUE INDEX "DepthUpdates_s_E_key" ON "DepthUpdates"("s", "E");

-- CreateIndex
CREATE INDEX "AggTrades_s_E_idx" ON "AggTrades"("s", "E");

-- CreateIndex
CREATE UNIQUE INDEX "AggTrades_s_a_key" ON "AggTrades"("s", "a");

-- CreateIndex
CREATE UNIQUE INDEX "Borders_s_key" ON "Borders"("s");

-- CreateIndex
CREATE UNIQUE INDEX "SharedAction_symbol_key" ON "SharedAction"("symbol");

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateTable
CREATE TABLE "OrderBookSnapshot" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "lastUpdateId" BIGINT NOT NULL,
    "symbol" TEXT NOT NULL,
    "E" TIMESTAMP(3) NOT NULL,
    "T" TIMESTAMP(3) NOT NULL,
    "bids" JSONB[],
    "asks" JSONB[],

    CONSTRAINT "OrderBookSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepthUpdates" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "u" BIGINT NOT NULL,
    "E" TIMESTAMP(3) NOT NULL,
    "T" TIMESTAMP(3) NOT NULL,
    "s" TEXT NOT NULL,
    "U" BIGINT NOT NULL,
    "pu" BIGINT NOT NULL,
    "b" JSONB NOT NULL,
    "a" JSONB NOT NULL,

    CONSTRAINT "DepthUpdates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AggTrades" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "a" BIGINT NOT NULL,
    "E" TIMESTAMP(3) NOT NULL,
    "s" TEXT NOT NULL,
    "p" TEXT NOT NULL,
    "q" TEXT NOT NULL,
    "f" BIGINT NOT NULL,
    "l" BIGINT NOT NULL,
    "T" TIMESTAMP(3) NOT NULL,
    "m" BOOLEAN NOT NULL,

    CONSTRAINT "AggTrades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DepthUpdates_s_E_idx" ON "DepthUpdates"("s", "E");

-- CreateIndex
CREATE INDEX "AggTrades_s_E_m_idx" ON "AggTrades"("s", "E", "m");

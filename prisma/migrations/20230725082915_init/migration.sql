-- CreateTable
CREATE TABLE "OrderBookSnapshot" (
    "lastUpdateId" INTEGER NOT NULL,
    "E" TIMESTAMP(3) NOT NULL,
    "T" TIMESTAMP(3) NOT NULL,
    "bids" JSONB NOT NULL,
    "asks" JSONB NOT NULL,

    CONSTRAINT "OrderBookSnapshot_pkey" PRIMARY KEY ("lastUpdateId")
);

-- CreateTable
CREATE TABLE "DepthUpdates" (
    "u" INTEGER NOT NULL,
    "E" TIMESTAMP(3) NOT NULL,
    "T" TIMESTAMP(3) NOT NULL,
    "s" TEXT NOT NULL,
    "U" INTEGER NOT NULL,
    "pu" INTEGER NOT NULL,
    "b" JSONB NOT NULL,
    "a" JSONB NOT NULL,

    CONSTRAINT "DepthUpdates_pkey" PRIMARY KEY ("u")
);

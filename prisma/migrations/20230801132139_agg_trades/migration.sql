-- CreateTable
CREATE TABLE "AggTrades" (
    "a" INTEGER NOT NULL,
    "E" TIMESTAMP(3) NOT NULL,
    "s" TEXT NOT NULL,
    "p" TEXT NOT NULL,
    "q" TEXT NOT NULL,
    "f" INTEGER NOT NULL,
    "l" INTEGER NOT NULL,
    "T" TIMESTAMP(3) NOT NULL,
    "m" BOOLEAN NOT NULL,

    CONSTRAINT "AggTrades_pkey" PRIMARY KEY ("a")
);

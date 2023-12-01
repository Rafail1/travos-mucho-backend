/*
  Warnings:

  - A unique constraint covering the columns `[s,a]` on the table `AggTrades` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "AggTrades_s_E_m_key";

-- CreateIndex
CREATE INDEX "AggTrades_s_E_idx" ON "AggTrades"("s", "E");

-- CreateIndex
CREATE UNIQUE INDEX "AggTrades_s_a_key" ON "AggTrades"("s", "a");

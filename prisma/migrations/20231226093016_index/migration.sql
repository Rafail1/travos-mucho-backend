/*
  Warnings:

  - The primary key for the `OrderBookSnapshot` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `OrderBookSnapshot` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[symbol,E]` on the table `OrderBookSnapshot` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "OrderBookSnapshot" DROP CONSTRAINT "OrderBookSnapshot_pkey",
DROP COLUMN "id";

-- CreateIndex
CREATE INDEX "DepthUpdates_s_E_idx" ON "DepthUpdates"("s", "E");

-- CreateIndex
CREATE UNIQUE INDEX "OrderBookSnapshot_symbol_E_key" ON "OrderBookSnapshot"("symbol", "E");

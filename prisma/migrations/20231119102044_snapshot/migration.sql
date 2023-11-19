/*
  Warnings:

  - You are about to drop the column `T` on the `AggTrades` table. All the data in the column will be lost.
  - You are about to drop the column `f` on the `AggTrades` table. All the data in the column will be lost.
  - You are about to drop the column `l` on the `AggTrades` table. All the data in the column will be lost.
  - The primary key for the `DepthUpdates` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `DepthUpdates` table. All the data in the column will be lost.
  - You are about to drop the `OrderBookSnapshot` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[s,time,price,m]` on the table `DepthUpdates` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `s` on the `AggTrades` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `p` on the `AggTrades` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `q` on the `AggTrades` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "AggTrades" DROP COLUMN "T",
DROP COLUMN "f",
DROP COLUMN "l",
DROP COLUMN "s",
ADD COLUMN     "s" "Symbol" NOT NULL,
DROP COLUMN "p",
ADD COLUMN     "p" DOUBLE PRECISION NOT NULL,
DROP COLUMN "q",
ADD COLUMN     "q" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "DepthUpdates" DROP CONSTRAINT "DepthUpdates_pkey",
DROP COLUMN "id",
ADD COLUMN     "snapshot" BOOLEAN DEFAULT false;

-- DropTable
DROP TABLE "OrderBookSnapshot";

-- CreateIndex
CREATE INDEX "AggTrades_s_E_m_idx" ON "AggTrades"("s", "E", "m");

-- CreateIndex
CREATE INDEX "DepthUpdates_s_idx" ON "DepthUpdates"("s");

-- CreateIndex
CREATE INDEX "DepthUpdates_time_idx" ON "DepthUpdates"("time");

-- CreateIndex
CREATE INDEX "DepthUpdates_price_idx" ON "DepthUpdates"("price");

-- CreateIndex
CREATE UNIQUE INDEX "DepthUpdates_s_time_price_m_key" ON "DepthUpdates"("s", "time", "price", "m");

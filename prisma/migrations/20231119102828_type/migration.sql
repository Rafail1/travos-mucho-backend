/*
  Warnings:

  - You are about to drop the column `m` on the `DepthUpdates` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[s,time,price,type]` on the table `DepthUpdates` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `type` to the `DepthUpdates` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TradeType" AS ENUM ('ask', 'bid');

-- DropIndex
DROP INDEX "DepthUpdates_s_time_price_m_key";

-- AlterTable
ALTER TABLE "DepthUpdates" DROP COLUMN "m",
ADD COLUMN     "type" "TradeType" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "DepthUpdates_s_time_price_type_key" ON "DepthUpdates"("s", "time", "price", "type");

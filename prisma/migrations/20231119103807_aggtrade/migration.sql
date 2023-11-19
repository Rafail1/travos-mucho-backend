/*
  Warnings:

  - The primary key for the `AggTrades` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `AggTrades` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[a,s]` on the table `AggTrades` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "AggTrades" DROP CONSTRAINT "AggTrades_pkey",
DROP COLUMN "id";

-- CreateIndex
CREATE UNIQUE INDEX "AggTrades_a_s_key" ON "AggTrades"("a", "s");

/*
  Warnings:

  - The primary key for the `AggTrades` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `f` on the `AggTrades` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `AggTrades` table. All the data in the column will be lost.
  - You are about to drop the column `l` on the `AggTrades` table. All the data in the column will be lost.
  - The primary key for the `Borders` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Borders` table. All the data in the column will be lost.
  - The primary key for the `DepthUpdates` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `T` on the `DepthUpdates` table. All the data in the column will be lost.
  - You are about to drop the column `U` on the `DepthUpdates` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `DepthUpdates` table. All the data in the column will be lost.
  - You are about to drop the column `pu` on the `DepthUpdates` table. All the data in the column will be lost.
  - You are about to drop the column `u` on the `DepthUpdates` table. All the data in the column will be lost.
  - You are about to drop the column `additionalInfo` on the `SharedAction` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[s,E,m]` on the table `AggTrades` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[s]` on the table `Borders` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[s,E]` on the table `DepthUpdates` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `reason` to the `SharedAction` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "AggTrades_s_E_m_idx";

-- DropIndex
DROP INDEX "DepthUpdates_s_E_idx";

-- AlterTable
ALTER TABLE "AggTrades" DROP CONSTRAINT "AggTrades_pkey",
DROP COLUMN "f",
DROP COLUMN "id",
DROP COLUMN "l";

-- AlterTable
ALTER TABLE "Borders" DROP CONSTRAINT "Borders_pkey",
DROP COLUMN "id";

-- AlterTable
ALTER TABLE "DepthUpdates" DROP CONSTRAINT "DepthUpdates_pkey",
DROP COLUMN "T",
DROP COLUMN "U",
DROP COLUMN "id",
DROP COLUMN "pu",
DROP COLUMN "u";

-- AlterTable
ALTER TABLE "SharedAction" DROP COLUMN "additionalInfo",
ADD COLUMN     "reason" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "AggTrades_s_E_m_key" ON "AggTrades"("s", "E", "m");

-- CreateIndex
CREATE UNIQUE INDEX "Borders_s_key" ON "Borders"("s");

-- CreateIndex
CREATE UNIQUE INDEX "DepthUpdates_s_E_key" ON "DepthUpdates"("s", "E");

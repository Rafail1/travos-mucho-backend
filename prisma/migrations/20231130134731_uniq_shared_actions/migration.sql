/*
  Warnings:

  - The primary key for the `SharedAction` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `SharedAction` table. All the data in the column will be lost.
  - You are about to drop the column `resolved` on the `SharedAction` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `SharedAction` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[symbol]` on the table `SharedAction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "SharedAction" DROP CONSTRAINT "SharedAction_pkey",
DROP COLUMN "id",
DROP COLUMN "resolved",
DROP COLUMN "type";

-- CreateIndex
CREATE UNIQUE INDEX "SharedAction_symbol_key" ON "SharedAction"("symbol");

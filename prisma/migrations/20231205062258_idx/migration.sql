/*
  Warnings:

  - The primary key for the `PartialSnapshot` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `PartialSnapshot` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[s,E]` on the table `PartialSnapshot` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "PartialSnapshot_s_E_idx";

-- AlterTable
ALTER TABLE "PartialSnapshot" DROP CONSTRAINT "PartialSnapshot_pkey",
DROP COLUMN "id";

-- CreateIndex
CREATE UNIQUE INDEX "PartialSnapshot_s_E_key" ON "PartialSnapshot"("s", "E");

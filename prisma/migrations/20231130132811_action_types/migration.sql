/*
  Warnings:

  - Added the required column `type` to the `SharedAction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ActionTypes" AS ENUM ('SetBorders', 'SetOrderBook');

-- AlterTable
ALTER TABLE "SharedAction" ADD COLUMN     "type" "ActionTypes" NOT NULL,
ALTER COLUMN "additionalInfo" DROP NOT NULL;

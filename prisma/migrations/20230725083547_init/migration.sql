/*
  Warnings:

  - Added the required column `symbol` to the `OrderBookSnapshot` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OrderBookSnapshot" ADD COLUMN     "symbol" TEXT NOT NULL;

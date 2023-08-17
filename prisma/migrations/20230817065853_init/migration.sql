/*
  Warnings:

  - The `bids` column on the `OrderBookSnapshot` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `asks` column on the `OrderBookSnapshot` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "OrderBookSnapshot" DROP COLUMN "bids",
ADD COLUMN     "bids" JSONB[],
DROP COLUMN "asks",
ADD COLUMN     "asks" JSONB[];

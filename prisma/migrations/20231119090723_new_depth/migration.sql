/*
  Warnings:

  - The primary key for the `AggTrades` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `AggTrades` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `DepthUpdates` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `E` on the `DepthUpdates` table. All the data in the column will be lost.
  - You are about to drop the column `T` on the `DepthUpdates` table. All the data in the column will be lost.
  - You are about to drop the column `U` on the `DepthUpdates` table. All the data in the column will be lost.
  - You are about to drop the column `a` on the `DepthUpdates` table. All the data in the column will be lost.
  - You are about to drop the column `b` on the `DepthUpdates` table. All the data in the column will be lost.
  - You are about to drop the column `pu` on the `DepthUpdates` table. All the data in the column will be lost.
  - You are about to drop the column `u` on the `DepthUpdates` table. All the data in the column will be lost.
  - The `id` column on the `DepthUpdates` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `OrderBookSnapshot` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `OrderBookSnapshot` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `m` to the `DepthUpdates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price` to the `DepthUpdates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantity` to the `DepthUpdates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `time` to the `DepthUpdates` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `s` on the `DepthUpdates` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Symbol" AS ENUM ('S_BTCUSDT', 'S_ETHUSDT', 'S_BCHUSDT', 'S_XRPUSDT', 'S_EOSUSDT', 'S_LTCUSDT', 'S_TRXUSDT', 'S_ETCUSDT', 'S_LINKUSDT', 'S_XLMUSDT', 'S_ADAUSDT', 'S_XMRUSDT', 'S_DASHUSDT', 'S_ZECUSDT', 'S_XTZUSDT', 'S_BNBUSDT', 'S_ATOMUSDT', 'S_ONTUSDT', 'S_IOTAUSDT', 'S_BATUSDT', 'S_VETUSDT', 'S_NEOUSDT', 'S_QTUMUSDT', 'S_IOSTUSDT', 'S_THETAUSDT', 'S_ALGOUSDT', 'S_ZILUSDT', 'S_KNCUSDT', 'S_ZRXUSDT', 'S_COMPUSDT', 'S_OMGUSDT', 'S_DOGEUSDT', 'S_SXPUSDT', 'S_KAVAUSDT', 'S_BANDUSDT', 'S_RLCUSDT', 'S_WAVESUSDT', 'S_MKRUSDT', 'S_SNXUSDT', 'S_DOTUSDT', 'S_DEFIUSDT', 'S_YFIUSDT', 'S_BALUSDT', 'S_CRVUSDT', 'S_TRBUSDT', 'S_RUNEUSDT', 'S_SUSHIUSDT', 'S_EGLDUSDT', 'S_SOLUSDT', 'S_ICXUSDT', 'S_STORJUSDT', 'S_BLZUSDT', 'S_UNIUSDT', 'S_AVAXUSDT', 'S_FTMUSDT', 'S_ENJUSDT', 'S_FLMUSDT', 'S_RENUSDT', 'S_KSMUSDT', 'S_NEARUSDT', 'S_AAVEUSDT', 'S_FILUSDT', 'S_RSRUSDT', 'S_LRCUSDT', 'S_MATICUSDT', 'S_OCEANUSDT', 'S_BELUSDT', 'S_CTKUSDT', 'S_AXSUSDT', 'S_ALPHAUSDT', 'S_ZENUSDT', 'S_SKLUSDT', 'S_GRTUSDT', 'S_1INCHUSDT', 'S_CHZUSDT', 'S_SANDUSDT', 'S_ANKRUSDT', 'S_LITUSDT', 'S_UNFIUSDT', 'S_REEFUSDT', 'S_RVNUSDT', 'S_SFPUSDT', 'S_XEMUSDT', 'S_COTIUSDT', 'S_CHRUSDT', 'S_MANAUSDT', 'S_ALICEUSDT', 'S_HBARUSDT', 'S_ONEUSDT', 'S_LINAUSDT', 'S_STMXUSDT', 'S_DENTUSDT', 'S_CELRUSDT', 'S_HOTUSDT', 'S_MTLUSDT', 'S_OGNUSDT', 'S_NKNUSDT', 'S_DGBUSDT', 'S_1000SHIBUSDT', 'S_BAKEUSDT', 'S_GTCUSDT', 'S_BTCDOMUSDT', 'S_IOTXUSDT', 'S_AUDIOUSDT', 'S_C98USDT', 'S_MASKUSDT', 'S_ATAUSDT', 'S_DYDXUSDT', 'S_1000XECUSDT', 'S_GALAUSDT', 'S_CELOUSDT', 'S_ARUSDT', 'S_KLAYUSDT', 'S_ARPAUSDT', 'S_CTSIUSDT', 'S_LPTUSDT', 'S_ENSUSDT', 'S_PEOPLEUSDT', 'S_ANTUSDT', 'S_ROSEUSDT', 'S_DUSKUSDT', 'S_FLOWUSDT', 'S_IMXUSDT', 'S_API3USDT', 'S_GMTUSDT', 'S_APEUSDT', 'S_WOOUSDT', 'S_JASMYUSDT', 'S_DARUSDT', 'S_GALUSDT', 'S_OPUSDT', 'S_INJUSDT', 'S_STGUSDT', 'S_FOOTBALLUSDT', 'S_SPELLUSDT', 'S_1000LUNCUSDT', 'S_LUNA2USDT', 'S_LDOUSDT', 'S_CVXUSDT', 'S_ICPUSDT', 'S_APTUSDT', 'S_QNTUSDT', 'S_BLUEBIRDUSDT', 'S_FETUSDT', 'S_FXSUSDT', 'S_HOOKUSDT', 'S_MAGICUSDT', 'S_TUSDT', 'S_RNDRUSDT', 'S_HIGHUSDT', 'S_MINAUSDT', 'S_ASTRUSDT', 'S_AGIXUSDT', 'S_PHBUSDT', 'S_GMXUSDT', 'S_CFXUSDT', 'S_STXUSDT', 'S_BNXUSDT', 'S_ACHUSDT', 'S_SSVUSDT', 'S_CKBUSDT', 'S_PERPUSDT', 'S_TRUUSDT', 'S_LQTYUSDT', 'S_USDCUSDT', 'S_IDUSDT', 'S_ARBUSDT', 'S_JOEUSDT', 'S_TLMUSDT', 'S_AMBUSDT', 'S_LEVERUSDT', 'S_RDNTUSDT', 'S_HFTUSDT', 'S_XVSUSDT', 'S_BLURUSDT', 'S_EDUUSDT', 'S_IDEXUSDT', 'S_SUIUSDT', 'S_1000PEPEUSDT', 'S_1000FLOKIUSDT', 'S_UMAUSDT', 'S_RADUSDT', 'S_KEYUSDT', 'S_COMBOUSDT', 'S_NMRUSDT', 'S_MAVUSDT', 'S_MDTUSDT', 'S_XVGUSDT', 'S_WLDUSDT', 'S_PENDLEUSDT', 'S_ARKMUSDT', 'S_AGLDUSDT', 'S_YGGUSDT', 'S_DODOXUSDT', 'S_BNTUSDT', 'S_OXTUSDT', 'S_SEIUSDT', 'S_CYBERUSDT', 'S_HIFIUSDT', 'S_ARKUSDT', 'S_FRONTUSDT', 'S_GLMRUSDT', 'S_BICOUSDT', 'S_STRAXUSDT', 'S_LOOMUSDT', 'S_BIGTIMEUSDT', 'S_BONDUSDT', 'S_ORBSUSDT', 'S_STPTUSDT', 'S_WAXPUSDT', 'S_BSVUSDT', 'S_RIFUSDT', 'S_POLYXUSDT', 'S_GASUSDT', 'S_POWRUSDT', 'S_SLPUSDT', 'S_TIAUSDT', 'S_SNTUSDT', 'S_CAKEUSDT', 'S_MEMEUSDT', 'S_TWTUSDT', 'S_TOKENUSDT', 'S_ORDIUSDT', 'S_STEEMUSDT', 'S_BADGERUSDT', 'S_ILVUSDT', 'S_NTRNUSDT', 'S_MBLUSDT', 'S_KASUSDT', 'S_BEAMXUSDT');

-- DropIndex
DROP INDEX "DepthUpdates_s_E_idx";

-- AlterTable
ALTER TABLE "AggTrades" DROP CONSTRAINT "AggTrades_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "AggTrades_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "DepthUpdates" DROP CONSTRAINT "DepthUpdates_pkey",
DROP COLUMN "E",
DROP COLUMN "T",
DROP COLUMN "U",
DROP COLUMN "a",
DROP COLUMN "b",
DROP COLUMN "pu",
DROP COLUMN "u",
ADD COLUMN     "m" BOOLEAN NOT NULL,
ADD COLUMN     "price" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "quantity" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "time" TIMESTAMP(3) NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "s",
ADD COLUMN     "s" "Symbol" NOT NULL,
ADD CONSTRAINT "DepthUpdates_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "OrderBookSnapshot" DROP CONSTRAINT "OrderBookSnapshot_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "OrderBookSnapshot_pkey" PRIMARY KEY ("id");

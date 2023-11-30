-- CreateTable
CREATE TABLE "SharedAction" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "resolved" BOOLEAN NOT NULL,
    "inProgress" BOOLEAN NOT NULL,
    "symbol" TEXT NOT NULL,
    "additionalInfo" JSONB NOT NULL,
    "E" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedAction_pkey" PRIMARY KEY ("id")
);

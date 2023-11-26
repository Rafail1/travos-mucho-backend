-- CreateTable
CREATE TABLE "PartialSnapshot" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "s" TEXT NOT NULL,
    "E" TIMESTAMP(3) NOT NULL,
    "bids" JSONB[],
    "asks" JSONB[],

    CONSTRAINT "PartialSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartialSnapshot_s_E_idx" ON "PartialSnapshot"("s", "E");

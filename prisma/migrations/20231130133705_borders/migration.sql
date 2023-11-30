-- CreateTable
CREATE TABLE "Borders" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "s" TEXT NOT NULL,
    "E" TIMESTAMP(3) NOT NULL,
    "min" DOUBLE PRECISION NOT NULL,
    "max" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Borders_pkey" PRIMARY KEY ("id")
);

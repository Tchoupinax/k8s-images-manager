-- CreateTable
CREATE TABLE "stats_snapshots" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "node_count" INTEGER NOT NULL,
    "image_count" INTEGER NOT NULL,
    "unique_image_count" INTEGER NOT NULL,
    "total_bytes" BIGINT NOT NULL,

    CONSTRAINT "stats_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stats_snapshots_created_at_idx" ON "stats_snapshots"("created_at");

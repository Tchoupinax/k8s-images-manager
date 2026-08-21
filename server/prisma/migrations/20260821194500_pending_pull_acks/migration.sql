-- CreateTable
CREATE TABLE "pending_pull_acks" (
    "id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "repository" TEXT NOT NULL,
    "tag" TEXT NOT NULL,

    CONSTRAINT "pending_pull_acks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_pull_acks_node_id_repository_tag_key" ON "pending_pull_acks"("node_id", "repository", "tag");

-- AddForeignKey
ALTER TABLE "pending_pull_acks" ADD CONSTRAINT "pending_pull_acks_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

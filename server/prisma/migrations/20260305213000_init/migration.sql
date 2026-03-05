-- CreateTable
CREATE TABLE "nodes" (
    "id" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "images" (
    "id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "repository" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "digest" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "date" TEXT NOT NULL,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_deletions" (
    "id" TEXT NOT NULL,
    "repository" TEXT NOT NULL,
    "tag" TEXT NOT NULL,

    CONSTRAINT "pending_deletions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nodes_hostname_key" ON "nodes"("hostname");

-- CreateIndex
CREATE UNIQUE INDEX "pending_deletions_repository_tag_key" ON "pending_deletions"("repository", "tag");

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

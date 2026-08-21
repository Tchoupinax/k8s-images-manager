-- CreateTable
CREATE TABLE "pending_pulls" (
    "id" TEXT NOT NULL,
    "repository" TEXT NOT NULL,
    "tag" TEXT NOT NULL,

    CONSTRAINT "pending_pulls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_pulls_repository_tag_key" ON "pending_pulls"("repository", "tag");

-- Project (folder gom chat kiểu ChatGPT/Claude Projects) + ProjectThread
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "color" TEXT,
    "links" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Project_orgId_createdAt_idx" ON "Project"("orgId", "createdAt");

CREATE TABLE "ProjectThread" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectThread_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProjectThread_projectId_threadId_key" ON "ProjectThread"("projectId", "threadId");
CREATE INDEX "ProjectThread_projectId_createdAt_idx" ON "ProjectThread"("projectId", "createdAt");
ALTER TABLE "ProjectThread" ADD CONSTRAINT "ProjectThread_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

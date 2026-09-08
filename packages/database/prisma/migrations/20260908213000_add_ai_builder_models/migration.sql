-- CreateTable
CREATE TABLE "AiProject" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiSession" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "userId" UUID,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPrompt" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelUsage" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "projectId" UUID,
    "provider" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiProject_tenantId_id_key" ON "AiProject"("tenantId", "id");

-- CreateIndex
CREATE INDEX "AiProject_tenantId_idx" ON "AiProject"("tenantId");

-- CreateIndex
CREATE INDEX "AiProject_tenantId_status_idx" ON "AiProject"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AiSession_tenantId_id_key" ON "AiSession"("tenantId", "id");

-- CreateIndex
CREATE INDEX "AiSession_tenantId_idx" ON "AiSession"("tenantId");

-- CreateIndex
CREATE INDEX "AiSession_tenantId_projectId_idx" ON "AiSession"("tenantId", "projectId");

-- CreateIndex
CREATE INDEX "AiSession_userId_idx" ON "AiSession"("userId");

-- CreateIndex
CREATE INDEX "AiPrompt_tenantId_idx" ON "AiPrompt"("tenantId");

-- CreateIndex
CREATE INDEX "AiPrompt_tenantId_sessionId_idx" ON "AiPrompt"("tenantId", "sessionId");

-- CreateIndex
CREATE INDEX "AiPrompt_tenantId_projectId_idx" ON "AiPrompt"("tenantId", "projectId");

-- CreateIndex
CREATE INDEX "ModelUsage_tenantId_idx" ON "ModelUsage"("tenantId");

-- CreateIndex
CREATE INDEX "ModelUsage_tenantId_projectId_idx" ON "ModelUsage"("tenantId", "projectId");

-- CreateIndex
CREATE INDEX "ModelUsage_tenantId_provider_idx" ON "ModelUsage"("tenantId", "provider");

-- CreateIndex
CREATE INDEX "ModelUsage_tenantId_createdAt_idx" ON "ModelUsage"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiProject" ADD CONSTRAINT "AiProject_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSession" ADD CONSTRAINT "AiSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSession" ADD CONSTRAINT "AiSession_tenantId_projectId_fkey" FOREIGN KEY ("tenantId", "projectId") REFERENCES "AiProject"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSession" ADD CONSTRAINT "AiSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPrompt" ADD CONSTRAINT "AiPrompt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPrompt" ADD CONSTRAINT "AiPrompt_tenantId_projectId_fkey" FOREIGN KEY ("tenantId", "projectId") REFERENCES "AiProject"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPrompt" ADD CONSTRAINT "AiPrompt_tenantId_sessionId_fkey" FOREIGN KEY ("tenantId", "sessionId") REFERENCES "AiSession"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelUsage" ADD CONSTRAINT "ModelUsage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelUsage" ADD CONSTRAINT "ModelUsage_tenantId_projectId_fkey" FOREIGN KEY ("tenantId", "projectId") REFERENCES "AiProject"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

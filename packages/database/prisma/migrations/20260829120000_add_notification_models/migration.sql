-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "recipientId" TEXT,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_tenantId_id_key" ON "NotificationTemplate"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_tenantId_name_key" ON "NotificationTemplate"("tenantId", "name");

-- CreateIndex
CREATE INDEX "NotificationTemplate_tenantId_channel_idx" ON "NotificationTemplate"("tenantId", "channel");

-- CreateIndex
CREATE INDEX "NotificationTemplate_tenantId_isActive_idx" ON "NotificationTemplate"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationLog_tenantId_id_key" ON "NotificationLog"("tenantId", "id");

-- CreateIndex
CREATE INDEX "NotificationLog_tenantId_channel_idx" ON "NotificationLog"("tenantId", "channel");

-- CreateIndex
CREATE INDEX "NotificationLog_tenantId_status_idx" ON "NotificationLog"("tenantId", "status");

-- CreateIndex
CREATE INDEX "NotificationLog_tenantId_createdAt_idx" ON "NotificationLog"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "NotificationTemplate"
    ADD CONSTRAINT "NotificationTemplate_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog"
    ADD CONSTRAINT "NotificationLog_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

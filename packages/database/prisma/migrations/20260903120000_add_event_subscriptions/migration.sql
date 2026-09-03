-- CreateTable
CREATE TABLE "EventSubscription" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "notificationTemplateId" UUID,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "EventSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventSubscription_tenantId_eventType_notificationTemplateId_key" ON "EventSubscription"("tenantId", "eventType", "notificationTemplateId");

-- CreateIndex
CREATE INDEX "EventSubscription_tenantId_eventType_idx" ON "EventSubscription"("tenantId", "eventType");

-- CreateIndex
CREATE INDEX "EventSubscription_tenantId_isEnabled_idx" ON "EventSubscription"("tenantId", "isEnabled");

-- AddForeignKey
ALTER TABLE "EventSubscription" ADD CONSTRAINT "EventSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSubscription" ADD CONSTRAINT "EventSubscription_notificationTemplateId_fkey" FOREIGN KEY ("notificationTemplateId") REFERENCES "NotificationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

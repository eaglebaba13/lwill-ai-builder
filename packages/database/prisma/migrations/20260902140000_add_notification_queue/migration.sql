-- Notification Queue Foundation
-- Adds the notification_queue table for Phase 1 notification dispatcher foundation.
-- This table is scheduler-compatible and does not require Redis or external workers.
--
-- All columns are nullable/default-safe where appropriate to preserve existing data.
-- No destructive changes.

-- 1. Create notification_queue table
CREATE TABLE "NotificationQueue" (
  id UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "templateId" UUID NOT NULL,
  "recipientId" UUID,
  channel TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  variables JSONB,
  status TEXT NOT NULL DEFAULT 'PENDING',
  "scheduledAt" TIMESTAMP,
  attempts INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "lastAttemptAt" TIMESTAMP,
  "nextAttemptAt" TIMESTAMP,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),

  CONSTRAINT "NotificationQueue_pkey" PRIMARY KEY ("id")
);

-- 2. Foreign keys
ALTER TABLE "NotificationQueue"
  ADD CONSTRAINT "NotificationQueue_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;

ALTER TABLE "NotificationQueue"
  ADD CONSTRAINT "NotificationQueue_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "NotificationTemplate"("id") ON DELETE RESTRICT;

-- 3. Indexes for scheduler and dispatcher queries
CREATE INDEX "NotificationQueue_tenantId_status_idx"
  ON "NotificationQueue" ("tenantId", status);

CREATE INDEX "NotificationQueue_tenantId_channel_idx"
  ON "NotificationQueue" ("tenantId", channel);

CREATE INDEX "NotificationQueue_tenantId_scheduledAt_idx"
  ON "NotificationQueue" ("tenantId", "scheduledAt");

CREATE INDEX "NotificationQueue_tenantId_nextAttemptAt_idx"
  ON "NotificationQueue" ("tenantId", "nextAttemptAt");

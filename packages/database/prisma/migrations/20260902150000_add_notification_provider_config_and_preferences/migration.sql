-- Notification Provider Config & Preferences Foundation
-- Adds notification_provider_config and notification_preference tables.
-- No destructive changes. Preserves existing data.

-- 1. Create notification_provider_config table
CREATE TABLE "NotificationProviderConfig" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "tenantId" UUID NOT NULL,
  "channel" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "config" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- 2. Create notification_preference table
CREATE TABLE "NotificationPreference" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "tenantId" UUID NOT NULL,
  "userId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- 3. Foreign keys
ALTER TABLE "NotificationProviderConfig"
  ADD CONSTRAINT "NotificationProviderConfig_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;

ALTER TABLE "NotificationPreference"
  ADD CONSTRAINT "NotificationPreference_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;

-- 4. Indexes
CREATE UNIQUE INDEX "NotificationProviderConfig_tenantId_channel_key"
  ON "NotificationProviderConfig" ("tenantId", "channel");

CREATE INDEX "NotificationProviderConfig_tenantId_isActive_idx"
  ON "NotificationProviderConfig" ("tenantId", "isActive");

CREATE UNIQUE INDEX "NotificationPreference_tenantId_userId_channel_key"
  ON "NotificationPreference" ("tenantId", "userId", "channel");

CREATE INDEX "NotificationPreference_tenantId_userId_idx"
  ON "NotificationPreference" ("tenantId", "userId");

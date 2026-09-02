-- Add deliveryMode to NotificationLog
-- Distinguishes mock/test delivery from real provider delivery
-- Safe additive migration; preserves existing data

ALTER TABLE "NotificationLog"
  ADD COLUMN "deliveryMode" TEXT;

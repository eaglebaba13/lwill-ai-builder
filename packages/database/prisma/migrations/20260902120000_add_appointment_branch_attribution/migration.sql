-- Appointment Branch Attribution Migration (Data-Preserving)
-- Restores the Appointment.branchId composite FK to Branch that is declared in
-- packages/database/prisma/schema.prisma but missing from the production
-- database. This is the fix for the /api/reports/franchise-overview 500
-- (PrismaClientValidationError: Unknown field `branchId` on model `Appointment`).
--
-- branchId is OPERATIONAL attribution of the appointment to a branch, not the
-- legal/tenant ownership. The tenant boundary remains Appointment.tenantId
-- (unchanged). This column enables per-branch appointment aggregation in
-- franchise reporting.
--
-- The migration is idempotent and uses IF NOT EXISTS guards throughout so it
-- can be re-run safely. No data is dropped or rewritten: the new column is
-- nullable and defaults to NULL. Existing appointments (the 1 existing
-- production appointment) retain NULL, which is the correct value because
-- the branch attribution is not knowable for appointments created before
-- this column existed.

-- 1. Add nullable branchId column
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "branchId" UUID;

-- 2. Composite FK (tenantId, branchId) -> Branch(tenantId, id)
--    ON DELETE RESTRICT matches the Prisma schema's onDelete: Restrict.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_tenantId_branchId_fkey'
    ) THEN
        ALTER TABLE "Appointment"
            ADD CONSTRAINT "Appointment_tenantId_branchId_fkey"
            FOREIGN KEY ("tenantId", "branchId")
            REFERENCES "Branch"("tenantId", "id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- 3. Composite index (tenantId, branchId) matching the Prisma schema
--    @@index([tenantId, branchId]) declaration on model Appointment.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'Appointment_tenantId_branchId_idx'
    ) THEN
        CREATE INDEX "Appointment_tenantId_branchId_idx"
            ON "Appointment"("tenantId", "branchId");
    END IF;
END $$;

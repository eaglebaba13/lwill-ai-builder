-- Invoice Branch Attribution Migration (Data-Preserving)
-- Restores the Invoice.branchId composite FK to Branch that is declared in
-- packages/database/prisma/schema.prisma but missing from the production
-- database. This is the fix for the /api/reports/franchise-overview and
-- /api/franchise/payout 500s (PrismaClientValidationError:
--   Unknown field `branchId` on model `Invoice`).
--
-- branchId is OPERATIONAL attribution of the invoice to a branch, not the
-- legal invoice issuer. The legal invoice issuer remains the Tenant
-- (Invoice.tenantId, unchanged). This column enables per-branch revenue
-- attribution for franchise payout calculations.
--
-- The migration is idempotent and uses IF NOT EXISTS guards throughout so
-- it can be re-run safely. No data is dropped or rewritten: the new column
-- is nullable and defaults to NULL. Historical invoices (the 1 existing
-- production invoice) retain NULL, which is the correct value because the
-- branch attribution is not knowable for invoices created before this
-- column existed.

-- 1. Add nullable branchId column
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "branchId" UUID;

-- 2. Composite FK (tenantId, branchId) -> Branch(tenantId, id)
--    ON DELETE RESTRICT matches the Prisma schema's onDelete: Restrict.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_tenantId_branchId_fkey'
    ) THEN
        ALTER TABLE "Invoice"
            ADD CONSTRAINT "Invoice_tenantId_branchId_fkey"
            FOREIGN KEY ("tenantId", "branchId")
            REFERENCES "Branch"("tenantId", "id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- 3. Composite index (tenantId, branchId) matching the Prisma schema
--    @@index([tenantId, branchId]) declaration on model Invoice.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'Invoice_tenantId_branchId_idx'
    ) THEN
        CREATE INDEX "Invoice_tenantId_branchId_idx"
            ON "Invoice"("tenantId", "branchId");
    END IF;
END $$;

-- Branch Territory Relation Migration (Data-Preserving)
-- Restores the Branch.territoryId composite FK to Territory that is declared in
-- packages/database/prisma/schema.prisma but missing from the production database.
-- This is the fix for the /api/branches 500 (PrismaClientKnownRequestError:
-- column Branch.territoryId does not exist).
--
-- The migration is idempotent and uses IF NOT EXISTS guards throughout so it
-- can be re-run safely. No data is dropped or rewritten: the new column is
-- nullable and defaults to NULL, which matches the Prisma schema declaration
-- and the single existing Branch row (a 1-row table with no Territory link).

-- 1. Add nullable territoryId column
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "territoryId" UUID;

-- 2. Composite FK (tenantId, territoryId) -> Territory(tenantId, id)
--    ON DELETE RESTRICT matches the Prisma schema's onDelete: Restrict.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Branch_tenantId_territoryId_fkey'
    ) THEN
        ALTER TABLE "Branch"
            ADD CONSTRAINT "Branch_tenantId_territoryId_fkey"
            FOREIGN KEY ("tenantId", "territoryId")
            REFERENCES "Territory"("tenantId", "id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- 3. Composite index (tenantId, territoryId) matching the Prisma schema
--    @@index([tenantId, territoryId]) declaration on model Branch.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'Branch_tenantId_territoryId_idx'
    ) THEN
        CREATE INDEX "Branch_tenantId_territoryId_idx"
            ON "Branch"("tenantId", "territoryId");
    END IF;
END $$;

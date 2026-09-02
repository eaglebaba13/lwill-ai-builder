-- Franchise Territory Models Migration (Data-Preserving)
-- This migration creates franchise/territory tables safely without dropping existing data.
-- It is idempotent and can be re-run without data loss.

-- ============================================
-- 1. TERRITORY
-- ============================================

CREATE TABLE IF NOT EXISTS "Territory" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Territory_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Territory_tenantId_id_key') THEN
        CREATE UNIQUE INDEX "Territory_tenantId_id_key" ON "Territory"("tenantId", "id");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Territory_tenantId_name_key') THEN
        CREATE UNIQUE INDEX "Territory_tenantId_name_key" ON "Territory"("tenantId", "name");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Territory_tenantId_isActive_idx') THEN
        CREATE INDEX "Territory_tenantId_isActive_idx" ON "Territory"("tenantId", "isActive");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Territory_tenantId_fkey') THEN
        ALTER TABLE "Territory"
            ADD CONSTRAINT "Territory_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================
-- 2. FRANCHISEPARTNER
-- ============================================

CREATE TABLE IF NOT EXISTS "FranchisePartner" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "panNumber" TEXT,
    "gstin" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FranchisePartner_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'FranchisePartner_tenantId_id_key') THEN
        CREATE UNIQUE INDEX "FranchisePartner_tenantId_id_key" ON "FranchisePartner"("tenantId", "id");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'FranchisePartner_tenantId_userId_key') THEN
        CREATE UNIQUE INDEX "FranchisePartner_tenantId_userId_key" ON "FranchisePartner"("tenantId", "userId");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'FranchisePartner_tenantId_isActive_idx') THEN
        CREATE INDEX "FranchisePartner_tenantId_isActive_idx" ON "FranchisePartner"("tenantId", "isActive");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FranchisePartner_tenantId_fkey') THEN
        ALTER TABLE "FranchisePartner"
            ADD CONSTRAINT "FranchisePartner_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FranchisePartner_userId_fkey') THEN
        ALTER TABLE "FranchisePartner"
            ADD CONSTRAINT "FranchisePartner_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE Restrict ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================
-- 3. FRANCHISEOUTLETPROFILE
-- ============================================

CREATE TABLE IF NOT EXISTS "FranchiseOutletProfile" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "territoryId" UUID,
    "outletType" TEXT NOT NULL DEFAULT 'STANDALONE',
    "investmentCents" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FranchiseOutletProfile_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'FranchiseOutletProfile_tenantId_branchId_key') THEN
        CREATE UNIQUE INDEX "FranchiseOutletProfile_tenantId_branchId_key" ON "FranchiseOutletProfile"("tenantId", "branchId");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'FranchiseOutletProfile_tenantId_partnerId_branchId_key') THEN
        CREATE UNIQUE INDEX "FranchiseOutletProfile_tenantId_partnerId_branchId_key" ON "FranchiseOutletProfile"("tenantId", "partnerId", "branchId");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'FranchiseOutletProfile_tenantId_partnerId_idx') THEN
        CREATE INDEX "FranchiseOutletProfile_tenantId_partnerId_idx" ON "FranchiseOutletProfile"("tenantId", "partnerId");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'FranchiseOutletProfile_tenantId_territoryId_idx') THEN
        CREATE INDEX "FranchiseOutletProfile_tenantId_territoryId_idx" ON "FranchiseOutletProfile"("tenantId", "territoryId");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FranchiseOutletProfile_tenantId_fkey') THEN
        ALTER TABLE "FranchiseOutletProfile"
            ADD CONSTRAINT "FranchiseOutletProfile_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FranchiseOutletProfile_tenantId_partnerId_fkey') THEN
        ALTER TABLE "FranchiseOutletProfile"
            ADD CONSTRAINT "FranchiseOutletProfile_tenantId_partnerId_fkey"
            FOREIGN KEY ("tenantId", "partnerId") REFERENCES "FranchisePartner"("tenantId", "id") ON DELETE Restrict ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FranchiseOutletProfile_tenantId_branchId_fkey') THEN
        ALTER TABLE "FranchiseOutletProfile"
            ADD CONSTRAINT "FranchiseOutletProfile_tenantId_branchId_fkey"
            FOREIGN KEY ("tenantId", "branchId") REFERENCES "Branch"("tenantId", "id") ON DELETE Restrict ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FranchiseOutletProfile_tenantId_territoryId_fkey') THEN
        ALTER TABLE "FranchiseOutletProfile"
            ADD CONSTRAINT "FranchiseOutletProfile_tenantId_territoryId_fkey"
            FOREIGN KEY ("tenantId", "territoryId") REFERENCES "Territory"("tenantId", "id") ON DELETE Restrict ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================
-- 4. FRANCHISEAGREEMENT (with legacy branchId handling)
-- ============================================

-- Create table without branchId (current schema)
CREATE TABLE IF NOT EXISTS "FranchiseAgreement" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "territoryId" UUID NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FranchiseAgreement_pkey" PRIMARY KEY ("id")
);

-- If the legacy branchId column exists, migrate its data into FranchiseAgreementOutlet
DO $$
DECLARE
    has_branch_id_column BOOLEAN;
    migrated_count INTEGER;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'FranchiseAgreement' AND column_name = 'branchId'
    ) INTO has_branch_id_column;

    IF has_branch_id_column THEN
        -- Create FranchiseAgreementOutlet records from legacy branchId
        -- Only for agreements that don't already have an outlet record
        INSERT INTO "FranchiseAgreementOutlet" ("id", "tenantId", "agreementId", "branchId", "createdAt")
        SELECT gen_random_uuid(), "tenantId", "id", "branchId", CURRENT_TIMESTAMP
        FROM "FranchiseAgreement" fa
        WHERE fa."branchId" IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM "FranchiseAgreementOutlet" fao
            WHERE fao."agreementId" = fa."id"
          );

        GET DIAGNOSTICS migrated_count = ROW_COUNT;

        -- Drop the legacy column
        ALTER TABLE "FranchiseAgreement" DROP COLUMN IF EXISTS "branchId";
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'FranchiseAgreement_tenantId_id_key') THEN
        CREATE UNIQUE INDEX "FranchiseAgreement_tenantId_id_key" ON "FranchiseAgreement"("tenantId", "id");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'FranchiseAgreement_tenantId_partnerId_idx') THEN
        CREATE INDEX "FranchiseAgreement_tenantId_partnerId_idx" ON "FranchiseAgreement"("tenantId", "partnerId");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'FranchiseAgreement_tenantId_territoryId_idx') THEN
        CREATE INDEX "FranchiseAgreement_tenantId_territoryId_idx" ON "FranchiseAgreement"("tenantId", "territoryId");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'FranchiseAgreement_tenantId_isActive_idx') THEN
        CREATE INDEX "FranchiseAgreement_tenantId_isActive_idx" ON "FranchiseAgreement"("tenantId", "isActive");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FranchiseAgreement_tenantId_fkey') THEN
        ALTER TABLE "FranchiseAgreement"
            ADD CONSTRAINT "FranchiseAgreement_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FranchiseAgreement_tenantId_partnerId_fkey') THEN
        ALTER TABLE "FranchiseAgreement"
            ADD CONSTRAINT "FranchiseAgreement_tenantId_partnerId_fkey"
            FOREIGN KEY ("tenantId", "partnerId") REFERENCES "FranchisePartner"("tenantId", "id") ON DELETE Restrict ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FranchiseAgreement_tenantId_territoryId_fkey') THEN
        ALTER TABLE "FranchiseAgreement"
            ADD CONSTRAINT "FranchiseAgreement_tenantId_territoryId_fkey"
            FOREIGN KEY ("tenantId", "territoryId") REFERENCES "Territory"("tenantId", "id") ON DELETE Restrict ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================
-- 5. FRANCHISEAGREEMENTOUTLET
-- ============================================

CREATE TABLE IF NOT EXISTS "FranchiseAgreementOutlet" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "agreementId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FranchiseAgreementOutlet_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'FranchiseAgreementOutlet_tenantId_agreementId_branchId_key') THEN
        CREATE UNIQUE INDEX "FranchiseAgreementOutlet_tenantId_agreementId_branchId_key" ON "FranchiseAgreementOutlet"("tenantId", "agreementId", "branchId");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'FranchiseAgreementOutlet_tenantId_agreementId_idx') THEN
        CREATE INDEX "FranchiseAgreementOutlet_tenantId_agreementId_idx" ON "FranchiseAgreementOutlet"("tenantId", "agreementId");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'FranchiseAgreementOutlet_tenantId_branchId_idx') THEN
        CREATE INDEX "FranchiseAgreementOutlet_tenantId_branchId_idx" ON "FranchiseAgreementOutlet"("tenantId", "branchId");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FranchiseAgreementOutlet_tenantId_fkey') THEN
        ALTER TABLE "FranchiseAgreementOutlet"
            ADD CONSTRAINT "FranchiseAgreementOutlet_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FranchiseAgreementOutlet_tenantId_agreementId_fkey') THEN
        ALTER TABLE "FranchiseAgreementOutlet"
            ADD CONSTRAINT "FranchiseAgreementOutlet_tenantId_agreementId_fkey"
            FOREIGN KEY ("tenantId", "agreementId") REFERENCES "FranchiseAgreement"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FranchiseAgreementOutlet_tenantId_branchId_fkey') THEN
        ALTER TABLE "FranchiseAgreementOutlet"
            ADD CONSTRAINT "FranchiseAgreementOutlet_tenantId_branchId_fkey"
            FOREIGN KEY ("tenantId", "branchId") REFERENCES "Branch"("tenantId", "id") ON DELETE Restrict ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================
-- 6. FRANCHISEREVENUEDISTRIBUTION
-- ============================================

CREATE TABLE IF NOT EXISTS "FranchiseRevenueDistribution" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "agreementOutletId" UUID NOT NULL,
    "beneficiary" TEXT NOT NULL,
    "percentage" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FranchiseRevenueDistribution_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'FranchiseRevenueDistribution_tenantId_agreementOutletId_beneficiary_key') THEN
        CREATE UNIQUE INDEX "FranchiseRevenueDistribution_tenantId_agreementOutletId_beneficiary_key" ON "FranchiseRevenueDistribution"("tenantId", "agreementOutletId", "beneficiary");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'FranchiseRevenueDistribution_tenantId_agreementOutletId_idx') THEN
        CREATE INDEX "FranchiseRevenueDistribution_tenantId_agreementOutletId_idx" ON "FranchiseRevenueDistribution"("tenantId", "agreementOutletId");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'FranchiseRevenueDistribution_tenantId_beneficiary_idx') THEN
        CREATE INDEX "FranchiseRevenueDistribution_tenantId_beneficiary_idx" ON "FranchiseRevenueDistribution"("tenantId", "beneficiary");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FranchiseRevenueDistribution_tenantId_fkey') THEN
        ALTER TABLE "FranchiseRevenueDistribution"
            ADD CONSTRAINT "FranchiseRevenueDistribution_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FranchiseRevenueDistribution_tenantId_agreementOutletId_fkey') THEN
        ALTER TABLE "FranchiseRevenueDistribution"
            ADD CONSTRAINT "FranchiseRevenueDistribution_tenantId_agreementOutletId_fkey"
            FOREIGN KEY ("tenantId", "agreementOutletId") REFERENCES "FranchiseAgreementOutlet"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

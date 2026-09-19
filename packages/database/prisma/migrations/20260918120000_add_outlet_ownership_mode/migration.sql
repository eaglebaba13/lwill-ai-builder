-- FranchiseOutletOwnershipMode enum + ownershipMode field + partnerId nullable
-- This migration adds outlet ownership type support (COMPANY_OWNED / UNDER_FRANCHISE_PARTNER)
-- and makes FranchiseOutletProfile.partnerId nullable to support company-owned outlets
-- that do not require an external Franchise Partner.

-- CreateEnum
CREATE TYPE "FranchiseOutletOwnershipMode" AS ENUM ('COMPANY_OWNED', 'UNDER_FRANCHISE_PARTNER');

-- AlterTable: add ownershipMode column (nullable, no default — legacy rows remain NULL)
ALTER TABLE "FranchiseOutletProfile" ADD COLUMN "ownershipMode" "FranchiseOutletOwnershipMode";

-- AlterTable: make partnerId nullable for COMPANY_OWNED outlets
-- Existing FK constraint remains valid (NULL partnerId skips FK check in PostgreSQL)
ALTER TABLE "FranchiseOutletProfile" ALTER COLUMN "partnerId" DROP NOT NULL;

-- The existing @@unique([tenantId, partnerId, branchId]) constraint remains valid.
-- PostgreSQL treats NULLs as distinct in unique constraints, so:
--   (tenant, NULL, branch) does not conflict with (tenant, NULL, branch)
-- This correctly allows multiple COMPANY_OWNED outlets on the same branch.
-- The @@unique([tenantId, branchId]) constraint already prevents duplicate branch assignments per tenant.

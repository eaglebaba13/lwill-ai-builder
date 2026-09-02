-- Franchise Agreement Commercial Terms Foundation
-- Adds agreement-level commercial terms for the approved X NAIL ₹10L model
-- and preserves historical reproducibility for existing ₹3.10L agreements.
--
-- All new columns are nullable to preserve existing production rows.
-- Historical agreements are backfilled with known fixed MG terms.
--
-- ADR-014, MG-01, MG-02, NP-01, NP-02, HR-02 approved 2026-09-02.

-- 1. Add commercial term columns
ALTER TABLE "FranchiseAgreement" 
  ADD COLUMN IF NOT EXISTS "minimumGuaranteeCents" Int,
  ADD COLUMN IF NOT EXISTS "mgFormulaRateBp" Int,
  ADD COLUMN IF NOT EXISTS "mgFormulaBase" String,
  ADD COLUMN IF NOT EXISTS "variableReturnRateBp" Int,
  ADD COLUMN IF NOT EXISTS "variableReturnBasis" String,
  ADD COLUMN IF NOT EXISTS "payoutRule" String,
  ADD COLUMN IF NOT EXISTS "termsSnapshot" Json,
  ADD COLUMN IF NOT EXISTS "effectiveFrom" DateTime,
  ADD COLUMN IF NOT EXISTS "effectiveTo" DateTime;

-- 2. Backfill existing ₹3.10L agreements with historical fixed MG terms
--    These agreements have fixed MG = ₹15,000/month (1500000 cents).
UPDATE "FranchiseAgreement"
SET
  "minimumGuaranteeCents" = 1500000,
  "termsSnapshot" = '{"minimumGuaranteeCents":1500000,"mgFormulaRateBp":null,"mgFormulaBase":null,"variableReturnRateBp":null,"variableReturnBasis":null,"payoutRule":null,"effectiveFrom":"2026-08-29","effectiveTo":null}',
  "effectiveFrom" = "startDate"
WHERE
  "minimumGuaranteeCents" IS NULL
  AND "mgFormulaRateBp" IS NULL
  AND "mgFormulaBase" IS NULL
  AND "variableReturnRateBp" IS NULL
  AND "variableReturnBasis" IS NULL
  AND "payoutRule" IS NULL
  AND "termsSnapshot" IS NULL
  AND "effectiveFrom" IS NULL
  AND "effectiveTo" IS NULL;

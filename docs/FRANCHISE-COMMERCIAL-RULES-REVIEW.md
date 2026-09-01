# Franchise Commercial Rules Slice — Architecture & Implementation Review

**Review Date:** 2026-08-30  
**Branch:** `phase-1d-native-auth` at `298ceab`  
**Reviewer:** Kilo (automated review per user request)  
**Scope:** Revenue Share (20%), Minimum Guarantee (₹15,000), Territory Royalty (2%)  
**Status:** NOT COMPLETE — Critical schema gaps identified

---

## 1. Executive Summary

The current implementation adds `Territory` and `FranchiseAgreement` models and implements `getFranchisePayout` with per-outlet `MAX(20% gross, ₹15,000)` and territory royalty `2% × total territory turnover ÷ eligible partner count`. 

**However, the schema does NOT satisfy the required conceptual hierarchy.** The executed agreements and user requirements mandate that:
- One Franchise Partner can own/manage multiple outlets
- `FranchisePartner` must be a distinct entity from `User`
- `FranchiseOutletProfile` must link `Branch` ↔ `FranchisePartner`
- `FranchiseAgreement` must be capable of covering one or multiple outlets

**Critical finding:** `FranchisePartner` and `FranchiseOutletProfile` are entirely missing from the Prisma schema. `FranchiseAgreement` is hard-coded to exactly one `branchId`, making multi-outlet agreements impossible without schema correction.

---

## 2. Current Schema & Implementation State

### 2.1 Models Added

| Model | Fields | Relations |
|-------|--------|-----------|
| `Territory` | `id`, `tenantId`, `name`, `code?`, `isActive`, timestamps | `Tenant`, `Branch[]`, `FranchiseAgreement[]` |
| `FranchiseAgreement` | `id`, `tenantId`, `userId`, `territoryId`, `branchId`, `startDate`, `endDate?`, `isActive`, timestamps | `Tenant`, `User`, `Territory`, `Branch` |

### 2.2 Existing Models Used

| Model | Relevant Fields |
|-------|----------------|
| `Branch` | `id`, `tenantId`, `businessUnitId`, `name`, `territoryId?`, timestamps |
| `User` | `id`, `email?`, `displayName?`, `franchiseAgreements[]` |
| `Tenant` | `id`, `name`, `territories[]`, `franchiseAgreements[]` |
| `Invoice` | `id`, `tenantId`, `branchId`, `totalCents`, `issuedAt` |

### 2.3 Migration

- File: `packages/database/prisma/migrations/20260830180000_add_franchise_territory_models/migration.sql`
- Creates `Territory` and `FranchiseAgreement` tables with FK constraints
- `FranchiseAgreement.branchId` → `Branch(tenantId, id)` (one branch per agreement)
- `Branch.territoryId` → `Territory(tenantId, id)`

---

## 3. Requirement vs. Implementation Verification

### A. One Franchise Partner → Multiple Outlets

**Status: NOT SUPPORTED**

**Evidence:**
- `FranchiseAgreement` schema has a single `branchId` FK (`schema.prisma:160`)
- No `FranchisePartner` model exists
- No `FranchiseOutletProfile` model exists
- `User.franchiseAgreements[]` is one-to-many, but this conflates platform identity (`User`) with business partner identity (`FranchisePartner`)

**Why it matters:** The executed agreements (Kushwaha, HUF) each cover one outlet, but the platform must support partners expanding to multiple outlets under the same partner entity. The current schema would require creating a new `FranchiseAgreement` per outlet with no explicit partner-level grouping.

### B. One Territory → Multiple Operational Outlets

**Status: SUPPORTED (via `Branch.territoryId`)**

**Evidence:**
- `Branch` has `territoryId` FK (`schema.prisma:115-116`)
- `Territory` has `branches[]` (`schema.prisma:147`)
- `getFranchisePayout` queries all branches in territory via `prisma.branch.findMany({ where: { tenantId, territoryId: { in: territoryIds } } })` (`report-service.ts:607-610`)

**Caveat:** `FranchiseAgreement` also stores its own `territoryId`, creating a redundant path. There is no DB-level enforcement that `agreement.territoryId === branch.territoryId`.

### C. Territory Royalty: Total Sales Turnover of ALL Operational Outlets × 2%

**Status: CORRECTLY IMPLEMENTED**

**Evidence:**
- `allTerritoryBranches` fetches ALL branches in territory (`report-service.ts:607-610`)
- `allTerritoryInvoices` fetches invoices for ALL territory branches (`report-service.ts:617-627`)
- `territorySalesMap` aggregates sales across ALL territory branches (`report-service.ts:639-645`)
- `royaltyPoolCents = Math.round(sales * 0.02)` (`report-service.ts:659`)

### D. Equal Royalty Distribution: Territory Royalty Pool ÷ Eligible Franchise Partner Count

**Status: CORRECTLY IMPLEMENTED**

**Evidence:**
- `allTerritoryAgreements` fetches ALL active agreements in territory (`report-service.ts:594-606`)
- `allTerritoryPartnerMap` deduplicates by `userId` (`report-service.ts:647-654`)
- `individualCents = Math.round(poolCents / eligibleCount)` (`report-service.ts:661`)

**Caveat:** Partner count is based on distinct `userId` values in `FranchiseAgreement`. Without a `FranchisePartner` entity, there is no explicit partner registry — any `User` with an active agreement is automatically counted.

### E. Partner-Level Aggregation Across All Outlets Belonging to That Partner

**Status: CORRECTLY IMPLEMENTED (per current schema)**

**Evidence:**
- `partnerAgreementMap` groups all agreements by `userId` (`report-service.ts:665-669`)
- `totalRevenueSharePayoutCents` sums `eligibleRevenueSharePayoutCents` across all agreements for the partner (`report-service.ts:689`)
- `totalTerritoryRoyaltyCents` sums territory royalties across all territories the partner has agreements in (`report-service.ts:705`)

**Caveat:** This works because a `User` can have multiple `FranchiseAgreement` rows. However, the required conceptual hierarchy treats `FranchisePartner` as a separate entity from `User`.

---

## 4. Schema/Design Gap Report

### 4.1 Missing Entity: `FranchisePartner`

**Exact missing relationship:**
A dedicated `FranchisePartner` model to represent the business partner identity, separate from the platform `User` identity.

**Why it is required:**
- The executed agreements refer to "City Franchise Partner" as a distinct business entity (e.g., "Kushwaha Chandan Vijaybhai", "Mr. UMESH BABURAO NILAWAR HUF")
- DOC-025 SRS lists `franchisees` as a core database table
- The conceptual hierarchy requires `FranchisePartner` as a node between `FranchiseAgreement` and `FranchiseOutletProfile`
- Without it, partner identity is conflated with platform `User`, making it impossible to represent:
  - Multiple users under one partnership (e.g., partners with multiple authorized contacts)
  - Partner-level metadata (PAN, GSTIN, address, bank details) independent of login credentials
  - Master Franchise Partner relationships

**How it should relate to existing `Branch`:**
- Via `FranchiseOutletProfile` junction entity: `FranchisePartner` ↔ `FranchiseOutletProfile` ↔ `Branch`
- Direct relation: `FranchisePartner` should NOT have a direct FK to `Branch`; the junction allows one partner → many outlets, one outlet → one partner (or many partners for shared ownership)

**How one partner can have multiple outlets:**
```
FranchisePartner (1) ──< FranchiseOutletProfile >── (N) Branch
```
A `FranchisePartner` record relates to multiple `FranchiseOutletProfile` records, each pointing to a `Branch`. The partner may also have multiple `FranchiseAgreement` records covering different outlets.

### 4.2 Missing Entity: `FranchiseOutletProfile`

**Exact missing relationship:**
A junction/association entity between `FranchisePartner` and `Branch`.

**Why it is required:**
- Represents the operational assignment of an outlet to a partner
- Stores outlet-specific partner metadata (investment amount, outlet type, shop-in-shop vs standalone, etc.)
- Enforces that a `Branch` can be a franchise outlet for exactly one partner (or multiple, if shared ownership is needed)
- Required by the conceptual hierarchy: `Branch ↔ FranchiseOutletProfile ↔ FranchisePartner`

**How it should relate to existing `Branch`:**
- `FranchiseOutletProfile.branchId` → `Branch.id` (one branch has one outlet profile)
- `FranchiseOutletProfile.partnerId` → `FranchisePartner.id` (one profile belongs to one partner)
- Could also store `isPrimary`, `outletType`, `investmentCents`, ` commencementDate`

### 4.3 Missing Relationship: Multi-Outlet Agreement Support

**Exact missing relationship:**
`FranchiseAgreement` currently has a single `branchId` FK. There is no junction table for agreement-outlet mapping.

**How the agreement-to-outlet relationship should work:**
- **Option A (Current, limited):** One agreement = one outlet. Multiple agreements per partner for multiple outlets.
- **Option B (Required):** One agreement can cover multiple outlets via a junction table:
  ```
  FranchiseAgreement (1) ──< AgreementOutlet >── (N) Branch
  ```
  `AgreementOutlet` would have `agreementId`, `branchId`, and potentially `outletSpecificTerms`.

**Evidence from source documents:**
- Both executed agreements refer to "the assigned Outlet" (singular) and "approved business location" (singular)
- This suggests single-outlet agreements for the current executed contracts
- However, DOC-025 SRS requires `outlets` as a core table, and the user explicitly states: "Do not assume one agreement = one outlet unless the source documents explicitly require that."

### 4.4 Redundancy: Territory Stored on Both `Branch` and `FranchiseAgreement`

**Issue:**
- `Branch.territoryId` exists
- `FranchiseAgreement.territoryId` also exists
- No DB-level constraint ensures they match

**Recommendation:**
If territory is an attribute of the outlet's location, it should live on `Branch` (or `FranchiseOutletProfile`) only. `FranchiseAgreement` should derive territory from the covered outlets, not store it independently.

### 4.5 Missing Revenue Distribution Model

**Issue:**
The executed agreements specify a 100% revenue distribution:
- Salon Operations: 50%
- Franchise Owner: 20%
- Product & Marketing: 10%
- Master Franchise Partner: 5%
- Company: 15%

The current `FranchiseAgreement` model stores no revenue distribution percentages. It only calculates the Franchise Owner's 20% share in application code.

**Capability gap:**
The schema is NOT currently capable of representing this distribution. To support the eventual financial architecture, `FranchiseAgreement` (or a related model) needs to store:
- Revenue share percentages per beneficiary
- Master Franchise Partner entity and allocation
- Company share tracking

---

## 5. Financial Logic Verification

### 5.1 Revenue Share + MG Formula

**Required rule:**
```
RevenueShare = Gross Outlet Revenue × 20%
Base Partner Payout = MAX(RevenueShare, ₹15,000)
```

**Current implementation (`report-service.ts:674-675`):**
```typescript
const revenueShareCents = Math.round(grossRevenueCents * 0.2);
const eligibleRevenueSharePayoutCents = revenueShareCents > 1500000 ? revenueShareCents : 1500000;
```

**Verdict: CORRECT** — Per-agreement, this implements `MAX(20%, ₹15,000)`.

### 5.2 Multi-Outlet Partner Aggregation

**Required rule:**
- Partner with Outlet A (₹50,000) + Outlet B (₹1,00,000):
  - A: `MAX(₹10,000, ₹15,000)` = ₹15,000
  - B: `MAX(₹20,000, ₹15,000)` = ₹20,000
  - Partner total: ₹35,000

**Current implementation (`report-service.ts:689`):**
```typescript
const totalRevenueSharePayoutCents = agreementPayouts.reduce(
  (sum, item) => sum + item.eligibleRevenueSharePayoutCents,
  0
);
```

**Verdict: CORRECT** — Sums per-outlet eligible payouts. Does NOT add MG + revenue share for the same outlet.

### 5.3 Territory Royalty

**Required rule:**
```
Territory Royalty Pool = Total Sales Turnover of ALL operational outlets in territory × 2%
Individual Partner Royalty = Territory Royalty Pool ÷ Eligible Franchise Partner Count
```

**Current implementation (`report-service.ts:658-662`):**
```typescript
const sales = territorySalesMap.get(territoryId) ?? 0;
const poolCents = Math.round(sales * 0.02);
const eligibleCount = partners.size;
const individualCents = eligibleCount > 0 ? Math.round(poolCents / eligibleCount) : 0;
```

**Verdict: CORRECT** — Uses ALL territory branches, ALL territory invoices, divides by distinct partner count.

### 5.4 Final Partner Entitlement

**Required rule:**
```
Final Partner Entitlement = Base Partner Payout + Individual Partner Royalty
```

**Current implementation (`report-service.ts:714`):**
```typescript
totalEligiblePayoutCents: totalRevenueSharePayoutCents + totalTerritoryRoyaltyCents,
```

**Verdict: CORRECT**

### 5.5 100% Outlet Revenue Distribution Model

**Required capability:**
The system must be architecturally capable of representing:
- Salon Operations (50%)
- Franchise Owner (20%)
- Product & Marketing (10%)
- Master Franchise Partner (5%)
- Company (15%)

**Current status: NOT CAPABLE**

The current `FranchiseAgreement` model has no fields for revenue distribution percentages. The 20% Franchise Owner share is hard-coded in `getFranchisePayout`. The other 80% is not represented in the schema at all.

**What is NOT to be implemented yet (per instructions):**
- Master Franchise Partner 5% payout engine
- ROI / 3X ROI calculations
- Refund calculations
- Franchise-sale commission
- Monthly settlement/payment engine
- Statement generation

---

## 6. Missing Entities & Relationships — Summary

| Missing Entity | Purpose | Required Relations |
|---------------|---------|-------------------|
| `FranchisePartner` | Distinct business partner identity | `User` (optional link for login), `FranchiseOutletProfile[]`, `FranchiseAgreement[]` |
| `FranchiseOutletProfile` | Junction between partner and branch/outlet | `FranchisePartner`, `Branch`, `Territory` (optional), outlet metadata |
| `AgreementOutlet` (junction) | One agreement → multiple outlets | `FranchiseAgreement`, `Branch` |

**Current schema gap visualization:**
```
Tenant
  → BusinessUnit
    → Branch
      → Territory (via Branch.territoryId) ✓
      → FranchiseAgreement (via FranchiseAgreement.branchId) ✓
        → FranchiseAgreement.territoryId (redundant) ✓
        → User (as partner) ✗ (should be FranchisePartner)

MISSING:
  Branch → FranchiseOutletProfile → FranchisePartner
  FranchiseAgreement → AgreementOutlet → Branch (multi-outlet)
```

---

## 7. Authorization Analysis

### 7.1 Route-Level Authorization

**Current implementation (`report-route-handlers.ts`):**
- `handleGetFranchisePayout` calls `services.authorize("report.read")` (`report-route-handlers.ts:66`)
- Returns 401 if unauthenticated, 403 if forbidden (`report-route-handlers.ts:67-70`)
- Passes `authResult.tenantId` and `authResult.userId` to `getFranchisePayout` (`report-route-handlers.ts:77`)

**Verdict: CORRECT** — Standard `report.read` permission gate, consistent with other report routes.

### 7.2 Service-Level Authorization

**Current implementation (`report-service.ts:527-547`):**
- If `userId` is provided, filters agreements to that user (`report-service.ts:533-537`)
- If `userId` is omitted, returns all partners' payouts (`report-service.ts:542-546`)
- Territory royalty calculation uses ALL agreements in territory, not just requesting user's agreements (`report-service.ts:594-606`)

**Verdict: CORRECT** — User scoping works. Territory royalty correctly considers all partners.

### 7.3 Missing Authorization Hooks

**Gaps:**
- No verification that the requesting user is actually a franchise partner in the tenant
- No branch-level authorization (any user with `report.read` can see all franchise payouts in the tenant)
- No territory-level authorization
- No agreement-level authorization

**Note:** This may be intentional for the current slice scope, but the user requirements explicitly call for:
- branch authorization
- territory authorization
- agreement authorization

---

## 8. Tests Status

### 8.1 Report Service Tests (`report-service.test.ts`)

**Executed: 33 tests total**
- `listDailySales`: 3 tests ✓
- `listAppointmentReport`: 3 tests ✓
- `listMembershipReport`: 3 tests ✓
- `listPackageUtilizationReport`: 3 tests ✓
- `getGstSummary`: 3 tests ✓
- `listBranchPerformance`: 3 tests ✓
- `getFranchiseOverview`: 2 tests ✓
- `getFranchisePayout`: 7 tests ✓

**Coverage gaps:**
- ❌ No test for Partner A with Outlet 1 + Outlet 2 + Outlet 3
- ❌ No test for Partner B with another outlet
- ❌ No test for partner-level revenue aggregation across multiple outlets
- ❌ No test verifying territory royalty considers ALL eligible operational outlets (not just requesting user's outlets)
- ❌ No test for tenant isolation
- ❌ No test for branch authorization
- ❌ No test for territory authorization
- ❌ No test for agreement authorization

### 8.2 Route Handler Tests

| File | Tests | Status |
|------|-------|--------|
| `franchise-payout-route-handlers.test.ts` | 5 | ✓ Pass |
| `franchise-overview-route-handlers.test.ts` | 5 | ✓ Pass |
| `report-route-handlers.test.ts` | 5 | ✓ Pass |
| `x-nail-native-auth.test.tsx` | 36 | ✓ Pass |

### 8.3 Financial Example Verification

| Scenario | Expected | Current Code |
|----------|----------|--------------|
| Outlet A = ₹50,000 | ₹15,000 (MG) | ✓ Correct |
| Outlet A + B under same partner | ₹35,000 total | ✓ Correct |
| Territory: 3 outlets, ₹10,00,000 total, 4 partners | ₹5,000 each | ✓ Correct |

---

## 9. Migration Status

### 9.1 Current Migration

- **File:** `packages/database/prisma/migrations/20260830180000_add_franchise_territory_models/migration.sql`
- **Status:** Unapplied (uncommitted changes in working tree)
- **Tables created:** `Territory`, `FranchiseAgreement`
- **FK constraints:**
  - `FranchiseAgreement.tenantId` → `Tenant.id`
  - `FranchiseAgreement.userId` → `User.id`
  - `FranchiseAgreement(tenantId, territoryId)` → `Territory(tenantId, id)`
  - `FranchiseAgreement(tenantId, branchId)` → `Branch(tenantId, id)`
  - `Branch(tenantId, territoryId)` → `Territory(tenantId, id)`

### 9.2 Migration Safety Assessment

**The current migration is NOT safe to apply as-is for the required architecture because:**
1. It hard-codes `FranchiseAgreement.branchId` as a single FK, preventing multi-outlet agreements
2. It does not create `FranchisePartner` or `FranchiseOutletProfile`
3. If applied and later corrected, the correction would require a new migration to:
   - Add `FranchisePartner` table
   - Add `FranchiseOutletProfile` table
   - Add `AgreementOutlet` junction table (if multi-outlet agreements are needed)
   - Add `userId` FK from `FranchiseAgreement` to `FranchisePartner` (or keep `User` as partner with caution)

**Recommendation:** Do NOT apply the current migration to production. Create a corrected migration after the schema design is finalized.

---

## 10. Authorization Logic Deep Dive

### 10.1 Current Authorization Chain

```
Request → handleGetFranchisePayout
  → services.authorize("report.read")
    → authorizeFromContext({ permissionCode: "report.read", scope: { kind: "tenant", tenantId } })
      → loadPermissionGrants + TenantMembership + Role check
  → authorizationOutcome(authorization)
  → services.getFranchisePayout(tenantId, userId, year, month)
```

### 10.2 Identified Gaps

1. **No franchise-specific permission:** Uses generic `report.read`. If franchise financials require tighter control, a dedicated `franchise.payout.read` permission would be needed.
2. **No partner verification:** The route trusts that any authenticated user with `report.read` can request payouts for any `userId` parameter. In the current implementation, `userId` comes from the authenticated session, not from query parameters, which limits exposure.
3. **No outlet/territory/agreement authorization:** A user with `report.read` can see all franchise payouts in the tenant, regardless of whether they are a franchise partner themselves.

---

## 11. Final Checklist

| Requirement | Status | Evidence |
|-------------|--------|----------|
| A. One Franchise Partner → multiple outlets | ❌ NOT SUPPORTED | No `FranchisePartner` model; `FranchiseAgreement.branchId` is single FK |
| B. One territory → multiple operational outlets | ✅ SUPPORTED | `Branch.territoryId` allows multiple branches per territory |
| C. Territory royalty: all outlets × 2% | ✅ CORRECT | `allTerritoryBranches` + `allTerritoryInvoices` aggregation |
| D. Equal royalty distribution ÷ eligible partners | ✅ CORRECT | Deduplicated `userId` count in `allTerritoryPartnerMap` |
| E. Partner-level aggregation across all outlets | ✅ CORRECT (per-user) | `partnerAgreementMap` groups by `userId` |
| Financial: MAX(20%, ₹15,000) per outlet | ✅ CORRECT | `eligibleRevenueSharePayoutCents` logic |
| Financial: Partner total = sum of outlet payouts | ✅ CORRECT | `totalRevenueSharePayoutCents` reduce |
| 100% distribution model capability | ❌ NOT CAPABLE | No schema fields for 50/20/10/5/15 split |
| `FranchisePartner` entity | ❌ MISSING | Not in schema |
| `FranchiseOutletProfile` entity | ❌ MISSING | Not in schema |
| Multi-outlet agreement support | ❌ MISSING | Single `branchId` FK only |
| Authorization: tenant isolation | ✅ PRESENT | `tenantId` in all queries |
| Authorization: branch authorization | ❌ MISSING | No branch-level scope check |
| Authorization: territory authorization | ❌ MISSING | No territory-level scope check |
| Authorization: agreement authorization | ❌ MISSING | No agreement-level scope check |
| Tests: multi-outlet partner | ❌ MISSING | No test exists |
| Tests: partner revenue aggregation | ❌ MISSING | No test exists |
| Tests: territory royalty with all outlets | ❌ MISSING | No test exists |
| Migration: safe to apply | ❌ NOT SAFE | Schema gaps would require immediate follow-up migration |

---

## 12. Architectural Blockers

1. **No `FranchisePartner` entity** — The entire franchise domain model is built on `User` as a stand-in for partner identity. This violates the required conceptual hierarchy and prevents proper partner-level metadata, multi-user partnerships, and master franchise relationships.

2. **No `FranchiseOutletProfile` entity** — There is no explicit representation of the Branch ↔ Partner relationship. Outlet-specific franchise metadata (investment, type, commencement) has nowhere to live.

3. **Single-branch agreements** — `FranchiseAgreement.branchId` prevents one agreement from covering multiple outlets. If the business later executes a multi-outlet agreement, the schema must be changed.

4. **No 100% revenue distribution schema** — The current schema cannot represent the 50/20/10/5/15 split defined in the executed agreements. Adding this later requires new tables or columns.

5. **Migration applied to production would create technical debt** — Applying the current migration and then correcting it creates a follow-up migration that must handle data migration, backfills, and potential downtime.

---

## 13. Files Changed (Current Slice)

| File | Change |
|------|--------|
| `packages/database/prisma/schema.prisma` | Added `Territory` and `FranchiseAgreement` models |
| `packages/database/prisma/migrations/20260830180000_add_franchise_territory_models/migration.sql` | New migration |
| `packages/authentication-context-prisma/src/report-service.ts` | Added `getFranchisePayout` implementation |
| `packages/authentication-context-prisma/src/report-service.test.ts` | Added franchise payout tests |
| `apps/web/src/lib/crm/report-route-handlers.ts` | Added `handleGetFranchisePayout` |
| `apps/web/src/test/franchise-payout-route-handlers.test.ts` | Route handler tests |
| `apps/web/src/test/franchise-overview-route-handlers.test.ts` | Route handler tests |
| `apps/web/src/test/report-route-handlers.test.ts` | Added franchise payout test |
| `apps/web/src/app/xnail/page.tsx` | Added franchise UI tabs and data fetching |

---

## 14. Recommended Next Steps

### Minimum Required Correction (Before Any Production Migration)

1. **Add `FranchisePartner` model:**
   - `id`, `tenantId`, `userId?` (link to login user), `name`, `pan?`, `gstin?`, `address?`, `isActive`, timestamps
   - Relations: `FranchiseOutletProfile[]`, `FranchiseAgreement[]`

2. **Add `FranchiseOutletProfile` model:**
   - `id`, `tenantId`, `partnerId`, `branchId`, `territoryId?`, `outletType?`, `investmentCents?`, `isActive`, timestamps
   - Unique: `[tenantId, branchId]`
   - Relations: `FranchisePartner`, `Branch`, `Territory`

3. **Add `AgreementOutlet` junction table (for future multi-outlet agreements):**
   - `id`, `tenantId`, `agreementId`, `branchId`, `createdAt`
   - Unique: `[tenantId, agreementId, branchId]`
   - Modify `FranchiseAgreement` to remove direct `branchId` FK (or keep as deprecated)

4. **Update `getFranchisePayout` to use `FranchisePartner`:**
   - Partner identifier becomes `partnerId`, not `userId`
   - Territory royalty partner count based on distinct `partnerId` in agreements
   - Partner aggregation across all outlets via `FranchiseOutletProfile`

5. **Add required tests:**
   - Partner A with Outlet 1 + Outlet 2 + Outlet 3
   - Partner B with another outlet
   - Partner-level revenue aggregation
   - Territory royalty with all territory outlets
   - Tenant isolation
   - Branch/territory/agreement authorization

6. **Create corrected migration:**
   - Drop or modify the unapplied migration
   - Create new versioned migration with corrected schema
   - Verify with `prisma migrate dev` locally before production

---

## 15. Conclusion

**The Franchise Commercial Rules slice is NOT architecturally complete.**

The financial calculation logic (`getFranchisePayout`) is correct for the current schema. However, the schema itself is fundamentally incomplete for the required franchise model:

- `FranchisePartner` and `FranchiseOutletProfile` are missing
- One partner → multiple outlets is not properly modeled
- One agreement → multiple outlets is impossible
- The 100% revenue distribution model has no schema representation
- Critical authorization dimensions (branch, territory, agreement) are absent

**Do not claim the Franchise Financial Engine is complete.** The current implementation is a functional prototype that calculates payouts correctly under a limited schema, but it does not satisfy the architectural requirements for a production franchise management system.

The current unapplied migration must NOT be applied to production without correction.

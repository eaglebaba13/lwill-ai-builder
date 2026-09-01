# Franchise Domain Architecture Readiness Audit

**Document ID:** FRANCHISE-MULTI-PLAN-ARCHITECTURE-READINESS-AUDIT  
**Version:** 1.0  
**Status:** Read-Only Audit — No Code Changes  
**Branch:** `phase-1d-native-auth`  
**Reviewer:** Kilo (automated audit per user request)  
**Scope:** Assess whether the current franchise domain can safely evolve into a reusable multi-plan architecture after commercial approval.

---

## 1. Executive Summary

The current franchise domain is a **single-plan prototype** that happens to work for the two executed FOCO agreements (Kushwaha and HUF) because both share identical commercial terms. The domain **cannot safely support multiple franchise plans** without architectural changes.

**Key findings:**
- The Prisma schema already contains the correct entity relationships for the current single-plan slice.
- All commercial rules that would vary by plan (MG, royalty rate, revenue distribution) are **hardcoded** in `report-service.ts`.
- No franchise plan abstraction exists anywhere in the repository, schema, migrations, SRS, or ADRs.
- The current architecture has **no mechanism** to preserve historical commercial terms if rules change.
- ADR 014 explicitly gates commercial-rule implementation until applicable commercial rules are explicitly approved.

**Classification:**
- Current domain: **PARTIAL** — entity relationships implemented; commercial rules are hardcoded.
- Multi-plan readiness: **BLOCKED** — no plan abstraction, no historical reproducibility, no business approval.

---

## 2. Current Repository State

### 2.1 Git Status

```
Branch: phase-1d-native-auth
HEAD: 9684c3b
Working tree: uncommitted franchise changes present
```

### 2.2 Modified Files (Franchise-Specific)

| File | Status |
|------|--------|
| `packages/database/prisma/schema.prisma` | Modified — franchise models added |
| `packages/authentication-context-prisma/src/report-service.ts` | Modified — franchise payout logic |
| `packages/authentication-context-prisma/src/report-service.test.ts` | Modified — franchise tests |
| `apps/web/src/lib/crm/report-route-handlers.ts` | Modified — franchise routes |
| `apps/web/src/lib/crm/report-runtime.ts` | Modified — franchise service wiring |
| `apps/web/src/app/api/franchise/payout/route.ts` | Untracked — new API route |
| `apps/web/src/app/api/reports/franchise-overview/route.ts` | Untracked — new API route |
| `apps/web/src/app/xnail/page.tsx` | Modified — franchise UI tabs |
| `apps/web/src/test/franchise-payout-route-handlers.test.ts` | Untracked — route tests |
| `apps/web/src/test/franchise-overview-route-handlers.test.ts` | Untracked — route tests |
| `docs/FRANCHISE-COMMERCIAL-RULES-SPECIFICATION.md` | Untracked — new spec document |
| `docs/FRANCHISE-COMMERCIAL-RULES-REVIEW.md` | Untracked — prior review |

### 2.3 New Migration

| Migration | Status | Tables Created |
|-----------|--------|----------------|
| `20260830180000_add_franchise_territory_models` | Unapplied, uncommitted | `Territory`, `FranchisePartner`, `FranchiseOutletProfile`, `FranchiseAgreement`, `FranchiseAgreementOutlet`, `FranchiseRevenueDistribution` |

### 2.4 Git History

No commits reference `FranchisePlan`, `franchise plan`, `franchise type`, `franchise model`, or `franchise category`. The franchise work exists only as uncommitted changes on `phase-1d-native-auth`.

---

## 3. Current Franchise Domain Map

### 3.1 Entity Relationship Map (Actual Current State)

```
Tenant (1) ─── (N) FranchisePartner
                 ├── (1) User? (optional login link)
                 ├── (1) ─── (N) FranchiseOutletProfile ─── (1) Branch
                 │                ├── (1) Territory?
                 │                └── (N) FranchiseAgreementOutlet
                 └── (1) ─── (N) FranchiseAgreement ─── (1) Territory
                                      └── (N) FranchiseAgreementOutlet
                                            └── (N) FranchiseRevenueDistribution

Branch (N) ─── (1) Territory
Branch (N) ─── (1) BusinessUnit
BusinessUnit (N) ─── (1) Tenant
```

### 3.2 Entity Status Labels

| Entity | Status | Evidence |
|--------|--------|----------|
| `Tenant` | ✅ IMPLEMENTED | `schema.prisma:10-50` |
| `BusinessUnit` | ✅ IMPLEMENTED | `schema.prisma:85-101` |
| `Branch` | ✅ IMPLEMENTED | `schema.prisma:103-136` |
| `Territory` | ✅ IMPLEMENTED | `schema.prisma:138-155`; migration lines 9-49 |
| `FranchisePartner` | ✅ IMPLEMENTED | `schema.prisma:157-179`; migration lines 55-109 |
| `FranchiseOutletProfile` | ✅ IMPLEMENTED | `schema.prisma:181-203`; migration lines 115-192 |
| `FranchiseAgreement` | ✅ IMPLEMENTED | `schema.prisma:205-225`; migration lines 198-296 |
| `FranchiseAgreementOutlet` | ✅ IMPLEMENTED | `schema.prisma:227-242`; migration lines 302-358 |
| `FranchiseRevenueDistribution` | ✅ IMPLEMENTED | `schema.prisma:244-260`; migration lines 364-414 |
| `Invoice` | ✅ IMPLEMENTED | Used by payout calculation |
| `User` | ✅ IMPLEMENTED | Optional link from `FranchisePartner.userId` |

### 3.3 Relationship Completeness

| Relationship | Status | Notes |
|-------------|--------|-------|
| Tenant → FranchisePartner | ✅ Implemented | `FranchisePartner.tenantId` FK |
| FranchisePartner → User | ✅ Implemented | Optional `userId` FK; unique constraint |
| FranchisePartner → FranchiseOutletProfile | ✅ Implemented | `outletProfiles[]` |
| FranchisePartner → FranchiseAgreement | ✅ Implemented | `agreements[]` |
| Branch → Territory | ✅ Implemented | `Branch.territoryId` FK |
| Branch → FranchiseOutletProfile | ✅ Implemented | `franchiseOutletProfiles[]` |
| Branch → FranchiseAgreementOutlet | ✅ Implemented | `franchiseAgreementOutlets[]` |
| Territory → FranchiseAgreement | ✅ Implemented | `agreements[]` |
| FranchiseAgreement → FranchiseAgreementOutlet | ✅ Implemented | `outlets[]` |
| FranchiseAgreementOutlet → FranchiseRevenueDistribution | ✅ Implemented | `distributions[]` |
| FranchiseAgreement → Territory | ✅ Implemented | `territoryId` FK |

---

## 4. Concept Separation

### 4.1 Concept Definitions and Current Representation

| # | Concept | Does It Exist? | Where | What It Represents | What It Does NOT Represent |
|---|---------|---------------|-------|-------------------|---------------------------|
| 1 | **Tenant** | ✅ Yes | `Tenant` model | Legal/operational entity owning all data | Not a franchise plan or partner |
| 2 | **Brand / Business Unit** | ✅ Yes | `BusinessUnit` model | Organizational unit within tenant (e.g., X Nail Bar) | Not a franchise plan |
| 3 | **Franchise Plan** | ❌ No | NOT IMPLEMENTED | Reusable commercial template for agreements | Does not exist in repository/SRS/ADR |
| 4 | **Franchise Agreement** | ✅ Yes | `FranchiseAgreement` model | Executed legal contract between company and partner | Not a plan; not a partner |
| 5 | **Franchise Partner** | ✅ Yes | `FranchisePartner` model | Commercial/legal counterparty | Not a tenant; not a user (though linked) |
| 6 | **Agreement Holder / Legal Party Name** | ⚠️ Partial | `FranchisePartner.name` | Partner name in agreement | Not a separate entity; not validated against agreement document |
| 7 | **Territory** | ✅ Yes | `Territory` model | Approved geographic operating rights | Not a plan; not a partner |
| 8 | **Outlet** | ❌ No | NOT IMPLEMENTED | Operational location concept | Does not exist as separate entity |
| 9 | **Branch** | ✅ Yes | `Branch` model | Actual operational location in system | Not exclusively a franchise concept |
| 10 | **Agreement Outlet** | ✅ Yes | `FranchiseAgreementOutlet` model | Junction: agreement ↔ branch | Not a standalone outlet entity |
| 11 | **Operating Model** | ⚠️ Partial | `FranchiseOutletProfile.outletType` | FOCO/FOFO/COCO/hybrid classification | Field exists but unused in calculations |
| 12 | **Commercial Terms** | ⚠️ Partial | Hardcoded in `report-service.ts` | MG, royalty, revenue share | Not stored in schema; not configurable |
| 13 | **Revenue Distribution** | ⚠️ Partial | `FranchiseRevenueDistribution` model | Per-outlet beneficiary percentages | Only 20% Franchise Owner implemented; no 100% validation |
| 14 | **Payout / Settlement** | ⚠️ Partial | `getFranchisePayout()` in `report-service.ts` | Monthly payout calculation | Not persisted; no settlement records |

### 4.2 HUF Terminology Guardrail

**HUF is the agreement holder/party short form in the executed HUF agreement.**

It must NOT be mapped to:
- FranchisePlan
- FranchiseModel
- FranchiseType
- Module
- Tenant
- Partner Type
- Operating Model
- Software component

**Current repository usage of "HUF":**
- `docs/franchise-agreements/X NAILS  Franchise Agreement - HUF.txt` — agreement party name
- `packages/authentication-context-prisma/src/report-service.test.ts` — test partner name `"HUF"`
- No code, schema, route, or service references "HUF" as a technical concept.

---

## 5. Multi-Plan Readiness

### 5.1 Current State: Single-Plan Prototype

The current implementation assumes **one set of commercial rules** for all franchise agreements:
- MG = ₹15,000 (hardcoded)
- Territory royalty = 2% (hardcoded)
- Franchise owner revenue share = 20% (read from distribution table, but only one beneficiary is tracked)
- No plan-level configuration exists

### 5.2 Attributes That May Eventually Vary by Plan

| Attribute | Current Scope | Can Vary by Plan? | Evidence |
|-----------|--------------|-------------------|----------|
| Initial investment | Agreement/Outlet | Unknown | `FranchiseOutletProfile.investmentCents` exists; no plan link |
| MG | Hardcoded global | Unknown | Both agreements state ₹15,000; ADR 014 blocks variation |
| Revenue distribution % | Agreement Outlet | Unknown | Only 20% implemented; agreements specify 100% |
| Territory royalty rate | Hardcoded global | Unknown | Both agreements state 2%; ADR 014 blocks variation |
| Operating model | Outlet (unused) | Unknown | `outletType` field exists; FOCO/FOFO/COCO mentioned in DOC-025 |
| Agreement duration | Agreement | Likely fixed per agreement | Both agreements: 3 years |
| Renewal terms | Agreement | Likely fixed per agreement | Both agreements: ₹20,000 fee |
| Franchise-sale commission | Agreement | Likely fixed per agreement | Both agreements: ₹15,000 per sale |
| Statement/release timing | Agreement | Likely fixed per agreement | Both agreements: 5th working day |

### 5.3 Multi-Plan Gap Analysis

| Gap | Impact | Severity |
|------|--------|----------|
| No `FranchisePlan` entity | Cannot group agreements by reusable commercial template | HIGH |
| MG hardcoded | Cannot vary by plan or agreement | HIGH |
| Royalty rate hardcoded | Cannot vary by plan, agreement, or territory | HIGH |
| Revenue distribution incomplete | Cannot represent 100% split; no plan template | MEDIUM |
| No effective dating | Changing any rule retroactively alters historical calculations | HIGH |
| No agreement snapshot | Cannot preserve executed terms if plan changes | HIGH |
| `outletType` unused | Cannot classify outlets by operating model for plan selection | LOW |
| No `investmentCents` linkage | Cannot derive MG from investment even if formula is approved | MEDIUM |

---

## 6. Plan vs Agreement Analysis

### 6.1 Conceptual Hierarchy (Proposed, Not Implemented)

```
Franchise Plan (if approved)
    ↓
Franchise Agreement
    ↓
Agreement Outlet(s)
    ↓
Outlet / Branch
```

### 6.2 Current Implementation Status

| Layer | Implemented? | Evidence |
|-------|-------------|----------|
| Franchise Plan | ❌ NOT IMPLEMENTED | No model, no code, no SRS detail |
| Franchise Agreement | ✅ IMPLEMENTED | `FranchiseAgreement` model exists |
| Agreement Outlet | ✅ IMPLEMENTED | `FranchiseAgreementOutlet` model exists |
| Outlet / Branch | ✅ IMPLEMENTED | `Branch` model exists |
| Franchise Partner | ✅ IMPLEMENTED | `FranchisePartner` model exists |
| Territory | ✅ IMPLEMENTED | `Territory` model exists |

### 6.3 Plan vs Agreement Distinction

**From source documents:**
- DOC-025 mentions "FOCO, FOFO, COCO and hybrid franchise models" but does **not** define a reusable plan entity.
- ADR 014 treats FOCO as an "operating model" (semantic classification), not a plan with commercial rules.
- No executed agreement references a "franchise plan" or "plan ID."
- No git commit, schema migration, or code file references a plan abstraction.

**Conclusion:** A franchise plan abstraction is **NOT SPECIFIED** by current sources. If business/legal decides that multiple commercial rule sets are needed, a plan abstraction must be explicitly approved and designed.

---

## 7. Commercial Term Ownership Matrix

| Commercial Term | Current Storage | Current Calculation | Source | Correct Ownership (Proposed) | Approval Required? | Status |
|----------------|----------------|---------------------|--------|------------------------------|--------------------|--------|
| **MG amount** | Hardcoded `1500000` in `report-service.ts:752` | `revenueShareCents > 1500000 ? revenueShareCents : 1500000` | Both agreements clause 2.3 | Plan / Agreement / Outlet | ✅ Yes — fixed vs. formula, scope | BLOCKED |
| **MG formula** | Not implemented | Not implemented | Both agreements clause 2.3 — "5% of Initial Investment" | Plan / Agreement / Outlet | ✅ Yes — resolve ₹15,000 vs ₹15,500 discrepancy | NOT IMPLEMENTED |
| **Revenue distribution %** | `FranchiseRevenueDistribution.percentage` per outlet | `grossRevenueCents * percentage / 100` | Both agreements clause 2.2A | Agreement Outlet | ✅ Yes — if future plans allow variation | PARTIAL |
| **Franchise owner %** | `FranchiseRevenueDistribution` where beneficiary = "FRANCHISE_OWNER" | Read from distribution table | Both agreements clause 2.2A | Agreement Outlet | ❌ No — fixed by current agreements | IMPLEMENTED |
| **Territory royalty rate** | Hardcoded `0.02` in `report-service.ts:731` | `sales * 0.02` | Both agreements clause 2.2C | Plan / Agreement / Territory | ✅ Yes — if future plans allow different rates | BLOCKED |
| **Territory royalty basis** | All territory branches in code | All territory invoice sales | Both agreements clause 2.2C | Territory | ❌ No — fixed by current agreements | IMPLEMENTED |
| **Territory royalty distribution** | Equal split in code | `poolCents / eligibleCount` | Implicit in both agreements | Agreement | ❌ No — fixed by current calculation | IMPLEMENTED |
| **Franchise-sale commission** | Not stored | Not calculated | Both agreements clause 2.2C | Agreement / Outlet | ❌ No — fixed by current agreements | NOT IMPLEMENTED |
| **Statement/release timing** | Not stored | Not enforced | Both agreements clause 2.3/2.4 | Agreement | ❌ No — fixed by current agreements | NOT IMPLEMENTED |
| **Initial investment** | `FranchiseOutletProfile.investmentCents` | Not used in calculation | Both agreements clause 1.3/2.1 | Agreement Outlet / Partner | ❌ No — fixed by current agreements | PARTIAL |
| **Operating model** | `FranchiseOutletProfile.outletType` (unused) | Not used | Both agreements clause 1.1/1.3; ADR 014 | Agreement Outlet | ❌ No — fixed by current agreements | NOT IMPLEMENTED |
| **Agreement duration** | `FranchiseAgreement.startDate`/`endDate` | Date range check in `getFranchisePayout` | Both agreements clause 7 | Agreement | ❌ No — fixed by current agreements | IMPLEMENTED |
| **Renewal terms** | Not stored | Not enforced | Both agreements clause 7.5 | Agreement | ❌ No — fixed by current agreements | NOT IMPLEMENTED |
| **Refund policy** | Not stored | Not calculated | Both agreements clause 6.1 | Agreement | ❌ No — fixed by current agreements | NOT IMPLEMENTED |

---

## 8. Historical Reproducibility Audit

### 8.1 Current Capability

| Mechanism | Current State | Impact |
|-----------|--------------|--------|
| **Effective dating** | ❌ Missing | Changing `FranchiseRevenueDistribution.percentage` retroactively changes all historical payouts |
| **Agreement snapshot** | ❌ Missing | `FranchiseAgreement` stores no commercial terms; cannot reconstruct executed terms |
| **Settlement records** | ❌ Missing | Payouts are calculated on-the-fly; no persisted settlement history |
| **Versioning** | ❌ Missing | No way to version commercial terms |
| **Audit trail** | ⚠️ Partial | `AuditLog` exists but does not capture commercial-term changes |

### 8.2 Required Capability (If Multi-Plan Is Approved)

If future plans can change commercial rules, the system **must** preserve historical payouts under the terms in effect at the time of settlement.

**Architectural options (NOT requirements — to be decided after business approval):**

| Option | Description | Trade-off |
|--------|-------------|-----------|
| **Agreement commercial snapshot** | Store executed commercial terms as JSON/columns on `FranchiseAgreement` | Simple, but requires migration when terms change |
| **Effective dating** | Add `validFrom`/`validTo` to `FranchiseRevenueDistribution` | Flexible, but adds query complexity |
| **Versioned commercial terms** | Version number on each commercial record | Auditable, but requires version management |
| **Immutable executed terms** | Once agreement is active, commercial terms cannot be edited | Safest for reproducibility, but inflexible for corrections |
| **Settlement snapshot** | Persist calculated payout per month per partner | Accurate history, but storage overhead |

### 8.3 Current Risk

**HIGH RISK:** The current `getFranchisePayout` calculation is **purely functional** with no persisted output. Any change to:
- `FranchiseRevenueDistribution.percentage`
- The hardcoded `1500000` MG floor
- The hardcoded `0.02` royalty rate

...will retroactively change all historical and future payouts for all agreements. There is **no mechanism** to preserve the terms that were in effect when a past month was calculated.

---

## 9. Data Model Risks

### 9.1 Identified Risks

| # | Risk | Impact | Evidence | Recommended Decision | Implementation Blocked? |
|---|------|--------|----------|----------------------|-------------------------|
| 1 | **Hardcoded MG (`1500000`)** | Cannot support plans with different MG values | `report-service.ts:752` | Move to configurable field | Yes |
| 2 | **Hardcoded royalty rate (`0.02`)** | Cannot support plans with different royalty rates | `report-service.ts:731` | Move to configurable field | Yes |
| 3 | **Free-text beneficiary** | No controlled vocabulary; typos/inconsistencies possible | `FranchiseRevenueDistribution.beneficiary` (line 248) | Add enum or validation | No |
| 4 | **No 100% distribution validation** | Distributions could sum to >100% or <100% | `FranchiseRevenueDistribution.percentage` has no sum check | Add application-level validation | No |
| 5 | **No effective dating** | Historical calculations change when data changes | `FranchiseRevenueDistribution` has no `validFrom`/`validTo` | Add effective dating or snapshot | Yes |
| 6 | **No agreement commercial snapshot** | Cannot reconstruct executed terms | `FranchiseAgreement` has no commercial fields | Add snapshot or link to plan | Yes |
| 7 | **`outletType` unused** | Cannot classify outlets by operating model | `FranchiseOutletProfile.outletType` defaults to "STANDALONE" | Use or remove field | No |
| 8 | **`investmentCents` unused** | Cannot derive MG from investment | `FranchiseOutletProfile.investmentCents` exists but is not read | Use or document as future | No |
| 9 | **Missing `FranchisePlan`** | Cannot group agreements by reusable commercial template | No model, no code, no SRS detail | Business decision required | Yes |
| 10 | **Redundant territory storage** | `Branch.territoryId` and `FranchiseAgreement.territoryId` can diverge | Both fields exist with no DB constraint | Derive territory from outlets or add constraint | No |
| 11 | **No settlement/payout history** | Cannot audit historical payouts | `getFranchisePayout` returns calculated values only | Add settlement table or snapshot | Yes |
| 12 | **No `FranchisePartner` → `User` uniqueness enforcement at DB level for non-null** | Multiple partners could theoretically link to same user if `userId` is null | Unique constraint on `(tenantId, userId)` allows multiple nulls | Add filtered unique index | No |

---

## 10. API/Service Risks

### 10.1 Franchise-Related Files and Risks

| File | Risk | Description |
|------|------|-------------|
| `packages/authentication-context-prisma/src/report-service.ts:752` | **Hardcoded MG** | `const eligibleRevenueSharePayoutCents = revenueShareCents > 1500000 ? revenueShareCents : 1500000;` — ₹15,000 floor is a magic number |
| `packages/authentication-context-prisma/src/report-service.ts:731` | **Hardcoded royalty rate** | `const poolCents = Math.round(sales * 0.02);` — 2% is a magic number |
| `packages/authentication-context-prisma/src/report-service.ts:676` | **Single-beneficiary assumption** | `beneficiary: "FRANCHISE_OWNER"` — only one beneficiary is read; other 80% is ignored |
| `packages/authentication-context-prisma/src/report-service.ts:743-764` | **Per-outlet MG application** | MG floor is applied per outlet, not per partner — this matches current agreements but may not match future plans |
| `packages/authentication-context-prisma/src/report-service.ts:769` | **Territory royalty per territory** | Royalty is calculated per territory and summed per partner — assumes one territory per agreement or compatible territories |
| `apps/web/src/lib/crm/report-route-handlers.ts:66` | **Generic permission** | Uses `report.read` for franchise endpoints — no franchise-specific permission |
| `apps/web/src/lib/crm/report-runtime.ts:19-38` | **Tenant-only authorization** | Authorization is tenant-scoped; no franchise-partner, territory, or agreement scope |
| `apps/web/src/app/xnail/page.tsx:170` | **Hardcoded tabs** | "Franchise Overview" and "Financials" are hardcoded tabs — not plan-driven |

### 10.2 Assumptions Embedded in Code

| Assumption | Location | Risk |
|------------|----------|------|
| All agreements have same MG | `report-service.ts:752` | Breaks if future plans negotiate different MG |
| All territories have same royalty rate | `report-service.ts:731` | Breaks if future plans negotiate different rates |
| Only Franchise Owner receives revenue share | `report-service.ts:676` | Breaks if other beneficiaries are added |
| MG floor applies per outlet | `report-service.ts:752` | May not match future plan semantics |
| Territory royalty is split equally among partners | `report-service.ts:733` | May not match future plan semantics |
| Any user with `report.read` can see all franchise payouts | `report-route-handlers.ts:66` | May not match future authorization requirements |

---

## 11. Test Architecture Audit

### 11.1 Current Test Coverage

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `report-service.test.ts` | 33 tests | Payout calculation, territory royalty, user scoping, zero revenue, multi-outlet |
| `franchise-payout-route-handlers.test.ts` | 5 tests | Auth gating, year/month params, default values |
| `franchise-overview-route-handlers.test.ts` | 5 tests | Auth gating, tenant scoping, response shape |

### 11.2 Test Architecture Gaps

| Gap | Current Status | Required for Multi-Plan |
|------|----------------|------------------------|
| Multiple plans with different commercial rules | ❌ No tests | Required |
| Agreement-level commercial override | ❌ No tests | Required if overrides are approved |
| Plan defaults vs. agreement overrides | ❌ No tests | Required if plans are approved |
| Historical reproducibility | ❌ No tests | Required if effective dating is approved |
| Distribution sum validation | ❌ No tests | Required |
| Effective dating | ❌ No tests | Required if plans can change |
| Operating model classification | ❌ No tests | Required if `outletType` affects logic |
| Renewal terms | ❌ No tests | Required |
| Franchise-sale commission | ❌ No tests | Required |
| Settlement records | ❌ No tests | Required |

### 11.3 Test Mock Architecture

The `createFranchisePrisma` mock in `report-service.test.ts:634-790` is well-structured and supports multi-outlet, multi-partner, and multi-agreement scenarios. It can be extended for multi-plan testing without structural changes.

---

## 12. Decision Gates

| # | Decision | Why Required | Current Status | Can Engineering Proceed? |
|---|----------|--------------|----------------|--------------------------|
| 1 | **What is a Franchise Plan?** | Needed before any plan-level schema or logic | NOT DECIDED | ❌ No |
| 2 | **Are multiple plans officially supported?** | Determines whether architecture must be multi-plan from the start | NOT DECIDED | ❌ No |
| 3 | **Relationship between Plan and Agreement** | Determines schema design and override semantics | NOT DECIDED | ❌ No |
| 4 | **MG ownership scope** | Determines where MG is stored and calculated | BLOCKED by business/legal | ❌ No |
| 5 | **Royalty ownership scope** | Determines where royalty rate is stored and calculated | BLOCKED by ADR 014 | ❌ No |
| 6 | **Revenue distribution ownership** | Determines where percentages are stored | PARTIAL — outlet level only | ⚠️ Partial |
| 7 | **Operating model ownership** | Determines whether FOCO/FOFO/COCO affect commercial rules | NOT DECIDED | ❌ No |
| 8 | **Investment ownership** | Determines whether `investmentCents` drives MG formula | NOT DECIDED | ❌ No |
| 9 | **Agreement override policy** | Determines whether plans can be overridden | NOT DECIDED | ❌ No |
| 10 | **Historical reproducibility strategy** | Determines whether historical payouts must be immutable | NOT DECIDED | ❌ No |
| 11 | **Effective dating/versioning** | Determines mechanism for plan changes | NOT DECIDED | ❌ No |
| 12 | **Agreement execution/snapshot strategy** | Determines how executed terms are preserved | NOT DECIDED | ❌ No |

---

## 13. Recommended Architecture Direction

### 13.1 Approved Facts (From Source Documents)

1. **Entity relationships are correct.** The current schema (`FranchisePartner`, `Territory`, `FranchiseOutletProfile`, `FranchiseAgreement`, `FranchiseAgreementOutlet`, `FranchiseRevenueDistribution`) correctly models the required franchise domain for the current single-plan slice.

2. **Multi-outlet agreements are supported.** `FranchiseAgreementOutlet` enables one agreement to cover multiple outlets.

3. **Partner → multiple outlets is supported.** `FranchiseOutletProfile` links a partner to multiple branches.

4. **Both executed agreements are FOCO with identical commercial terms.** No source document demonstrates a second plan with different rules.

5. **ADR 014 gates commercial implementation.** No commercial-rule implementation may proceed until rules are explicitly approved.

6. **MG and royalty are hardcoded.** This is acceptable for the current single-plan slice but blocks multi-plan support.

### 13.2 Architectural Recommendation (For Future Approval)

**Do not create `FranchisePlan` yet.** Instead, prepare the domain for multi-plan support through **agreement-level commercial term storage** and **historical reproducibility mechanisms**.

**Recommended direction (requires business/legal approval):**

1. **Add commercial-term fields to `FranchiseAgreement`** (or a related snapshot table):
   - `minimumGuaranteeCents`
   - `royaltyRate` (basis points or decimal)
   - `revenueSharePercentage` (for Franchise Owner)
   - `agreementTerms` (JSON or typed fields for other commercial rules)

2. **Add effective dating to `FranchiseRevenueDistribution`**:
   - `validFrom` / `validTo` or `effectiveDate`
   - This allows distribution changes without affecting historical calculations

3. **Add a `FranchisePlan` entity only if business/legal confirms**:
   - Multiple plans will exist
   - Plans have distinct, reusable commercial rules
   - Plans are not merely agreement-level variations

4. **Introduce settlement/payout history table**:
   - Persist calculated payouts per partner per month
   - Ensures historical reproducibility regardless of future rule changes

5. **Decouple hardcoded constants from calculation logic**:
   - Read MG from agreement or plan
   - Read royalty rate from agreement or plan
   - Read revenue share from `FranchiseRevenueDistribution` (already done)

### 13.3 Safe Evolution Path

```
Current State (Single Plan)
    ↓
Add agreement-level commercial fields (if approved)
    ↓
Add effective dating to distributions (if approved)
    ↓
Add payout history table (if approved)
    ↓
Add FranchisePlan only if business confirms need
    ↓
Multi-plan architecture
```

This path preserves current functionality while enabling future multi-plan support without code duplication.

---

## 14. Implementation Blockers

| # | Blocker | Type | Resolution Required |
|---|---------|------|---------------------|
| 1 | **MG fixed vs. formula ambiguity** | Business/Legal | Resolve ₹15,000 vs. ₹15,500 discrepancy |
| 2 | **ADR 014 commercial-policy gate** | Architecture | Explicit approval of commercial rules |
| 3 | **No franchise plan abstraction** | Architecture | Business decision on whether plans are needed |
| 4 | **Hardcoded MG** | Technical | Move to configurable field |
| 5 | **Hardcoded royalty rate** | Technical | Move to configurable field |
| 6 | **No historical reproducibility** | Architecture | Design effective dating or snapshot mechanism |
| 7 | **Incomplete revenue distribution** | Technical | Implement 100% distribution or document scope |
| 8 | **No settlement history** | Architecture | Design payout persistence strategy |
| 9 | **Generic authorization** | Architecture | Franchise-specific permission codes if needed |
| 10 | **Unapplied migration** | Operational | Migration must be applied before production use |

---

## 15. Exact Next Safe Engineering Step

**Task: Prepare an architectural proposal for agreement-level commercial term storage and historical reproducibility.**

This task does **not** implement commercial rules. It does **not** create a `FranchisePlan` model. It does **not** modify payout calculations.

**What the proposal must address:**
1. Schema changes to add commercial-term fields to `FranchiseAgreement` (or a new snapshot table) — **only if** business/legal approves agreement-level variation.
2. Effective dating strategy for `FranchiseRevenueDistribution` — **only if** distributions may change over time.
3. Settlement/payout history table design — to ensure historical reproducibility regardless of future rule changes.
4. Backward-compatibility strategy for existing agreements (Kushwaha, HUF) — ensuring their ₹15,000 MG and 2% royalty are preserved exactly.
5. Migration strategy for the unapplied `20260830180000` migration — how to safely apply it and any subsequent migrations.

**What the proposal must NOT do:**
- Change MG from ₹15,000
- Change royalty from 2%
- Create `FranchisePlan`
- Modify revenue-share percentages
- Implement commercial calculations
- Assume business/legal approval

**Deliverable:** A single markdown proposal document in `docs/` that can be reviewed by business/legal and architecture before any code changes.

**Why this is the correct next step:** All commercial implementation is blocked by ADR 014. The current domain is structurally sound for single-plan use but lacks the foundations for multi-plan support. The proposal bridges this gap without assuming business decisions that have not been made.

---

## 16. Files Inspected

### Schema & Migrations
- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations/20260830180000_add_franchise_territory_models/migration.sql`

### Service & Calculation Code
- `packages/authentication-context-prisma/src/report-service.ts`
- `packages/authentication-context-prisma/src/report-service.test.ts`

### Route Handlers & Runtime
- `apps/web/src/lib/crm/report-route-handlers.ts`
- `apps/web/src/lib/crm/report-runtime.ts`
- `apps/web/src/app/api/franchise/payout/route.ts`
- `apps/web/src/app/api/reports/franchise-overview/route.ts`

### Tests
- `apps/web/src/test/franchise-payout-route-handlers.test.ts`
- `apps/web/src/test/franchise-overview-route-handlers.test.ts`
- `apps/web/src/test/report-route-handlers.test.ts`

### UI
- `apps/web/src/app/xnail/page.tsx` (franchise tabs and data fetching)

### Documentation
- `docs/FRANCHISE-COMMERCIAL-RULES-SPECIFICATION.md`
- `docs/FRANCHISE-COMMERCIAL-RULES-REVIEW.md`
- `docs/LWILL-DOC-025-Franchise-Management-SRS-v1.0.txt`
- `docs/LWILL-DOC-017-X-Nail-ERP-SRS-MVP-v1.0.txt`
- `docs/LWILL-DOC-009-Master-Platform-Blueprint-Volume-1-v1.0.txt`
- `docs/DECISIONS.md` (ADR 004, 010, 014)
- `docs/franchise-agreements/X NAILS  Franchise Agreement - Kushwaha.txt`
- `docs/franchise-agreements/X NAILS  Franchise Agreement - HUF.txt`

---

## 17. Commands/Tests Executed

- `git status --short` — confirmed working tree state
- `git log --all --oneline` — confirmed no franchise-plan commits
- `git log --all --oneline --grep="franchise" -i` — no results
- `git log --all --oneline --grep="payout" -i` — no results
- `git log --all --oneline --grep="territory" -i` — no results
- `grep` searches for `FranchisePlan`, `franchise plan`, `franchise type`, `franchise model`, `franchise category`, `commercial package`, `agreement template`, `commercial rule set`, `planId`, `plan_id` — no results
- `pnpm test --filter @lwill/authentication-context-prisma` — 471 tests passed
- `pnpm test --filter web` — 540 tests passed
- `pnpm exec vitest run src/test/franchise-overview-route-handlers.test.ts src/test/franchise-payout-route-handlers.test.ts` — 10 tests passed
- `pnpm build` — passed
- `pnpm lint` — 0 errors

**No files were modified during this audit.**

---

*End of audit.*

# Franchise Commercial Rules Specification

**Document ID:** LWILL-DOC-025-COMMERCIAL-RULES-SPECIFICATION  
**Version:** 1.0  
**Status:** Draft — Pending Business/Legal Approval  
**Branch:** `phase-1d-native-auth`  
**Reviewer:** Kilo (automated audit per user request)  
**Scope:** Minimum Guarantee, revenue distribution, territory royalty, investment, operating model, multi-plan support, and historical reproducibility for the LWILL AI BUILDER franchise domain.

---

## 1. Purpose

This document consolidates **agreement-derived facts**, **SRS-derived requirements**, **ADR/architecture decisions**, and **unresolved business/legal questions** for franchise commercial rules. It is **not** an implementation specification. No application code, schema change, migration, or test modification is authorized by this document.

This document exists because:
- ADR 014 explicitly gates royalty, revenue/profit sharing, and franchise settlement implementation until applicable commercial rules are explicitly approved.
- The current executed agreements contain an internal mathematical discrepancy regarding the Minimum Guarantee (MG).
- Future franchise plans/models are expected, but no reusable plan abstraction currently exists in the repository, schema, or approved SRS/ADR.
- Historical reproducibility of commercial terms has not been designed.

---

## 2. Source Documents Inspected

| Document | Role |
|----------|------|
| `docs/franchise-agreements/X NAILS  Franchise Agreement - Kushwaha.txt` | Executed agreement — agreement party: **Kushwaha Chandan Vijaybhai** |
| `docs/franchise-agreements/X NAILS  Franchise Agreement - HUF.txt` | Executed agreement — agreement party: **Mr. UMESH BABURAO NILAWAR HUF (Blush Cosmetics and Nail Studio)** |
| `docs/LWILL-DOC-025-Franchise-Management-SRS-v1.0.txt` | Franchise Management SRS |
| `docs/LWILL-DOC-017-X-Nail-ERP-SRS-MVP-v1.0.txt` | X Nail ERP SRS |
| `docs/LWILL-DOC-009-Master-Platform-Blueprint-Volume-1-v1.0.txt` | Master Platform Blueprint |
| `docs/DECISIONS.md` (ADR 004, 010, 014) | Architectural Decision Records |
| `docs/FRANCHISE-COMMERCIAL-RULES-REVIEW.md` | Prior architecture review |
| `packages/database/prisma/schema.prisma` | Current Prisma schema |
| `packages/authentication-context-prisma/src/report-service.ts` | Current payout calculation logic |

---

## 3. Terminology Model

### 3.1 Conceptual Hierarchy (Proposed)

```
Franchise Plan                    ← reusable commercial template (NOT YET APPROVED)
    ↓
Franchise Agreement              ← executed legal contract
    ↓
Agreement Outlet(s)              ← specific outlet(s) covered by the agreement
    ↓
Outlet / Branch                  ← operational location
```

### 3.2 Separate Concepts (Not a Hierarchy)

| Concept | Definition | Source |
|---------|------------|--------|
| **Franchise Partner** | Legal/commercial counterparty to the agreement | ADR 014; both agreements |
| **Territory** | Approved geographic operating rights | Both agreements, clause 1.2 |
| **Agreement Holder Name** | Party short form/name appearing in the agreement (e.g., "Kushwaha", "HUF") | Both agreements |
| **Operating Model** | Business model classification (e.g., FOCO, Shop-in-Shop) | Both agreements, clause 1.1 / 1.3 |
| **Franchise Plan** | Reusable set of commercial rules applied to one or more agreements | **NOT SPECIFIED** — does not exist in source documents |

### 3.3 Terminology Guardrails

- **"HUF"** is the agreement holder/party short form in the executed HUF agreement. It is **NOT** a franchise module, franchise plan, franchise type, or software component.
- **"Kushwaha"** is the agreement holder/party name in the executed Kushwaha agreement. It is **NOT** a franchise plan.
- **FOCO** is an operating model described in the executed agreements and ADR 014. It is **NOT** a franchise plan abstraction.
- **Shop-in-Shop** is a sub-model described in the HUF agreement (clause 1.1, location paragraph). It is **NOT** a franchise plan.

---

## 4. Executed Agreement Summary

### 4.1 Common Commercial Terms (Both Agreements)

| Attribute | Value | Agreement Clause |
|-----------|-------|------------------|
| **Agreement Party (Kushwaha)** | Kushwaha Chandan Vijaybhai | Preamble |
| **Agreement Party (HUF)** | Mr. UMESH BABURAO NILAWAR HUF (Blush Cosmetics and Nail Studio) | Preamble |
| **Business Model** | FOCO (Franchise Owned, Company Operated) | Kushwaha clause 1.1; HUF clause 1.1 |
| **Sub-model (HUF only)** | Shop-in-Shop | HUF clause 1.1, location paragraph |
| **Initial Investment** | ₹3,10,000 | Kushwaha clause 1.3 / 2.1; HUF clause 1.3 / 2.1 |
| **Payment Terms (HUF only)** | ₹1,50,000 upfront + ₹75,000 Oct 2026 + ₹85,000 Nov 2026 | HUF clause 2.1 |
| **Revenue Distribution** | Salon Operations 50%, Franchise Owner 20%, Product & Marketing 10%, Master Franchise Partner 5%, Company 15% | Both agreements, clause 2.2A |
| **Franchise Owner Revenue Share** | 20% of Gross Sales (Top-Line Revenue) | Both agreements, clause 2.2A |
| **Franchise-Sale Commission** | ₹15,000 for every successful franchise sold in territory | Both agreements, clause 2.2C |
| **Territory Royalty** | 2% on sales turnover of all operational outlets in territory | Both agreements, clause 2.2C |
| **MG** | ₹15,000 per month | Both agreements, clause 2.3 |
| **MG Formula Text** | "equivalent to 5% of the Initial Investment" | Both agreements, clause 2.3 |
| **MG Rule** | Whichever is higher: actual earnings or ₹15,000 | Both agreements, clause 2.3 |
| **Statement Timing** | On or before 5th Working Day of succeeding month | Both agreements, clause 2.3 / 2.4 |
| **MG Default Consequence** | Material breach; partner may terminate and claim 90% refund of investment | Both agreements, clause 2.3 |
| **Agreement Duration** | Three (3) Years from Effective Date | Both agreements, clause 7 |
| **Renewal Terms** | Renewal fee ₹20,000; extended three years on prevailing terms | Both agreements, clause 7.5 |
| **Refund on Termination (initial)** | 90% of Initial Investment (10% deduction for admin/onboarding) | Both agreements, clause 6.1 |
| **Refund on Pre-expiry Termination** | 50% of original investment | Both agreements, clause 6.1 |

### 4.2 Agreement-Specific Differences

| Attribute | Kushwaha | HUF |
|-----------|----------|-----|
| Effective Date | 29/8/2026 | 25/8/2026 |
| Territory | Surat City + 3 km radius | Nanded City Maharashtra + 5 km radius |
| Location Type | Not explicitly sub-classified | Shop-in-Shop (within Blush Cosmetics & Nail Studio) |
| Payment Terms | Not specified in excerpt | Staged: ₹1,50,000 + ₹75,000 + ₹85,000 |

### 4.3 Mathematical Discrepancy: MG vs. Initial Investment

**AGREEMENT-DERIVED FACT — DO NOT RESOLVE UNILATERALLY**

| Calculation | Value |
|-------------|-------|
| Initial Investment (both agreements) | ₹3,10,000 |
| 5% of Initial Investment | ₹15,500 |
| Explicitly stated MG | ₹15,000 |
| Discrepancy | ₹500 |

Both agreements use the identical wording: "equivalent to 5% of the Initial Investment, i.e., ₹/15000- per month." The "i.e." (id est) construction grammatically introduces ₹15,000 as the specific agreed value, with "5%" as descriptive context. However, the arithmetic does not reconcile.

This discrepancy **requires business/legal clarification** before any automated MG calculation is implemented or modified.

---

## 5. Current Implementation State

### 5.1 Schema (`packages/database/prisma/schema.prisma`)

| Model | Status | Relevant Fields |
|-------|--------|-----------------|
| `Territory` | ✅ Implemented | `id`, `tenantId`, `name`, `code?`, `isActive` |
| `FranchisePartner` | ✅ Implemented | `id`, `tenantId`, `userId?`, `name`, `email?`, `phone?`, `panNumber?`, `gstin?`, `address?` |
| `FranchiseOutletProfile` | ✅ Implemented | `id`, `tenantId`, `partnerId`, `branchId`, `territoryId?`, `outletType?` (default `"STANDALONE"`), `investmentCents?` |
| `FranchiseAgreement` | ✅ Implemented | `id`, `tenantId`, `partnerId`, `territoryId`, `startDate`, `endDate?`, `isActive` |
| `FranchiseAgreementOutlet` | ✅ Implemented | `id`, `tenantId`, `agreementId`, `branchId`, `createdAt` |
| `FranchiseRevenueDistribution` | ✅ Implemented | `id`, `tenantId`, `agreementOutletId`, `beneficiary`, `percentage`, `isActive` |

**Note:** The current schema already supports the multi-outlet agreement structure via `FranchiseAgreementOutlet`. The prior review (`FRANCHISE-COMMERCIAL-RULES-REVIEW.md`) incorrectly stated that `FranchisePartner` and `FranchiseAgreementOutlet` were missing from the schema. They are present.

### 5.2 Payout Calculation (`packages/authentication-context-prisma/src/report-service.ts`)

| Rule | Current Implementation | Location |
|------|------------------------|----------|
| Revenue share % | Read from `FranchiseRevenueDistribution` where `beneficiary = "FRANCHISE_OWNER"` | Lines 672-679 |
| Revenue share calculation | `grossRevenueCents * percentage / 100` | Line 751 |
| MG floor | **Hardcoded** `1500000` (₹15,000) | Line 752 |
| Territory royalty rate | **Hardcoded** `0.02` (2%) | Line 731 |
| Territory royalty basis | All territory branch sales | Lines 689-717 |
| Territory royalty distribution | Equal split among eligible partners | Lines 728-734 |
| Partner aggregation | Sum of per-outlet eligible payouts + territory royalties | Lines 767, 783, 792 |

### 5.3 Current Test Coverage

| Scenario | Status |
|----------|--------|
| ₹0 revenue → MG floor applies | ✅ `report-service.test.ts:1280` |
| ₹50,000 revenue → MG floor applies | ✅ `report-service.test.ts:824` |
| ₹75,000 revenue → MG floor applies | ✅ `report-service.test.ts:868` |
| ₹80,000 revenue → no floor | ✅ `report-service.test.ts:910` |
| ₹1,00,000 revenue → no floor | ✅ `report-service.test.ts:953` |
| Multiple outlets, same partner | ✅ `report-service.test.ts:1169` |
| Multiple partners, same territory | ✅ `report-service.test.ts:1199` |
| User scoping | ✅ `report-service.test.ts:1127` |
| Cross-partner access denied | ✅ `report-service.test.ts:1193` |

---

## 6. Commercial Rule Ownership Matrix

| Rule | Current Source | Agreement-Derived? | SRS-Derived? | Proposed Ownership Scope | Approval Required? | Current Implementation Status |
|------|---------------|--------------------|--------------|--------------------------|--------------------|-------------------------------|
| **Minimum Guarantee (MG)** | Both agreements clause 2.3 | ✅ Yes — "₹15,000 per month" | ❌ No | **BLOCKED** — plan, agreement, or outlet level requires business decision | ✅ Yes — MG fixed vs. formula, scope | Hardcoded constant `1500000` |
| **MG Formula** | Both agreements clause 2.3 — "5% of Initial Investment" | ✅ Yes — but mathematically inconsistent | ❌ No | **BLOCKED** — formula vs. fixed amount | ✅ Yes — resolve ₹15,000 vs ₹15,500 discrepancy | Not implemented; not resolvable without business decision |
| **Revenue Distribution Percentages** | Both agreements clause 2.2A — 50/20/10/5/15 | ✅ Yes | ❌ No | Agreement Outlet level | ✅ Yes — if future plans allow different percentages | Partial: only Franchise Owner 20% is stored/used; others not represented |
| **Franchise Owner %** | Both agreements clause 2.2A — 20% | ✅ Yes | ❌ No | Agreement Outlet level | ❌ No — fixed by current agreements | Read from `FranchiseRevenueDistribution` |
| **Territory Royalty Rate** | Both agreements clause 2.2C — 2% | ✅ Yes | ❌ No | **BLOCKED** — plan, agreement, or territory level requires business decision | ✅ Yes — if future plans allow different rates | Hardcoded constant `0.02` |
| **Territory Royalty Basis** | Both agreements clause 2.2C — "all operational outlets functioning within the allotted territory" | ✅ Yes | ❌ No | Territory level | ❌ No — fixed by current agreements | Implemented: all territory branches/invoices included |
| **Territory Royalty Distribution** | Implicit — equal among eligible partners | ⚠️ Implicit | ❌ No | Agreement level | ❌ No — fixed by current calculation | Implemented: equal split |
| **Franchise-Sale Commission** | Both agreements clause 2.2C — ₹15,000 per sale | ✅ Yes | ❌ No | Agreement or Outlet level | ❌ No — fixed by current agreements | NOT IMPLEMENTED |
| **Statement/Release Timing** | Both agreements clause 2.3 / 2.4 — "5th Working Day" | ✅ Yes | ❌ No | Agreement level | ❌ No — fixed by current agreements | NOT IMPLEMENTED |
| **Initial Investment** | Both agreements clause 1.3 / 2.1 — ₹3,10,000 | ✅ Yes | ❌ No | Agreement Outlet or Partner level | ❌ No — fixed by current agreements | Partial: `FranchiseOutletProfile.investmentCents` exists but is not used in MG calculation |
| **Operating Model** | Both agreements — FOCO; HUF adds Shop-in-Shop | ✅ Yes | ✅ DOC-025 mentions FOCO/FOFO/COCO/hybrid | Agreement Outlet level | ❌ No — fixed by current agreements | NOT IMPLEMENTED: `outletType` field exists but unused |
| **Agreement Duration** | Both agreements clause 7 — Three (3) Years | ✅ Yes | ❌ No | Agreement level | ❌ No — fixed by current agreements | Implemented: `startDate`/`endDate` |
| **Renewal Terms** | Both agreements clause 7.5 — ₹20,000 fee, prevailing terms | ✅ Yes | ❌ No | Agreement level | ❌ No — fixed by current agreements | NOT IMPLEMENTED |
| **Refund Policy** | Both agreements clause 6.1 — 90% initial, 50% pre-expiry | ✅ Yes | ❌ No | Agreement level | ❌ No — fixed by current agreements | NOT IMPLEMENTED |

---

## 7. Minimum Guarantee (MG) — Detailed Analysis

### 7.1 Agreement Evidence

**AGREEMENT-DERIVED FACT — EXACT CLAUSE TEXT**

Both agreements, clause 2.3, state:

> "The Company shall provide the Franchise Partner with a Minimum Guaranteed Return (MG) equivalent to 5% of the Initial Investment, i.e., ₹/15000- per month, subject to the Franchise Partner's compliance with the terms and conditions of this Agreement."

> "If the total actual earnings exceed the Minimum Guaranteed Return of ₹15000/- for that month, the Company shall pay the higher actual earnings."

> "If the total actual earnings are less than ₹15000/- for that month, the Company shall pay the Minimum Guaranteed Return of ₹15000/-."

> "The Franchise Partner shall always be entitled to receive whichever amount is higher between: The actual earnings accrued under this Agreement; or The Minimum Guaranteed Return (MG) of 15000/- per month."

### 7.2 Mathematical Discrepancy

**AGREEMENT-DERIVED FACT — DO NOT RESOLVE UNILATERALLY**

| Item | Value |
|------|-------|
| Initial Investment (both agreements) | ₹3,10,000 |
| 5% of Initial Investment (as stated in agreement) | ₹15,500 |
| Explicitly stated MG (as stated in agreement) | ₹15,000 |
| Discrepancy | ₹500 |

The agreements contain a **mathematical inconsistency**. The phrase "equivalent to 5% of the Initial Investment, i.e., ₹15,000" is internally contradictory because 5% of ₹3,10,000 is ₹15,500, not ₹15,000.

### 7.3 Required Business/Legal Decisions

| Decision | Options | Status |
|----------|---------|--------|
| Is MG a fixed contractual amount or a formula? | A) Fixed at ₹15,000; B) Formula = 5% × Initial Investment; C) Formula with different base | **BUSINESS/DECISION REQUIRED** |
| If formula, what is the correct base? | ₹3,00,000 (makes 5% = ₹15,000) or ₹3,10,000 (makes 5% = ₹15,500) | **BUSINESS/DECISION REQUIRED** |
| If future agreements have different investment, does MG scale? | Yes / No | **BUSINESS/DECISION REQUIRED** |
| What is the ownership scope of MG? | Plan-level / Agreement-level / Outlet-level / Partner-level | **BUSINESS/DECISION REQUIRED** |

---

## 8. Multiple Franchise Plans

### 8.1 Source Document Evidence

**SRS-DERIVED REQUIREMENT**

DOC-025 (line 8) states the franchise module purpose:

> "Define the reusable Franchise Management module for businesses operating FOCO, FOFO, COCO and hybrid franchise models across multiple brands."

**SRS-DERIVED REQUIREMENT**

DOC-025 core database tables include:
- `franchise_leads`
- `franchisees`
- `agreements`
- `territories`
- `outlets`
- `royalties`
- `revenue_sharing`

**ADR/ARCHITECTURE DECISION**

ADR 014 (line 219) scope:

> "X Nail Bar requires both company-owned and FOCO outlets."

ADR 014 (line 224):

> "DOC-025 requires reusable franchise partner, agreement, territory, outlet, royalty, revenue-sharing, compliance, support, and performance capabilities."

### 8.2 Current Repository State

**NOT IMPLEMENTED**

Exhaustive search of the repository found **no** franchise plan abstraction:
- No `FranchisePlan` model or table
- No `planId`, `plan_id`, `franchise_plan`, or `FranchisePlan` in schema, code, tests, or migrations
- No `FranchiseType`, `FranchiseModel`, `FranchiseCategory`, `CommercialPackage`, `AgreementTemplate`, or `CommercialRuleSet`
- No git commits referencing franchise plans

### 8.3 Determination

**NOT SPECIFIED / BUSINESS DECISION REQUIRED**

DOC-025 mentions multiple franchise models (FOCO, FOFO, COCO, hybrid) but does **not** specify:
- Whether these models are implemented as a reusable "franchise plan" entity
- What fields a franchise plan would contain
- Whether plans are tenant-level, brand-level, or agreement-level
- Which commercial rules vary by plan vs. which are universal

The current architecture treats FOCO as a **semantic classification** (ADR 014), not as a plan entity with distinct commercial rules.

**If future plans require different commercial rules, a plan abstraction or agreement-level override mechanism must be approved before implementation.**

---

## 9. Revenue Distribution

### 9.1 Agreement-Stated Distribution

**AGREEMENT-DERIVED FACT**

Both agreements, clause 2.2A, state the following 100% distribution of Gross/Top-Line revenue:

| Beneficiary | Percentage |
|-------------|------------|
| Salon Operations | 50% |
| Franchise Owner | 20% |
| Product & Marketing | 10% |
| Master Franchise Partner | 5% |
| Company | 15% |
| **Total** | **100%** |

### 9.2 Current Implementation

| Beneficiary | Implemented? | Evidence |
|-------------|--------------|----------|
| Salon Operations (50%) | ❌ NOT IMPLEMENTED | No schema field, no calculation |
| Franchise Owner (20%) | ✅ PARTIAL | `FranchiseRevenueDistribution` stores percentage; `report-service.ts` reads it |
| Product & Marketing (10%) | ❌ NOT IMPLEMENTED | No schema field, no calculation |
| Master Franchise Partner (5%) | ❌ NOT IMPLEMENTED | No schema field, no calculation |
| Company (15%) | ❌ NOT IMPLEMENTED | No schema field, no calculation |

**Current implementation uses only the Franchise Owner 20% share.** The remaining 80% has no schema representation.

### 9.3 Future Revenue-Share Variation

**BUSINESS/DECISION REQUIRED**

If future franchise plans or agreements specify different percentages, the ownership scope must be approved:
- **Plan-level:** Reusable distribution template
- **Agreement-level:** Each agreement carries its own distribution
- **Agreement-outlet-level:** Distribution varies per outlet within an agreement

The current `FranchiseRevenueDistribution` model is **outlet-level** and can support different distributions per outlet without schema changes, but it has no validation that percentages sum to 100%.

---

## 10. Territory Royalty

### 10.1 Agreement Evidence

**AGREEMENT-DERIVED FACT**

Both agreements, clause 2.2C:

> "2% Royalty on the sales turnover of all operational outlets functioning within the allotted territory, as per the Company's approved accounting records."

### 10.2 Current Implementation

| Aspect | Current State |
|--------|---------------|
| Rate | Hardcoded `0.02` (2%) in `report-service.ts:731` |
| Basis | All territory branch sales (`report-service.ts:689-717`) |
| Distribution | Equal split among eligible partners (`report-service.ts:728-734`) |

### 10.3 Future Royalty Variation

**BUSINESS/DECISION REQUIRED**

If future franchise plans or agreements specify different royalty rates, the ownership scope must be approved:
- **Plan-level:** Reusable rate template
- **Agreement-level:** Each agreement carries its own rate
- **Territory-level:** Rate varies by territory
- **Outlet-level:** Rate varies per outlet

The current architecture **cannot** support varying royalty rates without code and schema changes.

---

## 11. Investment

### 11.1 Agreement Evidence

**AGREEMENT-DERIVED FACT**

Both agreements state:
- **Kushwaha:** "Initial Investment of ₹3,10,000" (clause 1.3, 2.1)
- **HUF:** "Initial Investment of ₹3,10,000" with staged payment terms: ₹1,50,000 upfront + ₹75,000 Oct 2026 + ₹85,000 Nov 2026 (clause 2.1)

### 11.2 Current Schema

`FranchiseOutletProfile.investmentCents` (line 188) exists but is **not used** in any payout calculation or MG derivation.

### 11.3 Determination

**NOT SPECIFIED / BUSINESS DECISION REQUIRED**

The source documents do not specify whether `investmentCents` belongs to:
- The franchise partner
- The franchise agreement
- The agreement outlet
- The franchise plan

This determination affects MG formula design (if MG is derived from investment) and refund calculations.

---

## 12. Operating Model

### 12.1 Source Terminology

| Term | Source | Exact Meaning |
|------|--------|---------------|
| **FOCO** | Both agreements, clause 1.1; ADR 014 | Franchise Owned, Company Operated |
| **FOFO** | DOC-025, line 8 | Franchise Owned, Franchise Operated |
| **COCO** | DOC-025, line 8 | Company Owned, Company Operated |
| **hybrid** | DOC-025, line 8 | Mixed model |
| **Shop-in-Shop** | HUF agreement, clause 1.1 location paragraph | Sub-model of FOCO where outlet operates within host premises |

### 12.2 Current Representation

| Concept | Current Representation | Status |
|---------|------------------------|--------|
| FOCO | Semantic classification in ADR 014; `outletType` field exists but unused | NOT IMPLEMENTED |
| FOFO | Mentioned in DOC-025 only | NOT SPECIFIED |
| COCO | Mentioned in DOC-025 only | NOT SPECIFIED |
| hybrid | Mentioned in DOC-025 only | NOT SPECIFIED |
| Shop-in-Shop | Described in HUF agreement only | NOT IMPLEMENTED |

### 12.3 Determination

**NOT SPECIFIED**

Operating model is currently a **descriptive attribute**, not a commercial rule determinant. If future plans assign different commercial rules to different operating models, the model must be explicitly approved as a commercial rule dimension.

---

## 13. Historical Reproducibility

### 13.1 Requirement

**ARCHITECTURAL DECISION REQUIRED**

The system must ensure that **changing future commercial rules does not retroactively change historical franchise payouts** for executed agreements.

### 13.2 Current Architecture Gaps

| Gap | Impact |
|-----|--------|
| `FranchiseRevenueDistribution` has no `validFrom`/`validTo` | Changing a distribution record retroactively changes all historical calculations |
| `FranchiseAgreement` stores no commercial terms | Cannot reconstruct executed terms from agreement alone |
| No snapshot/version mechanism | Cannot preserve commercial terms at execution time |
| MG and royalty are hardcoded constants | Cannot represent plan or agreement variation |

### 13.3 Required Mechanisms (If Multi-Plan Is Approved)

| Mechanism | Purpose | Status |
|-----------|---------|--------|
| Agreement-level commercial override | Preserve terms specific to executed agreement | NOT IMPLEMENTED |
| Effective dating | Allow plan changes without affecting historical calculations | NOT IMPLEMENTED |
| Snapshot/version | Capture commercial terms at execution time | NOT IMPLEMENTED |
| Live plan reference with override | Default to plan terms, allow agreement-specific adjustments | NOT IMPLEMENTED |

**The exact mechanism is an architectural decision, not a business requirement.** It must be designed after business/legal approves which rules are variable and at what scope.

---

## 14. Commercial Rule Ownership Matrix (Expanded)

| Rule | Current Source | Agreement-Derived? | SRS-Derived? | ADR-Derived? | Proposed Ownership Scope | Approval Required? | Current Implementation |
|------|---------------|--------------------|--------------|--------------|--------------------------|--------------------|------------------------|
| MG amount | Both agreements, clause 2.3 | ✅ Yes | ❌ No | ❌ No | Plan / Agreement / Outlet | ✅ Yes | Hardcoded `1500000` |
| MG formula | Both agreements, clause 2.3 | ✅ Yes (discrepant) | ❌ No | ❌ No | Plan / Agreement / Outlet | ✅ Yes | Not implemented |
| Revenue distribution % | Both agreements, clause 2.2A | ✅ Yes | ❌ No | ❌ No | Agreement Outlet | ✅ Yes (if variable) | Partial: only 20% stored |
| Franchise owner % | Both agreements, clause 2.2A | ✅ Yes | ❌ No | ❌ No | Agreement Outlet | ❌ No | Read from distribution table |
| Territory royalty rate | Both agreements, clause 2.2C | ✅ Yes | ❌ No | ❌ No | Plan / Agreement / Territory | ✅ Yes (if variable) | Hardcoded `0.02` |
| Territory royalty basis | Both agreements, clause 2.2C | ✅ Yes | ❌ No | ❌ No | Territory | ❌ No | Implemented |
| Franchise-sale commission | Both agreements, clause 2.2C | ✅ Yes | ❌ No | ❌ No | Agreement / Outlet | ❌ No | NOT IMPLEMENTED |
| Statement/release timing | Both agreements, clause 2.3/2.4 | ✅ Yes | ❌ No | ❌ No | Agreement | ❌ No | NOT IMPLEMENTED |
| Initial investment | Both agreements, clause 1.3/2.1 | ✅ Yes | ❌ No | ❌ No | Agreement Outlet / Partner | ❌ No | Partial: field exists, unused |
| Operating model | Both agreements, clause 1.1/1.3; ADR 014 | ✅ Yes | ✅ DOC-025 | ✅ ADR 014 | Agreement Outlet | ❌ No | NOT IMPLEMENTED |
| Agreement duration | Both agreements, clause 7 | ✅ Yes | ❌ No | ❌ No | Agreement | ❌ No | Implemented |
| Renewal terms | Both agreements, clause 7.5 | ✅ Yes | ❌ No | ❌ No | Agreement | ❌ No | NOT IMPLEMENTED |
| Refund policy | Both agreements, clause 6.1 | ✅ Yes | ❌ No | ❌ No | Agreement | ❌ No | NOT IMPLEMENTED |
| Territory definition | Both agreements, clause 1.2 | ✅ Yes | ❌ No | ❌ No | Agreement | ❌ No | Implemented |

---

## 15. Required Business/Legal Decisions

The following decisions **must** be approved before any commercial-rule implementation proceeds:

### 15.1 Minimum Guarantee (MG)

| # | Decision | Options | Status |
|---|----------|---------|--------|
| MG-01 | Is MG a fixed amount or a formula? | Fixed ₹15,000 / 5% × Investment / Other formula | **PENDING** |
| MG-02 | If formula, what is the correct base investment? | ₹3,00,000 / ₹3,10,000 / Other | **PENDING** |
| MG-03 | What is the MG ownership scope? | Plan / Agreement / Outlet / Partner | **PENDING** |
| MG-04 | Can future agreements have different MG values? | Yes / No | **PENDING** |

### 15.2 Revenue Distribution

| # | Decision | Options | Status |
|---|----------|---------|--------|
| RD-01 | Can future plans/agreements have different revenue-share percentages? | Yes / No | **PENDING** |
| RD-02 | What is the ownership scope for revenue distribution? | Plan / Agreement / Agreement Outlet | **PENDING** |
| RD-03 | Must distributions always sum to 100%? | Yes / No | **PENDING** |
| RD-04 | How are the other 80% beneficiaries (Salon Operations, Product & Marketing, Master Franchise Partner, Company) represented in the system? | Schema / Not in scope | **PENDING** |

### 15.3 Territory Royalty

| # | Decision | Options | Status |
|---|----------|---------|--------|
| TR-01 | Can future plans/agreements have different royalty rates? | Yes / No | **PENDING** |
| TR-02 | What is the ownership scope for royalty rate? | Plan / Agreement / Territory / Outlet | **PENDING** |

### 15.4 Investment

| # | Decision | Options | Status |
|---|----------|---------|--------|
| INV-01 | What entity does `investmentCents` belong to? | Partner / Agreement / Agreement Outlet | **PENDING** |
| INV-02 | Is `investmentCents` used for MG calculation? | Yes / No | **PENDING** |

### 15.5 Operating Model

| # | Decision | Options | Status |
|---|----------|---------|--------|
| OM-01 | Is operating model a commercial rule determinant? | Yes / No | **PENDING** |
| OM-02 | If yes, which models are approved for implementation? | FOCO / FOFO / COCO / hybrid / Shop-in-Shop / Other | **PENDING** |

### 15.6 Historical Reproducibility

| # | Decision | Options | Status |
|---|----------|---------|--------|
| HR-01 | Must historical payouts be reproducible after plan/rule changes? | Yes / No | **PENDING** |
| HR-02 | What mechanism preserves executed terms? | Agreement snapshot / Effective dating / Versioning / Other | **PENDING** |
| HR-03 | Can a future plan change affect existing agreements? | Yes / No | **PENDING** |

### 15.7 Franchise Plan Abstraction

| # | Decision | Options | Status |
|---|----------|---------|--------|
| FP-01 | Is a reusable franchise plan abstraction required? | Yes / No | **PENDING** |
| FP-02 | If yes, what is the exact definition and field list? | To be determined | **PENDING** |
| FP-03 | What is the relationship between plan and agreement? | 1:Many / Many:Many / Agreement-only | **PENDING** |

---

## 16. Implementation Gate

**NO COMMERCIAL-RULE IMPLEMENTATION SHOULD PROCEED UNTIL THE REQUIRED BUSINESS/LEGAL DECISIONS LISTED IN SECTION 15 ARE APPROVED, CONSISTENT WITH ADR 014.**

This means:
- Do not modify the MG constant.
- Do not modify royalty logic.
- Do not create a `FranchisePlan` model.
- Do not modify `FranchiseAgreement` to add commercial fields.
- Do not implement agreement snapshots or effective dating.
- Do not implement the remaining 80% revenue distribution beneficiaries.

Implementation is blocked until ADR 014's commercial-policy gate is lifted by explicit approval of the applicable commercial rules.

---

## 17. Current vs. Proposed Conceptual Model

### 17.1 Current Implementation (What Exists Now)

```
Tenant
  └── BusinessUnit
        └── Branch
              ├── Territory (via Branch.territoryId)
              ├── FranchiseOutletProfile (partner + branch + territory + outletType + investmentCents)
              └── FranchiseAgreement (partner + territory + startDate + endDate + isActive)
                    └── FranchiseAgreementOutlet (agreement + branch)
                          └── FranchiseRevenueDistribution (agreementOutlet + beneficiary + percentage)
```

**Current commercial rules are hardcoded in `report-service.ts`:** MG = ₹15,000; royalty = 2%.

### 17.2 Proposed Conceptual Model (Requires Approval)

```
Franchise Plan (if approved)
    ↓
Franchise Agreement
    ↓
Agreement Outlet(s)
    ↓
Outlet / Branch

(Parallel)
Franchise Partner = legal/commercial counterparty
Territory = geographic scope
```

**The proposed conceptual model is NOT YET APPROVED.** It is presented here to distinguish current implementation from future architecture.

---

## 18. Open Questions for Business/Legal Review

1. **MG Discrepancy:** Why do the agreements state "5% of Initial Investment, i.e., ₹15,000" when 5% of ₹3,10,000 equals ₹15,500? Is MG a fixed amount or a formula?
2. **Future MG Variation:** Will future agreements negotiate different MG values based on different investment amounts?
3. **Revenue Distribution Completeness:** The agreements specify a 100% distribution (50/20/10/5/15). Only 20% is implemented. Are the other beneficiaries (Salon Operations, Product & Marketing, Master Franchise Partner, Company) required in the system?
4. **Royalty Rate Variability:** Will future plans use royalty rates other than 2%?
5. **Plan Abstraction:** Is a reusable franchise plan/template needed, or should all commercial terms live on the agreement?
6. **Historical Reproducibility:** If commercial rules change, must historical payouts remain fixed to the terms in effect at the time?
7. **Operating Model Semantics:** Does FOCO vs. FOFO vs. COCO vs. hybrid change commercial rules, or is it purely an operational classification?
8. **Renewal Terms:** When agreements renew (clause 7.5), do commercial terms reset to plan defaults, or are they negotiated per renewal?

---

## 19. Approval Checklist

Before any commercial-rule implementation proceeds, the following must be approved:

- [ ] MG-01: MG fixed vs. formula decision
- [ ] MG-02: Correct investment base for MG formula (if applicable)
- [ ] MG-03: MG ownership scope (plan / agreement / outlet / partner)
- [ ] MG-04: Future MG variability permission
- [ ] RD-01: Revenue-share variability permission
- [ ] RD-02: Revenue distribution ownership scope
- [ ] RD-03: 100% distribution validation requirement
- [ ] RD-04: Other 80% beneficiaries implementation scope
- [ ] TR-01: Royalty rate variability permission
- [ ] TR-02: Royalty ownership scope
- [ ] INV-01: `investmentCents` ownership entity
- [ ] INV-02: `investmentCents` usage in MG calculation
- [ ] OM-01: Operating model as commercial rule determinant
- [ ] OM-02: Approved operating models for implementation
- [ ] HR-01: Historical reproducibility requirement
- [ ] HR-02: Mechanism for preserving executed terms
- [ ] HR-03: Plan change impact on existing agreements
- [ ] FP-01: Franchise plan abstraction requirement
- [ ] FP-02: Franchise plan definition and fields (if approved)
- [ ] FP-03: Plan-agreement relationship (if approved)

---

## 20. References

- ADR 014: X Nail Bar FOCO Operating Model (`docs/DECISIONS.md`)
- ADR 004: Dynamic Tenant Hierarchy (`docs/DECISIONS.md`)
- ADR 010: Tenant Code Physical Separation (`docs/DECISIONS.md`)
- DOC-025: Franchise Management SRS (`docs/LWILL-DOC-025-Franchise-Management-SRS-v1.0.txt`)
- DOC-017: X Nail ERP SRS (`docs/LWILL-DOC-017-X-Nail-ERP-SRS-MVP-v1.0.txt`)
- DOC-009: Master Platform Blueprint (`docs/LWILL-DOC-009-Master-Platform-Blueprint-Volume-1-v1.0.txt`)
- Executed Agreement — Kushwaha (`docs/franchise-agreements/X NAILS  Franchise Agreement - Kushwaha.txt`)
- Executed Agreement — HUF (`docs/franchise-agreements/X NAILS  Franchise Agreement - HUF.txt`)
- Prior Review (`docs/FRANCHISE-COMMERCIAL-RULES-REVIEW.md`)

---

*End of specification.*

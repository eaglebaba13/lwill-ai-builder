# LWILL AI BUILDER — Franchise Settlement Business Decision Sheet

**Document ID:** LWILL-DOC-025-SETTLEMENT-BUSINESS-DECISIONS  
**Version:** 2.0  
**Status:** APPROVED — Business Baseline Complete  
**Branch:** `phase-1d-native-auth`  
**Created:** 2026-09-14  
**Updated:** 2026-09-14

**Purpose:** Make every unresolved franchise settlement and payment decision explicit so business, finance, and legal can approve or reject it before engineering implementation begins.

**Related Documents:**
- `docs/FRANCHISE-SETTLEMENT-PAYMENT-RULES-SPECIFICATION.md` v1.0
- `docs/FRANCHISE-COMMERCIAL-RULES-SPECIFICATION.md` v1.3
- `docs/FRANCHISE-COMMERCIAL-RULES-APPROVALS.md` v1.1
- `docs/DECISIONS.md` §ADR 014, §ADR 016
- `docs/LWILL-DOC-025-Franchise-Management-SRS-v1.0.txt`
- `docs/LWILL-DOC-017-X-Nail-ERP-SRS-MVP-v1.0.txt`
- `docs/LWILL-DOC-023-Finance-Accounting-SRS-v1.0.txt`
- `docs/franchise-agreements/X NAILS  Franchise Agreement - Kushwaha.txt`
- `docs/franchise-agreements/X NAILS  Franchise Agreement - HUF.txt`

---

## Existing Approved Commercial Rules

The following commercial rules are already approved and implemented. Settlement must consume the existing commercial calculation engine rather than duplicate or redesign it.

| Decision | Rule | Status |
|----------|------|--------|
| MG-01 | Hybrid: existing ₹3.10L product = fixed ₹15,000/month MG; all other/new products = formula-based | **APPROVED, IMPLEMENTED** |
| MG-02 | Formula MG = 3% of Initial Investment | **APPROVED, IMPLEMENTED** |
| MG-03 | Agreement-level MG (one MG per agreement) | **APPROVED, IMPLEMENTED** |
| MG-04 | Agreement-level override for future MG variability | **APPROVED, IMPLEMENTED** |
| NP-01 | Net Sales = Invoice Total − GST | **APPROVED, IMPLEMENTED** |
| NP-02 | Payout = MAX(MG, 30% of Net Sales excluding GST) | **APPROVED, IMPLEMENTED** |
| TR-01 | Royalty rate: agreement-level override | **APPROVED, IMPLEMENTED** |
| TR-02 | Royalty ownership: agreement-level | **APPROVED, IMPLEMENTED** |
| TR-03 | Royalty basis: all operational outlets in territory | **APPROVED, IMPLEMENTED** |
| RD-01 | Revenue distribution: per-row via `FranchiseRevenueDistribution` | **APPROVED, IMPLEMENTED** |
| RD-02 | Distribution ownership: Agreement-Outlet level | **APPROVED, IMPLEMENTED** |
| RD-03 | Distribution validation: sum-to-100% enforced at write time | **APPROVED, IMPLEMENTED** |
| HR-01 | Historical reproducibility required | **APPROVED, IMPLEMENTED** |
| HR-02 | Agreement-level commercial-terms snapshot | **APPROVED, IMPLEMENTED** |
| HR-03 | Existing agreements frozen to snapshot | **APPROVED, IMPLEMENTED** |
| CX-01 | Single plan, agreement-level overrides only | **APPROVED, IMPLEMENTED** |
| CX-02 | Historical reproducibility required | **APPROVED, IMPLEMENTED** |
| CX-03 | Executed agreements are binding source of truth | **APPROVED, IMPLEMENTED** |

**Engineered payout calculation already exists and produces correct results. Settlement wraps this calculation in a formal financial obligation.**

---

## ADR-016 Domain Boundary

The following separation is architecturally mandated by ADR 016 and must be preserved:

```
Customer Payment (Invoice → Payment)
  ≠ Gateway Settlement (payment provider reconciliation)
  ≠ Franchise Partner Settlement (MG/variable/royalty/commission)
  ≠ Marketplace Vendor Settlement (future)
  ≠ Bank Reconciliation (DOC-023)
```

**Source:** ADR 016 (lines 389, 446): *"Customer Payment is separate from settlement"*, *"Customer Payment ≠ Gateway Settlement ≠ Franchise Partner Settlement ≠ Marketplace Vendor Settlement."*

Franchise settlement must remain architecturally separate from customer invoice payment. The existing `Payment` model (linked to `Invoice`) is for customer payments only.

---

## Approved Settlement Baseline

All 20 FR-SET decisions are approved. Summary:

| FR-SET | Decision | Approved Option | Key Rule |
|--------|----------|-----------------|----------|
| 001 | Settlement Period | **A** | Calendar month, 1st–last day. Statement/payment due by 5th Working Day of succeeding month. |
| 002 | Statement Content | **B** | Full statement: period, gross sales, GST, net sales, MG, variable return, higher-of payout, royalty, line-item breakdown, previous balance, adjustments, amount paid, outstanding balance. |
| 003 | Settlement = Payout | **A** | Settlement amount = existing payout calculation result. No duplicate formulas. |
| 004 | Settlement Lifecycle | **B** | CALCULATED → APPROVED → PARTIALLY_PAID → PAID |
| 005 | Approval Workflow | **B** | Two-step: Accountant generates → Tenant Admin approves. |
| 006 | Payment Methods | **B** | Bank Transfer, UPI. No cash, cheque, or configurable methods. |
| 007 | Payment Statuses | **B** | PENDING → CONFIRMED / FAILED. No REVERSED. |
| 008 | Partial Payment | **B** | Allowed. Multiple payments per settlement until fully paid. |
| 009 | Outstanding Balance | **B** | Tracked and carries forward. No additional carry-forward rules. |
| 010 | Reconciliation | **A** | No automated reconciliation. Manual verification by Finance. Bank reconciliation is DOC-023/ADR-016. |
| 011 | Adjustments | **B** | Manual categorized adjustments allowed. Operational losses/depreciation/business losses PROHIBITED per agreement clause 2.4A. Adjustment category taxonomy: NOT SPECIFIED. |
| 012 | Refund Workflow | **A** | Manual, outside platform. Platform may track agreement-defined refund amount/timing where supported. No termination/refund workflow in settlement phase. |
| 013 | Franchise-Sale Commission | **A** | Included in monthly settlement when agreement-defined commission trigger occurs. "Successful franchise sold" definition: NOT SPECIFIED. |
| 014 | Renewal Fee | **A** | Manual. Platform tracks agreement dates. No renewal workflow in settlement phase. |
| 015 | Tax Treatment | **A** | Settlement does NOT calculate GST/TDS/tax. Records gross amounts. Finance handles tax externally. **This does NOT mean taxes are legally inapplicable.** |
| 016 | Dispute Workflow | **A** | No software dispute workflow. Disputes handled externally per agreement/legal process. |
| 017 | Settlement Reversal | **B** | Supported with audit. Reversed settlement remains historically recorded, never deleted. Reversal accounting behavior: NOT SPECIFIED. |
| 018 | Settlement RBAC | **C** | Four permissions: `settlement.view`, `settlement.generate`, `settlement.approve`, `settlement.pay`. Role mapping: NOT YET ASSIGNED. |
| 019 | Settlement Data Model | **APPROVED** | Entities: `FranchiseSettlement`, `FranchiseSettlementLine`, `FranchisePayment`. See detailed requirements below. |
| 020 | Finance/GL | **A** | No GL integration. No accounting entries. DOC-023 Finance/GL is separate future implementation. |

---

## FR-SET-001: Settlement Period — APPROVED

### Source Evidence

Both agreements (clause 2.3):
> *"At the end of each calendar month, the Company shall calculate the total amount payable to the Franchise Partner, including revenue sharing, franchise commissions, royalties and all other earnings under this Agreement."*

Both agreements (clause 2.3 / 2.4):
> *"The Company shall release the payable amount on or before the 5th Working Day of the succeeding month, along with a detailed statement of accounts."*

> *"The Company shall provide complete revenue statements on or before the 5th Working Day of every succeeding month."*

### Decision

**APPROVE OPTION A**

Calendar month: settlement period = 1st to last day of each calendar month. Statement and payment due by 5th Working Day of the following month.

### Implementation Impact

The settlement period determines:
- Invoice date range included in each settlement
- Duplicate prevention boundaries
- Outstanding balance carry-forward periods
- Reporting period on statements

---

## FR-SET-002: Statement Content — APPROVED

### Source Evidence

Both agreements (clause 2.3):
> *"along with a detailed statement of accounts"*

Both agreements (clause 2.4):
> *"The Company shall provide complete revenue statements"*

### Decision

**APPROVE OPTION B**

Full statement:
- period
- gross sales
- GST
- net sales
- MG
- variable return
- higher-of payout
- royalty
- line-item breakdown
- previous balance
- adjustments
- amount paid
- outstanding balance

Do not add fields beyond these unless already required by another approved source.

---

## FR-SET-003: Settlement Relationship to Payout — APPROVED

### Source Evidence

Both agreements (clause 2.3):
> *"the Company shall calculate the total amount payable to the Franchise Partner, including revenue sharing, franchise commissions, royalties and all other earnings under this Agreement."*

### Decision

**APPROVE OPTION A**

Settlement amount = existing payout calculation result. Settlement must consume the existing commercial calculation engine. Do not duplicate or redesign commercial formulas.

---

## FR-SET-004: Settlement Lifecycle — APPROVED

### Source Evidence

No authoritative source defines settlement lifecycle states.

### Decision

**APPROVE OPTION B**

Settlement lifecycle: CALCULATED → APPROVED → PARTIALLY_PAID → PAID

Do not add DISPUTED, REVERSED, SUBMITTED, FAILED or other settlement states.

---

## FR-SET-005: Approval Workflow — APPROVED

### Source Evidence

No authoritative source defines who generates, reviews, or approves settlements.

### Decision

**APPROVE OPTION B**

Two-step approval:
- Accountant generates settlement
- Tenant Admin approves settlement

Do not introduce additional approval levels.

---

## FR-SET-006: Payment Methods — APPROVED

### Source Evidence

No authoritative source specifies how franchise partners are paid.

ADR 016 (line 440): *"Payment method taxonomy: NOT SPECIFIED — APPROVAL REQUIRED. Current implementation uses free-text `method` field."*

### Decision

**APPROVE OPTION B**

Payment methods:
- Bank Transfer
- UPI

Do not add cash, cheque or configurable payment methods.

---

## FR-SET-007: Payment Statuses — APPROVED

### Source Evidence

No authoritative source defines payment status states.

ADR 016 (line 437): *"Payment status model (PAID/PARTIAL/OUTSTANDING/REFUNDED): NOT SPECIFIED — APPROVAL REQUIRED."*

### Decision

**APPROVE OPTION B**

Payment lifecycle: PENDING → CONFIRMED / FAILED

Do not add REVERSED unless separately approved in a future decision.

---

## FR-SET-008: Partial Payment — APPROVED

### Source Evidence

No authoritative source addresses whether a franchise settlement may be partially paid.

The agreement uses singular "pay" (clause 2.3): *"the Company shall pay the higher actual earnings"* — which could imply full payment, but is not explicit.

### Decision

**APPROVE OPTION B**

Partial payments are allowed. A settlement may receive multiple payments until fully paid.

---

## FR-SET-009: Outstanding Balance — APPROVED

### Source Evidence

No explicit source requires outstanding balance tracking across periods.

Agreement clause 6.1 mentions "outstanding dues, damages or liabilities" in refund context, which implies outstanding amounts can exist.

### Decision

**APPROVE OPTION B**

Outstanding balance is tracked and carries forward. Do not invent additional carry-forward rules beyond tracking the outstanding obligation.

---

## FR-SET-010: Reconciliation — APPROVED

### Source Evidence

DOC-023 (Finance SRS) specifies FIN-006: "Support bank reconciliation" as a general finance requirement.

ADR 016 (line 447): *"DOC-023 bank reconciliation is a separate Finance capability."*

No source defines franchise-specific reconciliation.

### Decision

**APPROVE OPTION A**

No automated reconciliation in the settlement engine. Payments are recorded with references and manually verified by Finance. Bank reconciliation remains a separate Finance capability under DOC-023 / ADR-016.

---

## FR-SET-011: Adjustments — APPROVED

### Source Evidence

Both agreements (clause 2.4A):
> *"Any operational losses, depreciation, business losses, or other liabilities incurred by the Company in operating the outlet shall not be adjusted, deducted, or recovered from the Franchise Partner's investment or refund amount. The Franchise Partner shall not be responsible for such liabilities."*

### Decision

**APPROVE OPTION B**

Manual categorized adjustments are allowed.

**PROHIBITED:** Operational losses, depreciation, business losses, or other liabilities described by the agreement as non-recoverable from the Franchise Partner's investment/refund must NOT be deducted as settlement adjustments.

**NOT SPECIFIED:** Adjustment-category taxonomy. If a category is required during implementation but not specified, stop and report it as NOT SPECIFIED.

---

## FR-SET-012: Refund Workflow — APPROVED

### Source Evidence

Both agreements (clause 6.1):
> *"Upon termination of this Agreement, the Company shall refund 90% of the Initial Investment, after adjustment of any outstanding dues, damages or liabilities, if any."*

> *"The deduction of 10% represents administrative expenses, documentation charges, onboarding, branding, training and other initial operational expenses already incurred by the Company."*

> *"The refund shall be processed within 30 (Thirty) Working Days from completion of settlement and handover formalities."*

> *"In the event that the Franchise Agreement is terminated or mutually closed before the expiry of the agreed tenure, the Company shall refund 50% of the original investment amount made by the Franchise Partner."*

Both agreements (clause 2.3 / MG Default):
> *"In the event the Franchise Partner does not receive the applicable Commission or Minimum Guarantee (MG) for two (2) consecutive months, the same shall be treated as a material breach... the Franchise Partner shall have the right to terminate the Agreement and shall be entitled to an immediate refund of 90% of the Franchise Investment."*

### Decision

**APPROVE OPTION A**

Refund remains manually processed outside the platform. The platform may document/track the agreement-defined refund amount and timing only where already supported by existing requirements. Do not implement a termination/refund workflow in this settlement phase.

---

## FR-SET-013: Franchise-Sale Commission Settlement — APPROVED

### Source Evidence

Both agreements (clause 2.2C):
> *"₹15,000 (Rupees Fifteen Thousand Only) for every successful franchise sold in the territory allotted to the Franchise Partner, payable by the Company to the Franchise Partner."*

### Decision

**APPROVE OPTION A**

Franchise-sale commission is included in the monthly settlement when the agreement-defined commission trigger has occurred.

**NOT SPECIFIED:** Exact definition of "successful franchise sold", cancellation/reversal behavior, tax treatment. These remain NOT SPECIFIED unless already defined by an authoritative source.

---

## FR-SET-014: Renewal Fee Settlement — APPROVED

### Source Evidence

Both agreements (clause 7.5):
> *"Upon successful completion of the initial contract period, the Franchise Partner shall have the first right to renew the franchise for the same outlet by paying a renewal fee of ₹20,000."*

> *"Upon payment of the renewal fee and execution of the renewal documents, the Agreement shall be extended for a further three (3) years on the prevailing renewal terms and conditions."*

### Decision

**APPROVE OPTION A**

Renewal remains manually handled. The platform may continue to track agreement dates. Do not implement a renewal workflow in this settlement phase.

---

## FR-SET-015: GST/TDS/Tax Treatment — APPROVED

### Source Evidence

ADR 014 (line 301): *"Tax treatment of royalty, sharing, reimbursements, and settlement transactions"* — listed as NOT SPECIFIED.

### Decision

**APPROVE OPTION A**

Settlement does NOT calculate GST/TDS/tax. Settlement records gross settlement amounts without platform tax calculation. Finance handles applicable tax externally until a formal tax specification is approved.

**CRITICAL CLARIFICATION:** This does NOT mean taxes are legally inapplicable. It means tax calculation/withholding is outside this settlement implementation.

---

## FR-SET-016: Dispute Workflow — APPROVED

### Source Evidence

Both agreements (clause 10): Disputes referred to arbitration under the Arbitration and Conciliation Act, 1996. This is a legal clause, not a software workflow.

### Decision

**APPROVE OPTION A**

No software dispute workflow. Disputes remain handled externally according to the agreement/legal process.

---

## FR-SET-017: Settlement Reversal — APPROVED

### Source Evidence

No authoritative source defines settlement reversal rules.

### Decision

**APPROVE OPTION B**

Settlement reversal is supported with audit. A reversed settlement must remain historically recorded and must never be deleted.

**NOT SPECIFIED:** Complete reversal accounting behavior or reversal state model beyond this approval. If implementation requires additional reversal rules, report them as NOT SPECIFIED before coding.

---

## FR-SET-018: Settlement RBAC — APPROVED

### Source Evidence

No authoritative source defines settlement-specific permissions.

Current franchise permissions: `franchise.read`, `franchise.write`.

### Decision

**APPROVE OPTION C**

Settlement permissions:
- `settlement.view`
- `settlement.generate`
- `settlement.approve`
- `settlement.pay`

**NOT YET ASSIGNED:** Do not automatically assign these permissions to roles yet unless the repository already contains an authoritative role mapping. If role mapping is absent, identify it for the implementation design phase.

---

## FR-SET-019: Settlement Data Model — APPROVED

### Source Evidence

No authoritative source defines the settlement data model.

### Decision

**APPROVE AS PROPOSED**

Approved settlement-domain entities:

| Entity | Purpose |
|--------|---------|
| `FranchiseSettlement` | Formal financial obligation for a period |
| `FranchiseSettlementLine` | Individual components (MG, variable, royalty, commission, adjustment) |
| `FranchisePayment` | Payment records linked to settlement (separate from Invoice Payment) |

Architectural requirements:
- Tenant isolated
- Settlement linked to FranchiseAgreement / FranchisePartner as appropriate
- Settlement lines preserve calculation breakdown
- Terms snapshot captured at settlement generation
- Historical settlement calculation must remain reproducible
- FranchisePayment remains separate from Invoice Payment
- Approved settlement data must be immutable except through explicitly supported controlled operations
- Duplicate settlement generation must be prevented
- Integer cents for monetary amounts
- Proper foreign keys and indexes
- Auditability

**IMPORTANT:** The approved data-model baseline does NOT mean every field in the previous proposal is automatically approved. During implementation design, distinguish: APPROVED / REQUIRED BY EXISTING ARCHITECTURE / TECHNICAL IMPLEMENTATION DETAIL / NOT SPECIFIED.

---

## FR-SET-020: Finance/GL Prerequisites — APPROVED

### Source Evidence

DOC-023 (Finance SRS) specifies: Chart of Accounts, General Ledger, Accounts Receivable, Accounts Payable, Bank Reconciliation — NONE of which are implemented.

### Decision

**APPROVE OPTION A**

Settlement operates without General Ledger integration. No GL/accounting entries are generated by the settlement engine. Finance can handle accounting externally. DOC-023 Finance/GL remains a separate future implementation.

---

## Remaining NOT SPECIFIED Items

The following sub-rules remain unresolved despite their parent FR-SET decision being approved:

| Parent Decision | Unresolved Sub-Rule | Status |
|----------------|---------------------|--------|
| FR-SET-002 | Digital signature / authorization mark on statements | NOT SPECIFIED |
| FR-SET-011 | Adjustment-category taxonomy (which categories are permitted) | NOT SPECIFIED |
| FR-SET-013 | Definition of "successful franchise sold" | NOT SPECIFIED |
| FR-SET-013 | Commission cancellation/reversal behavior | NOT SPECIFIED |
| FR-SET-013 | Commission tax treatment | NOT SPECIFIED |
| FR-SET-017 | Complete reversal accounting behavior | NOT SPECIFIED |
| FR-SET-017 | Reversal state model details | NOT SPECIFIED |
| FR-SET-018 | Role → permission mapping (which roles get settlement.* permissions) | NOT SPECIFIED |
| FR-SET-019 | Final field list per entity (distinguish APPROVED vs IMPLEMENTATION DETAIL) | NOT SPECIFIED |
| FR-SET-015 | Tax applicability (taxes may still apply legally — just not calculated by platform) | NOT SPECIFIED (external) |
| FR-SET-020 | GL/accounting entry format (DOC-023 future) | NOT SPECIFIED (future) |

**Do NOT treat "APPROVED" parent decisions as blanket approval for unspecified sub-rules.**

---

## Engineering Gate

**SETTLEMENT BUSINESS BASELINE: APPROVED FOR TECHNICAL DESIGN**

**ENGINEERING IMPLEMENTATION: NOT STARTED**

Before coding, a final technical implementation/schema review is required.

All 20 FR-SET decisions are approved. The business baseline is complete. Engineering may begin technical design.

Minimum technical design deliverables before implementation:
- Prisma schema for FranchiseSettlement, FranchiseSettlementLine, FranchisePayment
- Migration strategy
- Service interface design
- API route design
- RBAC permission assignment to roles
- Adjustment-category taxonomy (if required)
- Reversal behavior specification (if required beyond audit trail)

---

## Approval Summary

| FR-SET ID | Decision Question | Approved Option | Status |
|-----------|-------------------|-----------------|--------|
| FR-SET-001 | Settlement period | A — Calendar month, 5th WD due | **APPROVED** |
| FR-SET-002 | Statement content | B — Full statement | **APPROVED** |
| FR-SET-003 | Settlement = payout | A — Direct wrapper | **APPROVED** |
| FR-SET-004 | Settlement lifecycle | B — CALCULATED→APPROVED→PARTIALLY_PAID→PAID | **APPROVED** |
| FR-SET-005 | Approval workflow | B — Two-step (Accountant→Admin) | **APPROVED** |
| FR-SET-006 | Payment methods | B — Bank Transfer + UPI | **APPROVED** |
| FR-SET-007 | Payment statuses | B — PENDING→CONFIRMED/FAILED | **APPROVED** |
| FR-SET-008 | Partial payment | B — Allowed | **APPROVED** |
| FR-SET-009 | Outstanding balance | B — Tracked, carries forward | **APPROVED** |
| FR-SET-010 | Reconciliation | A — No automated reconciliation | **APPROVED** |
| FR-SET-011 | Adjustments | B — Manual categorized (losses PROHIBITED) | **APPROVED** |
| FR-SET-012 | Refund workflow | A — Manual, outside platform | **APPROVED** |
| FR-SET-013 | Commission settlement | A — In monthly settlement | **APPROVED** |
| FR-SET-014 | Renewal fee | A — Manual | **APPROVED** |
| FR-SET-015 | Tax treatment | A — No platform tax calculation | **APPROVED** |
| FR-SET-016 | Dispute workflow | A — No software workflow | **APPROVED** |
| FR-SET-017 | Settlement reversal | B — With audit | **APPROVED** |
| FR-SET-018 | Settlement RBAC | C — 4 granular permissions | **APPROVED** |
| FR-SET-019 | Settlement data model | APPROVED — 3 entities | **APPROVED** |
| FR-SET-020 | Finance/GL | A — No GL integration | **APPROVED** |

### Status Summary

| Status | Count |
|--------|-------|
| **APPROVED** | **20** |
| Remaining NOT SPECIFIED sub-rules | 11 |

---

## Critical Tax Clarification

FR-SET-015 Option A means:

**"Tax calculation is OUTSIDE the settlement engine."**

It does NOT mean:

**"No tax applies."**

This distinction must be preserved in all implementation and documentation.

---

## Critical ADR-016 Boundary

Preserve:

```
Customer Payment ≠ Gateway Settlement ≠ Franchise Partner Settlement ≠ Marketplace Vendor Settlement ≠ Bank Reconciliation
```

Existing Invoice Payment remains customer payment only.

FranchisePayment is a separate settlement-domain entity.

---

*End of decision sheet. Version 2.0 — All 20 FR-SET decisions approved.*

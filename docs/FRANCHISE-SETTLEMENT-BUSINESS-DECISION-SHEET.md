# LWILL AI BUILDER — Franchise Settlement Business Decision Sheet

**Document ID:** LWILL-DOC-025-SETTLEMENT-BUSINESS-DECISIONS  
**Version:** 1.0  
**Status:** Draft — Pending Business/Finance/Legal Approval  
**Branch:** `phase-1d-native-auth`  
**Created:** 2026-09-14

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

## How to Use This Document

1. Read each FR-SET decision.
2. Review the source evidence.
3. Select an option or write a modification.
4. Record the decision in the **Decision** field.
5. Sign in the **Approval Summary** table at the end.

**Decision field options:**
- **APPROVE OPTION A** — accept Option A as written
- **APPROVE OPTION B** — accept Option B as written
- **MODIFY** — write the approved modification in the notes
- **DEFER** — postpone to a future phase

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

## FR-SET-001: Settlement Period

### Source Evidence

Both agreements (clause 2.3):
> *"At the end of each calendar month, the Company shall calculate the total amount payable to the Franchise Partner, including revenue sharing, franchise commissions, royalties and all other earnings under this Agreement."*

Both agreements (clause 2.3 / 2.4):
> *"The Company shall release the payable amount on or before the 5th Working Day of the succeeding month, along with a detailed statement of accounts."*

> *"The Company shall provide complete revenue statements on or before the 5th Working Day of every succeeding month."*

### Current Status

**REQUIRES APPROVAL**

The agreement implies monthly calculation and monthly statement/payment, but does not explicitly define a "settlement period" as a system concept.

### Implementation Impact

The settlement period determines:
- Invoice date range included in each settlement
- Duplicate prevention boundaries
- Outstanding balance carry-forward periods
- Reporting period on statements

### Proposed Options

| Option | Description |
|--------|-------------|
| **A** | Calendar month: settlement period = 1st to last day of each calendar month. Statement and payment due by 5th Working Day of the following month. |
| **B** | Custom period: configurable start/end dates per settlement. More flexible but more complex. |

### Approving Authority

**BUSINESS / FINANCE**

### Decision

**APPROVE OPTION A / APPROVE OPTION B / MODIFY / DEFER**

Notes: _______________________________________________________

---

## FR-SET-002: Statement Content

### Source Evidence

Both agreements (clause 2.3):
> *"along with a detailed statement of accounts"*

Both agreements (clause 2.4):
> *"The Company shall provide complete revenue statements"*

### Current Status

**REQUIRES APPROVAL**

The agreement requires "detailed" and "complete" statements but does not specify exact fields.

### Implementation Impact

Statement content determines what the settlement system displays to franchise partners. Incomplete statements may cause disputes.

### Fields Derivable from Existing Commercial Rules

| Field | Source |
|-------|--------|
| Reporting period | Agreement clause 2.3 |
| Gross Sales | Agreement clause 2.2A |
| GST | NP-01 (approved) |
| Net Sales | NP-01 (approved) |
| Revenue Distribution (Franchise Owner 20%) | Agreement clause 2.2A |
| MG | Agreement clause 2.3 |
| Variable Return | NP-02 (approved) |
| Higher-of Payout | NP-02 (approved) |
| Territory Royalty | Agreement clause 2.2C |
| Amount Payable | Derived |

### Fields Requiring Explicit Approval

| Field | Status |
|-------|--------|
| Line-item breakdown (MG, variable, royalty as separate lines) | **REQUIRES APPROVAL** |
| Previous period balance / carry-forward | **NOT SPECIFIED** |
| Adjustments detail | **NOT SPECIFIED** |
| Amount already paid | **NOT SPECIFIED** |
| Outstanding balance | **NOT SPECIFIED** |
| Payment method / reference | **NOT SPECIFIED** |
| Digital signature / authorization mark | **NOT SPECIFIED** |

### Proposed Options

| Option | Description |
|--------|-------------|
| **A** | Minimal: period, gross sales, GST, net sales, MG, variable return, higher-of payout, royalty, total payable. No outstanding balance or previous-period information. |
| **B** | Full: all of Option A plus line-item breakdown, previous balance, adjustments, amount paid, outstanding balance. |

### Approving Authority

**BUSINESS / FINANCE**

### Decision

**APPROVE OPTION A / APPROVE OPTION B / MODIFY / DEFER**

Notes: _______________________________________________________

---

## FR-SET-003: Settlement Relationship to Payout

### Source Evidence

Both agreements (clause 2.3):
> *"the Company shall calculate the total amount payable to the Franchise Partner, including revenue sharing, franchise commissions, royalties and all other earnings under this Agreement."*

### Current Status

**REQUIRES APPROVAL**

The existing payout report calculates the total eligible amount. The question is whether this calculated amount IS the settlement amount, or whether additional steps (adjustments, commissions, deductions) intervene.

### Implementation Impact

Determines whether settlement is a direct wrapper around the payout calculation or requires additional business logic.

### Proposed Options

| Option | Description |
|--------|-------------|
| **A** | Settlement amount = payout calculation result. The existing payout report produces the final settlement amount. No additional calculation steps. |
| **B** | Settlement amount = payout calculation + additional components (commission, adjustments, etc.). Requires defining the additional components first. |

### Approving Authority

**BUSINESS / FINANCE**

### Decision

**APPROVE OPTION A / APPROVE OPTION B / MODIFY / DEFER**

Notes: _______________________________________________________

---

## FR-SET-004: Settlement Lifecycle

### Source Evidence

No authoritative source defines settlement lifecycle states.

### Current Status

**NOT SPECIFIED**

### Implementation Impact

Without defined lifecycle states, the settlement engine cannot track whether a settlement is draft, calculated, approved, paid, or disputed. This is the foundational design decision for the settlement system.

### Proposed Options

| Option | States | Description |
|--------|--------|-------------|
| **A** | CALCULATED → APPROVED → PAID | Minimal: settlement is calculated, then approved for payment, then marked paid when payment is recorded. |
| **B** | CALCULATED → APPROVED → PARTIALLY_PAID → PAID | Adds partial payment support. |
| **C** | CALCULATED → SUBMITTED → APPROVED → PARTIALLY_PAID → PAID → DISPUTED → REVERSED | Full lifecycle with dispute and reversal. Most complex. |
| **D** | Custom | Business defines the exact states needed. |

**Note:** The states listed above are examples only. Each state must be explicitly approved.

### Approving Authority

**BUSINESS / FINANCE / TECHNICAL**

### Decision

**APPROVE OPTION A / APPROVE OPTION B / APPROVE OPTION C / APPROVE OPTION D / MODIFY / DEFER**

Notes: _______________________________________________________

---

## FR-SET-005: Approval Workflow

### Source Evidence

No authoritative source defines who generates, reviews, or approves settlements.

### Current Status

**NOT SPECIFIED**

### Implementation Impact

Without an approval workflow, settlements cannot be authorized for payment. This affects:
- Who can generate a settlement
- Who can approve it for payment
- Whether multiple approval levels exist
- Whether the franchise partner can view or dispute

### Proposed Options

| Option | Description |
|--------|-------------|
| **A** | Single-step: Tenant Admin (or authorized role) generates and approves in one step. Simplest. |
| **B** | Two-step: Accountant generates → Tenant Admin approves. Separation of duties. |
| **C** | Three-step: Accountant generates → Finance Manager reviews → Tenant Admin approves. Maximum control. |

### Approving Authority

**BUSINESS**

### Decision

**APPROVE OPTION A / APPROVE OPTION B / APPROVE OPTION C / MODIFY / DEFER**

Notes: _______________________________________________________

---

## FR-SET-006: Payment Methods

### Source Evidence

No authoritative source specifies how franchise partners are paid.

ADR 016 (line 440): *"Payment method taxonomy: NOT SPECIFIED — APPROVAL REQUIRED. Current implementation uses free-text `method` field."*

### Current Status

**NOT SPECIFIED**

### Implementation Impact

Payment method determines:
- How payments are recorded in the system
- What reference information is captured
- Whether gateway integration is needed
- Whether proof of payment is required

### Proposed Options

| Option | Methods | Description |
|--------|---------|-------------|
| **A** | Bank Transfer (NEFT/RTGS/IMPS) only | Single method, simplest to implement. Requires bank reference number. |
| **B** | Bank Transfer + UPI | Adds UPI as a second method. Requires UPI reference. |
| **C** | Bank Transfer + UPI + Cash | Adds cash. Cash payments require manual confirmation. |
| **D** | Configurable list | Admin can configure available methods per tenant. Most flexible. |

### Approving Authority

**BUSINESS / FINANCE**

### Decision

**APPROVE OPTION A / APPROVE OPTION B / APPROVE OPTION C / APPROVE OPTION D / MODIFY / DEFER**

Notes: _______________________________________________________

---

## FR-SET-007: Payment Statuses

### Source Evidence

No authoritative source defines payment status states.

ADR 016 (line 437): *"Payment status model (PAID/PARTIAL/OUTSTANDING/REFUNDED): NOT SPECIFIED — APPROVAL REQUIRED."*

### Current Status

**NOT SPECIFIED**

### Implementation Impact

Payment status determines how the system tracks whether a settlement has been fulfilled.

### Proposed Options

| Option | States | Description |
|--------|--------|-------------|
| **A** | CONFIRMED only | Every recorded payment is immediately confirmed. Simplest. No failed/reversed states. |
| **B** | PENDING → CONFIRMED / FAILED | Adds pending state for async payment confirmation. |
| **C** | PENDING → CONFIRMED → REVERSED | Adds reversal capability. |

**Note:** States listed are examples only.

### Approving Authority

**BUSINESS / FINANCE**

### Decision

**APPROVE OPTION A / APPROVE OPTION B / APPROVE OPTION C / MODIFY / DEFER**

Notes: _______________________________________________________

---

## FR-SET-008: Partial Payment

### Source Evidence

No authoritative source addresses whether a franchise settlement may be partially paid.

The agreement uses singular "pay" (clause 2.3): *"the Company shall pay the higher actual earnings"* — which could imply full payment, but is not explicit.

### Current Status

**NOT SPECIFIED**

### Implementation Impact

If partial payments are supported:
- Outstanding balance tracking is required
- Settlement status must support PARTIALLY_PAID
- Multiple payment records per settlement are needed

If partial payments are NOT supported:
- Each settlement is either fully paid or unpaid
- Simpler implementation

### Proposed Options

| Option | Description |
|--------|-------------|
| **A** | Full payment only: each settlement must be paid in full. No partial payments. |
| **B** | Partial payments allowed: settlement can be paid in installments. Outstanding balance tracked. |

### Approving Authority

**BUSINESS / FINANCE**

### Decision

**APPROVE OPTION A / APPROVE OPTION B / MODIFY / DEFER**

Notes: _______________________________________________________

---

## FR-SET-009: Outstanding Balance

### Source Evidence

No explicit source requires outstanding balance tracking across periods.

Agreement clause 6.1 mentions "outstanding dues, damages or liabilities" in refund context, which implies outstanding amounts can exist.

### Current Status

**NOT SPECIFIED**

### Implementation Impact

If outstanding balances are tracked:
- Each settlement records total payable, total paid, and outstanding
- Outstanding from one period can carry forward to the next
- Reporting can show total outstanding per partner

### Proposed Options

| Option | Description |
|--------|-------------|
| **A** | No carry-forward: each settlement is independent. Outstanding from one period does not affect the next. |
| **B** | Carry-forward: outstanding balance from period N becomes opening balance for period N+1. |

### Approving Authority

**BUSINESS / FINANCE**

### Decision

**APPROVE OPTION A / APPROVE OPTION B / MODIFY / DEFER**

Notes: _______________________________________________________

---

## FR-SET-010: Reconciliation

### Source Evidence

DOC-023 (Finance SRS) specifies FIN-006: "Support bank reconciliation" as a general finance requirement.

ADR 016 (line 447): *"DOC-023 bank reconciliation is a separate Finance capability."*

No source defines franchise-specific reconciliation.

### Current Status

**NOT SPECIFIED**

### Implementation Impact

Reconciliation ensures that recorded payments match actual bank transactions. Without it, there is no automated way to verify that recorded payments were actually received.

### Proposed Options

| Option | Description |
|--------|-------------|
| **A** | No automated reconciliation: payments are recorded manually with reference numbers. Manual verification by finance team. |
| **B** | Basic matching: system matches payment reference against bank statement upload. |
| **C** | Full reconciliation: integrated with bank API for automated matching. Requires bank integration (not currently available). |

### Approving Authority

**FINANCE / TECHNICAL**

### Decision

**APPROVE OPTION A / APPROVE OPTION B / APPROVE OPTION C / MODIFY / DEFER**

Notes: _______________________________________________________

---

## FR-SET-011: Adjustments

### Source Evidence

Both agreements (clause 2.4A):
> *"Any operational losses, depreciation, business losses, or other liabilities incurred by the Company in operating the outlet shall not be adjusted, deducted, or recovered from the Franchise Partner's investment or refund amount. The Franchise Partner shall not be responsible for such liabilities."*

### Current Status

**PARTIALLY SPECIFIED**

Operational loss adjustment is explicitly prohibited. Other adjustment types are not specified.

### Implementation Impact

The system needs to know:
- What adjustment categories are permitted
- Who can create adjustments
- How adjustments affect the settlement amount
- Whether adjustments require approval

### Proposed Options

| Option | Description |
|--------|-------------|
| **A** | No adjustments: settlement amount is always the calculated payout. No manual adjustments permitted. |
| **B** | Manual adjustments with categories: authorized users can add debit/credit adjustments with mandatory description and category. Operational loss adjustments prohibited (per agreement). |
| **C** | Defer adjustment handling to a future phase. |

### Approving Authority

**BUSINESS / FINANCE / LEGAL**

### Decision

**APPROVE OPTION A / APPROVE OPTION B / APPROVE OPTION C / MODIFY / DEFER**

Notes: _______________________________________________________

---

## FR-SET-012: Refund Workflow

### Source Evidence

Both agreements (clause 6.1):
> *"Upon termination of this Agreement, the Company shall refund 90% of the Initial Investment, after adjustment of any outstanding dues, damages or liabilities, if any."*

> *"The deduction of 10% represents administrative expenses, documentation charges, onboarding, branding, training and other initial operational expenses already incurred by the Company."*

> *"The refund shall be processed within 30 (Thirty) Working Days from completion of settlement and handover formalities."*

> *"In the event that the Franchise Agreement is terminated or mutually closed before the expiry of the agreed tenure, the Company shall refund 50% of the original investment amount made by the Franchise Partner."*

Both agreements (clause 2.3 / MG Default):
> *"In the event the Franchise Partner does not receive the applicable Commission or Minimum Guarantee (MG) for two (2) consecutive months, the same shall be treated as a material breach... the Franchise Partner shall have the right to terminate the Agreement and shall be entitled to an immediate refund of 90% of the Franchise Investment."*

### Current Status

**PARTIALLY SPECIFIED**

Refund amounts and timing are specified. The refund workflow (how it is initiated, approved, processed, and recorded) is NOT SPECIFIED.

### Implementation Impact

Refund processing requires:
- Agreement termination workflow (not currently implemented)
- Refund calculation (90% or 50% of investment, minus outstanding)
- Refund approval
- Refund payment recording
- 30 Working Day SLA tracking

### Proposed Options

| Option | Description |
|--------|-------------|
| **A** | Manual refund: refund is calculated by the system but processed and recorded manually outside the platform. |
| **B** | Platform refund workflow: system tracks refund request → approval → payment → confirmation. |

### Approving Authority

**BUSINESS / FINANCE**

### Decision

**APPROVE OPTION A / APPROVE OPTION B / MODIFY / DEFER**

Notes: _______________________________________________________

---

## FR-SET-013: Franchise-Sale Commission Settlement

### Source Evidence

Both agreements (clause 2.2C):
> *"₹15,000 (Rupees Fifteen Thousand Only) for every successful franchise sold in the territory allotted to the Franchise Partner, payable by the Company to the Franchise Partner."*

### Current Status

**PARTIALLY SPECIFIED**

Amount and trigger are specified. Settlement integration, payment timing, cancellation behavior, and tax treatment are NOT SPECIFIED.

### Implementation Impact

Commission settlement requires:
- Defining what constitutes a "successful franchise sold"
- Recording commission events
- Including commission in settlement statements
- Commission reversal if franchise is cancelled/refunded

### Proposed Options

| Option | Description |
|--------|-------------|
| **A** | Commission included in monthly settlement: when a new franchise is sold in the territory, ₹15,000 is added as a line item to that month's settlement. |
| **B** | Commission settled separately: commission is paid as a one-time payment outside the monthly settlement cycle. |
| **C** | Defer commission settlement to a future phase. Commission is tracked but not settled through the platform. |

### Approving Authority

**BUSINESS / FINANCE**

### Decision

**APPROVE OPTION A / APPROVE OPTION B / APPROVE OPTION C / MODIFY / DEFER**

Notes: _______________________________________________________

---

## FR-SET-014: Renewal Fee Settlement

### Source Evidence

Both agreements (clause 7.5):
> *"Upon successful completion of the initial contract period, the Franchise Partner shall have the first right to renew the franchise for the same outlet by paying a renewal fee of ₹20,000."*

> *"Upon payment of the renewal fee and execution of the renewal documents, the Agreement shall be extended for a further three (3) years on the prevailing renewal terms and conditions."*

### Current Status

**PARTIALLY SPECIFIED**

Fee amount and renewal period are specified. Payment workflow, approval, and "prevailing terms" definition are NOT SPECIFIED.

### Implementation Impact

Renewal requires:
- Agreement expiry detection
- Renewal offer generation
- Renewal fee collection
- New agreement creation with prevailing terms
- Linking renewal to existing partner/outlet

### Proposed Options

| Option | Description |
|--------|-------------|
| **A** | Manual renewal: renewal is managed outside the platform. System only tracks agreement end dates. |
| **B** | Platform renewal workflow: system detects upcoming expiry → generates renewal offer → records payment → creates new agreement. |

### Approving Authority

**BUSINESS**

### Decision

**APPROVE OPTION A / APPROVE OPTION B / MODIFY / DEFER**

Notes: _______________________________________________________

---

## FR-SET-015: GST/TDS/Tax Treatment

### Source Evidence

ADR 014 (line 301): *"Tax treatment of royalty, sharing, reimbursements, and settlement transactions"* — listed as NOT SPECIFIED.

### Current Status

**NOT SPECIFIED — requires Finance/Legal decision.**

### Implementation Impact

Tax treatment determines:
- Whether GST is charged on franchise payouts
- Whether TDS is withheld on payments to franchise partners
- Whether settlement amounts are gross or net of tax
- Whether tax invoices are generated
- Accounting entries for tax liabilities

**This is a compliance-critical decision that must be made by Finance/Legal. Engineering cannot proceed without it.**

### Proposed Options

| Option | Description |
|--------|-------------|
| **A** | No tax in settlement: settlement records gross amounts only. Tax handling is managed outside the platform by the finance team. |
| **B** | GST inclusive: settlement includes GST calculation and tax invoice generation. Requires GST rate determination. |
| **C** | TDS applicable: settlement deducts TDS before payment. Requires TDS rate and section determination. |
| **D** | Full tax: both GST and TDS handled by the platform. |

### Approving Authority

**FINANCE / LEGAL**

### Decision

**APPROVE OPTION A / APPROVE OPTION B / APPROVE OPTION C / APPROVE OPTION D / MODIFY / DEFER**

Notes: _______________________________________________________

---

## FR-SET-016: Dispute Workflow

### Source Evidence

Both agreements (clause 10): Disputes referred to arbitration under the Arbitration and Conciliation Act, 1996. This is a legal clause, not a software workflow.

### Current Status

**NOT SPECIFIED**

The arbitration clause is a legal mechanism. No software dispute workflow is defined.

### Implementation Impact

A software dispute workflow would allow:
- Franchise partner to flag a settlement as disputed
- Dispute to pause payment obligations
- Resolution tracking
- Escalation to arbitration if unresolved

### Proposed Options

| Option | Description |
|--------|-------------|
| **A** | No software dispute workflow: disputes are handled externally per the arbitration clause. |
| **B** | Basic dispute flag: franchise partner can flag a settlement as "disputed" with a reason. Flag pauses payment obligation. Resolution is manual. |
| **C** | Full dispute workflow: dispute submission → evidence upload → review → resolution → settlement update. |

### Approving Authority

**BUSINESS / LEGAL**

### Decision

**APPROVE OPTION A / APPROVE OPTION B / APPROVE OPTION C / MODIFY / DEFER**

Notes: _______________________________________________________

---

## FR-SET-017: Settlement Reversal

### Source Evidence

No authoritative source defines settlement reversal rules.

### Current Status

**NOT SPECIFIED**

### Implementation Impact

Reversal would allow a settled/paid settlement to be rolled back. This is needed if:
- A calculation error is discovered after approval
- A payment is recorded incorrectly
- A dispute results in settlement cancellation

### Proposed Options

| Option | Description |
|--------|-------------|
| **A** | No reversal: once approved, a settlement cannot be reversed. Errors are corrected via adjustments in the next period. |
| **B** | Reversal with audit: authorized users can reverse a settlement. Reversal creates an audit trail. Reversed settlements are marked, not deleted. |

### Approving Authority

**BUSINESS / FINANCE**

### Decision

**APPROVE OPTION A / APPROVE OPTION B / MODIFY / DEFER**

Notes: _______________________________________________________

---

## FR-SET-018: Settlement RBAC

### Source Evidence

No authoritative source defines settlement-specific permissions.

Current franchise permissions: `franchise.read`, `franchise.write`.

### Current Status

**NOT SPECIFIED**

### Implementation Impact

Settlement operations require permissions beyond the existing `franchise.read`/`franchise.write`:
- Who can view settlements
- Who can generate settlements
- Who can approve settlements
- Who can record payments
- Who can view settlement financial details

### Proposed Options

| Option | Permissions | Description |
|--------|-------------|-------------|
| **A** | Reuse `franchise.read`/`franchise.write` | No new permissions. Existing franchise permissions cover settlement operations. |
| **B** | Add `settlement.view`, `settlement.manage` | Two new permissions: view (read-only) and manage (generate/approve/pay). |
| **C** | Add `settlement.view`, `settlement.generate`, `settlement.approve`, `settlement.pay` | Four granular permissions for full separation of duties. |

### Approving Authority

**BUSINESS / TECHNICAL**

### Decision

**APPROVE OPTION A / APPROVE OPTION B / APPROVE OPTION C / MODIFY / DEFER**

Notes: _______________________________________________________

---

## FR-SET-019: Settlement Data Model

### Source Evidence

No authoritative source defines the settlement data model.

### Current Status

**NOT SPECIFIED**

### Implementation Impact

The data model determines what the settlement system can store and track. This is the technical foundation for all settlement features.

### Proposed Entities

| Entity | Purpose | Status |
|--------|---------|--------|
| `FranchiseSettlement` | Formal financial obligation for a period | **PROPOSED** |
| `FranchiseSettlementLine` | Individual components (MG, variable, royalty, commission, adjustment) | **PROPOSED** |
| `FranchisePayment` | Payment records linked to settlement (separate from Invoice Payment) | **PROPOSED** |

### Key Design Decisions

| Decision | Impact |
|----------|--------|
| Settlement is per-partner-per-period | Prevents duplicate settlements |
| Settlement lines are immutable after approval | Ensures historical reproducibility (HR-01) |
| FranchisePayment is separate from Invoice Payment | Preserves ADR 016 boundary |
| Terms snapshot captured at settlement generation | Preserves HR-02 |

### Approving Authority

**TECHNICAL / BUSINESS**

### Decision

**APPROVE AS PROPOSED / MODIFY / DEFER**

Notes: _______________________________________________________

---

## FR-SET-020: Finance/GL Prerequisites

### Source Evidence

DOC-023 (Finance SRS) specifies: Chart of Accounts, General Ledger, Accounts Receivable, Accounts Payable, Bank Reconciliation — NONE of which are implemented.

### Current Status

**NOT SPECIFIED**

### Implementation Impact

If franchise settlement must post accounting entries to a general ledger, the GL must exist first. Currently:
- No GL exists
- No AR/AP exists
- No chart of accounts exists

Settlement can operate as a standalone obligation/payment tracker without GL integration, but cannot produce accounting entries.

### Proposed Options

| Option | Description |
|--------|-------------|
| **A** | Settlement without GL: settlement operates as a standalone tracker. No accounting entries. Finance team manually enters settlement data into external accounting system. |
| **B** | Settlement with basic GL: implement minimal GL (journal entries + chart of accounts) alongside settlement. Settlement posts entries to GL. |
| **C** | Defer settlement until GL is implemented: full DOC-023 Finance module must be built first. |

### Approving Authority

**FINANCE / TECHNICAL**

### Decision

**APPROVE OPTION A / APPROVE OPTION B / APPROVE OPTION C / MODIFY / DEFER**

Notes: _______________________________________________________

---

## Approval Summary

| FR-SET ID | Decision Question | Proposed Option | Approval Authority | Status |
|-----------|-------------------|-----------------|-------------------|--------|
| FR-SET-001 | Settlement period | Calendar month (A) | BUSINESS / FINANCE | **REQUIRES APPROVAL** |
| FR-SET-002 | Statement content | Minimal (A) or Full (B) | BUSINESS / FINANCE | **REQUIRES APPROVAL** |
| FR-SET-003 | Settlement = payout? | Direct wrapper (A) | BUSINESS / FINANCE | **REQUIRES APPROVAL** |
| FR-SET-004 | Settlement lifecycle | Minimal (A), Partial (B), Full (C), Custom (D) | BUSINESS / FINANCE / TECHNICAL | **NOT SPECIFIED** |
| FR-SET-005 | Approval workflow | Single (A), Two-step (B), Three-step (C) | BUSINESS | **NOT SPECIFIED** |
| FR-SET-006 | Payment methods | Bank only (A), Bank+UPI (B), Bank+UPI+Cash (C), Configurable (D) | BUSINESS / FINANCE | **NOT SPECIFIED** |
| FR-SET-007 | Payment statuses | Confirmed only (A), Pending+Confirmed/Failed (B), +Reversed (C) | BUSINESS / FINANCE | **NOT SPECIFIED** |
| FR-SET-008 | Partial payment | Full only (A), Partial allowed (B) | BUSINESS / FINANCE | **NOT SPECIFIED** |
| FR-SET-009 | Outstanding balance | No carry-forward (A), Carry-forward (B) | BUSINESS / FINANCE | **NOT SPECIFIED** |
| FR-SET-010 | Reconciliation | Manual (A), Basic matching (B), Full (C) | FINANCE / TECHNICAL | **NOT SPECIFIED** |
| FR-SET-011 | Adjustments | None (A), Manual with categories (B), Defer (C) | BUSINESS / FINANCE / LEGAL | **PARTIALLY SPECIFIED** |
| FR-SET-012 | Refund workflow | Manual (A), Platform workflow (B) | BUSINESS / FINANCE | **PARTIALLY SPECIFIED** |
| FR-SET-013 | Commission settlement | In monthly (A), Separate (B), Defer (C) | BUSINESS / FINANCE | **PARTIALLY SPECIFIED** |
| FR-SET-014 | Renewal fee | Manual (A), Platform workflow (B) | BUSINESS | **PARTIALLY SPECIFIED** |
| FR-SET-015 | Tax treatment | None (A), GST (B), TDS (C), Full (D) | FINANCE / LEGAL | **NOT SPECIFIED** |
| FR-SET-016 | Dispute workflow | None (A), Basic flag (B), Full (C) | BUSINESS / LEGAL | **NOT SPECIFIED** |
| FR-SET-017 | Settlement reversal | None (A), With audit (B) | BUSINESS / FINANCE | **NOT SPECIFIED** |
| FR-SET-018 | Settlement RBAC | Reuse existing (A), 2 new (B), 4 granular (C) | BUSINESS / TECHNICAL | **NOT SPECIFIED** |
| FR-SET-019 | Settlement data model | As proposed | TECHNICAL / BUSINESS | **NOT SPECIFIED** |
| FR-SET-020 | Finance/GL prerequisites | Standalone (A), Basic GL (B), Defer (C) | FINANCE / TECHNICAL | **NOT SPECIFIED** |

### Status Summary

| Status | Count |
|--------|-------|
| APPROVED | 0 |
| AGREEMENT-SPECIFIED | 0 |
| PARTIALLY SPECIFIED | 4 (FR-SET-011, 012, 013, 014) |
| NOT SPECIFIED | 13 (FR-SET-004 through 010, 015 through 020) |
| REQUIRES APPROVAL | 3 (FR-SET-001, 002, 003) |

**No settlement decision has APPROVED status.**

---

## Engineering Gate

**SETTLEMENT IMPLEMENTATION STATUS: BLOCKED — PENDING EXPLICIT BUSINESS/FINANCE/LEGAL APPROVAL**

Implementation may begin only after all CRITICAL decisions required by the selected implementation scope are explicitly approved.

Minimum decisions required for Phase 1 (Settlement Core):
- FR-SET-001: Settlement period
- FR-SET-003: Settlement relationship to payout
- FR-SET-004: Settlement lifecycle (at least Option A)
- FR-SET-019: Settlement data model

Minimum decisions required for Phase 2 (Payment):
- FR-SET-006: Payment methods
- FR-SET-007: Payment statuses
- FR-SET-008: Partial payment

Minimum decisions required for Phase 3 (Full Settlement):
- FR-SET-005: Approval workflow
- FR-SET-009: Outstanding balance
- FR-SET-015: Tax treatment
- FR-SET-018: Settlement RBAC

---

*End of decision sheet.*

# LWILL AI BUILDER — Franchise Settlement & Payment Rules Specification

**Document ID:** LWILL-DOC-025-SETTLEMENT-PAYMENT-RULES  
**Version:** 1.0  
**Status:** Draft — Pending Business/Legal/Finance Approval  
**Branch:** `phase-1d-native-auth`  
**Created:** 2026-09-14

**Related Documents:**
- `docs/FRANCHISE-COMMERCIAL-RULES-SPECIFICATION.md` v1.3
- `docs/FRANCHISE-COMMERCIAL-RULES-APPROVALS.md` v1.1
- `docs/DECISIONS.md` §ADR 014, §ADR 016
- `docs/LWILL-DOC-025-Franchise-Management-SRS-v1.0.txt`
- `docs/LWILL-DOC-017-X-Nail-ERP-SRS-MVP-v1.0.txt`
- `docs/LWILL-DOC-023-Finance-Accounting-SRS-v1.0.txt`
- `docs/LWILL-DOC-027-Analytics-Business-Intelligence-SRS-v1.0.txt`
- `docs/franchise-agreements/X NAILS  Franchise Agreement - Kushwaha.txt`
- `docs/franchise-agreements/X NAILS  Franchise Agreement - HUF.txt`

---

## 1. Purpose

### 1.1 Objective

Define the business requirements for the future franchise settlement and payment system. This document bridges the gap between:

- **Payout Calculation** (already implemented) — calculates commercial amounts
- **Settlement** (not implemented) — creates formal financial obligations
- **Payment** (not implemented for franchise) — records actual disbursements
- **Reconciliation** (not implemented) — matches payments to obligations

### 1.2 Critical Distinction

**Customer Payment ≠ Franchise Partner Settlement**

Per ADR 016 (line 389): *"Customer Payment is separate from settlement: Customer payment against invoices is a distinct domain from franchise partner settlement, marketplace vendor settlement, gateway settlement, and bank reconciliation."*

Per ADR 016 (line 446): *"Customer Payment ≠ Gateway Settlement ≠ Franchise Partner Settlement ≠ Marketplace Vendor Settlement."*

These are separate domains and must remain architecturally separate.

### 1.3 Scope

This document covers:
- Franchise settlement statement generation
- Settlement lifecycle and approval
- Franchise partner payment processing
- Payment reconciliation against settlements
- Related commission, renewal, and refund settlement

This document does NOT cover:
- Customer invoice payments (existing `Payment` model)
- Payment gateway integration (ADR 016 domain)
- General ledger / double-entry accounting (DOC-023 domain)
- Bank reconciliation for customer receipts (DOC-023 domain)

### 1.4 Classification Key

Every rule in this document is classified as:

| Classification | Meaning |
|---------------|---------|
| **APPROVED** | Explicitly approved in FRANCHISE-COMMERCIAL-RULES-APPROVALS.md |
| **AGREEMENT-SPECIFIED** | Stated in executed franchise agreement(s) |
| **EXISTING PLATFORM BEHAVIOR** | Already implemented and operational |
| **DEFERRED** | Explicitly deferred by approval record |
| **NOT SPECIFIED** | No authoritative source defines this rule |
| **REQUIRES APPROVAL** | Business/legal decision needed before implementation |

---

## 2. Current Commercial Inputs (Already Approved)

The following commercial calculations are already implemented and approved. They serve as inputs to any future settlement system.

### 2.1 Approved Commercial Rules

| Rule | Status | Source |
|------|--------|--------|
| Net Sales = Invoice Total − GST | **APPROVED** (NP-01) | Approvals §NP-01 |
| MG Hybrid: existing ₹3.10L = fixed ₹15,000; new products = 3% of investment | **APPROVED** (MG-01, MG-02) | Approvals §MG-01, §MG-02 |
| MG scope: agreement-level | **APPROVED** (MG-03) | Approvals §MG-03 |
| MG variability: agreement-level override | **APPROVED** (MG-04) | Approvals §MG-04 |
| Variable Return = 30% of Net Sales | **APPROVED** (NP-02) | Approvals §NP-02 |
| Payout = MAX(MG, Variable Return) | **APPROVED** (NP-02) | Approvals §NP-02 |
| Royalty = 2% of territory sales (default); agreement-level override | **APPROVED** (TR-01, TR-02) | Approvals §TR-01, §TR-02 |
| Royalty basis: all operational outlets in territory | **APPROVED** (TR-03) | Approvals §TR-03 |
| Revenue Distribution: per-outlet, sum-to-100% | **APPROVED** (RD-01, RD-02, RD-03) | Approvals §RD-01, §RD-02, §RD-03 |
| Effective-dated commercial terms snapshot | **APPROVED** (HR-01, HR-02, HR-03) | Approvals §HR-01, §HR-02, §HR-03 |
| Executed agreements are binding source of truth | **APPROVED** (CX-03) | Approvals §CX-03 |

### 2.2 Existing Payout Calculation Flow

**EXISTING PLATFORM BEHAVIOR**

```
Operational Sales (Invoice data)
  → Net Sales (totalCents − gstCents)
  → Revenue Distribution (per-outlet percentage)
  → MG Resolution (fixed / formula / default)
  → Variable Return (30% of net sales)
  → Payout Rule: MAX(MG, Variable Return)
  → Franchise Payout (per-outlet eligible amount)
  → Territory Royalty (2% of territory sales, split equally)
  → Partner Total (payout + royalty)
```

This flow is implemented in `packages/authentication-context-prisma/src/report-service.ts` and exposed via `GET /api/franchise/payout`.

### 2.3 What Payout Calculation Does NOT Do

The existing payout calculation:
- Does NOT create a financial obligation record
- Does NOT create a settlement statement
- Does NOT create an invoice or payable
- Does NOT record a payment
- Does NOT track outstanding balance
- Does NOT support approval workflow
- Is a **read-only report**, not a financial transaction

---

## 3. Settlement Period

### 3.1 Agreement Wording

**AGREEMENT-SPECIFIED**

Both agreements (clause 2.3 / 2.4):
> *"The Company shall release the payable amount on or before the 5th Working Day of the succeeding month, along with a detailed statement of accounts."*

> *"The Company shall provide complete revenue statements on or before the 5th Working Day of every succeeding month."*

### 3.2 Analysis

The agreement specifies:
- **Statement timing**: On or before the 5th Working Day of the succeeding month
- **Payment release timing**: On or before the 5th Working Day of the succeeding month
- **Calculation trigger**: "At the end of each calendar month" (clause 2.3)

The agreement does NOT explicitly specify:
- Whether "succeeding month" means calendar month
- Whether settlement and payment are the same event or separate events
- Whether settlement covers a calendar-month period
- Whether partial-month periods are handled differently

### 3.3 Determination

| Item | Status |
|------|--------|
| Statement timing | **AGREEMENT-SPECIFIED**: 5th Working Day of succeeding month |
| Payment release timing | **AGREEMENT-SPECIFIED**: 5th Working Day of succeeding month |
| Settlement period basis | **NOT SPECIFIED** — agreement implies monthly but does not explicitly define a settlement period |
| Partial-month handling | **NOT SPECIFIED** |
| Settlement/payment distinction | **NOT SPECIFIED** — agreement uses "release the payable amount" which could mean settlement and payment are simultaneous |

**FR-SET-001**: Does the settlement period align with the calendar month? Are settlement and payment simultaneous or separate events?

---

## 4. Settlement Statement

### 4.1 Agreement Requirement

**AGREEMENT-SPECIFIED**

Both agreements require:
- "detailed statement of accounts" (clause 2.3)
- "complete revenue statements" (clause 2.4)

### 4.2 Required by Source

The following can be derived from the agreement's commercial terms:

| Field | Source | Status |
|-------|--------|--------|
| Reporting period | Agreement clause 2.3: "each calendar month" | **AGREEMENT-SPECIFIED** |
| Gross Sales | Agreement clause 2.2A: "Gross/Top-Line Revenue" | **AGREEMENT-SPECIFIED** |
| GST | Implied by NP-01 (GST excluded from net sales) | **APPROVED** |
| Net Sales | NP-01: Total − GST | **APPROVED** |
| Revenue Distribution (Franchise Owner 20%) | Agreement clause 2.2A | **AGREEMENT-SPECIFIED** |
| MG | Agreement clause 2.3 | **AGREEMENT-SPECIFIED** |
| Variable Return | NP-02: 30% of net sales | **APPROVED** |
| Higher-of Payout | NP-02: MAX(MG, Variable Return) | **APPROVED** |
| Territory Royalty | Agreement clause 2.2C: 2% of territory sales | **AGREEMENT-SPECIFIED** |
| Franchise-Sale Commission | Agreement clause 2.2C: ₹15,000 per sale | **AGREEMENT-SPECIFIED** |
| Amount Payable | Derived from above | **AGREEMENT-SPECIFIED** |

### 4.3 Proposed / Requires Approval

| Field | Status |
|-------|--------|
| Detailed line-item breakdown | **REQUIRES APPROVAL** — agreement says "detailed" but does not specify format |
| Previous period balance | **NOT SPECIFIED** |
| Adjustments | **NOT SPECIFIED** (see Section 13) |
| Amount paid | **NOT SPECIFIED** |
| Outstanding balance | **NOT SPECIFIED** |
| Payment method details | **NOT SPECIFIED** |
| Bank/UPI details | **NOT SPECIFIED** |
| Digital signature / authorization | **NOT SPECIFIED** |

**FR-SET-002**: What exact fields must appear on the settlement statement?

---

## 5. Settlement Calculation

### 5.1 Existing Payout Calculation

**EXISTING PLATFORM BEHAVIOR**

The payout calculation already computes:

1. Per-outlet net sales (invoice total − GST)
2. Per-outlet revenue share (net sales × distribution percentage)
3. Per-outlet MG (fixed / formula / default)
4. Per-outlet variable return (30% of net sales)
5. Per-outlet eligible payout (MAX of MG and variable return)
6. Per-partner total payout (sum of outlet payouts)
7. Per-territory royalty pool (2% of territory sales)
8. Per-partner individual royalty (pool ÷ eligible partners)
9. Per-partner total eligible (payout + royalty)

### 5.2 Settlement vs Payout

**NOT SPECIFIED — REQUIRES APPROVAL**

The agreement states: *"the Company shall calculate the total amount payable to the Franchise Partner, including revenue sharing, franchise commissions, royalties and all other earnings under this Agreement."*

This implies the settlement amount is the total payable. However, the sources do NOT specify:

- Whether the calculated payout IS the settlement amount
- Whether additional adjustments apply before settlement
- Whether commission is included in the same settlement
- Whether multiple payout components are settled separately

**FR-SET-003**: Is the franchise payout calculation the settlement amount, or does settlement involve additional steps?

---

## 6. Settlement Lifecycle

### 6.1 Source Analysis

**NOT SPECIFIED — REQUIRES APPROVAL**

No authoritative source defines settlement lifecycle states. The agreement only specifies:
- Calculation happens "at the end of each calendar month"
- Statement and payment happen "on or before the 5th Working Day of the succeeding month"

### 6.2 Potential Lifecycle States

The following states are **PROPOSED ONLY** and require explicit business approval:

| State | Proposed Meaning | Source Support |
|-------|-----------------|---------------|
| DRAFT | Settlement being prepared | No source |
| CALCULATED | Payout amounts computed | Agreement clause 2.3 |
| GENERATED | Statement created | Agreement clause 2.4 |
| APPROVED | Authorized for payment | No source |
| PAYMENT_PENDING | Awaiting payment | No source |
| PARTIALLY_PAID | Some payment received | No source |
| PAID | Fully settled | No source |
| OVERDUE | Past due date | No source |
| DISPUTED | Under dispute | No source |
| REVERSED | Rolled back | No source |
| CANCELLED | Voided | No source |

**FR-SET-004**: What lifecycle states does the settlement system require?

---

## 7. Approval Workflow

### 7.1 Source Analysis

**NOT SPECIFIED — REQUIRES APPROVAL**

Neither the agreements nor the SRS documents specify:
- Who generates the settlement
- Who reviews the settlement
- Who approves the settlement for payment
- Whether the franchise partner can approve or dispute
- Whether settlement can be edited after approval
- Whether multiple approval levels exist

### 7.2 Existing RBAC

**EXISTING PLATFORM BEHAVIOR**

Current franchise permissions:
- `franchise.read` — view franchise data
- `franchise.write` — create/edit franchise entities

These are NOT settlement approval permissions. They control access to franchise partner, agreement, territory, and outlet CRUD operations.

### 7.3 Proposed Permissions (Requires Approval)

| Permission | Proposed Purpose | Status |
|-----------|-----------------|--------|
| `settlement.view` | View settlement statements | **PROPOSED — REQUIRES APPROVAL** |
| `settlement.generate` | Generate monthly settlement | **PROPOSED — REQUIRES APPROVAL** |
| `settlement.approve` | Approve settlement for payment | **PROPOSED — REQUIRES APPROVAL** |
| `settlement.pay` | Record franchise payment | **PROPOSED — REQUIRES APPROVAL** |
| `settlement.reconcile` | Match payments to settlements | **PROPOSED — REQUIRES APPROVAL** |

**FR-SET-005**: Who has authority to generate, approve, and pay franchise settlements?

---

## 8. Payment

### 8.1 Source Analysis

**NOT SPECIFIED — REQUIRES APPROVAL**

Neither the agreements nor the SRS documents specify:
- Payment method (bank transfer, UPI, cash, cheque, NEFT, RTGS, IMPS)
- Payment gateway usage
- Beneficiary bank account details
- Payment reference format
- Payment proof requirements

### 8.2 Agreement Clues

The agreements use the word "release" (clause 2.3): *"The Company shall release the payable amount."*

This does not specify a payment mechanism.

The HUF agreement (clause 2.1) specifies investment payment terms: *"₹1,50,000/- payable at the time of confirmation/onboarding"* — but this is investment payment, not franchise settlement payment.

### 8.3 Existing Payment Infrastructure

**EXISTING PLATFORM BEHAVIOR**

| Component | Status | Capability |
|-----------|--------|-----------|
| `Payment` model | IMPLEMENTED | Records invoice payments with `amountCents`, `method` (free text), `paidAt`, `notes` |
| `GatewayAccount` model | PARTIAL | Stores gateway provider config; no integration code |
| Payment APIs | IMPLEMENTED | `POST /api/payments`, `GET /api/invoices/[id]/payments` |

The existing `Payment` model is designed for customer invoice payments and is linked to `Invoice`. It is NOT designed for franchise partner settlements.

**FR-SET-006**: What payment methods does the franchise settlement system support?

---

## 9. Payment Status

### 9.1 Source Analysis

**NOT SPECIFIED — REQUIRES APPROVAL**

No authoritative source defines payment states for franchise settlements.

The existing `Payment` model has NO status field. ADR 016 (line 437) identifies: *"Payment status model (PAID/PARTIAL/OUTSTANDING/REFUNDED): NOT SPECIFIED — APPROVAL REQUIRED."*

### 9.2 Proposed States (Requires Approval)

| State | Proposed Meaning | Status |
|-------|-----------------|--------|
| PENDING | Payment initiated but not confirmed | **PROPOSED — REQUIRES APPROVAL** |
| PROCESSING | Payment in progress | **PROPOSED — REQUIRES APPROVAL** |
| PAID | Payment confirmed | **PROPOSED — REQUIRES APPROVAL** |
| FAILED | Payment attempt failed | **PROPOSED — REQUIRES APPROVAL** |
| REVERSED | Payment rolled back | **PROPOSED — REQUIRES APPROVAL** |

**FR-SET-007**: What payment status model does the franchise settlement system require?

---

## 10. Partial Payments

### 10.1 Source Analysis

**NOT SPECIFIED**

No authoritative source addresses whether a franchise settlement may be partially paid.

The agreement clause 2.3 states: *"the Company shall pay the higher actual earnings"* — using singular "pay" which could imply full payment. However, this is not explicit.

**FR-SET-008**: Does the franchise settlement system support partial payments?

---

## 11. Outstanding Balance

### 11.1 Source Analysis

**NOT SPECIFIED**

No authoritative source requires tracking of:
- Settlement amount vs. paid amount
- Outstanding balance carry-forward
- Overdue balance accumulation

The agreement clause 6.1 mentions "outstanding dues, damages or liabilities" in the context of refund deduction, which implies outstanding amounts can exist, but does not specify a tracking mechanism.

**FR-SET-009**: Must the platform track outstanding balances across settlement periods?

---

## 12. Reconciliation

### 12.1 Source Analysis

**NOT SPECIFIED for franchise settlement**

DOC-023 (Finance SRS) specifies FIN-006: "Support bank reconciliation" as a general finance requirement. However, this is a general Finance capability, not a franchise settlement requirement.

ADR 016 (line 447): *"DOC-023 bank reconciliation is a separate Finance capability."*

No source defines:
- Payment-to-settlement matching
- Franchise-specific reconciliation
- Unmatched payment handling
- Reconciliation status tracking

**FR-SET-010**: What reconciliation process is required for franchise settlement payments?

---

## 13. Adjustments

### 13.1 Specified Adjustment Rule

**AGREEMENT-SPECIFIED**

Both agreements (clause 2.4A):
> *"Any operational losses, depreciation, business losses, or other liabilities incurred by the Company in operating the outlet shall not be adjusted, deducted, or recovered from the Franchise Partner's investment or refund amount. The Franchise Partner shall not be responsible for such liabilities."*

This is a **negative rule**: operational losses CANNOT be adjusted against the franchise partner.

### 13.2 Unspecified Adjustments

| Adjustment Type | Status |
|----------------|--------|
| Operational loss adjustment | **AGREEMENT-SPECIFIED**: NOT ALLOWED |
| Discount adjustment | **NOT SPECIFIED** |
| Refund adjustment | **NOT SPECIFIED** |
| Manual adjustment | **NOT SPECIFIED** |
| Tax adjustment | **NOT SPECIFIED** |
| Penalty / late fee | **NOT SPECIFIED** |
| Credit note adjustment | **NOT SPECIFIED** |
| Commission offset | **NOT SPECIFIED** |

**FR-SET-011**: What adjustment categories are permitted in franchise settlement?

---

## 14. Refunds

### 14.1 Agreement Rules

**AGREEMENT-SPECIFIED**

| Rule | Clause | Status |
|------|--------|--------|
| 90% refund on termination | Clause 6.1 | **AGREEMENT-SPECIFIED** |
| 10% deduction (admin/onboarding) | Clause 6.1 | **AGREEMENT-SPECIFIED** |
| 50% refund on pre-expiry termination | Clause 6.1 | **AGREEMENT-SPECIFIED** |
| 30 Working Days processing time | Clause 6.1 | **AGREEMENT-SPECIFIED** |
| "from completion of settlement and handover formalities" | Clause 6.1 | **AGREEMENT-SPECIFIED** |
| Deduction of "outstanding dues, damages or liabilities" | Clause 6.1 | **AGREEMENT-SPECIFIED** |
| Operational losses excluded from deduction | Clause 2.4A | **AGREEMENT-SPECIFIED** |
| 2 consecutive months MG default → material breach → 90% refund right | Clause 2.3 | **AGREEMENT-SPECIFIED** |

### 14.2 Unspecified Refund Items

| Item | Status |
|------|--------|
| Refund payment method | **NOT SPECIFIED** |
| Refund approval workflow | **NOT SPECIFIED** |
| Refund accounting treatment | **NOT SPECIFIED** |
| GST reversal on refund | **NOT SPECIFIED** |
| Partial refund scenarios | **NOT SPECIFIED** |
| Refund interaction with outstanding settlement | **NOT SPECIFIED** |
| Refund recording in platform | **NOT SPECIFIED** |

**FR-SET-012**: What refund workflow does the platform require?

---

## 15. Franchise-Sale Commission

### 15.1 Agreement Terms

**AGREEMENT-SPECIFIED**

Both agreements (clause 2.2C):
> *"₹15,000 (Rupees Fifteen Thousand Only) for every successful franchise sold in the territory allotted to the Franchise Partner, payable by the Company to the Franchise Partner."*

### 15.2 Known Details

| Aspect | Value | Status |
|--------|-------|--------|
| Amount | ₹15,000 per sale | **AGREEMENT-SPECIFIED** |
| Recipient | Territory partner | **AGREEMENT-SPECIFIED** |
| Payer | The Company (HDK Beauty) | **AGREEMENT-SPECIFIED** |
| Trigger | "successful franchise sold in territory" | **AGREEMENT-SPECIFIED** |

### 15.3 Unspecified Items

| Item | Status |
|------|--------|
| What constitutes a "successful franchise sold" | **NOT SPECIFIED** |
| Payment timing | **NOT SPECIFIED** |
| Whether commission is one-time or recurring | **NOT SPECIFIED** (appears one-time per sale) |
| Cancellation reversal | **NOT SPECIFIED** |
| Refund effect on commission | **NOT SPECIFIED** |
| Settlement integration | **NOT SPECIFIED** |
| Tax treatment (GST/TDS) | **NOT SPECIFIED** |
| Whether it appears on settlement statement | **NOT SPECIFIED** |

**FR-SET-013**: How is franchise-sale commission settled and paid?

---

## 16. Renewal

### 16.1 Agreement Terms

**AGREEMENT-SPECIFIED**

Both agreements (clause 7.5):
> *"Upon successful completion of the initial contract period, the Franchise Partner shall have the first right to renew the franchise for the same outlet by paying a renewal fee of ₹20,000."*

> *"Upon payment of the renewal fee and execution of the renewal documents, the Agreement shall be extended for a further three (3) years on the prevailing renewal terms and conditions."*

### 16.2 Known Details

| Aspect | Value | Status |
|--------|-------|--------|
| Renewal fee | ₹20,000 | **AGREEMENT-SPECIFIED** |
| Renewal period | 3 years | **AGREEMENT-SPECIFIED** |
| Trigger | Successful completion of initial term | **AGREEMENT-SPECIFIED** |
| Right | First right of renewal | **AGREEMENT-SPECIFIED** |
| Terms | "Prevailing renewal terms and conditions" | **AGREEMENT-SPECIFIED** |

### 16.3 Unspecified Items

| Item | Status |
|------|--------|
| Renewal payment method | **NOT SPECIFIED** |
| Renewal payment timing | **NOT SPECIFIED** |
| Whether renewal fee appears on settlement | **NOT SPECIFIED** |
| Renewal approval workflow | **NOT SPECIFIED** |
| What "prevailing terms" means | **NOT SPECIFIED** |
| Whether MG/royalty change on renewal | **NOT SPECIFIED** |
| Renewal invoice behavior | **NOT SPECIFIED** |
| Auto-renewal vs. manual renewal | **NOT SPECIFIED** |

**FR-SET-014**: How is the renewal fee settled and what are the prevailing renewal terms?

---

## 17. Tax

### 17.1 Source Analysis

**NOT SPECIFIED — REQUIRES APPROVAL**

ADR 014 (line 301) explicitly identifies: *"Tax treatment of royalty, sharing, reimbursements, and settlement transactions"* as NOT SPECIFIED.

### 17.2 Tax Decision Items

| Item | Status |
|------|--------|
| GST on franchise payout | **NOT SPECIFIED** |
| GST on royalty | **NOT SPECIFIED** |
| GST on commission | **NOT SPECIFIED** |
| TDS on franchise payout | **NOT SPECIFIED** |
| TDS on royalty | **NOT SPECIFIED** |
| GST on renewal fee | **NOT SPECIFIED** |
| GST on refund | **NOT SPECIFIED** |
| GST on MG | **NOT SPECIFIED** |
| Input tax credit interaction | **NOT SPECIFIED** |
| Tax invoice requirement | **NOT SPECIFIED** |

**FR-SET-015**: What is the tax treatment of franchise settlement payments?

---

## 18. Disputes

### 18.1 Legal Clause

**AGREEMENT-SPECIFIED (legal, not software)**

Both agreements (clause 10): Disputes referred to arbitration under the Arbitration and Conciliation Act, 1996.

- Kushwaha: Seat of arbitration = Jaipur, Rajasthan
- HUF: Seat of arbitration = Nanded, Maharashtra

### 18.2 Software Dispute Workflow

**NOT SPECIFIED**

No source defines a software dispute workflow for settlement disagreements. The arbitration clause is a legal mechanism, not a software feature.

| Item | Status |
|------|--------|
| Software dispute submission | **NOT SPECIFIED** |
| Dispute evidence upload | **NOT SPECIFIED** |
| Dispute resolution workflow | **NOT SPECIFIED** |
| Dispute impact on payment | **NOT SPECIFIED** |
| Dispute escalation | **NOT SPECIFIED** |

**FR-SET-016**: Does the platform require a software dispute workflow, or is dispute handling managed externally?

---

## 19. Reversals

### 19.1 Source Analysis

**NOT SPECIFIED**

No authoritative source defines settlement reversal rules.

| Item | Status |
|------|--------|
| Settlement reversal trigger | **NOT SPECIFIED** |
| Reversal approval | **NOT SPECIFIED** |
| Reversal accounting | **NOT SPECIFIED** |
| Reversal notification | **NOT SPECIFIED** |
| Partial reversal | **NOT SPECIFIED** |

**FR-SET-017**: Under what conditions can a settlement be reversed?

---

## 20. Historical Reproducibility

### 20.1 Approved Rule

**APPROVED (HR-01, HR-02, HR-03)**

Historical calculations must use the commercial terms applicable at the time of the calculation period, preserved via agreement-level `termsSnapshot`.

### 20.2 Settlement Impact

When settlement is implemented:
- Settlement statements for historical periods MUST use the `termsSnapshot` captured at agreement creation time
- Changing future commercial rules MUST NOT retroactively alter historical settlement statements
- Each settlement record MUST reference the commercial terms version used for calculation

### 20.3 Implementation Requirement

**APPROVED** — settlement records must be reproducible from the commercial terms snapshot.

---

## 21. RBAC

### 21.1 Current Permissions

**EXISTING PLATFORM BEHAVIOR**

| Permission | Current Scope | Settlement Relevance |
|-----------|--------------|---------------------|
| `franchise.read` | View franchise partners, agreements, territories, outlets | Would cover settlement viewing |
| `franchise.write` | Create/edit franchise entities | Would cover settlement generation |
| `report.read` | View reports including payout report | Covers payout viewing |

### 21.2 Proposed Settlement Permissions

**PROPOSED — REQUIRES APPROVAL**

| Permission | Proposed Purpose | Status |
|-----------|-----------------|--------|
| `settlement.view` | View settlement statements | **PROPOSED — REQUIRES APPROVAL** |
| `settlement.generate` | Generate monthly settlement | **PROPOSED — REQUIRES APPROVAL** |
| `settlement.approve` | Approve settlement for payment | **PROPOSED — REQUIRES APPROVAL** |
| `settlement.pay` | Record franchise payment | **PROPOSED — REQUIRES APPROVAL** |
| `settlement.reconcile` | Match payments to settlements | **PROPOSED — REQUIRES APPROVAL** |

**FR-SET-018**: What settlement-specific RBAC permissions are required?

---

## 22. Data Model Requirements

### 22.1 Conceptual Requirements

**PROPOSED — REQUIRES APPROVAL**

No settlement data model exists. The following concepts would be required:

| Concept | Purpose | Status |
|---------|---------|--------|
| Settlement | A formal financial obligation for a period | **REQUIRED for settlement** |
| SettlementLine | Individual components (MG, revenue share, royalty, commission) | **REQUIRED for settlement** |
| SettlementAdjustment | Permitted adjustments to settlement amount | **PROPOSED** |
| SettlementPayment | Payment records linked to settlement | **REQUIRED for payment** |
| SettlementStatement | Generated document for franchise partner | **REQUIRED for statement** |
| PaymentReference | Bank/UPI/transaction reference for payment | **PROPOSED** |

### 22.2 Existing Reusable Models

| Model | Reusability |
|-------|------------|
| `FranchiseAgreement` | Links settlement to agreement |
| `FranchiseAgreementOutlet` | Links settlement to outlet |
| `FranchiseRevenueDistribution` | Provides distribution percentages |
| `FranchiseOutletProfile` | Provides investment amount |
| `AuditLog` | Can record settlement actions |

### 22.3 Non-Reusable Models

| Model | Reason |
|-------|--------|
| `Payment` | Linked to `Invoice`, not designed for franchise settlement |
| `Invoice` | Customer invoices, not franchise obligations |

**FR-SET-019**: What data model is required for franchise settlement?

---

## 23. Finance Integration

### 23.1 Existing Finance State

| Component | Status | Notes |
|-----------|--------|-------|
| Invoice | **IMPLEMENTED** | Customer invoices with line items, GST, discounts |
| Invoice Payment | **IMPLEMENTED** | Records payments against invoices |
| GatewayAccount | **PARTIAL** | Model exists; no integration code |
| General Ledger | **NOT IMPLEMENTED** | DOC-023 specifies; no schema |
| Accounts Receivable | **NOT IMPLEMENTED** | DOC-023 specifies; no schema |
| Accounts Payable | **NOT IMPLEMENTED** | DOC-023 specifies; no schema |
| Bank Reconciliation | **NOT IMPLEMENTED** | DOC-023 specifies; no schema |
| Chart of Accounts | **NOT IMPLEMENTED** | DOC-023 specifies; no schema |

### 23.2 Integration Principle

Per ADR 016: Franchise settlement must remain **architecturally separate** from customer invoice payment. Future Finance integration must reuse platform Finance where architecturally appropriate (e.g., if GL is implemented, franchise settlement entries should post to the same GL).

### 23.3 Current Gap

No general ledger, accounts receivable, or accounts payable exists. Franchise settlement cannot currently integrate with double-entry accounting.

**FR-SET-020**: What Finance infrastructure must exist before franchise settlement can post accounting entries?

---

## 24. Settlement Flow

### 24.1 Requirements-Level Flow

```
Operational Sales (Invoice data)
  → [IMPLEMENTED]

Commercial Calculation (Payout report)
  → [IMPLEMENTED]

Revenue Statement Generation
  → [AGREEMENT-SPECIFIED: 5th Working Day]
  → [NOT IMPLEMENTED]

Settlement Obligation Creation
  → [NOT SPECIFIED]
  → [REQUIRES APPROVAL]

Settlement Approval
  → [NOT SPECIFIED]
  → [REQUIRES APPROVAL]

Payment Disbursement
  → [NOT SPECIFIED]
  → [REQUIRES APPROVAL]

Payment Recording
  → [NOT SPECIFIED]
  → [REQUIRES APPROVAL]

Reconciliation
  → [NOT SPECIFIED]
  → [REQUIRES APPROVAL]
```

### 24.2 Known Gaps

Every step after "Revenue Statement Generation" is unspecified and requires business approval before implementation.

---

## 25. Business Decision Register

| ID | Question | Current Source Position | Status |
|----|----------|------------------------|--------|
| FR-SET-001 | Settlement period and frequency | Agreement implies monthly; not explicitly defined | **REQUIRES APPROVAL** |
| FR-SET-002 | Settlement statement content | Agreement requires "detailed statement of accounts" and "complete revenue statements"; exact fields not specified | **REQUIRES APPROVAL** |
| FR-SET-003 | Settlement calculation: is payout the settlement amount? | Agreement says "calculate the total amount payable"; unclear if additional steps needed | **REQUIRES APPROVAL** |
| FR-SET-004 | Settlement lifecycle states | No source defines lifecycle | **NOT SPECIFIED** |
| FR-SET-005 | Settlement approval workflow (who generates, reviews, approves) | No source defines workflow | **NOT SPECIFIED** |
| FR-SET-006 | Payment method (bank transfer, UPI, cash, etc.) | No source specifies method | **NOT SPECIFIED** |
| FR-SET-007 | Payment status model | No source defines states | **NOT SPECIFIED** |
| FR-SET-008 | Partial payment support | No source addresses | **NOT SPECIFIED** |
| FR-SET-009 | Outstanding balance tracking across periods | No source requires | **NOT SPECIFIED** |
| FR-SET-010 | Reconciliation process (payment-to-settlement matching) | No source defines | **NOT SPECIFIED** |
| FR-SET-011 | Adjustment categories (beyond operational-loss exclusion) | Agreement excludes operational losses; other types unspecified | **PARTIALLY SPECIFIED** |
| FR-SET-012 | Refund workflow (payment method, approval, accounting) | Agreement specifies amounts/timing; workflow unspecified | **PARTIALLY SPECIFIED** |
| FR-SET-013 | Franchise-sale commission settlement and payment | Agreement specifies ₹15,000 per sale; settlement/payment unspecified | **PARTIALLY SPECIFIED** |
| FR-SET-014 | Renewal fee settlement and "prevailing terms" definition | Agreement specifies ₹20,000 fee; workflow and terms unspecified | **PARTIALLY SPECIFIED** |
| FR-SET-015 | Tax treatment (GST/TDS on payout, royalty, commission, refund) | ADR 014 explicitly marks as NOT SPECIFIED | **NOT SPECIFIED** |
| FR-SET-016 | Software dispute workflow | Only arbitration clause exists (legal, not software) | **NOT SPECIFIED** |
| FR-SET-017 | Settlement reversal rules | No source defines | **NOT SPECIFIED** |
| FR-SET-018 | Settlement-specific RBAC permissions | No source defines | **NOT SPECIFIED** |
| FR-SET-019 | Settlement data model | No source defines | **NOT SPECIFIED** |
| FR-SET-020 | Finance infrastructure prerequisites (GL, AR/AP) | DOC-023 specifies but NOT IMPLEMENTED | **NOT SPECIFIED** |

### 25.1 Status Summary

| Status | Count |
|--------|-------|
| APPROVED | 0 |
| AGREEMENT-SPECIFIED (partial) | 5 (FR-SET-002, 003, 011, 012, 013, 014) |
| NOT SPECIFIED | 14 (FR-SET-004, 005, 006, 007, 008, 009, 010, 015, 016, 017, 018, 019, 020) |
| REQUIRES APPROVAL | 3 (FR-SET-001, 002, 003) |

**No settlement decision has APPROVED status. Implementation is blocked.**

---

## 26. Implementation Gate

**SETTLEMENT IMPLEMENTATION IS BLOCKED PENDING BUSINESS APPROVAL.**

Per ADR 014 §"Commercial-policy gate" and §"Implementation Sequence" item 9:

> *"Implement royalty, sharing, and settlement only after all applicable commercial formulas and processes are explicitly approved."*

Per FRANCHISE-COMMERCIAL-RULES-APPROVALS.md Phase 4:

> *"No franchise commercial calculation, commission calculation, settlement calculation, or related schema/API implementation may begin until the applicable decision IDs are explicitly approved."*

The 20 FR-SET decisions in this document must receive explicit business/legal/finance approval before any settlement engine implementation begins.

---

## 27. Existing Approved Commercial Rules (Not Changed)

The following approved rules are preserved and remain implemented:

| Decision | Rule | Status |
|----------|------|--------|
| MG-01 | Hybrid: existing ₹3.10L = fixed ₹15,000; new = formula | **APPROVED, IMPLEMENTED** |
| MG-02 | 3% of Initial Investment for formula MG | **APPROVED, IMPLEMENTED** |
| MG-03 | Agreement-level MG | **APPROVED, IMPLEMENTED** |
| MG-04 | Agreement-level override | **APPROVED, IMPLEMENTED** |
| NP-01 | Net Sales excludes GST | **APPROVED, IMPLEMENTED** |
| NP-02 | MAX(MG, 30% of Net Sales) | **APPROVED, IMPLEMENTED** |
| TR-01/02/03 | Agreement-level royalty override, all territory outlets | **APPROVED, IMPLEMENTED** |
| RD-01/02/03 | Per-outlet distribution, sum-to-100% | **APPROVED, IMPLEMENTED** |
| HR-01/02/03 | Historical reproducibility, terms snapshot | **APPROVED, IMPLEMENTED** |
| CX-01/02/03 | Single plan, reproducibility, binding agreements | **APPROVED, IMPLEMENTED** |

---

## 28. Document Classification Summary

| Category | Items | Status |
|----------|-------|--------|
| Approved commercial rules | 10 decisions | Preserved, implemented |
| Agreement-specified settlement terms | 5 items | Documented, not implemented |
| Not specified settlement items | 14 items | Documented, require approval |
| Proposed settlement permissions | 5 permissions | Documented, require approval |
| Proposed data model concepts | 6 concepts | Documented, require approval |
| Finance integration gaps | 5 components | Documented, not implemented |

---

*End of specification.*

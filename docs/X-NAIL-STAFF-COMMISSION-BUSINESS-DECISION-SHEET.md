# X Nail Staff Commission — Business Decision Sheet

**Document ID:** LWILL-XNAIL-STAFF-COMMISSION-BDS  
**Version:** 2.0  
**Status:** AWAITING BUSINESS APPROVAL  
**Branch:** `phase-1d-native-auth`  
**Created:** 2026-09-15  
**Updated:** 2026-09-15

**Purpose:** Present explicit commission business-rule options to the business owner for approval before engineering implementation begins.

**Related Documents:**
- `docs/LWILL-DOC-017-X-Nail-ERP-SRS-MVP-v1.0.txt` (XN-006)
- `docs/LWILL-DOC-023-Finance-Accounting-SRS-v1.0.txt`
- `docs/DECISIONS.md` (ADR 014)
- `docs/FRANCHISE-COMMERCIAL-RULES-BUSINESS-APPROVAL-SHEET.md`
- `docs/PROJECT-STATUS.md`

---

## Background

### XN-006 Requirement

DOC-017 defines: `XN-006 | Staff attendance and commission calculation.`

**Attendance:** IMPLEMENTED — check-in/check-out, staff assignment, branch scoping.

**Staff Commission:** NOT IMPLEMENTED — no formula, rate, basis, eligibility, timing, or calculation rules exist in any approved document.

### Staff Commission vs Franchise-Sale Commission

These are two distinct business concepts:

| | Staff Commission | Franchise-Sale Commission |
|---|---|---|
| **Concept** | Operational staff earning from service/sale revenue | Franchise partner earning from selling new franchises |
| **SRS** | XN-006 (DOC-017) | Agreement clause 2.2C |
| **Rate** | NOT SPECIFIED | ₹15,000 per successful franchise sold |
| **Governed by** | This document | Franchise commercial rules |
| **Blocked by ADR-014?** | **NO** | YES |

**These concepts must not be merged.**

---

## P0 Decisions — Minimum Required Before Technical Design

These 5 decisions MUST be approved before any commission implementation can begin.

---

### SC-001 — Commission Basis

**Business Question:** What monetary amount should the commission rate be applied to?

**Options:**

- [ ] A. **Service revenue** — The listed price of each service performed. Simple and predictable. Does not depend on payment status.
- [ ] B. **Invoice revenue** — The total invoice amount including all line items (services, products, packages). Broader than service-only.
- [ ] C. **Collected payment** — Only amounts actually collected from customers. Most conservative — commission is only earned when the business receives money.
- [ ] D. **Service-specific commissionable amount** — Each service has its own designated commissionable amount (may differ from price). Most flexible but requires per-service configuration.
- [ ] Other / Specify: _______________________________________________

**Business Owner Decision:** _______________________________________________

**Notes:** _______________________________________________

---

### SC-002 — Commission Rate Structure

**Business Question:** How should the commission rate be defined?

**Options:**

- [ ] A. **One global rate** — One configurable percentage for all eligible services. Example: 10% of all eligible service revenue.
- [ ] B. **Per-service rate** — Different services have different commission rates. Example: Manicure 10%, Pedicure 12%, Nail Art 15%.
- [ ] C. **Per-staff rate** — Different staff members have different commission rates based on experience/role.
- [ ] D. **Staff + service combination** — Each staff member has different rates for different services. Most granular.
- [ ] E. **Fixed amount** — Flat fee per service regardless of price. Example: ₹50 per manicure.
- [ ] Other / Specify: _______________________________________________

**If a percentage-based option is selected, specify the rate(s):**

_______________________________________________

**Business Owner Decision:** _______________________________________________

**Notes:** _______________________________________________

---

### SC-003 — Staff Eligibility

**Business Question:** Which staff members can earn commission?

**Options:**

- [ ] A. **All active staff** — Every staff member marked as active is eligible. Simplest.
- [ ] B. **Nail technicians only** — Only staff with a nail technician role/title.
- [ ] C. **Selected staff roles** — Configurable set of roles (specify which): _______________________________________________
- [ ] D. **Individual flag** — Each staff member has an explicit eligibility flag. Most flexible.
- [ ] Other / Specify: _______________________________________________

**Business Owner Decision:** _______________________________________________

**Notes:** _______________________________________________

---

### SC-004 — Staff Attribution

**Business Question:** Which staff relationship earns the commission?

**Options:**

- [ ] A. **Appointment staff** — The staff member assigned to the appointment (`Appointment.staffId`) earns commission. Already exists in the system.
- [ ] B. **Explicit staff assignment at billing** — The billing user selects the commission-earning staff at invoice creation time. Requires a new field.
- [ ] C. **Invoice-line staff attribution** — Each line item on the invoice can be attributed to a different staff member. Most granular but most complex.
- [ ] Other / Specify: _______________________________________________

**Business Owner Decision:** _______________________________________________

**Notes:** _______________________________________________

---

### SC-005 — Earning Event

**Business Question:** When does commission become earned?

**Options:**

- [ ] A. **Appointment completion** — Commission is earned when the appointment status changes to completed.
- [ ] B. **Invoice creation** — Commission is earned when the invoice is created.
- [ ] C. **Payment collection** — Commission is earned when payment is received.
- [ ] D. **End-of-period calculation** — Commission is calculated in batch at the end of a period (daily/weekly/monthly).
- [ ] Other / Specify: _______________________________________________

**Business Owner Decision:** _______________________________________________

**Notes:** _______________________________________________

---

## P1 Decisions — Required for Complete Production-Safe Commission

These decisions define scope, tax treatment, and product coverage.

**IMPORTANT:** Business owner must explicitly approve the intended release scope if any P1 decisions are deferred.

---

### SC-006 — Unpaid Invoices

**Business Question:** Should unpaid invoices generate commission?

**Options:**

- [ ] A. **Yes** — Unpaid invoices generate commission. Staff earns commission regardless of customer payment.
- [ ] B. **No** — Only collected payments generate commission. Most financially conservative.
- [ ] Other / Specify: _______________________________________________

**Business Owner Decision:** _______________________________________________

**Notes:** _______________________________________________

---

### SC-007 — Discount Treatment

**Business Question:** Do discounts reduce the commissionable base?

**Options:**

- [ ] A. **Before discount** — Commission calculated on the original amount before discount.
- [ ] B. **After discount** — Commission calculated on the amount after discount is applied.
- [ ] C. **Selected discount types only** — Discount excluded only for selected discount types (specify): _______________________________________________
- [ ] Other / Specify: _______________________________________________

**Business Owner Decision:** _______________________________________________

**Notes:** _______________________________________________

---

### SC-008 — GST Treatment

**Business Question:** Is GST included in the commissionable revenue?

**Options:**

- [ ] A. **Excluding GST** — Commission on amount excluding GST.
- [ ] B. **Including GST** — Commission on amount including GST.
- [ ] Other / Specify: _______________________________________________

**Business Owner Decision:** _______________________________________________

**Notes:** _______________________________________________

---

### SC-009a — Service Sales Commission

**Business Question:** Does commission apply to service sales?

**Options:**

- [ ] A. **Commission applies**
- [ ] B. **Commission does not apply**
- [ ] C. **Separate rate** (specify): _______________________________________________
- [ ] Other / Specify: _______________________________________________

**Business Owner Decision:** _______________________________________________

---

### SC-009b — Product Sales Commission

**Business Question:** Does commission apply to product sales (nail polish, tools, etc.)?

**Options:**

- [ ] A. **Commission applies**
- [ ] B. **Commission does not apply**
- [ ] C. **Separate rate** (specify): _______________________________________________
- [ ] Other / Specify: _______________________________________________

**Business Owner Decision:** _______________________________________________

---

### SC-009c — Package Sales Commission

**Business Question:** Does commission apply to package sales (bundled service packages)?

**Options:**

- [ ] A. **Commission applies**
- [ ] B. **Commission does not apply**
- [ ] C. **Separate rate** (specify): _______________________________________________
- [ ] Other / Specify: _______________________________________________

**Business Owner Decision:** _______________________________________________

---

### SC-009d — Membership Sales Commission

**Business Question:** Does commission apply to membership sales (recurring membership plans)?

**Options:**

- [ ] A. **Commission applies**
- [ ] B. **Commission does not apply**
- [ ] C. **Separate rate** (specify): _______________________________________________
- [ ] Other / Specify: _______________________________________________

**Business Owner Decision:** _______________________________________________

---

### SC-010 — Refund: Cancelled Appointment

**Business Question:** How should commission be treated when an appointment is cancelled (service not performed)?

**Options:**

- [ ] A. **Reverse commission completely**
- [ ] B. **Reduce commission proportionally**
- [ ] C. **No change after finalization**
- [ ] D. **Manual adjustment**
- [ ] Other / Specify: _______________________________________________

**Business Owner Decision:** _______________________________________________

---

### SC-011 — Refund: Cancelled Invoice

**Business Question:** How should commission be treated when an invoice is voided?

**Options:**

- [ ] A. **Reverse commission completely**
- [ ] B. **Reduce commission proportionally**
- [ ] C. **No change after finalization**
- [ ] D. **Manual adjustment**
- [ ] Other / Specify: _______________________________________________

**Business Owner Decision:** _______________________________________________

---

### SC-012 — Refund: Partial Refund

**Business Question:** How should commission be treated when a partial refund is issued?

**Options:**

- [ ] A. **Reverse commission completely**
- [ ] B. **Reduce commission proportionally**
- [ ] C. **No change after finalization**
- [ ] D. **Manual adjustment**
- [ ] Other / Specify: _______________________________________________

**Business Owner Decision:** _______________________________________________

---

### SC-013 — Refund: Full Refund

**Business Question:** How should commission be treated when a full refund is issued?

**Options:**

- [ ] A. **Reverse commission completely**
- [ ] B. **Reduce commission proportionally**
- [ ] C. **No change after finalization**
- [ ] D. **Manual adjustment**
- [ ] Other / Specify: _______________________________________________

**Business Owner Decision:** _______________________________________________

---

### SC-014 — Multiple Staff Attribution

**Business Question:** What happens when more than one staff member contributes to one service/transaction?

**Options:**

- [ ] A. **One primary staff member** — Only the primary staff member earns commission.
- [ ] B. **Equal split** — Commission divided equally among all contributing staff.
- [ ] C. **Configurable percentage split** — Each staff member gets a configured percentage. Total must not exceed 100%.
- [ ] D. **Individual line-item attribution** — Each line item on the invoice is attributed to a specific staff member.
- [ ] E. **Manual allocation** — Staff allocation is done manually per transaction.
- [ ] Other / Specify: _______________________________________________

**Business Owner Decision:** _______________________________________________

**Notes:** _______________________________________________

---

### SC-015 — Approval / Finalization

**Business Question:** Does commission require approval before becoming final?

**Options:**

- [ ] A. **Automatically final** — Commission is final when calculated. No approval step.
- [ ] B. **Manager approval required**
- [ ] C. **Accountant approval required**
- [ ] D. **Tenant-admin approval required**
- [ ] Other / Specify: _______________________________________________

**If approval is required, can finalized commission be edited?**

- [ ] Yes
- [ ] No

**Business Owner Decision:** _______________________________________________

**Notes:** _______________________________________________

---

### SC-016 — Historical Commission Rate

**Business Question:** Must commission calculations remain historically reproducible when rates change?

**Options:**

- [ ] A. **Snapshot** — The applicable commission rate is captured at calculation time. Historical calculations remain reproducible even if rates change later.
- [ ] B. **Recalculate** — Historical periods are recalculated using current rates. Simpler but historical results change when rates change.
- [ ] Other / Specify: _______________________________________________

**Business Owner Decision:** _______________________________________________

**Notes:** _______________________________________________

---

### SC-017 — Calculation Period

**Business Question:** What is the normal commission calculation period? (Separate from the earning event.)

**Options:**

- [ ] A. **Per transaction** — Commission calculated immediately on each transaction.
- [ ] B. **Daily**
- [ ] C. **Weekly**
- [ ] D. **Monthly**
- [ ] E. **Payroll period** (specify): _______________________________________________
- [ ] Other / Specify: _______________________________________________

**Business Owner Decision:** _______________________________________________

**Notes:** _______________________________________________

---

### SC-018 — Manual Adjustments

**Business Question:** Can authorized users manually adjust commission amounts?

**Options:**

- [ ] A. **No manual adjustments** — Commission is purely formula-driven.
- [ ] B. **Manual positive/negative adjustments with reason** — Adjustments allowed with a required reason. History retained.
- [ ] C. **Manual adjustments requiring approval** — Adjustments require approval before taking effect.
- [ ] Other / Specify: _______________________________________________

**If manual adjustments are allowed, must adjustment history be retained?**

- [ ] Yes
- [ ] No

**Business Owner Decision:** _______________________________________________

**Notes:** _______________________________________________

---

### SC-019 — Branch / Staff Scope

**Business Question:** To which branch does commission belong?

**Options:**

- [ ] A. **Staff's assigned branch** — Commission belongs to the branch where the staff member is assigned.
- [ ] B. **Appointment branch** — Commission follows the appointment's branch.
- [ ] C. **Invoice branch** — Commission follows the invoice's branch.
- [ ] Other / Specify: _______________________________________________

**Business Owner Decision:** _______________________________________________

**Notes:** _______________________________________________

---

### SC-020 — Payment / Payout Boundary

**Business Question:** What is the scope of this commission implementation?

**Options:**

- [ ] A. **Calculation only** — Platform calculates commission amounts. Actual payment to staff is handled externally (payroll).
- [ ] B. **Calculation + approval** — Platform calculates and supports approval workflow. Payment is external.
- [ ] C. **Full lifecycle** — Platform handles calculation, approval, and payment/payout tracking.
- [ ] Other / Specify: _______________________________________________

**Business Owner Decision:** _______________________________________________

**Notes:** _______________________________________________

---

## Commission Release Scope

**Business Question:** What is the intended release scope for staff commission?

**Options:**

- [ ] A. **Full commission scope** — SC-001 through SC-020 all approved. Implement complete commission system.
- [ ] B. **Limited Phase 1 scope** — Only P0 decisions (SC-001 through SC-005) approved for initial release. Remaining decisions (SC-006 through SC-020) deferred to a later phase. **Deferred decisions must be explicitly listed below.**
- [ ] C. **Do not implement yet** — Commission remains blocked.

**If B is selected, list deferred decisions:**

_______________________________________________

**Business Owner Decision:** _______________________________________________

**Notes:** _______________________________________________

---

## Decision Dependencies

The following dependencies exist between decisions:

- **SC-001 / SC-002 / SC-004 / SC-005** — These four decisions together define the core commission calculation architecture. They must be consistent (e.g., if SC-001 = "collected payment" and SC-005 = "appointment completion", there may be a timing mismatch).

- **SC-006 / SC-007 / SC-008** — These affect the commissionable base calculation. SC-006 (unpaid invoices) is only relevant if SC-001 selects invoice or payment basis.

- **SC-009a–d** — These determine which revenue categories generate commission. If SC-009a (services) = "does not apply", the system has no commission source.

- **SC-010–SC-013** — These define refund/reversal behavior. If SC-015 (approval) = "auto-final", refund handling becomes more critical because finalized commissions may need reversal.

- **SC-014** — Multiple staff attribution depends on SC-004 (staff attribution). If SC-004 = "appointment staff", SC-014 determines what happens when multiple staff serve one customer.

- **SC-016** — Historical rate snapshot affects whether past commission calculations can be reproduced. If SC-002 changes rates later, SC-016 determines whether historical records change.

- **SC-019** — Branch scope affects reporting and authorization. It is separate from franchise agreement ownership.

- **SC-020** — Defines the implementation boundary. SC-020 = "calculation only" means no payout/payment tracking in this phase.

---

## Known Technical Implications

The following technical facts are verified in the current repository and may affect commission implementation:

1. **Appointment has nullable `staffId`** — An appointment CAN exist without a staff member. If SC-004 = "appointment staff", appointments without staff assignment will not generate commission.

2. **Invoice does NOT have `staffId`** — An invoice cannot directly identify which staff member performed the service. If SC-004 = "explicit staff assignment at billing", a new field must be added to the Invoice model.

3. **InvoiceLineItem does NOT have `staffId`** — Line items cannot be attributed to individual staff. If SC-004 = "invoice-line staff attribution", a new field must be added to the InvoiceLineItem model.

4. **Payment does NOT have a status field** — The current Payment model has `amountCents`, `method`, `paidAt` but no status (paid/failed/refunded). If SC-006 = "only collected payments", the system may need payment status tracking.

5. **Refund/cancellation mechanisms are not currently implemented** — No cancelled-invoice or refunded-payment representation exists. If SC-010–SC-013 require refund handling, a refund mechanism must be designed.

6. **Multiple staff per appointment is not currently implemented** — The Appointment model has a single `staffId`. If SC-014 = "equal split" or "configurable split", a multi-staff mechanism must be designed.

7. **Commission model does not currently exist** — No commission table, service, API, or UI exists. All commission infrastructure must be created.

8. **Historical commission rate snapshot mechanism does not currently exist** — If SC-016 = "snapshot", a rate-capture mechanism must be designed.

9. **The existing settlement pattern (FranchiseSettlement → FranchiseSettlementLine → FranchisePayment) provides a reusable architecture** for commission calculation → line items → approval lifecycle.

---

## Implementation Sequence (After Approval)

```
Business Approval (this document)
    → Technical Design (schema, service, API, UI)
        → Design Review
            → Implementation
                → Tests
                    → UAT
                        → Production
```

---

## Approval

| Field | Value |
|-------|-------|
| Prepared by | Engineering |
| Business owner | |
| Approval date | |
| Release scope selected | |
| Approved decisions | |
| Deferred decisions | |
| Implementation authorized | YES / NO |

---

*End of decision sheet. Version 2.0 — Awaiting business approval.*

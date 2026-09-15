# X Nail Staff Commission — Business Decision Sheet

**Document ID:** LWILL-XNAIL-STAFF-COMMISSION-BDS  
**Version:** 1.0  
**Status:** AWAITING BUSINESS APPROVAL  
**Branch:** `phase-1d-native-auth`  
**Created:** 2026-09-15

**Purpose:** Present explicit commission business-rule options to the business owner for approval before engineering implementation begins.

**Related Documents:**
- `docs/LWILL-DOC-017-X-Nail-ERP-SRS-MVP-v1.0.txt` (XN-006)
- `docs/LWILL-DOC-023-Finance-Accounting-SRS-v1.0.txt`
- `docs/LWILL-DOC-027-Analytics-Business-Intelligence-SRS-v1.0.txt`
- `docs/DECISIONS.md` (ADR 014)
- `docs/FRANCHISE-COMMERCIAL-RULES-BUSINESS-APPROVAL-SHEET.md`
- `docs/FRANCHISE-COMMERCIAL-RULES-SPECIFICATION.md`
- `docs/FRANCHISE-COMMERCIAL-RULES-APPROVALS.md`
- `docs/FRANCHISE-COMMERCIAL-ARCHITECTURE-DECISION.md`
- `docs/PROJECT-STATUS.md`

---

## Background

### XN-006 Requirement

DOC-017 defines: `XN-006 | Staff attendance and commission calculation.`

**Attendance:** IMPLEMENTED — check-in/check-out, staff assignment, branch scoping.

**Staff Commission:** NOT IMPLEMENTED — no formula, rate, basis, eligibility, timing, or calculation rules exist in any approved document.

### ADR-014 Clarification

ADR-014 commercial-policy gate (line 239) blocks: *"Royalty, revenue/profit sharing, and franchise settlement implementation."*

ADR-014 does NOT block staff commission. `FRANCHISE-COMMERCIAL-RULES-BUSINESS-APPROVAL-SHEET.md` line 181 explicitly confirms: *"Deferral of these items does **not** block commission, reports, settings, inventory, staff, attendance, or any other non-franchise X NAIL module."*

### Staff Commission vs Franchise-Sale Commission

These are two distinct business concepts:

| | Staff Commission | Franchise-Sale Commission |
|---|---|---|
| **Concept** | Operational staff earning from service/sale revenue | Franchise partner earning from selling new franchises |
| **SRS** | XN-006 (DOC-017) | Agreement clause 2.2C |
| **Rate** | NOT SPECIFIED | ₹15,000 per successful franchise sold |
| **Basis** | NOT SPECIFIED | Per sale event |
| **Governed by** | This document | Franchise commercial rules (ADR-014, FRANCHISE-COMMERCIAL-RULES-APPROVALS.md) |
| **Blocked by ADR-014?** | **NO** | YES |

**These concepts must not be merged.** Staff commission is an X Nail operational requirement. Franchise-sale commission is a franchise commercial rule.

### Existing Infrastructure Available

| Component | Status | Notes |
|-----------|--------|-------|
| Staff model | IMPLEMENTED | `id`, `tenantId`, `branchId`, `displayName`, `email`, `phone`, `isActive` |
| Appointment model | IMPLEMENTED | `id`, `tenantId`, `customerId`, `serviceId`, `staffId`, `branchId`, `startsAt`, `endsAt`, `status` |
| Invoice model | IMPLEMENTED | `id`, `tenantId`, `customerId`, `branchId`, `issuedAt`, `subtotalCents`, `discountCents`, `gstCents`, `totalCents` |
| InvoiceLineItem | IMPLEMENTED | `id`, `tenantId`, `invoiceId`, `serviceId`, `productId`, `packageId`, `quantity`, `unitPriceCents`, `lineTotalCents` |
| Payment model | IMPLEMENTED | `id`, `tenantId`, `invoiceId`, `amountCents`, `method`, `paidAt` |
| Attendance model | IMPLEMENTED | `id`, `tenantId`, `staffId`, `checkInAt`, `checkOutAt`, `status` |
| Service model | IMPLEMENTED | `id`, `tenantId`, `name`, `durationMinutes`, `priceCents` |
| RBAC | IMPLEMENTED | `staff.read`, `staff.write` permissions exist |
| Report infrastructure | IMPLEMENTED | `report-service.ts` with multiple report types |
| Settlement pattern | IMPLEMENTED | Reusable architecture for calculation + approval + audit |

---

## Decision Table

Leave **Business Selection** column EMPTY for business owner to complete.

| ID | Business Decision | Option A | Option B | Option C | Option D | Other | Business Selection | Notes |
|----|-------------------|----------|----------|----------|----------|-------|--------------------|-------|
| SC-001 | Commission basis | Service revenue (price of service performed) | Invoice revenue (total invoice amount) | Collected payment (only paid amounts) | Service-specific commissionable amount | Other / Custom | | Determines the monetary base for commission calculation |
| SC-002 | Commission rate | One configurable percentage for all eligible services | Percentage configurable per service | Percentage configurable per staff member | Percentage configurable by staff + service combination | Fixed commission amount per service / Other / Custom | | Business must specify actual rate(s) |
| SC-003 | Staff eligibility | All active staff | Nail technicians only | Selected staff roles (specify) | Individual staff eligibility flag | Other / Custom | | Also: role-based, individually configurable, or both? |
| SC-004 | Staff attribution | Appointment staff (staffId on appointment) | Explicit staff assignment at billing time | Invoice-line staff attribution (per line item) | Other / Custom | | Which staff relationship earns the commission? |
| SC-005 | Earning event | Appointment completion | Invoice creation | Payment collection | End-of-period calculation | Other / Custom | | When does commission become earned? |
| SC-006 | Unpaid invoices | Yes — unpaid invoices generate commission | No — only collected payments generate commission | Other / Custom | | | Only relevant if basis is invoice/payment |
| SC-007 | Discount treatment | Commission calculated before discount | Commission calculated after discount | Discount excluded only for selected discount types | Other / Custom | | Do discounts reduce the commissionable base? |
| SC-008 | GST treatment | Commission on amount excluding GST | Commission on amount including GST | Other / Custom | | | Separate from franchise settlement GST rules |
| SC-009a | Service sales | Commission applies | Commission does not apply | Separate rate (specify) | Other / Custom | | |
| SC-009b | Product sales | Commission applies | Commission does not apply | Separate rate (specify) | Other / Custom | | |
| SC-009c | Package sales | Commission applies | Commission does not apply | Separate rate (specify) | Other / Custom | | |
| SC-009d | Membership sales | Commission applies | Commission does not apply | Separate rate (specify) | Other / Custom | | |
| SC-010 | Refund — cancelled appointment | Reverse commission completely | Reduce commission proportionally | No change after finalization | Manual adjustment | Other / Custom | |
| SC-011 | Refund — cancelled invoice | Reverse commission completely | Reduce commission proportionally | No change after finalization | Manual adjustment | Other / Custom | |
| SC-012 | Refund — partial refund | Reverse commission completely | Reduce commission proportionally | No change after finalization | Manual adjustment | Other / Custom | |
| SC-013 | Refund — full refund | Reverse commission completely | Reduce commission proportionally | No change after finalization | Manual adjustment | Other / Custom | |
| SC-014 | Multiple staff | One primary staff member per service | Equal split among contributing staff | Configurable percentage split | Individual line-item attribution | Manual allocation / Other / Custom | Total allocation must not exceed 100% if percentage |
| SC-015 | Approval / finalization | Automatically final when calculated | Manager approval required | Accountant approval required | Tenant-admin approval required | Other / Custom | Can finalized commission be edited? |
| SC-016 | Historical rate | Snapshot applicable rate at calculation time | Recalculate historical periods using current rates | Other / Custom | | | Affects historical reproducibility |
| SC-017 | Calculation period | Per transaction | Daily | Weekly | Monthly | Payroll period / Other / Custom | Separate from earning event |
| SC-018 | Manual adjustments | No manual adjustments | Manual positive/negative adjustments with reason | Manual adjustments requiring approval | Other / Custom | | If allowed: must adjustment history be retained? |
| SC-019 | Branch / staff scope | Commission belongs to staff's assigned branch | Commission follows appointment branch | Commission follows invoice branch | Other / Custom | | Operational scope, not franchise ownership |
| SC-020 | Payment / payout | Calculation only | Calculation + approval | Calculation + approval + payroll/payment | Other / Custom | | This phase scope boundary |

---

## Detailed Decision Context

### SC-001: Commission Basis

The commission basis defines what monetary amount the commission rate is applied to.

**Option A — Service revenue:** The listed price of each service performed. Simple and predictable. Does not depend on payment status.

**Option B — Invoice revenue:** The total invoice amount including all line items (services, products, packages). Broader than service-only but includes non-service items.

**Option C — Collected payment:** Only amounts actually collected from customers. Most conservative — commission is only earned when the business receives money. Requires payment tracking.

**Option D — Service-specific commissionable amount:** Each service has its own designated commissionable amount (may differ from price). Most flexible but requires per-service configuration.

### SC-002: Commission Rate

The rate determines how much commission is earned per unit of commissionable revenue.

**Option A — One global rate:** Simplest. Example: 10% of all eligible service revenue.

**Option B — Per-service rate:** Different services have different commission rates. Example: Manicure 10%, Pedicure 12%, Nail Art 15%.

**Option C — Per-staff rate:** Different staff members have different commission rates based on experience/role.

**Option D — Staff + service combination:** Most granular. Each staff member has different rates for different services.

**Option E — Fixed amount:** Flat fee per service regardless of price. Example: ₹50 per manicure.

**Business must specify actual rate(s) after selecting the structure.**

### SC-003: Staff Eligibility

**Option A — All active staff:** Every staff member with `isActive = true` is eligible. Simplest.

**Option B — Nail technicians only:** Only staff with a specific role/title. Requires role-based filtering.

**Option C — Selected staff roles:** Configurable set of roles (e.g., Nail Technician + Trainer). Requires role taxonomy.

**Option D — Individual flag:** Each staff member has an explicit `eligibleForCommission` flag. Most flexible.

### SC-004: Staff Attribution

**Option A — Appointment staff:** The `Appointment.staffId` field determines who earns commission. Already exists in the data model.

**Option B — Explicit staff assignment at billing:** The billing user selects the commission-earning staff at invoice creation time. Requires a new field.

**Option C — Invoice-line staff attribution:** Each line item on the invoice can be attributed to a different staff member. Most granular but most complex.

### SC-005: Earning Event

**Option A — Appointment completion:** Commission is earned when the appointment status changes to completed.

**Option B — Invoice creation:** Commission is earned when the invoice is created.

**Option C — Payment collection:** Commission is earned when payment is received.

**Option D — End-of-period calculation:** Commission is calculated in batch at the end of a period (daily/weekly/monthly).

### SC-006: Unpaid Invoices

Only relevant if commission basis is invoice or payment amount.

**Option A — Yes:** Unpaid invoices generate commission. Staff earns commission regardless of customer payment.

**Option B — No:** Only collected payments generate commission. Most financially conservative.

### SC-007–SC-008: Discount and GST Treatment

**Discount:** Whether the discount amount reduces the commissionable base.

**GST:** Whether GST-inclusive or GST-exclusive amount is used. Note: Staff commission GST treatment is separate from franchise settlement GST treatment (NP-01). Do not assume they must match.

### SC-009: Product / Package / Membership

Each revenue category may have different commission rules. The business must decide independently for each:

- **Services:** Primary commission source for salon staff
- **Products:** Retail product sales (nail polish, tools, etc.)
- **Packages:** Bundled service packages
- **Memberships:** Recurring membership plans

### SC-010–SC-013: Refund / Cancellation

Four scenarios require separate decisions:
1. Cancelled appointment (service not performed)
2. Cancelled invoice (invoice voided)
3. Partial refund (part of amount returned)
4. Full refund (entire amount returned)

### SC-014: Multiple Staff

When more than one staff member contributes to a service/transaction:

**Option A — One primary:** Only the primary staff member earns commission.

**Option B — Equal split:** Commission divided equally among all contributing staff.

**Option C — Configurable split:** Each staff member gets a configured percentage. Total must not exceed 100%.

**Option D — Line-item attribution:** Each line item on the invoice is attributed to a specific staff member.

### SC-015: Approval / Finalization

Whether commission requires approval before becoming final.

**Option A — Auto-final:** Commission is final when calculated. No approval step.

**Option B–D — Approval required:** Commission goes through an approval workflow before being finalized. Who approves?

### SC-016: Historical Rate

**Option A — Snapshot:** The applicable commission rate is captured at calculation time. Historical calculations remain reproducible even if rates change later.

**Option B — Recalculate:** Historical periods are recalculated using current rates. Simpler but historical results change when rates change.

### SC-017: Calculation Period

Separate from the earning event. Determines when batch calculations occur.

**Option A — Per transaction:** Commission calculated immediately on each transaction.

**Option B–E — Periodic:** Commission accumulated and calculated at the end of a period.

### SC-018: Manual Adjustments

Whether authorized users can manually adjust commission amounts.

**Option A — No:** No manual adjustments. Commission is purely formula-driven.

**Option B — Yes with reason:** Manual positive/negative adjustments allowed with a required reason. History retained.

**Option C — Yes with approval:** Manual adjustments require approval before taking effect.

### SC-019: Branch / Staff Scope

**Option A — Staff's assigned branch:** Commission belongs to the branch where the staff member is assigned (`Staff.branchId`).

**Option B — Appointment branch:** Commission follows the appointment's branch.

**Option C — Invoice branch:** Commission follows the invoice's branch.

This is an operational scope decision, separate from franchise agreement ownership.

### SC-020: Payment / Payout

Defines the scope boundary for this implementation phase.

**Option A — Calculation only:** Platform calculates commission amounts. Actual payment to staff is handled externally (payroll).

**Option B — Calculation + approval:** Platform calculates and supports approval workflow. Payment is external.

**Option C — Full lifecycle:** Platform handles calculation, approval, and payment/payout tracking.

---

## Implementation Gate

**STAFF COMMISSION IMPLEMENTATION IS BLOCKED UNTIL THE REQUIRED BUSINESS DECISIONS ARE APPROVED.**

### Implementation Sequence (after approval)

```
Business Approval (this document)
    → Technical Design (schema, service, API, UI design)
        → Schema/API/UI Design Review
            → Implementation
                → Tests
                    → UAT
                        → Production
```

### Minimum Required Decisions for Phase 1

At minimum, the following decisions MUST be approved before any implementation can begin:

| Priority | Decision | ID |
|----------|----------|-----|
| P0 | Commission basis | SC-001 |
| P0 | Commission rate structure | SC-002 |
| P0 | Staff eligibility | SC-003 |
| P0 | Staff attribution | SC-004 |
| P0 | Earning event | SC-005 |
| P1 | GST treatment | SC-008 |
| P1 | Service/product/package/membership scope | SC-009 |
| P1 | Calculation period | SC-017 |
| P2 | All remaining decisions | SC-006, SC-010–SC-016, SC-018–SC-020 |

P0 decisions define the core commission model. P1 decisions define scope and tax treatment. P2 decisions define edge cases and workflows.

---

## Approval

| Field | Value |
|-------|-------|
| Prepared by | Engineering (automated audit) |
| Business owner | |
| Approval date | |
| Approved decisions | |
| Deferred decisions | |
| Implementation authorized | YES / NO |

---

*End of decision sheet. Version 1.0 — Awaiting business approval.*

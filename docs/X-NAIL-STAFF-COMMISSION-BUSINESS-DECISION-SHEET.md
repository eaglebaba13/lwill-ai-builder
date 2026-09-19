# X Nail Staff Compensation — Business Decision & Approval Sheet

**Document ID:** LWILL-XNAIL-STAFF-COMPENSATION-BDS  
**Version:** 4.0  
**Status:** AWAITING BUSINESS APPROVAL  
**Branch:** `phase-1d-native-auth`  
**Created:** 2026-09-15  
**Updated:** 2026-09-15

**Purpose:** Organize all X Nail Staff Compensation business decisions into a logical approval flow so the business owner can approve decisions in stages, starting with the minimum required for technical design.

**Related Documents:**
- `docs/LWILL-DOC-017-X-Nail-ERP-SRS-MVP-v1.0.txt` (XN-006)
- `docs/DECISIONS.md` (ADR 014)
- `docs/PROJECT-STATUS.md`

---

## Confirmed Business Requirements

The business has explicitly confirmed these 12 requirements. They are NOT decisions — they are facts.

| # | Confirmed Requirement |
|---|----------------------|
| 1 | Staff are salary-based |
| 2 | Salary is dynamic/configurable |
| 3 | Salary may vary from low to high |
| 4 | Salary may fluctuate/change |
| 5 | Salary may differ by staff and/or assignment/period |
| 6 | Compensation = Salary + Target + Dynamic Incentive |
| 7 | Incentive is dynamic |
| 8 | Assignment allows configuring: salary, employment details, target, territory, branch, incentive terms |
| 9 | One staff → one, two, or more branches |
| 10 | System must NOT assume one staff = one branch |
| 11 | Staff may have territory/branch assignment |
| 12 | All commission/incentive calculations EXCLUDING GST ✅ APPROVED |

---

## Staff Compensation Model

```
STAFF COMPENSATION
    │
    ├── SALARY (fixed/dynamic per staff per period)
    │     └── may differ by branch assignment
    │
    ├── TARGET (performance/business measurement)
    │     ├── metric
    │     ├── amount
    │     ├── period
    │     └── may differ by branch
    │
    └── DYNAMIC INCENTIVE (additional compensation)
          ├── eligibility
          ├── basis (EXCLUDING GST)
          ├── formula
          ├── target relationship
          └── per-service/product/package/membership
```

---

## Decision Dependency Map

```
STAGE 1: EMPLOYMENT (SE)
    │
    ├── defines salary model
    │
    ▼
STAGE 2: ASSIGNMENT (SA)
    │
    ├── links staff to branches/territories
    ├── may affect salary per assignment
    │
    ▼
STAGE 3: TARGET (TG)
    │
    ├── defines performance measurement
    ├── may differ per branch assignment
    │
    ▼
STAGE 4: INCENTIVE PLAN (IN)
    │
    ├── defines how incentive is calculated
    ├── depends on target
    │
    ▼
STAGE 5: COMMISSION EVENT (SC)
    │
    ├── defines when/how commission is earned
    ├── depends on incentive plan
    ├── GST excluded (APPROVED)
    │
    ▼
STAGE 6: APPROVAL & PAYOUT (SC)
    │
    ├── defines finalization and payment boundary
    └── depends on all previous stages
```

**Specific dependencies:**
- SA-009 (assignment-specific compensation) → affects SE-002 (salary structure)
- SA-010 (assignment-specific target) → affects TG-005 (multi-branch aggregation)
- TG-002 (target metric) → affects IN-002 (incentive basis)
- IN-003 (incentive formula) → affects SC-002 (rate structure)
- IN-004 (target achievement relationship) → affects IN-005 (incentive slabs)
- SC-004 (staff attribution) → affects SC-014 (multiple staff)
- SC-008 (GST) → APPROVED — all amounts excluding GST

---

## Minimum Decisions Required to Start Technical Design

These 12 decisions block architecture and schema design. All other decisions can be deferred to a later phase if the business approves a limited release scope.

| ID | Decision | Stage | Why It Blocks Design |
|----|----------|-------|---------------------|
| SE-002 | Salary structure | Employment | Determines whether salary is per-staff, per-assignment, or per-period |
| SE-004 | Salary effective date | Employment | Determines whether salary history model is needed |
| SE-005 | Salary revision/history | Employment | Determines historical reproducibility |
| SA-001 | Assignment model | Assignment | Determines join table design for multi-branch |
| SA-002 | Multi-branch independence | Assignment | Determines whether salary/target/incentive differ per branch |
| SA-009 | Assignment-specific compensation | Assignment | Determines whether salary is global or per-assignment |
| TG-001 | Target period | Target | Determines target period model |
| TG-002 | Target metric | Target | Determines what is measured (revenue, services, etc.) |
| TG-004 | Target ownership | Target | Determines individual vs branch vs both |
| IN-001 | Incentive eligibility | Incentive | Determines who gets incentive |
| IN-003 | Incentive formula | Incentive | Determines calculation architecture |
| SC-008 | GST treatment | Commission | APPROVED — excluding GST ✅ |

**11 decisions still required + 1 already approved = 12 total to start design.**

---

## Business Owner Approval Workflow

The business owner approves decisions in 6 stages. Each stage builds on the previous.

### STEP 1 — Employment Model

**Purpose:** Define how staff employment and salary work.

Decisions: SE-001 through SE-009

### STEP 2 — Staff Assignment Model

**Purpose:** Define how staff are assigned to branches and territories.

Decisions: SA-001 through SA-010

### STEP 3 — Target Model

**Purpose:** Define what targets look like and how they are measured.

Decisions: TG-001 through TG-010

### STEP 4 — Incentive Model

**Purpose:** Define how incentive plans work.

Decisions: IN-001 through IN-020

### STEP 5 — Commission Event & Adjustments

**Purpose:** Define when commission is earned and how exceptions are handled.

Decisions: SC-001 through SC-014

### STEP 6 — Approval & Payout

**Purpose:** Define finalization, adjustments, and payout boundary.

Decisions: SC-015 through SC-020

---

## STAGE 1 — EMPLOYMENT DECISIONS

---

### SE-001 — Employment Status

**Business Question:** What employment statuses should the system track?

**Options:**

- [ ] A. Active / Inactive only
- [ ] B. Active / On Leave / Resigned / Terminated
- [ ] C. Configurable status list
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SE-002 — Salary Structure

**Business Question:** How should salary be structured?

**Options:**

- [ ] A. Fixed monthly salary — one amount per staff per month
- [ ] B. Fixed salary per assignment period — salary may change when assignment changes
- [ ] C. Hourly rate
- [ ] D. Daily rate
- [ ] E. Configurable — salary amount, period, and structure fully configurable per staff
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SE-003 — Salary Period

**Business Question:** What is the salary calculation/payment period?

**Options:**

- [ ] A. Monthly
- [ ] B. Bi-weekly
- [ ] C. Weekly
- [ ] D. Configurable per staff
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SE-004 — Salary Effective Date

**Business Question:** Does salary have an effective start date?

**Options:**

- [ ] A. Yes — salary applies from a specific date
- [ ] B. No — salary is immediate
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SE-005 — Salary Revision / History

**Business Question:** When salary changes, must the system preserve salary history?

**Options:**

- [ ] A. Yes — full salary history — every change recorded with dates; historical calculations use the salary active at the time
- [ ] B. Yes — current and previous only
- [ ] C. No — only current salary; no history
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SE-006 — Offer Letter Requirement

**Business Question:** Is an offer letter required when a staff member is assigned?

**Options:**

- [ ] A. Yes — mandatory
- [ ] B. No — optional
- [ ] C. Not applicable
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SE-007 — Offer Letter Information

**Business Question:** What information should be in the employment/offer record?

**Options:**

- [ ] A. Basic — start date, salary, role/title, branch assignment
- [ ] B. Standard — start date, salary, role/title, branch assignment, target, incentive terms
- [ ] C. Complete — start date, salary, role/title, branch assignment, target, incentive terms, territory, contract details
- [ ] D. Configurable
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SE-008 — Offer Letter Approval

**Business Question:** Does the offer letter / employment record require approval?

**Options:**

- [ ] A. No — final when created
- [ ] B. Manager approval required
- [ ] C. Tenant-admin approval required
- [ ] D. Multi-level approval
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SE-009 — Employment Effective Date

**Business Question:** Does employment have an effective start date?

**Options:**

- [ ] A. Yes — joining date
- [ ] B. Yes — joining date + end date (contract period)
- [ ] C. Immediate
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

## STAGE 2 — STAFF ASSIGNMENT DECISIONS

**CONFIRMED:** One staff → many branches.

---

### SA-001 — Staff-to-Branch Assignment Model

**Business Question:** How should staff-to-branch assignment be represented?

**Options:**

- [ ] A. Explicit assignment records — each assignment is a separate record with its own dates and terms
- [ ] B. Multiple branch selection — staff record allows selecting multiple branches (simple list)
- [ ] C. Assignment with role/title per branch
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SA-002 — Multiple Branch Assignment Independence

**Business Question:** When staff is assigned to multiple branches, are the assignments independent?

**Options:**

- [ ] A. Fully independent — each branch assignment has its own salary, target, incentive, and dates
- [ ] B. Partially independent — salary is global; target and incentive may differ per branch
- [ ] C. Fully linked — all terms same across all branches
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SA-003 — Primary Branch

**Business Question:** Is there a designated primary branch when staff has multiple assignments?

**Options:**

- [ ] A. Yes — one primary branch
- [ ] B. No — all branches equal
- [ ] C. Configurable — optional
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SA-004 — Territory Assignment

**Business Question:** Should staff be assigned to a territory in addition to branches?

**Options:**

- [ ] A. Yes — staff assigned to territory; branches within territory are the scope
- [ ] B. No — branch assignment only; territory derived from branch
- [ ] C. Both — territory AND specific branches
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SA-005 — Branch Assignment Effective Dates

**Business Question:** Do branch assignments have effective start/end dates?

**Options:**

- [ ] A. Yes — start and end dates
- [ ] B. Start date only
- [ ] C. No dates
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SA-006 — Territory Assignment Effective Dates

**Business Question:** Do territory assignments have effective start/end dates?

**Options:**

- [ ] A. Yes — start and end dates
- [ ] B. Start date only
- [ ] C. No dates
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SA-007 — Staff Transfer Between Branches

**Business Question:** How should the system handle staff transfer?

**Options:**

- [ ] A. End old assignment, create new assignment
- [ ] B. Add new assignment, keep old
- [ ] C. Replace assignment
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SA-008 — Simultaneous Multi-Branch Working

**Business Question:** Can a staff member work at multiple branches on the same day?

**Options:**

- [ ] A. Yes
- [ ] B. No — one branch per day
- [ ] C. Configurable
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SA-009 — Assignment-Specific Compensation

**Business Question:** Can salary differ per branch assignment?

**Options:**

- [ ] A. Yes — each branch assignment can have a different salary
- [ ] B. No — salary is global for the staff member
- [ ] C. Base + allowance — one base salary plus branch-specific allowance
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SA-010 — Assignment-Specific Target

**Business Question:** Can target differ per branch assignment?

**Options:**

- [ ] A. Yes — each branch assignment can have a different target
- [ ] B. No — target is global
- [ ] C. Separate per branch, aggregated
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

## STAGE 3 — TARGET DECISIONS

**CONFIRMED:** Compensation includes TARGET. Target is dynamic/configurable.

---

### TG-001 — Target Period

**Business Question:** What is the target measurement period?

**Options:**

- [ ] A. Monthly
- [ ] B. Weekly
- [ ] C. Quarterly
- [ ] D. Custom per staff
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### TG-002 — Target Metric

**Business Question:** What does the target measure?

**Options:**

- [ ] A. Revenue — total revenue generated (excluding GST)
- [ ] B. Service count — number of services performed
- [ ] C. Appointment count — number of appointments completed
- [ ] D. Customer count — number of unique customers served
- [ ] E. Product sales — product revenue
- [ ] F. Composite — combination (specify): _______________________________________________
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### TG-003 — Target Amount

**Business Question:** How is the target amount determined?

**Options:**

- [ ] A. Fixed amount per staff
- [ ] B. Fixed amount per role
- [ ] C. Fixed amount per branch
- [ ] D. Dynamic/configurable per staff per period
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### TG-004 — Target Ownership

**Business Question:** Who owns the target?

**Options:**

- [ ] A. Individual staff — each staff member has their own target
- [ ] B. Branch — target belongs to the branch; staff contribute collectively
- [ ] C. Both — individual AND branch targets exist independently
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### TG-005 — Multi-Branch Target Aggregation

**Business Question:** When staff works at multiple branches, how are targets aggregated?

**Options:**

- [ ] A. Sum of branch targets
- [ ] B. Single global target
- [ ] C. Separate per branch, no aggregation
- [ ] D. Not applicable
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### TG-006 — Branch-Specific Target

**Business Question:** Can a staff member have a different target at each branch?

**Options:**

- [ ] A. Yes
- [ ] B. No — same at all branches
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### TG-007 — Target Revision

**Business Question:** Can a target be revised after it is set?

**Options:**

- [ ] A. Yes — with history
- [ ] B. Yes — without history
- [ ] C. No — fixed once set
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### TG-008 — Target Effective Date

**Business Question:** Does a target have an effective start date?

**Options:**

- [ ] A. Yes
- [ ] B. No — immediate
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### TG-009 — Target Approval

**Business Question:** Does a target require approval?

**Options:**

- [ ] A. No — active when set
- [ ] B. Manager approval required
- [ ] C. Tenant-admin approval required
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### TG-010 — Target Achievement Calculation

**Business Question:** How is target achievement calculated?

**Options:**

- [ ] A. Percentage — (actual / target) × 100%
- [ ] B. Absolute — actual − target
- [ ] C. Both
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

## STAGE 4 — INCENTIVE PLAN DECISIONS

**CONFIRMED:** Incentive is dynamic and target-based. All calculations EXCLUDING GST.

---

### IN-001 — Incentive Eligibility

**Business Question:** Which staff are eligible for incentive?

**Options:**

- [ ] A. All active staff with a target
- [ ] B. Only staff who meet a minimum target threshold
- [ ] C. Selected staff roles only (specify): _______________________________________________
- [ ] D. Individual eligibility flag
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### IN-002 — Incentive Basis

**Business Question:** What monetary amount is the incentive calculated on?

**Options:**

- [ ] A. Revenue excluding GST
- [ ] B. Revenue exceeding target
- [ ] C. Total revenue after reaching target
- [ ] D. Service-specific amounts
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### IN-003 — Incentive Formula

**Business Question:** How is the incentive amount calculated?

**Options:**

- [ ] A. Fixed percentage of basis
- [ ] B. Slab-based percentage (requires IN-005)
- [ ] C. Fixed amount per unit
- [ ] D. Fixed amount upon target achievement
- [ ] E. Configurable per staff
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### IN-004 — Target Achievement Relationship

**Business Question:** How does target achievement affect incentive?

**Options:**

- [ ] A. No incentive until target is met
- [ ] B. Partial achievement = partial incentive
- [ ] C. Threshold-based — no incentive below X%; full at or above X%
- [ ] D. Always applies — target is informational only
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### IN-005 — Incentive Slabs / Tiers

**Business Question:** Are there incentive slabs based on achievement levels?

**Options:**

- [ ] A. No slabs — one flat rate
- [ ] B. Progressive slabs — higher achievement = higher rate
- [ ] C. Regressive slabs
- [ ] D. Configurable slabs
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### IN-006 — Incentive on Excess Target

**Business Question:** When staff exceeds target, does incentive apply to excess only or total?

**Options:**

- [ ] A. Excess only
- [ ] B. Total after reaching target
- [ ] C. Configurable
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### IN-007 — Service Incentive

**Business Question:** Does incentive apply to service revenue?

**Options:**

- [ ] A. Yes
- [ ] B. No
- [ ] C. Separate rate (specify): _______________________________________________
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### IN-008 — Product Incentive

**Business Question:** Does incentive apply to product sales?

**Options:**

- [ ] A. Yes
- [ ] B. No
- [ ] C. Separate rate (specify): _______________________________________________
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### IN-009 — Package Incentive

**Business Question:** Does incentive apply to package sales?

**Options:**

- [ ] A. Yes
- [ ] B. No
- [ ] C. Separate rate (specify): _______________________________________________
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### IN-010 — Membership Incentive

**Business Question:** Does incentive apply to membership sales?

**Options:**

- [ ] A. Yes
- [ ] B. No
- [ ] C. Separate rate (specify): _______________________________________________
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### IN-011 — Staff-Specific Incentive Plan

**Business Question:** Can each staff member have a different incentive plan?

**Options:**

- [ ] A. Yes
- [ ] B. No — one plan for all
- [ ] C. Role-based
- [ ] D. Branch-based
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### IN-012 — Branch-Specific Incentive Plan

**Business Question:** Can incentive plans differ by branch?

**Options:**

- [ ] A. Yes
- [ ] B. No — global
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### IN-013 — Incentive Effective Date

**Business Question:** Does an incentive plan have an effective start date?

**Options:**

- [ ] A. Yes
- [ ] B. No — immediate
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### IN-014 — Incentive Revision / History

**Business Question:** When incentive plan changes, must history be preserved?

**Options:**

- [ ] A. Yes — full history
- [ ] B. No — only current plan
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### IN-015 — Incentive Calculation Period

**Business Question:** What is the incentive calculation period?

**Options:**

- [ ] A. Monthly
- [ ] B. Weekly
- [ ] C. Per transaction
- [ ] D. Same as target period
- [ ] E. Configurable per staff
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### IN-016 — Incentive Earning Event

**Business Question:** When does incentive become earned?

**Options:**

- [ ] A. Appointment completion
- [ ] B. Invoice creation
- [ ] C. Payment collection
- [ ] D. End-of-period calculation
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### IN-017 — Incentive Approval / Finalization

**Business Question:** Does incentive require approval?

**Options:**

- [ ] A. Automatically final
- [ ] B. Manager approval
- [ ] C. Accountant approval
- [ ] D. Tenant-admin approval
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### IN-018 — Incentive Adjustment

**Business Question:** Can incentive be manually adjusted?

**Options:**

- [ ] A. No
- [ ] B. Yes — with reason
- [ ] C. Yes — requiring approval
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### IN-019 — Incentive Refund / Reversal

**Business Question:** How is incentive treated when revenue is reversed?

**Options:**

- [ ] A. Reverse completely
- [ ] B. Reduce proportionally
- [ ] C. No change after finalization
- [ ] D. Manual adjustment
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### IN-020 — Incentive Payout Boundary

**Business Question:** Does this implementation include actual payment to staff?

**Options:**

- [ ] A. Calculation only — payment handled externally
- [ ] B. Calculation + approval — payment external
- [ ] C. Full lifecycle — calculation, approval, and payment tracking
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

## STAGE 5 — COMMISSION EVENT & ADJUSTMENTS

---

### SC-001 — Commission Basis

**Business Question:** What monetary amount is the incentive rate applied to?

**Options:**

- [ ] A. Service revenue
- [ ] B. Invoice revenue
- [ ] C. Collected payment
- [ ] D. Service-specific commissionable amount
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SC-002 — Commission Rate Structure

**Business Question:** How is the incentive rate defined?

**Options:**

- [ ] A. One global rate
- [ ] B. Per-service rate
- [ ] C. Per-staff rate
- [ ] D. Staff + service combination
- [ ] E. Fixed amount per service
- [ ] F. Defined by incentive plan (see IN-003)
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SC-003 — Staff Eligibility

**Business Question:** Which staff earn incentive?

**Options:**

- [ ] A. All active staff
- [ ] B. Nail technicians only
- [ ] C. Selected staff roles (specify): _______________________________________________
- [ ] D. Individual eligibility flag
- [ ] E. Defined by incentive plan (see IN-001)
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SC-004 — Staff Attribution

**Business Question:** Which staff relationship earns the incentive?

**Options:**

- [ ] A. Appointment staff (Appointment.staffId)
- [ ] B. Explicit staff assignment at billing
- [ ] C. Invoice-line staff attribution
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SC-005 — Earning Event

**Business Question:** When does incentive become earned?

**Options:**

- [ ] A. Appointment completion
- [ ] B. Invoice creation
- [ ] C. Payment collection
- [ ] D. End-of-period calculation
- [ ] E. Defined by incentive plan (see IN-016)
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SC-006 — Unpaid Invoices

**Business Question:** Should unpaid invoices generate incentive?

**Options:**

- [ ] A. Yes
- [ ] B. No — only collected payments
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SC-007 — Discount Treatment

**Business Question:** Do discounts reduce the incentive base?

**Options:**

- [ ] A. Before discount
- [ ] B. After discount
- [ ] C. Selected discount types only
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SC-008 — GST Treatment

**Business Question:** Is GST included in the incentive base?

**Options:**

- [x] A. **Excluding GST** — ✅ CONFIRMED
- [ ] B. Including GST

**Business Owner Selection:** **A — Excluding GST** ✅ APPROVED

**Status:** **APPROVED**

---

### SC-009a — Service Incentive

**Options:**

- [ ] A. Applies
- [ ] B. Does not apply
- [ ] C. Separate rate
- [ ] D. Defined by incentive plan (IN-007)
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SC-009b — Product Incentive

**Options:**

- [ ] A. Applies
- [ ] B. Does not apply
- [ ] C. Separate rate
- [ ] D. Defined by incentive plan (IN-008)
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SC-009c — Package Incentive

**Options:**

- [ ] A. Applies
- [ ] B. Does not apply
- [ ] C. Separate rate
- [ ] D. Defined by incentive plan (IN-009)
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SC-009d — Membership Incentive

**Options:**

- [ ] A. Applies
- [ ] B. Does not apply
- [ ] C. Separate rate
- [ ] D. Defined by incentive plan (IN-010)
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SC-010 — Refund: Cancelled Appointment

**Options:**

- [ ] A. Reverse completely
- [ ] B. Reduce proportionally
- [ ] C. No change after finalization
- [ ] D. Manual adjustment
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SC-011 — Refund: Cancelled Invoice

**Options:**

- [ ] A. Reverse completely
- [ ] B. Reduce proportionally
- [ ] C. No change after finalization
- [ ] D. Manual adjustment
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SC-012 — Refund: Partial Refund

**Options:**

- [ ] A. Reverse completely
- [ ] B. Reduce proportionally
- [ ] C. No change after finalization
- [ ] D. Manual adjustment
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SC-013 — Refund: Full Refund

**Options:**

- [ ] A. Reverse completely
- [ ] B. Reduce proportionally
- [ ] C. No change after finalization
- [ ] D. Manual adjustment
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SC-014 — Multiple Staff Attribution

**Options:**

- [ ] A. One primary staff member
- [ ] B. Equal split
- [ ] C. Configurable percentage split
- [ ] D. Individual line-item attribution
- [ ] E. Manual allocation
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

## STAGE 6 — APPROVAL & PAYOUT

---

### SC-015 — Approval / Finalization

**Options:**

- [ ] A. Automatically final
- [ ] B. Manager approval
- [ ] C. Accountant approval
- [ ] D. Tenant-admin approval
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SC-016 — Historical Rate

**Options:**

- [ ] A. Snapshot — rate captured at calculation time
- [ ] B. Recalculate — historical periods use current rates
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SC-017 — Calculation Period

**Options:**

- [ ] A. Per transaction
- [ ] B. Daily
- [ ] C. Weekly
- [ ] D. Monthly
- [ ] E. Same as target/incentive period
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SC-018 — Manual Adjustments

**Options:**

- [ ] A. No manual adjustments
- [ ] B. Manual positive/negative with reason
- [ ] C. Manual with approval
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SC-019 — Branch / Staff Scope

**Options:**

- [ ] A. Staff's assigned branch
- [ ] B. Appointment branch
- [ ] C. Invoice branch
- [ ] D. Per assignment
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

### SC-020 — Payment / Payout Boundary

**Options:**

- [ ] A. Calculation only — payment external
- [ ] B. Calculation + approval — payment external
- [ ] C. Full lifecycle
- [ ] Other: _______________________________________________

**Business Owner Selection:** _______________________________________________

**Status:** NOT SPECIFIED

---

## Decision Priority Classification

### P0 — Required Before Technical Design (11 decisions)

| ID | Decision | Stage |
|----|----------|-------|
| SE-002 | Salary structure | Employment |
| SE-004 | Salary effective date | Employment |
| SE-005 | Salary revision/history | Employment |
| SA-001 | Assignment model | Assignment |
| SA-002 | Multi-branch independence | Assignment |
| SA-009 | Assignment-specific compensation | Assignment |
| TG-001 | Target period | Target |
| TG-002 | Target metric | Target |
| TG-004 | Target ownership | Target |
| IN-001 | Incentive eligibility | Incentive |
| IN-003 | Incentive formula | Incentive |

### P1 — Required Before Production Implementation (29 decisions)

SE-001, SE-003, SE-006, SE-007, SE-008, SE-009, SA-003, SA-004, SA-005, SA-006, SA-007, SA-008, SA-010, TG-003, TG-005, TG-006, TG-007, TG-008, TG-009, TG-010, IN-002, IN-004, IN-005, IN-006, IN-007, IN-008, IN-009, IN-010, IN-011

### P2 — Future / Deferrable (29 decisions)

IN-012, IN-013, IN-014, IN-015, IN-016, IN-017, IN-018, IN-019, IN-020, SC-001, SC-002, SC-003, SC-004, SC-005, SC-006, SC-007, SC-009a, SC-009b, SC-009c, SC-009d, SC-010, SC-011, SC-012, SC-013, SC-014, SC-015, SC-016, SC-017, SC-018, SC-019, SC-020

---

## Release Scope

**Options:**

- [ ] A. Full Staff Compensation — all 69 decisions approved
- [ ] B. Phase 1 — Employment + Assignment + Salary
- [ ] C. Phase 1 — Employment + Assignment + Salary + Target
- [ ] D. Phase 1 — Employment + Assignment + Salary + Target + Incentive
- [ ] E. Other (specify): _______________________________________________
- [ ] F. Do not implement yet

**Business Owner Selection:** _______________________________________________

**If B, C, or D is selected, list deferred decisions:**

_______________________________________________

---

## Decision Dependencies

```
Employment (SE)
  → defines salary model
  → SE-002 + SA-009 determine per-branch salary
  → SE-004 + SE-005 determine salary history

Assignment (SA)
  → SA-001 determines join table design
  → SA-002 + SA-009 determine per-branch compensation
  → SA-010 + TG-005 determine per-branch target

Target (TG)
  → TG-001 determines target period
  → TG-002 determines what is measured
  → TG-004 + SA-002 determine target ownership across branches

Incentive Plan (IN)
  → IN-001 determines eligibility
  → IN-003 determines formula
  → IN-004 + IN-005 determine slab behavior
  → IN-007–010 determine per-category rates

Commission Event (SC)
  → SC-004 + SC-014 determine staff attribution
  → SC-005 + IN-016 determine earning event
  → SC-008 APPROVED (excluding GST)

Approval & Payout (SC)
  → SC-015 determines finalization
  → SC-020 determines implementation boundary
```

---

## Known Technical Implications

These are technical facts, NOT business decisions:

1. Staff currently has a single nullable `branchId`
2. Multi-branch assignment does not exist
3. Staff territory relation does not exist
4. Salary model does not exist
5. Employment model does not exist
6. Target model does not exist
7. Incentive model does not exist
8. Commission model does not exist
9. Historical compensation model does not exist
10. Invoice has no `staffId`
11. InvoiceLineItem has no `staffId`
12. Payment has no status field
13. Refund/cancellation infrastructure does not exist

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

*End of decision sheet. Version 4.0 — Ready for business owner staged review.*

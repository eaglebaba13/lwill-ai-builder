# X Nail Franchise Hierarchy Business Approval Workbook

**Phase:** FH-1
**Status:** P0 BUSINESS DECISIONS APPROVED - P1/P2 BUSINESS DECISIONS PENDING
**Prepared:** 2026-09-17
**Scope:** Documentation and business approval only

## Approved Foundation - Not Open For Reinterpretation

1. X Nail / HDK -> State Franchise -> City Franchise -> Branch / Outlet.
2. One State Franchise may contain many City Franchises.
3. Every City Franchise belongs to exactly one State Franchise.
4. Multiple area-wise City assignments may exist in one city.
5. Every Outlet belongs to exactly one City Franchise and derives State through City.
6. Partner is a separate legal/business party and not the assignment itself.
7. State, City, and Outlet agreements are independent.
8. Each agreement may use its own commercial/sharing mode.
9. Commercial terms do not automatically cascade.
10. Partner identity must not be conflated with franchise assignment.

No FH choice below is approved automatically.

## P0 APPROVAL BLOCK

Use this block for first-pass business review. Detailed implications follow later.

| ID | Question | Recommended option | Alternative options | Approval |
|---|---|---|---|---|
| FH-01 | Can one state have multiple State Franchise holders? | B - multiple dated, non-overlapping holders | A one exclusive; B multiple non-overlapping; Other overlapping | [ ] Approve recommended [ ] Other [ ] Discuss |
| FH-14 | Can State rights cover only part of a state? | B - explicit coverage mode | A whole only; B whole or explicit partial | [ ] Approve recommended [ ] Other [ ] Discuss |
| FH-30 | What happens to children when a parent ends? | B - resolve children first | A cascade; B block until resolved; Other continue | [ ] Approve recommended [ ] Other [ ] Discuss |
| FH-02 | Can one Partner hold several City assignments? | B - separate records and contracts | A one; B multiple including across states | [ ] Approve recommended [ ] Other [ ] Discuss |
| FH-11 | What uniquely identifies a City assignment? | B - composite identity plus immutable ID | A tenant+city; B tenant+parent+city+area plus ID | [ ] Approve recommended [ ] Other [ ] Discuss |
| FH-13 | Can one City Franchise span cities? | A - separate assignment per city | A one city; B regional/multi-city | [ ] Approve recommended [ ] Other [ ] Discuss |
| FH-04 | May active City coverages overlap? | A - prohibit same-type overlap | A prohibit; B approved exception; Other unrestricted | [ ] Approve recommended [ ] Other [ ] Discuss |
| FH-05 | How should area-wise rights be represented? | B - named area plus normalized pincodes | A name; B name+pincodes; C ward/zone; D GIS | [ ] Approve recommended [ ] Other [ ] Discuss |
| FH-29 | What identifies states, cities and pincodes? | B - canonical stable references | A free text; B canonical IDs plus tenant labels | [ ] Approve recommended [ ] Other [ ] Discuss |
| FH-06 | Can an Outlet move to another City? | B - close old and create successor | A never; B dated transfer; Other overwrite | [ ] Approve recommended [ ] Other [ ] Discuss |
| FH-15 | Can Outlet lack active City parent? | B - non-operational exception only | A never; B draft/migration only; Other operational | [ ] Approve recommended [ ] Other [ ] Discuss |
| FH-17 | Can Outlet operator differ from parent Partners? | B - explicit operator/owner/beneficiary | A no; B yes with explicit roles | [ ] Approve recommended [ ] Other [ ] Discuss |
| FH-28 | How is relocation across coverage handled? | B - dated; new Branch only if identity changes | A mutate; B dated reassignment; Other new Branch | [ ] Approve recommended [ ] Other [ ] Discuss |
| FH-03 | Can a Partner hold State and City roles? | B - conflict approval, separate contracts | A prohibit; B approval-only; Other unrestricted | [ ] Approve recommended [ ] Other [ ] Discuss |
| FH-12 | May hierarchy-level Partners differ? | B - independent legal-party relations | A no; B yes and explicit | [ ] Approve recommended [ ] Other [ ] Discuss |
| FH-18 | Can one Partner own several Outlets? | B - permit separate assignments | A one; B multiple dated assignments | [ ] Approve recommended [ ] Other [ ] Discuss |
| FH-07 | Can an assignment have concurrent agreements? | B - explicit purpose, no same-purpose overlap | A one; B non-competing purposes; Other unrestricted | [ ] Approve recommended [ ] Other [ ] Discuss |
| FH-08 | What happens when target/purpose dates overlap? | A - reject approved/active overlap | A reject; B priority/latest wins | [ ] Approve recommended [ ] Other [ ] Discuss |
| FH-21 | How is ownership and correction history preserved? | B - immutable dated history | A overwrite; B dates/status plus audit events | [ ] Approve recommended [ ] Other [ ] Discuss |
| FH-20 | May assignments be deleted? | B - preserve referenced records | A hard delete; B unused drafts only/end-date others | [ ] Approve recommended [ ] Other [ ] Discuss |
| FH-16 | What if City agreement expires with active Outlets? | B - explicit grace, no inferred terms | A suspend; B bounded grace; Other auto-renew | [ ] Approve recommended [ ] Other [ ] Discuss |

## Practical Coverage Guide

City alone is insufficient because multiple City Franchises may coexist in Surat, Jaipur, or another city. Option A (Named Area only) is easy but cannot reliably detect overlap. Option B (Named Area + normalized Pincode list) is the recommended V1 balance. Option C (Ward/zone) depends on stable administrative data. Option D (GIS polygon) adds unnecessary V1 complexity. Active pincode overlap should be rejected unless FH-04 explicitly approves an exception. An Outlet's verified pincode and approved mapping must resolve to exactly one active City Franchise.

## Commercial Models For Approval

- **Model A - Independent:** each level calculates independently on its defined base.
- **Model B - Sequential:** Outlet share first, then City and State on residual balances.
- **Model C - Additive:** all approved percentages apply to the same base.
- **Model D - Agreement-defined explicit:** each agreement defines base, direction, and calculation; no implicit cascade. Recommended.

Payment direction must explicitly consider HDK -> State, HDK -> City, HDK -> Outlet, State -> City, City -> Outlet, Outlet -> City, and City -> State. No direction is assumed.


## A. State Franchise Structure

### FH-01 - State holder multiplicity

- **Priority:** P0
- **Business question:** Can one state have multiple State Franchise holders?
- **Why the decision matters:** Required for integrity, auditability, scalability, historical correctness, or deterministic settlement.
- **Available options:** A one exclusive; B multiple non-overlapping; Other overlapping
- **Recommended option:** B - multiple dated, non-overlapping holders
- **Recommendation rationale:** Smallest scalable, auditable default; advisory until owner approval.
- **Financial impact:** May alter exclusivity and State eligibility.
- **Operational impact:** Coverage and exit governance.
- **Technical impact:** State coverage/lifecycle constraints.
- **Migration impact:** Signed State mapping required.
- **Settlement impact:** No State calculation without valid target.
- **Status:** APPROVED
- **Approved option:** Option B
- **Decision outcome:** Multiple dated State Franchise holders are allowed only with explicit non-overlapping coverage.
- **Approver:** Dheeraj Narula
- **Role / authority:** Board of Director
- **Approval date:** 2026-09-17

### FH-14 - Partial-state rights

- **Priority:** P0
- **Business question:** Can State rights cover only part of a state?
- **Why the decision matters:** Required for integrity, auditability, scalability, historical correctness, or deterministic settlement.
- **Available options:** A whole only; B whole or explicit partial
- **Recommended option:** B - explicit coverage mode
- **Recommendation rationale:** Smallest scalable, auditable default; advisory until owner approval.
- **Financial impact:** May alter exclusivity and State eligibility.
- **Operational impact:** Coverage and exit governance.
- **Technical impact:** State coverage/lifecycle constraints.
- **Migration impact:** Signed State mapping required.
- **Settlement impact:** No State calculation without valid target.
- **Status:** APPROVED
- **Approved option:** Option B
- **Decision outcome:** State Franchise coverage may be whole-state or explicitly partial and non-overlapping.
- **Approver:** Dheeraj Narula
- **Role / authority:** Board of Director
- **Approval date:** 2026-09-17

### FH-30 - Parent lifecycle

- **Priority:** P0
- **Business question:** What happens to children when a parent ends?
- **Why the decision matters:** Required for integrity, auditability, scalability, historical correctness, or deterministic settlement.
- **Available options:** A cascade; B block until resolved; Other continue
- **Recommended option:** B - resolve children first
- **Recommendation rationale:** Smallest scalable, auditable default; advisory until owner approval.
- **Financial impact:** May alter exclusivity and State eligibility.
- **Operational impact:** Coverage and exit governance.
- **Technical impact:** State coverage/lifecycle constraints.
- **Migration impact:** Signed State mapping required.
- **Settlement impact:** No State calculation without valid target.
- **Status:** APPROVED
- **Approved option:** Option B
- **Decision outcome:** A parent cannot end until active children are transferred, ended, or otherwise resolved.
- **Approver:** Dheeraj Narula
- **Role / authority:** Board of Director
- **Approval date:** 2026-09-17

## B. City Franchise Structure

### FH-02 - Multiple City assignments

- **Priority:** P0
- **Business question:** Can one Partner hold several City assignments?
- **Why the decision matters:** Required for integrity, auditability, scalability, historical correctness, or deterministic settlement.
- **Available options:** A one; B multiple including across states
- **Recommended option:** B - separate records and contracts
- **Recommendation rationale:** Smallest scalable, auditable default; advisory until owner approval.
- **Financial impact:** May create distinct City obligations.
- **Operational impact:** Portfolio and area administration.
- **Technical impact:** City parent/identity constraints.
- **Migration impact:** Manual City mapping.
- **Settlement impact:** Target-specific City settlement.
- **Status:** APPROVED
- **Approved option:** Option B
- **Decision outcome:** A Partner may hold multiple City assignments through separate assignment and agreement records.
- **Approver:** Dheeraj Narula
- **Role / authority:** Board of Director
- **Approval date:** 2026-09-17

### FH-11 - City identity

- **Priority:** P0
- **Business question:** What uniquely identifies a City assignment?
- **Why the decision matters:** Required for integrity, auditability, scalability, historical correctness, or deterministic settlement.
- **Available options:** A tenant+city; B tenant+parent+city+area plus ID
- **Recommended option:** B - composite identity plus immutable ID
- **Recommendation rationale:** Smallest scalable, auditable default; advisory until owner approval.
- **Financial impact:** May create distinct City obligations.
- **Operational impact:** Portfolio and area administration.
- **Technical impact:** City parent/identity constraints.
- **Migration impact:** Manual City mapping.
- **Settlement impact:** Target-specific City settlement.
- **Status:** APPROVED
- **Approved option:** Option B
- **Decision outcome:** City assignment identity uses tenant, State parent, city, area code, and an immutable ID.
- **Approver:** Dheeraj Narula
- **Role / authority:** Board of Director
- **Approval date:** 2026-09-17

### FH-13 - Multi-city City Franchise

- **Priority:** P0
- **Business question:** Can one City Franchise span cities?
- **Why the decision matters:** Required for integrity, auditability, scalability, historical correctness, or deterministic settlement.
- **Available options:** A one city; B regional/multi-city
- **Recommended option:** A - separate assignment per city
- **Recommendation rationale:** Smallest scalable, auditable default; advisory until owner approval.
- **Financial impact:** May create distinct City obligations.
- **Operational impact:** Portfolio and area administration.
- **Technical impact:** City parent/identity constraints.
- **Migration impact:** Manual City mapping.
- **Settlement impact:** Target-specific City settlement.
- **Status:** APPROVED
- **Approved option:** Option A
- **Decision outcome:** Each City Franchise assignment belongs to exactly one city.
- **Approver:** Dheeraj Narula
- **Role / authority:** Board of Director
- **Approval date:** 2026-09-17

## C. Area / Territory Coverage

### FH-04 - City coverage overlap

- **Priority:** P0
- **Business question:** May active City coverages overlap?
- **Why the decision matters:** Required for integrity, auditability, scalability, historical correctness, or deterministic settlement.
- **Available options:** A prohibit; B approved exception; Other unrestricted
- **Recommended option:** A - prohibit same-type overlap
- **Recommendation rationale:** Smallest scalable, auditable default; advisory until owner approval.
- **Financial impact:** Controls revenue eligibility.
- **Operational impact:** Maintain pincode lists and overlaps.
- **Technical impact:** Canonical geography validation.
- **Migration impact:** Adjudicate legacy names/pincodes.
- **Settlement impact:** One City attribution; no rate implied.
- **Status:** APPROVED
- **Approved option:** Option A
- **Decision outcome:** Overlapping active City Franchise coverage is prohibited.
- **Approver:** Dheeraj Narula
- **Role / authority:** Board of Director
- **Approval date:** 2026-09-17

### FH-05 - Area representation

- **Priority:** P0
- **Business question:** How should area-wise rights be represented?
- **Why the decision matters:** Required for integrity, auditability, scalability, historical correctness, or deterministic settlement.
- **Available options:** A name; B name+pincodes; C ward/zone; D GIS
- **Recommended option:** B - named area plus normalized pincodes
- **Recommendation rationale:** Smallest scalable, auditable default; advisory until owner approval.
- **Financial impact:** Controls revenue eligibility.
- **Operational impact:** Maintain pincode lists and overlaps.
- **Technical impact:** Canonical geography validation.
- **Migration impact:** Adjudicate legacy names/pincodes.
- **Settlement impact:** One City attribution; no rate implied.
- **Status:** APPROVED
- **Approved option:** Option B
- **Decision outcome:** V1 City coverage uses a named area or zone plus a normalized pincode list.
- **Approver:** Dheeraj Narula
- **Role / authority:** Board of Director
- **Approval date:** 2026-09-17

### FH-29 - Canonical geography

- **Priority:** P0
- **Business question:** What identifies states, cities and pincodes?
- **Why the decision matters:** Required for integrity, auditability, scalability, historical correctness, or deterministic settlement.
- **Available options:** A free text; B canonical IDs plus tenant labels
- **Recommended option:** B - canonical stable references
- **Recommendation rationale:** Smallest scalable, auditable default; advisory until owner approval.
- **Financial impact:** Controls revenue eligibility.
- **Operational impact:** Maintain pincode lists and overlaps.
- **Technical impact:** Canonical geography validation.
- **Migration impact:** Adjudicate legacy names/pincodes.
- **Settlement impact:** One City attribution; no rate implied.
- **Status:** APPROVED
- **Approved option:** Option B
- **Decision outcome:** States, cities, and pincodes use stable canonical references with optional tenant labels.
- **Approver:** Dheeraj Narula
- **Role / authority:** Board of Director
- **Approval date:** 2026-09-17

## D. Outlet Ownership & Reassignment

### FH-06 - Outlet reassignment

- **Priority:** P0
- **Business question:** Can an Outlet move to another City?
- **Why the decision matters:** Required for integrity, auditability, scalability, historical correctness, or deterministic settlement.
- **Available options:** A never; B dated transfer; Other overwrite
- **Recommended option:** B - close old and create successor
- **Recommendation rationale:** Smallest scalable, auditable default; advisory until owner approval.
- **Financial impact:** Defines transfer cutoffs.
- **Operational impact:** Transfer/activation workflow.
- **Technical impact:** Dated Outlet parent and roles.
- **Migration impact:** Map Outlet history.
- **Settlement impact:** Use then-valid Outlet assignment.
- **Status:** APPROVED
- **Approved option:** Option B
- **Decision outcome:** Outlet reassignment closes the prior assignment and creates an effective-dated successor.
- **Approver:** Dheeraj Narula
- **Role / authority:** Board of Director
- **Approval date:** 2026-09-17

### FH-15 - Outlet without City

- **Priority:** P0
- **Business question:** Can Outlet lack active City parent?
- **Why the decision matters:** Required for integrity, auditability, scalability, historical correctness, or deterministic settlement.
- **Available options:** A never; B draft/migration only; Other operational
- **Recommended option:** B - non-operational exception only
- **Recommendation rationale:** Smallest scalable, auditable default; advisory until owner approval.
- **Financial impact:** Defines transfer cutoffs.
- **Operational impact:** Transfer/activation workflow.
- **Technical impact:** Dated Outlet parent and roles.
- **Migration impact:** Map Outlet history.
- **Settlement impact:** Use then-valid Outlet assignment.
- **Status:** APPROVED
- **Approved option:** Option B
- **Decision outcome:** An Outlet may lack an active City parent only while non-operational in draft or migration.
- **Approver:** Dheeraj Narula
- **Role / authority:** Board of Director
- **Approval date:** 2026-09-17

### FH-17 - Independent Outlet Partner

- **Priority:** P0
- **Business question:** Can Outlet operator differ from parent Partners?
- **Why the decision matters:** Required for integrity, auditability, scalability, historical correctness, or deterministic settlement.
- **Available options:** A no; B yes with explicit roles
- **Recommended option:** B - explicit operator/owner/beneficiary
- **Recommendation rationale:** Smallest scalable, auditable default; advisory until owner approval.
- **Financial impact:** Defines transfer cutoffs.
- **Operational impact:** Transfer/activation workflow.
- **Technical impact:** Dated Outlet parent and roles.
- **Migration impact:** Map Outlet history.
- **Settlement impact:** Use then-valid Outlet assignment.
- **Status:** APPROVED
- **Approved option:** Option B
- **Decision outcome:** Outlet operator, owner, and beneficiary may differ when their roles are explicitly recorded.
- **Approver:** Dheeraj Narula
- **Role / authority:** Board of Director
- **Approval date:** 2026-09-17

### FH-28 - Outlet relocation

- **Priority:** P0
- **Business question:** How is relocation across coverage handled?
- **Why the decision matters:** Required for integrity, auditability, scalability, historical correctness, or deterministic settlement.
- **Available options:** A mutate; B dated reassignment; Other new Branch
- **Recommended option:** B - dated; new Branch only if identity changes
- **Recommendation rationale:** Smallest scalable, auditable default; advisory until owner approval.
- **Financial impact:** Defines transfer cutoffs.
- **Operational impact:** Transfer/activation workflow.
- **Technical impact:** Dated Outlet parent and roles.
- **Migration impact:** Map Outlet history.
- **Settlement impact:** Use then-valid Outlet assignment.
- **Status:** APPROVED
- **Approved option:** Option B
- **Decision outcome:** Outlet relocation is effective-dated; a new Branch is created only when operational or legal identity changes.
- **Approver:** Dheeraj Narula
- **Role / authority:** Board of Director
- **Approval date:** 2026-09-17

## E. Partner / Legal Party Rules

### FH-03 - Cross-level Partner roles

- **Priority:** P0
- **Business question:** Can a Partner hold State and City roles?
- **Why the decision matters:** Required for integrity, auditability, scalability, historical correctness, or deterministic settlement.
- **Available options:** A prohibit; B approval-only; Other unrestricted
- **Recommended option:** B - conflict approval, separate contracts
- **Recommendation rationale:** Smallest scalable, auditable default; advisory until owner approval.
- **Financial impact:** Creates independent party obligations.
- **Operational impact:** Conflict and role transparency.
- **Technical impact:** Separate Partner relations.
- **Migration impact:** Evidence-based party mapping.
- **Settlement impact:** No inherited payee or netting.
- **Status:** APPROVED
- **Approved option:** Option B
- **Decision outcome:** A Partner may hold State and City roles only with documented conflict approval and independent agreements.
- **Approver:** Dheeraj Narula
- **Role / authority:** Board of Director
- **Approval date:** 2026-09-17

### FH-12 - Different Partners by level

- **Priority:** P0
- **Business question:** May hierarchy-level Partners differ?
- **Why the decision matters:** Required for integrity, auditability, scalability, historical correctness, or deterministic settlement.
- **Available options:** A no; B yes and explicit
- **Recommended option:** B - independent legal-party relations
- **Recommendation rationale:** Smallest scalable, auditable default; advisory until owner approval.
- **Financial impact:** Creates independent party obligations.
- **Operational impact:** Conflict and role transparency.
- **Technical impact:** Separate Partner relations.
- **Migration impact:** Evidence-based party mapping.
- **Settlement impact:** No inherited payee or netting.
- **Status:** APPROVED
- **Approved option:** Option B
- **Decision outcome:** State, City, and Outlet assignments may reference different explicit Partners.
- **Approver:** Dheeraj Narula
- **Role / authority:** Board of Director
- **Approval date:** 2026-09-17

### FH-18 - Partner owning multiple Outlets

- **Priority:** P0
- **Business question:** Can one Partner own several Outlets?
- **Why the decision matters:** Required for integrity, auditability, scalability, historical correctness, or deterministic settlement.
- **Available options:** A one; B multiple dated assignments
- **Recommended option:** B - permit separate assignments
- **Recommendation rationale:** Smallest scalable, auditable default; advisory until owner approval.
- **Financial impact:** Creates independent party obligations.
- **Operational impact:** Conflict and role transparency.
- **Technical impact:** Separate Partner relations.
- **Migration impact:** Evidence-based party mapping.
- **Settlement impact:** No inherited payee or netting.
- **Status:** APPROVED
- **Approved option:** Option B
- **Decision outcome:** A Partner may hold multiple separately recorded and effective-dated Outlet assignments.
- **Approver:** Dheeraj Narula
- **Role / authority:** Board of Director
- **Approval date:** 2026-09-17

## F. Agreement Lifecycle

### FH-07 - Concurrent agreements

- **Priority:** P0
- **Business question:** Can an assignment have concurrent agreements?
- **Why the decision matters:** Required for integrity, auditability, scalability, historical correctness, or deterministic settlement.
- **Available options:** A one; B non-competing purposes; Other unrestricted
- **Recommended option:** B - explicit purpose, no same-purpose overlap
- **Recommendation rationale:** Smallest scalable, auditable default; advisory until owner approval.
- **Financial impact:** Controls when terms affect money.
- **Operational impact:** Purpose/version approval governance.
- **Technical impact:** Immutable dated agreements and overlap checks.
- **Migration impact:** Classify legacy agreements.
- **Settlement impact:** Only valid unambiguous terms calculate.
- **Status:** APPROVED
- **Approved option:** Option B
- **Decision outcome:** Concurrent agreements are permitted only for explicit non-competing purposes.
- **Approver:** Dheeraj Narula
- **Role / authority:** Board of Director
- **Approval date:** 2026-09-17

### FH-08 - Agreement overlap

- **Priority:** P0
- **Business question:** What happens when target/purpose dates overlap?
- **Why the decision matters:** Required for integrity, auditability, scalability, historical correctness, or deterministic settlement.
- **Available options:** A reject; B priority/latest wins
- **Recommended option:** A - reject approved/active overlap
- **Recommendation rationale:** Smallest scalable, auditable default; advisory until owner approval.
- **Financial impact:** Controls when terms affect money.
- **Operational impact:** Purpose/version approval governance.
- **Technical impact:** Immutable dated agreements and overlap checks.
- **Migration impact:** Classify legacy agreements.
- **Settlement impact:** Only valid unambiguous terms calculate.
- **Status:** APPROVED
- **Approved option:** Option A
- **Decision outcome:** Approved or active agreements for the same target and purpose may not overlap.
- **Approver:** Dheeraj Narula
- **Role / authority:** Board of Director
- **Approval date:** 2026-09-17

### FH-21 - Agreement approval workflow

- **Priority:** P1
- **Business question:** Which states activate an agreement?
- **Why the decision matters:** Required for integrity, auditability, scalability, historical correctness, or deterministic settlement.
- **Available options:** A direct; B maker-checker lifecycle; Other configurable
- **Recommended option:** B - draft-review-approved-active-expired/terminated
- **Recommendation rationale:** Smallest scalable, auditable default; advisory until owner approval.
- **Financial impact:** Controls when terms affect money.
- **Operational impact:** Purpose/version approval governance.
- **Technical impact:** Immutable dated agreements and overlap checks.
- **Migration impact:** Classify legacy agreements.
- **Settlement impact:** Only valid unambiguous terms calculate.
- **Final approval field:** [ ] APPROVED - Option A  [ ] APPROVED - Option B  [ ] APPROVED - Other  [ ] DEFERRED  [ ] REJECTED  [ ] NEEDS DISCUSSION

## G. Commercial / Revenue Cascade

### FH-09 - Commercial calculation model

- **Priority:** P2
- **Business question:** How does value calculate across levels?
- **Why the decision matters:** Required for integrity, auditability, scalability, historical correctness, or deterministic settlement.
- **Available options:** A independent; B sequential; C additive; D agreement-defined
- **Recommended option:** D - explicit mode/base, no implicit cascade
- **Recommendation rationale:** Smallest scalable, auditable default; advisory until owner approval.
- **Financial impact:** Controls cumulative economics.
- **Operational impact:** Statements expose base/mode/order.
- **Technical impact:** Snapshotted modes and fail-closed resolver.
- **Migration impact:** Map ambiguous terms manually.
- **Settlement impact:** Layered calculation stays blocked.
- **Final approval field:** [ ] APPROVED - Option A  [ ] APPROVED - Option B  [ ] APPROVED - Other  [ ] DEFERRED  [ ] REJECTED  [ ] NEEDS DISCUSSION

### FH-22 - Term precedence

- **Priority:** P2
- **Business question:** What happens if several terms apply?
- **Why the decision matters:** Required for integrity, auditability, scalability, historical correctness, or deterministic settlement.
- **Available options:** A most-specific/latest; B reject ambiguity
- **Recommended option:** B - one target/purpose/time or fail closed
- **Recommendation rationale:** Smallest scalable, auditable default; advisory until owner approval.
- **Financial impact:** Controls cumulative economics.
- **Operational impact:** Statements expose base/mode/order.
- **Technical impact:** Snapshotted modes and fail-closed resolver.
- **Migration impact:** Map ambiguous terms manually.
- **Settlement impact:** Layered calculation stays blocked.
- **Final approval field:** [ ] APPROVED - Option A  [ ] APPROVED - Option B  [ ] APPROVED - Other  [ ] DEFERRED  [ ] REJECTED  [ ] NEEDS DISCUSSION

### FH-23 - Royalty and calculation base

- **Priority:** P2
- **Business question:** Which base applies at each level?
- **Why the decision matters:** Required for integrity, auditability, scalability, historical correctness, or deterministic settlement.
- **Available options:** A universal; B enumerated agreement-defined
- **Recommended option:** B - snapshot gross/net/GST-exclusive/margin/profit/fixed/MG/higher-of
- **Recommendation rationale:** Smallest scalable, auditable default; advisory until owner approval.
- **Financial impact:** Controls cumulative economics.
- **Operational impact:** Statements expose base/mode/order.
- **Technical impact:** Snapshotted modes and fail-closed resolver.
- **Migration impact:** Map ambiguous terms manually.
- **Settlement impact:** Layered calculation stays blocked.
- **Final approval field:** [ ] APPROVED - Option A  [ ] APPROVED - Option B  [ ] APPROVED - Other  [ ] DEFERRED  [ ] REJECTED  [ ] NEEDS DISCUSSION

### FH-24 - Share composition

- **Priority:** P2
- **Business question:** Are shares independent, additive, sequential or residual?
- **Why the decision matters:** Required for integrity, auditability, scalability, historical correctness, or deterministic settlement.
- **Available options:** A independent; B sequential; C additive; D agreement-defined
- **Recommended option:** D - explicit mode, never inferred
- **Recommendation rationale:** Smallest scalable, auditable default; advisory until owner approval.
- **Financial impact:** Controls cumulative economics.
- **Operational impact:** Statements expose base/mode/order.
- **Technical impact:** Snapshotted modes and fail-closed resolver.
- **Migration impact:** Map ambiguous terms manually.
- **Settlement impact:** Layered calculation stays blocked.
- **Final approval field:** [ ] APPROVED - Option A  [ ] APPROVED - Option B  [ ] APPROVED - Other  [ ] DEFERRED  [ ] REJECTED  [ ] NEEDS DISCUSSION

## H. Settlement / Tax / Payment

### FH-10 - Payment direction

- **Priority:** P2
- **Business question:** Who pays whom at every layer?
- **Why the decision matters:** Required for integrity, auditability, scalability, historical correctness, or deterministic settlement.
- **Available options:** A HDK pays all; B parent-child; C agreement-defined
- **Recommended option:** C - immutable payer/payee per agreement
- **Recommendation rationale:** Smallest scalable, auditable default; advisory until owner approval.
- **Financial impact:** Changes cash timing, net payable and compliance.
- **Operational impact:** Defines invoicing, close and reconciliation.
- **Technical impact:** Parties, periods, tax snapshots and ledger.
- **Migration impact:** Map balances, registrations and directions.
- **Settlement impact:** Finance/legal approval required.
- **Final approval field:** [ ] APPROVED - Option A  [ ] APPROVED - Option B  [ ] APPROVED - Other  [ ] DEFERRED  [ ] REJECTED  [ ] NEEDS DISCUSSION

### FH-25 - Settlement periods

- **Priority:** P2
- **Business question:** Are periods common or configurable?
- **Why the decision matters:** Required for integrity, auditability, scalability, historical correctness, or deterministic settlement.
- **Available options:** A month; B agreement; C outlet cycle; D common source/due dates
- **Recommended option:** D - common source period, explicit due dates
- **Recommendation rationale:** Smallest scalable, auditable default; advisory until owner approval.
- **Financial impact:** Changes cash timing, net payable and compliance.
- **Operational impact:** Defines invoicing, close and reconciliation.
- **Technical impact:** Parties, periods, tax snapshots and ledger.
- **Migration impact:** Map balances, registrations and directions.
- **Settlement impact:** Finance/legal approval required.
- **Final approval field:** [ ] APPROVED - Option A  [ ] APPROVED - Option B  [ ] APPROVED - Other  [ ] DEFERRED  [ ] REJECTED  [ ] NEEDS DISCUSSION

### FH-26 - Tax, GST, TDS and invoicing

- **Priority:** P2
- **Business question:** How are tax base, TDS and invoice direction handled?
- **Why the decision matters:** Required for integrity, auditability, scalability, historical correctness, or deterministic settlement.
- **Available options:** A universal; B party/level/agreement tax policy
- **Recommended option:** B - finance/legal-approved treatment per obligation
- **Recommendation rationale:** Smallest scalable, auditable default; advisory until owner approval.
- **Financial impact:** Changes cash timing, net payable and compliance.
- **Operational impact:** Defines invoicing, close and reconciliation.
- **Technical impact:** Parties, periods, tax snapshots and ledger.
- **Migration impact:** Map balances, registrations and directions.
- **Settlement impact:** Finance/legal approval required.
- **Final approval field:** [ ] APPROVED - Option A  [ ] APPROVED - Option B  [ ] APPROVED - Other  [ ] DEFERRED  [ ] REJECTED  [ ] NEEDS DISCUSSION

### FH-27 - Negative and carried balances

- **Priority:** P2
- **Business question:** Can balances be negative, adjusted or carried?
- **Why the decision matters:** Required for integrity, auditability, scalability, historical correctness, or deterministic settlement.
- **Available options:** A no; B zero floor plus approved carry; Other agreement
- **Recommended option:** B - auditable adjustment/carry lines
- **Recommendation rationale:** Smallest scalable, auditable default; advisory until owner approval.
- **Financial impact:** Changes cash timing, net payable and compliance.
- **Operational impact:** Defines invoicing, close and reconciliation.
- **Technical impact:** Parties, periods, tax snapshots and ledger.
- **Migration impact:** Map balances, registrations and directions.
- **Settlement impact:** Finance/legal approval required.
- **Final approval field:** [ ] APPROVED - Option A  [ ] APPROVED - Option B  [ ] APPROVED - Other  [ ] DEFERRED  [ ] REJECTED  [ ] NEEDS DISCUSSION

## I. Historical Data & Migration

### FH-19 - Historical ownership and transfer

- **Priority:** P0
- **Business question:** How is ownership and correction history preserved?
- **Why the decision matters:** Required for integrity, auditability, scalability, historical correctness, or deterministic settlement.
- **Available options:** A overwrite; B dates/status plus audit events
- **Recommended option:** B - immutable dated history
- **Recommendation rationale:** Smallest scalable, auditable default; advisory until owner approval.
- **Financial impact:** Determines historical beneficiary/liability.
- **Operational impact:** Evidence and approval for corrections.
- **Technical impact:** Temporal records and audit events.
- **Migration impact:** Reconstruct history; flag gaps.
- **Settlement impact:** Resolve then-valid assignment.
- **Status:** APPROVED
- **Approved option:** Option B
- **Decision outcome:** Ownership and transfer history uses effective dates, status, and immutable audit records.
- **Approver:** Dheeraj Narula
- **Role / authority:** Board of Director
- **Approval date:** 2026-09-17

## J. Lifecycle / Deactivation / Exit

### FH-20 - Deletion policy

- **Priority:** P0
- **Business question:** May assignments be deleted?
- **Why the decision matters:** Required for integrity, auditability, scalability, historical correctness, or deterministic settlement.
- **Available options:** A hard delete; B unused drafts only/end-date others
- **Recommended option:** B - preserve referenced records
- **Recommendation rationale:** Smallest scalable, auditable default; advisory until owner approval.
- **Financial impact:** Preserves obligations during exit.
- **Operational impact:** Grace/end-date/child checklist.
- **Technical impact:** Restricted delete and lifecycle validation.
- **Migration impact:** Do not remove referenced history.
- **Settlement impact:** Keep historical targets resolvable.
- **Status:** APPROVED
- **Approved option:** Option B
- **Decision outcome:** Only unreferenced drafts may be deleted; referenced records must be end-dated or terminated.
- **Approver:** Dheeraj Narula
- **Role / authority:** Board of Director
- **Approval date:** 2026-09-17

### FH-16 - Expired City agreement

- **Priority:** P0
- **Business question:** What if City agreement expires with active Outlets?
- **Why the decision matters:** Required for integrity, auditability, scalability, historical correctness, or deterministic settlement.
- **Available options:** A suspend; B bounded grace; Other auto-renew
- **Recommended option:** B - explicit grace, no inferred terms
- **Recommendation rationale:** Smallest scalable, auditable default; advisory until owner approval.
- **Financial impact:** Preserves obligations during exit.
- **Operational impact:** Grace/end-date/child checklist.
- **Technical impact:** Restricted delete and lifecycle validation.
- **Migration impact:** Do not remove referenced history.
- **Settlement impact:** Keep historical targets resolvable.
- **Status:** APPROVED
- **Approved option:** Option B
- **Decision outcome:** Expired City agreements may use an explicitly approved bounded grace state without inferred terms.
- **Approver:** Dheeraj Narula
- **Role / authority:** Board of Director
- **Approval date:** 2026-09-17

## Existing Data Mapping Checklist

Legacy Territory names such as "Surat City" cannot identify State holder, City Partner, area/pincodes, Outlet ownership, agreement target, effective dates, or payment direction. For every production record capture: legacy ID/type/name; tenant; proposed State/City/Outlet assignment; canonical geography; coverage; Partner role; agreement target/purpose; effective dates; evidence; mapper; reviewer; approval status; exception reason. Ambiguous records remain unmapped.

## Existing Commercial Rules Preserved

Existing approved commercial records remain authoritative, including hybrid MG, formula MG at 3% of initial investment for new/formula products, fixed INR 15,000 MG for the existing INR 3.10 lakh product, GST-exclusive Net Sales for NP-01, and MAX(MG, 30% of Net Sales) for NP-02. Those approvals do not decide hierarchy cascade, hierarchy payer/payee, hierarchy tax liability, or hierarchy settlement periods.

## Director Profit-Sharing Separation

**Director Profit Distribution is a Company Ownership/Profit Allocation domain and is not a State/City/Outlet Franchise settlement rule.**

Designated Director 1% royalty, salary, Company retained profit, and Director profit distribution are outside this workbook. They are not reused as franchise rates, bases, beneficiaries, or settlement directions.

## Approval Gate

P0 approval is required before schema design/migration. P0 and P1 approval is required before API/UI implementation. Applicable P2 and finance/legal approval is required before layered settlement redesign. Existing settlement remains unchanged.

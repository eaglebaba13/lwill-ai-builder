# X Nail Franchise Hierarchy Implementation Design

**Status:** FH-3 DESIGN REVIEW - NO IMPLEMENTATION
**Coding/migration authorization:** None

## Decision Firewall

All 21 P0 decisions are represented. FH-21 and FH-09, FH-10, FH-22 through FH-27 remain unresolved. Grace duration is BUSINESS VALUE REQUIRED. No maker-checker, cascade, payer/payee, calculation-base, share, period, tax, or carry-forward behavior is encoded. Director/payroll/Staff Commission/shareholding remain separate.

## Exact Current Schema Diff Map

The repository model is named Territory, not FranchiseTerritory.

| Existing model | Current surface | Target action |
|---|---|---|
| Tenant | owns flat franchise and settlement rows | ADD hierarchy relations; KEEP existing |
| BusinessUnit | tenant-owned Branch parent | KEEP unchanged |
| Branch | optional Territory; Outlets, AgreementOutlets, Invoices | KEEP; no hierarchy parent; Territory DEPRECATE LATER |
| Territory | tenant/name unique; flat relations | KEEP compatibility semantics; DEPRECATE LATER |
| FranchisePartner | legal party for Outlet/Agreement/Settlement | ADD State/City relations; KEEP identity |
| FranchiseOutletProfile | Partner, Branch, optional Territory; tenant/branch unique | ADD nullable currentCityFranchiseId and assignmentStatus; KEEP IDs/legacy fields |
| FranchiseAgreement | Partner, required Territory, terms/dates | ADD nullable level, purpose, targets, version/supersession, grace placeholder |
| FranchiseAgreementOutlet | Agreement-to-Branch junction | KEEP unchanged initially |
| FranchiseSettlement | Agreement/Partner snapshot | KEEP unchanged |
| FranchiseSettlementLine | Settlement detail | KEEP unchanged |
| FranchisePayment | Settlement payment | KEEP unchanged |

New models: GeoCountry, GeoState, GeoCity, GeoPincode, StateFranchise, StateFranchisePincode, CityFranchise, CityFranchiseArea, CityFranchisePincode, FranchiseOutletAssignment. No extra domain models.

## New Model Specification

| Model | Purpose | Required fields | Keys/lifecycle |
|---|---|---|---|
| GeoCountry | canonical country | code Char(2), name | code PK; immutable |
| GeoState | canonical State | UUID, countryCode, code, name | unique country/code |
| GeoCity | canonical City | UUID, stateId, code, name | unique state/code |
| GeoPincode | canonical Pincode | UUID, stateId, cityId, six-digit value | normalized; city/value index |
| StateFranchise | tenant State assignment | tenant, Partner, State, code/name, mode, dates/status, conflict evidence | tenant/id; tenant/code; end-dated |
| StateFranchisePincode | partial State coverage | tenant, State assignment, Pincode, dates | version unique; overlap prohibited |
| CityFranchise | tenant City assignment | tenant, State parent, Partner, City, areaCode/name, dates/status, conflict evidence | tenant/id; versioned identity |
| CityFranchiseArea | named label | tenant, City assignment, name/normalizedName | unique within assignment |
| CityFranchisePincode | V1 boundary | tenant, City assignment, optional area, Pincode, dates | overlap prohibited |
| FranchiseOutletAssignment | canonical parent history | tenant, Outlet Profile, City assignment, dates/status, transfer reference | one current parent; immutable history |

Tenant-owned FKs use tenantId plus target ID. Geography is tenant-independent. Effective periods are half-open UTC timestamps. No default grace duration.

## Prisma Draft Rules

The proposed blocks are in docs/X-NAIL-FRANCHISE-HIERARCHY-SCHEMA-DESIGN.md. Implementation must make all bidirectional Prisma relations compile without changing semantics.

- Outlet agreement target field: outletProfileId.
- Current Outlet pointer: currentCityFranchiseId.
- Parent-history source: FranchiseOutletAssignment.
- Agreement purpose: required normalized String purposeCode, not an enum yet.
- Agreement workflow status: deferred to FH-21.
- Enums: FranchiseAssignmentStatus, FranchiseCoverageMode, FranchiseAgreementLevel.

## Agreement Change Plan

Add nullable agreementLevel, purposeCode, stateFranchiseId, cityFranchiseId, outletProfileId, supersedesAgreementId, graceDurationDays; add version default 1. Add tenant-composite FKs and indexes. Keep required territoryId, AgreementOutlet, commercial columns, termsSnapshot, and settlement relations.

Backfill only from approved mapping data. Then validate exactly-one target and level match. Amendments create successor rows; financially used terms are immutable. Same target/purpose periods cannot overlap. FH-21 approval workflow remains deferred.

## Constraint Plan

| Name | Table | Purpose | Timing |
|---|---|---|---|
| chk_state_franchise_period | StateFranchise | valid dates | immediate |
| chk_city_franchise_period | CityFranchise | valid dates | immediate |
| chk_outlet_assignment_period | FranchiseOutletAssignment | valid dates | immediate |
| chk_agreement_target_one | FranchiseAgreement | exactly one target | after backfill |
| chk_agreement_level_target | FranchiseAgreement | level matches target | after backfill |
| chk_agreement_period | FranchiseAgreement | valid dates | after remediation |
| ex_state_pincode_period | StateFranchisePincode | no overlap | immediate |
| ex_city_pincode_period | CityFranchisePincode | no overlap | immediate |
| ex_outlet_assignment_period | FranchiseOutletAssignment | one parent at a time | immediate |
| ex_agreement_target_purpose | FranchiseAgreement | no same-purpose overlap | after mapping |

CHECK/exclusion constraints need reviewed raw PostgreSQL migration SQL. Exclusions require approved btree_gist support. Transactional service locks remain required. Parent containment/lifecycle stays in services.

## Outlet Assignment Contract

FranchiseOutletAssignment is authoritative. A transfer transaction locks the Outlet, validates tenant/Branch/Partner/City/State and dates, closes the old assignment, inserts the successor, updates the current pointer, and records evidence. Historical assignments and financial rows are never rewritten.

Transaction-time resolution queries the effective assignment. Zero or multiple matches fail closed. currentCityFranchiseId is current-read convenience only.

## Geography And Coverage

Seed canonical references from an approved versioned source. Normalize codes and six-digit Indian pincodes. Validate City-State and Pincode-City-State consistency. No GIS/PostGIS.

WHOLE_STATE conflicts with any overlapping State assignment for tenant/state. PINCODE_SET uses StateFranchisePincode. City coverage uses named areas plus canonical pincodes; pincode is enforceable, name is a label. Multiple Jaipur City assignments remain valid when coverage does not overlap.

## Tenant, Partner, Lifecycle, Grace

Composite tenant FKs enforce direct ownership; services validate geographic parentage and effective containment. Cross-tenant mutations fail closed.

Partner meanings remain explicit: State partner, City partner, existing Outlet partner, and Agreement counterparty. No unnamed Partner fields. Cross-level same-Partner activation requires conflict approval evidence; this is FH-03, not FH-21 workflow.

State cannot end with unresolved Cities; City cannot end with unresolved Outlet assignments. No cascade deletes. graceDurationDays is nullable with no default: missing value allows schema/read work but blocks use of grace. **BUSINESS VALUE REQUIRED.**

## Legacy Compatibility

Territory remains unchanged and visibly legacy; it is never auto-converted to CityFranchise. Compatibility adapters may add hierarchy labels without altering legacy DTO values.

FranchiseAgreementOutlet remains because settlement uses Invoice -> Branch -> AgreementOutlet -> Agreement -> Partner -> Settlement. Retirement requires P2 approval, redesigned settlement, parity, observation, and authorization.

## Service Change Map

| File | Class | Plan |
|---|---|---|
| packages/authentication-context-prisma/src/franchise-service.ts | EXTEND | compatibility DTOs and agreement target fields |
| packages/authentication-context-prisma/src/franchise-hierarchy-service.ts | NEW | State/City CRUD, coverage, lifecycle, Outlet transfer/resolution |
| packages/authentication-context-prisma/src/franchise-commercial-service.ts | UNCHANGED | no new calculations |
| packages/authentication-context-prisma/src/franchise-settlement-service.ts | UNCHANGED | preserve settlement |
| packages/authentication-context-prisma/src/report-service.ts | LATER | hierarchy reporting after parity |
| apps/web/src/lib/crm/franchise-runtime.ts | EXTEND | hierarchy service wiring |
| apps/web/src/lib/crm/franchise-route-handlers.ts | EXTEND/SPLIT | hierarchy handlers after size review |
| Branch services | UNCHANGED | Branch stays operational |

The dedicated hierarchy service is justified by temporal coverage/lifecycle transactions.

## Future API Plan

| Endpoint | Methods | Contract |
|---|---|---|
| /api/franchise/states | GET, POST | list/create draft |
| /api/franchise/states/[id] | GET, PATCH | detail/draft or lifecycle command |
| /api/franchise/states/[id]/coverage | GET, PUT | validated draft coverage |
| /api/franchise/cities | GET, POST | list/create under State |
| /api/franchise/cities/[id] | GET, PATCH | detail/draft/end |
| /api/franchise/cities/[id]/coverage | GET, PUT | areas/pincodes |
| /api/franchise/outlets/[id]/assignments | GET, POST | history/transfer |
| /api/franchise/agreements | existing | later add reviewed target fields |

No hard DELETE for active/history. Existing APIs continue during compatibility.

## RBAC, UI, Transfer

Reuse franchise.read for hierarchy reads and franchise.write for drafts, coverage, transfer, and lifecycle. Settlement permissions remain unchanged. A possible franchise.approve is PENDING FH-21 and is not proposed now.

Future tabs: Overview, State Franchises, City Franchises, Partners, Agreements, Outlets, Settlements. Legacy Territories remains labeled during migration. State drills into Cities; City shows coverage/Outlets. Geography selectors and assignment ownership remain separate.

| Module | XLSX upload/template | Excel | PDF |
|---|---|---|---|
| State master | reviewed mapping | yes | summary |
| City master | reviewed mapping | yes | summary |
| Areas/pincodes | validated bulk | yes | optional |
| Outlet assignment | controlled mapping/transfer | yes | history |
| Agreement | no blind financial import | metadata | signed/summary |

Imports require preview, validation, tenant-safe IDs, idempotency, evidence, and error workbook. FH-3 generates no mappings.
## P0 Implementation Traceability

| Decision | Planned implementation |
|---|---|
| FH-01 | dated non-overlapping State coverage |
| FH-02 | Partner-to-City one-to-many |
| FH-03 | cross-level conflict evidence |
| FH-04 | City pincode overlap exclusion |
| FH-05 | named areas plus normalized pincodes |
| FH-06 | effective-dated Outlet transfer |
| FH-07 | required purposeCode |
| FH-08 | same-purpose temporal exclusion |
| FH-11 | State/City/area identity plus immutable ID |
| FH-12 | independent Partner FKs by level |
| FH-13 | one canonical City per assignment |
| FH-14 | WHOLE_STATE or PINCODE_SET |
| FH-15 | activation requires one City parent |
| FH-16 | nullable grace placeholder; value required |
| FH-17 | explicit existing Outlet Partner role |
| FH-18 | Partner-to-Outlet one-to-many |
| FH-19 | immutable effective-dated history |
| FH-20 | delete unused drafts only |
| FH-28 | dated relocation and preserved history |
| FH-29 | canonical geography references |
| FH-30 | child-first parent end workflow |

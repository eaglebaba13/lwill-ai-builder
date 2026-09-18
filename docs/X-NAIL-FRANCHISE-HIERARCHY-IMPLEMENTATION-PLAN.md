# X Nail Franchise Hierarchy Implementation Plan

**Status:** FH-3 EXACT CHANGE PLAN - DO NOT IMPLEMENT
**Authorization:** No code or migration

## Migration Sequence

| Order | Proposed migration | Scope | Safe before mapping |
|---:|---|---|---|
| 1 | add_franchise_canonical_geography | canonical reference tables/indexes | tables only |
| 2 | add_franchise_hierarchy_foundation | enums, State/City, coverage tables | yes |
| 3 | add_outlet_assignment_history | assignment table; nullable Outlet pointer/status | schema only |
| 4 | add_hierarchy_agreement_targets | nullable level/purpose/targets/version/grace | schema only |
| 5 | add_franchise_hierarchy_guards | period and new-row exclusion guards | after extension review |
| 6 | validate_franchise_hierarchy_backfill | exactly-one target and hard validation | no |
| 7 | enforce_franchise_hierarchy_requiredness | activation/classification enforcement | no |

No migration is created in FH-3. Backfill uses reviewed operational tooling, not tenant-specific SQL in generic migrations. No legacy field is removed.

## Compatibility Releases

- **A - Additive schema:** application ignores new objects; old tests/output unchanged.
- **B - Compatibility writes:** hierarchy services/APIs disabled by default; settlement unchanged.
- **C - Mapping/shadow reads:** reviewed imports and comparison reports; zero mandatory unresolved rows.
- **D - Hierarchy UI:** authorized State/City/coverage/Outlet views; Territory visibly legacy.
- **E - Enforcement:** validate deferred constraints after lock/runtime rehearsal.
- **F - Legacy retirement later:** only after consumer migration, P1/P2 approvals, observation, and authorization.

## Mapping Workbooks

- **STATE_MAPPING:** legacyTerritoryId, tenantId, canonicalStateCode, stateFranchiseCode, statePartnerId, coverageMode, coveredPincodes, dates, evidence, mapper/reviewer/status/exception.
- **CITY_MAPPING:** legacyTerritoryId, tenantId, State assignment, canonicalCityCode, City name, areaCode, partnerId, dates, conflict evidence, reviewer/status.
- **COVERAGE:** tenantId, City assignment, area/normalized area, pincode, dates, source/reviewer/status.
- **OUTLET_MAPPING:** tenantId, outletProfileId, branchId, City assignment, dates, transfer evidence/reviewer/status.
- **AGREEMENT_MAPPING:** tenantId, agreementId, level, targetId, purposeCode, dates, version/supersession, evidence/reviewer/status.

Templates use stable IDs/codes. Import validates all rows before writes, is idempotent, and returns row-level errors. FH-3 creates no production mappings.

## Reconciliation And Rollback

Baseline legacy counts, active/null states, Invoice totals by Branch, and Settlement totals/snapshot hashes. Compare State/City/Area/Pincode/OutletAssignment counts, mapped/unmapped records, overlap, tenant mismatch, pointer/history mismatch, and version chains.

Hard gates: zero active Outlet without one valid City; zero active City without State; zero tenant mismatch; zero prohibited pincode overlap; zero mandatory unmapped Agreement; zero prohibited effective overlap. Existing Invoice/Settlement totals cannot change.

Default reads and Settlement stay legacy. New objects may remain dormant. Disable hierarchy reads on failure. Never initially remove Territory, AgreementOutlet, terms snapshots, or financial rows. Production restore/runbook and RTO/RPO require DBA approval.

## Exact File Plan

| File/path | Action/phase | Purpose | Risk/tests |
|---|---|---|---|
| packages/database/prisma/schema.prisma | MODIFY FH-4A | additive hierarchy schema | high; prisma validate/generate |
| packages/database/prisma/migrations/<sequence>/migration.sql | CREATE authorized phases | tables/constraints | critical; isolated migration/SQL assertions |
| packages/authentication-context-prisma/src/franchise-hierarchy-service.ts | CREATE FH-4B | hierarchy domain | high; lifecycle/tenant/overlap/transfer |
| packages/authentication-context-prisma/src/franchise-hierarchy-service.test.ts | CREATE FH-4B | domain tests | targeted/full package |
| packages/authentication-context-prisma/src/franchise-service.ts | EXTEND FH-4B/C | compatibility/Agreement targets | existing and compatibility tests |
| packages/authentication-context-prisma/src/franchise-settlement-service.ts | KEEP | preserve settlement | full settlement regression |
| packages/authentication-context-prisma/src/franchise-commercial-service.ts | KEEP | no P2 formulas | commercial regression |
| packages/authentication-context-prisma/src/report-service.ts | LATER/separate bugs | hierarchy reports after parity | report suite |
| apps/web/src/lib/crm/franchise-runtime.ts | EXTEND FH-4C | service wiring | integration tests |
| apps/web/src/lib/crm/franchise-route-handlers.ts or hierarchy file | EXTEND/CREATE | handlers | 401/403/input/tenant tests |
| apps/web/src/app/api/franchise/states/** | CREATE FH-4C | State routes | route tests |
| apps/web/src/app/api/franchise/cities/** | CREATE FH-4C | City/coverage routes | route tests |
| apps/web/src/app/api/franchise/outlets/[id]/assignments/route.ts | CREATE FH-4C | transfer/history | auth/overlap tests |
| apps/web/src/app/api/franchise/agreements/** | MODIFY LATER | target input | compatibility tests |
| initial-franchise-permissions-bootstrap.ts | KEEP initially | reuse read/write | existing tests |
| apps/web/src/app/xnail/page.tsx | MODIFY FH-4E | tabs; separate bugs | native-auth/UI tests |
| apps/web/src/test/franchise-route-handlers.test.ts | EXTEND | API contract | targeted/full web |
| FH documentation | UPDATE per phase | evidence/status | diff checks |

Service order: geography reads; State commands; City/coverage; Outlet transfer/resolution; compatibility projections; Agreement targets after mapping. Settlement remains untouched. Handlers use server auth tenant context and expose no hard delete.

## Independent Low-Risk Bugs

### Branch context
Root cause: header uses global Branch state, loaded only by tab-lazy effect around page.tsx lines 1959-1978; label near 5117. Fix with lightweight authorized context or existing dashboard count. Test non-Branch tab plus 401/403. **Timing: before FH-4A or separate commit.**

### Partner agreement KPI
Root cause: Partners KPI reads Agreement state loaded only around lines 2882-2893; KPI near 7781. Add server activeAgreementCount to Partner read/list or fetch aggregate with Partners. Test before Agreement tab opens. **Timing: before hierarchy UI, separate commit.**

### Overview Outlet KPI
Root cause: page.tsx near 7486 displays franchiseOverview.branches.length as Outlets. Use canonical Outlet Profile count/list. Test differing Branch/Outlet fixtures. **Timing: before hierarchy UI, separate commit.**

## Phase Split

- **FH-4A Schema foundation:** requires explicit migration authorization and DBA extension/lock review. Exit: additive schema validates; legacy tests unchanged.
- **FH-4B Services:** exit after State/City/coverage/Outlet transfer tenant and temporal tests.
- **FH-4C Compatibility APIs:** exit after auth/RBAC/input tests and unchanged legacy APIs.
- **FH-4D Mapping tooling:** exit after idempotent dry run, zero unexplained data, rollback test.
- **FH-4E UI:** exit after accessible role-filtered UI, legacy labels, transfer verification.
- **FH-4F Enforcement/cutover:** requires signed reconciliation/observation/rollback approval; Settlement remains legacy.

## Risk Register

| Risk | Severity | Likelihood | Mitigation | Rollback |
|---|---|---:|---|---|
| tenant leakage | critical | low | composite FKs/auth/tenant tests | disable endpoints/reads |
| wrong mapping | critical | medium | reviewed evidence workbook | disable reads; correct mapping |
| Agreement misclassification | critical | medium | legal review/fail closed | retain legacy settlement |
| coverage overlap | high | medium | exclusions and transactional locks | reject/end-date batch |
| Outlet orphaning | high | medium | activation gate/reconciliation | remap; legacy path |
| historical rewrite | critical | low | append/end-date only | forward correction |
| settlement regression | critical | low | no settlement changes/suite | legacy selector |
| mapping ambiguity | high | high | unresolved blocks enforcement | defer row/cutover |
| btree_gist unavailable | medium | medium | DBA check/service lock fallback | defer exclusion |
| grace duration missing | medium | high | null/no default; block grace | no grace workflow |

## Coding Gate

FH-4A starts only after this review is accepted and schema/migration creation is explicitly authorized. It must not include services, backfill, UI, Settlement changes, or destructive legacy work.

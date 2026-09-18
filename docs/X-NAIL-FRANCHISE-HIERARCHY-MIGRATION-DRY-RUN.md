# X Nail Franchise Hierarchy Migration Dry-Run Plan

**Status:** DESIGN ONLY - DO NOT EXECUTE
**Phase:** FH-2
**Production authorization:** None
**Schema implementation authorization:** None

## Objective

Define a repeatable non-production rehearsal for the approved hierarchy without creating a migration or changing schema.prisma. The eventual rollout is additive first. Territory, Branch.territoryId, Agreement.territoryId, FranchiseAgreementOutlet, and current settlement remain intact until separately authorized cutover.

## Entry Gates

Before any future dry run:

- approved FH-2 schema and constraint review;
- database owner and rollback owner assigned;
- sanitized production-shaped backup restored to an isolated environment;
- extension policy confirmed if exclusion constraints use btree_gist;
- complete business mapping sheets reviewed maker/checker;
- baseline row counts and checksums captured;
- current tests green on the candidate branch;
- no unresolved mandatory State, City, Outlet, or Agreement mapping.

FH-21 and P2 decisions are not entry gates for additive hierarchy tables, but features depending on them remain disabled.

## Required Mapping Sheets

| Sheet | Required columns | Approval |
|---|---|---|
| Legacy Territory -> State | tenantId, territoryId/name, canonicalStateId, coverageMode, coverage references, evidence, mapper, reviewer, status | Business/data owner |
| Legacy Territory -> City | tenantId, territoryId/name, State assignment, canonicalCityId, areaCode/name, evidence, exception | Business/data owner |
| State Franchise -> Partner | tenantId, State assignment code, partnerId, dates, conflict evidence | Legal/business |
| City Franchise -> Partner | tenantId, City assignment code, partnerId, parent State, dates, conflict approval | Legal/business |
| City Franchise -> Areas | City assignment, area name, normalized name | Business |
| City Franchise -> Pincodes | City assignment, area, canonical pincodeId/value, dates | Business/data |
| Outlet -> City Franchise | outletProfileId, branchId, City assignment, effective dates, transfer evidence | Operations/business |
| Agreement -> Level | agreementId, STATE/CITY/OUTLET, purposeCode, evidence | Legal/business |
| Agreement -> Target | agreementId, target assignment ID, version/supersession, effective dates | Legal/business |
| Branch -> Outlet verification | branchId, outletProfileId or non-franchise reason, tenant, active state | Operations |

A Territory such as "Surat City" cannot automatically determine State holder, City Partner, area, pincode rights, Outlet ownership, agreement target, purpose, or payment direction. Ambiguous rows remain unresolved and block hard constraints.

## Baseline Inventory

Capture per tenant:

- Tenant, BusinessUnit, Branch, Territory, Partner, Outlet Profile, Agreement, Agreement Outlet, Settlement, Settlement Line, Payment counts;
- active/inactive counts;
- null Territory relations;
- agreement date ranges and commercial snapshots;
- invoices per Branch and settlement totals;
- duplicate/invalid references;
- deterministic hashes of IDs and immutable financial fields.

## M1 - Add New Reference And Hierarchy Tables

Hypothetically add canonical geography, StateFranchise, State coverage, CityFranchise, City areas/pincodes, and Outlet assignment history. Add enums only after final Prisma review.

Acceptance:

- empty additive tables;
- no changed legacy row;
- current application starts and current tests pass;
- all new FKs are tenant-safe and Restrict historical deletion.

Rollback: drop only empty new objects in rehearsal, or restore snapshot. No legacy rollback needed.

## M2 - Add Nullable Compatibility Columns

Hypothetically add nullable currentCityFranchiseId and assignmentStatus to Outlet Profile; nullable agreement level, purpose, target FKs, version/supersession, and grace placeholder to Agreement.

Acceptance:

- every existing row remains readable;
- defaults do not classify or activate legacy rows;
- current settlement SQL/API output is unchanged.

Rollback: application ignores columns; columns may remain additive.

## M3 - Seed Canonical Geography

Load reviewed Country/State/City/Pincode references. Normalize India pincodes as six digits. Validate every Pincode City-State relation and source code uniqueness.

Acceptance:

- zero malformed/duplicate pincode values;
- zero City-State mismatches;
- source/version recorded.

Rollback: disable hierarchy reads and replace the isolated reference load.

## M4 - Create Reviewed State Assignments

Insert only approved mapping rows. WHOLE_STATE and PINCODE_SET are explicit. Do not infer Partner or coverage from Territory name.

Acceptance:

- tenant/Partner/state consistency;
- no effective overlap;
- conflict approval evidence where applicable;
- mapping sheet row count equals inserted + documented rejected count.

## M5 - Create Reviewed City Assignments

Insert each City under exactly one mapped State with canonical City, areaCode, Partner, dates, named areas, and pincodes.

Acceptance:

- one State parent;
- City geographic state equals parent state;
- multiple same-city assignments remain valid;
- zero overlapping tenant/city/pincode periods;
- all area/pincode mappings reviewed.

## M6 - Attach Outlet Profiles

For each approved Outlet mapping, insert an effective-dated FranchiseOutletAssignment and set the synchronized current City pointer only when exactly one open assignment exists.

Acceptance:

- active Outlet mapped exactly once;
- draft/migration exceptions explicitly listed;
- Branch and Outlet tenants match;
- assignment period fits City and State periods;
- no historical assignment overwritten.

Hard gate: unmapped active Outlet count must be zero before operational activation constraints.

## M7 - Classify Agreements

Populate level, purposeCode, and exactly one target from reviewed sheets. Preserve Territory, AgreementOutlet, termsSnapshot, commercial fields, and existing IDs.

Acceptance:

- every required agreement has one reviewed level/target;
- target and Partner tenants match;
- same-purpose overlap report is empty;
- version chain has no cycles/gaps;
- unapproved purpose values are rejected;
- graceDurationDays stays null until a business value is approved.

Current settlement continues using legacy joins.

## M8 - Reconcile Counts And Financial Baseline

Compare baseline and mapped metrics:

| Metric | Required result |
|---|---|
| Legacy Partner/Agreement/Outlet/Branch/Territory counts | unchanged |
| State/City counts | equal approved mapping rows |
| Mapped active Outlets | equals active franchise Outlet population |
| Unmapped mandatory Outlets | zero before hard gate |
| Mapped required Agreements | all; exceptions explicitly approved |
| Unmapped mandatory Agreements | zero before target constraint |
| Invoice counts/totals by Branch | unchanged |
| Settlement counts/totals/snapshots | unchanged |
| Orphan/cross-tenant references | zero |
| Coverage/agreement overlaps | zero |

Any unexplained delta stops the rehearsal.

## M9 - Enable Compatibility Reads

Behind a disabled-by-default selection mechanism, produce legacy output plus optional hierarchy labels. Do not dual-write settlement.

Acceptance:

- legacy responses byte/semantically equivalent for existing consumers;
- mapped hierarchy labels reconcile to sheets;
- hierarchy-only reads fail closed on missing mapping;
- observability reports mapping misses without secrets.

Rollback: disable hierarchy read selection.

## M10 - Rehearse Mandatory Constraints

Only after M8/M9 pass, validate exactly-one agreement target, effective-date checks, active Outlet parentage, tenant FKs, and overlap constraints in the isolated environment.

Use NOT VALID then VALIDATE CONSTRAINT where appropriate to separate installation from data validation. This is a future migration technique, not authorization to generate SQL now.

Acceptance: every constraint validates; lock duration and query plans recorded; no production execution.

## M11 - Rehearse Read Cutover

Switch non-financial hierarchy reads in the isolated environment. Keep settlement and legacy financial reports on the old path.

Acceptance:

- State/City/Outlet counts reconcile;
- latency and indexes acceptable;
- low-risk UI defects remain separate;
- rollback selection tested.

## M12 - Legacy Retirement Readiness

Do not remove anything. Produce a consumer inventory for Territory, Branch.territoryId, Agreement.territoryId, AgreementOutlet, membership roles, reports, exports, and settlement.

Retirement is a later phase requiring P1/P2 approvals, consumer migration, observation period, and explicit authorization.

## Read-Only Validation Query Designs

These are documentation examples only. They must be adapted to final table/column names and run only in an authorized isolated dry run.

### Cross-tenant Outlet references

```sql
SELECT op.id
FROM "FranchiseOutletProfile" op
JOIN "Branch" b ON b.id = op."branchId"
JOIN "FranchisePartner" p ON p.id = op."partnerId"
WHERE b."tenantId" <> op."tenantId"
   OR p."tenantId" <> op."tenantId";
```

### Active Outlet without one current assignment

```sql
SELECT op.id, count(oa.id) AS active_assignments
FROM "FranchiseOutletProfile" op
LEFT JOIN "FranchiseOutletAssignment" oa
  ON oa."tenantId" = op."tenantId"
 AND oa."outletProfileId" = op.id
 AND oa.status = 'ACTIVE'
 AND oa."effectiveFrom" <= :as_of
 AND (oa."effectiveTo" IS NULL OR oa."effectiveTo" > :as_of)
WHERE op."isActive" = true
GROUP BY op.id
HAVING count(oa.id) <> 1;
```

### Active City without valid State parent

```sql
SELECT cf.id
FROM "CityFranchise" cf
LEFT JOIN "StateFranchise" sf
  ON sf."tenantId" = cf."tenantId" AND sf.id = cf."stateFranchiseId"
WHERE cf.status = 'ACTIVE'
  AND (sf.id IS NULL OR sf.status NOT IN ('ACTIVE','SUSPENDED')
       OR cf."effectiveFrom" < sf."effectiveFrom"
       OR (sf."effectiveTo" IS NOT NULL
           AND (cf."effectiveTo" IS NULL OR cf."effectiveTo" > sf."effectiveTo")));
```

### Duplicate active City pincode ownership

```sql
SELECT a."tenantId", a."pincodeId", a.id, b.id
FROM "CityFranchisePincode" a
JOIN "CityFranchisePincode" b
  ON a."tenantId" = b."tenantId"
 AND a."pincodeId" = b."pincodeId"
 AND a.id < b.id
 AND tstzrange(a."effectiveFrom", COALESCE(a."effectiveTo",'infinity'),'[)')
     && tstzrange(b."effectiveFrom", COALESCE(b."effectiveTo",'infinity'),'[)');
```

### Agreement target classification

```sql
SELECT id
FROM "FranchiseAgreement"
WHERE "agreementLevel" IS NULL
   OR "purposeCode" IS NULL
   OR num_nonnulls("stateFranchiseId","cityFranchiseId","outletProfileId") <> 1;
```

### Same-purpose agreement overlap

```sql
-- Run independently for each target level.
SELECT a.id, b.id
FROM "FranchiseAgreement" a
JOIN "FranchiseAgreement" b
  ON a."tenantId" = b."tenantId"
 AND a."agreementLevel" = b."agreementLevel"
 AND a."purposeCode" = b."purposeCode"
 AND a."stateFranchiseId" = b."stateFranchiseId"
 AND a.id < b.id
 AND tstzrange(a."effectiveFrom",COALESCE(a."effectiveTo",'infinity'),'[)')
     && tstzrange(b."effectiveFrom",COALESCE(b."effectiveTo",'infinity'),'[)');
```

Equivalent checks are required for City and Outlet targets. Additional checks cover invalid dates, unresolved Territories, agreements without AgreementOutlets under the legacy path, Outlet profiles without valid Branch/Partner, current-pointer mismatch, and supersession cycles.

## Rollback Strategy

- Additive objects remain isolated from legacy settlement.
- Feature/read selector defaults to legacy.
- On reconciliation failure, disable hierarchy reads and preserve new rows for diagnosis.
- Never delete or rewrite legacy Territory, AgreementOutlet, Invoice, Settlement, or commercial snapshots during initial rollout.
- Before any authoritative hierarchy write, restore isolated snapshot or discard rehearsal data.
- After authoritative writes eventually begin, use forward correction from audit history rather than destructive rollback.
- Production rollback requires a separately approved runbook, backup verification, and recovery objective.

## Performance And Lock Review

The dry run records table sizes, index build time, validation duration, lock levels, query plans, and storage growth. Large indexes/constraints should use production-safe PostgreSQL techniques only after DBA review. No concurrency assumption should be based solely on a pre-check query.

## Pending Decision Firewall

Do not enable:

- agreement maker-checker workflow before FH-21;
- layered calculations before FH-09;
- payment direction before FH-10;
- precedence, base, composition, period, tax, or carry behavior before FH-22 through FH-27;
- grace-period use before duration approval;
- Director financial allocation in any franchise path.

## Independent Low-Risk Bugs

Branch context lazy state, Partner active-agreement KPI lazy data, and Overview Branch-versus-Outlet count may be fixed independently with focused tests. They are not migration steps and no code is changed in FH-2.

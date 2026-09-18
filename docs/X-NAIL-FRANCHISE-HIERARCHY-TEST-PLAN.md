# X Nail Franchise Hierarchy Test Plan

**Status:** FH-3 TEST DESIGN - NO TEST CODE
**Scope:** Future FH-4A through FH-4F
**Layered settlement tests:** Excluded pending P2 decisions

## Test Principles

- Tests scale by phase and run before enabling the next capability.
- Tenant isolation and historical immutability are mandatory negative tests.
- Legacy behavior is asserted before and after every additive phase.
- Time tests use fixed UTC timestamps and half-open periods.
- Database-specific CHECK/exclusion behavior requires PostgreSQL integration tests, not mocks alone.
- No test encodes FH-21 or P2 behavior.

## FH-4A Schema And Migration Tests

### Prisma
- schema validates and client generates;
- every relation has correct reverse field and relation name;
- composite tenant/id references compile;
- no existing model/field is dropped or made newly required;
- migration diff contains only authorized additive changes.

### Isolated PostgreSQL
- apply migrations to empty database;
- apply to production-shaped sanitized snapshot;
- rollback/restore rehearsal;
- period CHECK constraints accept open-ended/adjacent periods and reject invalid periods;
- pincode format constraints reject malformed values;
- exclusion constraints reject overlap and accept adjacent periods;
- extension availability/failure path documented;
- legacy row counts and hashes unchanged.

### Migration idempotency
Prisma migrations themselves run once as designed. Mapping/backfill tooling is separately idempotent by batch/key and produces no duplicate assignments or versions when replayed.

## Hierarchy Service Tests

### State Franchise
- create DRAFT whole-State and partial assignments;
- reject missing/wrong-tenant Partner or State;
- reject whole-State versus partial overlap;
- reject intersecting pincode periods;
- allow adjacent/non-overlapping periods;
- allow one Partner multiple State assignments;
- require conflict evidence for approved cross-level condition;
- block end while active City children exist;
- permit end after children resolved;
- prevent hard delete after reference/use.

### City Franchise
- require exactly one same-tenant State parent;
- require canonical City in parent's geographic State;
- support multiple City assignments in one City;
- preserve distinct areaCode identities;
- reject duplicate active pincode coverage;
- allow adjacent periods and non-overlapping pincode sets;
- validate named-area normalization;
- allow one Partner multiple City assignments;
- block end while Outlet assignments remain.

### Outlet Assignment
- require same-tenant Outlet, Branch, Partner, City, and State;
- reject assignment outside parent periods;
- reject zero-length and overlapping assignment periods;
- create first assignment and synchronize pointer;
- transfer closes old and creates successor atomically;
- failed transfer rolls back both rows and pointer;
- transaction-time resolver returns old/new parent at boundary;
- resolver fails closed for zero/multiple matches;
- history cannot be overwritten;
- active Outlet activation fails without assignment;
- non-operational draft/migration exception remains possible.

### Agreement Foundation
- exactly one target accepted after enforcement;
- zero or multiple targets rejected;
- level/target mismatch rejected;
- target/Partner tenant mismatch rejected;
- distinct purposes may overlap;
- same target/purpose overlap rejected, including open-ended;
- adjacent agreement periods allowed;
- successor version links correctly and prevents cycles;
- financially used terms cannot mutate;
- territoryId and AgreementOutlet compatibility retained;
- missing grace duration blocks grace use but not ordinary records;
- no approval workflow expectation pending FH-21.

## Concurrency Tests

Against PostgreSQL:

- two transactions claim the same City pincode period; one succeeds;
- two Outlet transfers at the same timestamp; one succeeds;
- two same-purpose Agreements target the same period; one succeeds;
- whole-State activation races partial coverage; one succeeds;
- deadlock/retry behavior is bounded and observable.

## API And Route Handler Tests

For every State, City, coverage, and Outlet assignment route:

- unauthenticated returns 401;
- authenticated without franchise.read/write returns 403;
- read uses franchise.read;
- mutation uses franchise.write;
- tenant derives from server authorization context;
- client tenantId is rejected/ignored as identity;
- unknown/extra fields rejected;
- invalid UUID/date/status/coverage rejected;
- cross-tenant IDs return fail-closed not-found/forbidden behavior;
- success response excludes internal/audit-sensitive fields;
- historical entities expose no hard DELETE;
- errors do not leak database details.

Compatibility tests ensure existing Territory, Partner, Agreement, Outlet, dashboard, payout, and Settlement route contracts remain unchanged until versioned intentionally.

## RBAC Tests

- existing franchise.read can view State/City/coverage/history;
- existing franchise.write can perform authorized draft/lifecycle operations;
- read cannot mutate;
- settlement permissions remain independent;
- no franchise approval permission exists before FH-21;
- role bootstrap remains idempotent and does not alter unrelated grants.

## Mapping And Import Tests

For every workbook:

- valid template round trip;
- required column/version validation;
- stable ID/code lookup, never display-name-only;
- pincode normalization and canonical lookup;
- duplicate row and duplicate batch handling;
- cross-tenant references rejected;
- ambiguous Territory rejected with actionable error;
- full preview performs no writes;
- any invalid row prevents atomic batch write where required;
- row-level error workbook has no secrets;
- replay is idempotent;
- reviewer/evidence metadata retained.

Financial Agreement import remains restricted to reviewed target metadata and never overwrites termsSnapshot/commercial values.

## Reconciliation Tests

Seed fixtures where Branch count differs from Outlet count and Territory names are ambiguous. Assert:

- legacy and new count metrics reconcile by documented definitions;
- every active Outlet has one valid parent;
- every active City has valid State;
- no tenant mismatch;
- no prohibited coverage or Agreement overlap;
- mapped + unresolved equals baseline population;
- mandatory unresolved reaches zero before hard gate;
- Invoice counts/totals by Branch unchanged;
- Settlement counts/totals/terms snapshots unchanged;
- pointer equals current history assignment;
- Agreement version chains are acyclic/complete.

## Compatibility And Settlement Regression

Run all existing suites:

- franchise-service.test.ts
- franchise-commercial-service.test.ts
- franchise-settlement-service.test.ts
- report-service.test.ts
- apps/web franchise route/payout/overview tests
- settlement-route-handlers.test.ts

Golden fixtures assert the existing path remains Invoice -> Branch -> AgreementOutlet -> Agreement -> Partner -> Settlement. No State/City calculation, payer/payee, precedence, tax, period, share, or carry expectation is added.

## UI Test Plan

- permission-filtered State/City tabs;
- loading, empty, error, and unauthorized states;
- hierarchy drill-down preserves URL/tab state;
- canonical geography and ownership controls remain separate;
- pincode collision errors are keyboard/screen-reader accessible;
- Outlet history shows effective periods and current assignment;
- Territory is visibly labeled legacy during compatibility;
- no action relies only on hover;
- responsive behavior at 375, 768, 1024, 1440, and 1920 px;
- XLSX preview/error/download and exports follow transfer standard.

Avoid brittle full-page snapshots. Test behavior and accessible roles.

## Independent Bug Regression Tests

### Branch context
Open Overview/Partners without opening Branches. Assert header uses authorized loaded count, not “pending”; preserve 401/403 and true-empty behavior.

### Partner Active Agreement KPI
Open Partners without Agreements. Fixture with one active Agreement must show one; unauthorized/error states must not display fabricated zero as loaded data.

### Outlet KPI
Fixture has four Branches and two Outlet Profiles. Overview Outlet KPI must show two while any Branch metric remains four.

These fixes should land in isolated commits before hierarchy UI and are not migration prerequisites.

## Performance And Operational Tests

- explain plans for tenant/state/city/pincode/current-assignment/Agreement resolution indexes;
- page through large Partner/City/Outlet portfolios;
- measure migration index/constraint validation locks;
- measure reconciliation and workbook preview memory;
- verify logs include correlation/batch IDs without PII/secrets;
- verify feature/read selector rollback under load.

## Phase Exit Matrix

| Phase | Required passing gates |
|---|---|
| FH-4A | Prisma, isolated migrations, constraints, all legacy tests |
| FH-4B | hierarchy services, concurrency, tenant isolation |
| FH-4C | API/RBAC/contracts plus legacy compatibility |
| FH-4D | import/mapping/idempotency/reconciliation/rollback |
| FH-4E | UI/accessibility/responsive/transfer |
| FH-4F | full suite, performance, signed reconciliation, rollback rehearsal |

## Explicit Exclusions

No layered settlement tests until FH-09, FH-10, and FH-22 through FH-27 are approved. No maker-checker Agreement tests until FH-21. No assumed grace duration. No Director royalty, payroll, Staff Commission, Company reserve, Director pool, or shareholding tests in this franchise hierarchy suite.

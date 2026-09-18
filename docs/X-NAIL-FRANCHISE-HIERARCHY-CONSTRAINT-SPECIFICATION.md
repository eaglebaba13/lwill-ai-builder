# X Nail Franchise Hierarchy Constraint Specification

**Status:** DESIGN ONLY - NOT APPLIED
**Phase:** FH-2
**Database:** PostgreSQL through Prisma
**Migration authorization:** None

## Constraint Strategy

Use defense in depth:

1. PostgreSQL for foreign keys, uniqueness, row-local checks, and temporal exclusion where operationally supportable.
2. Transactional services for cross-row lifecycle, coverage completeness, current-pointer synchronization, and conflict approval.
3. Reconciliation queries for migration/cutover gates.
4. No destructive cascade for hierarchy history.

Prisma schema cannot express every CHECK or exclusion constraint. Any future implementation must place custom constraints in a reviewed SQL migration and record them in migration tests. The expressions below are conceptual designs, not migration SQL.

## Tenant Consistency

Every tenant-owned target must expose a composite unique key (tenantId, id). Tenant-owned relations use composite FKs:

- CityFranchise(tenantId, stateFranchiseId) -> StateFranchise(tenantId, id)
- State/City partner -> FranchisePartner(tenantId, id)
- Outlet profile -> Branch(tenantId, id)
- Outlet assignment -> OutletProfile and CityFranchise composite keys
- Agreement -> Partner and hierarchy target composite keys
- current City pointer -> CityFranchise(tenantId, id)
- coverage rows -> owning assignment composite key

Canonical geography is global reference data and does not carry tenantId. Services additionally verify that City.stateId equals the StateFranchise.stateId and Pincode.cityId/stateId match the covered City/State.

## Row-Local Checks

Conceptual checks:

```sql
CHECK ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom")
CHECK ("version" >= 1)
CHECK ("graceDurationDays" IS NULL OR "graceDurationDays" >= 0)
CHECK ("coverageMode" <> 'WHOLE_STATE' OR no-inline-coverage-columns-are-set)
CHECK ("value" ~ '^[0-9]{6}$') -- canonical Indian pincode
```

Collection existence, such as a PINCODE_SET State requiring at least one active pincode, cannot be a simple CHECK and is an activation service invariant.

## Agreement Exactly-One Target

After agreement classification and before target columns become mandatory, add this conceptual check:

```sql
CHECK (
  num_nonnulls(
    "stateFranchiseId",
    "cityFranchiseId",
    "outletProfileId"
  ) = 1
)

CHECK (
  ("agreementLevel" = 'STATE'  AND "stateFranchiseId" IS NOT NULL
                               AND "cityFranchiseId" IS NULL
                               AND "outletProfileId" IS NULL)
  OR
  ("agreementLevel" = 'CITY'   AND "stateFranchiseId" IS NULL
                               AND "cityFranchiseId" IS NOT NULL
                               AND "outletProfileId" IS NULL)
  OR
  ("agreementLevel" = 'OUTLET' AND "stateFranchiseId" IS NULL
                               AND "cityFranchiseId" IS NULL
                               AND "outletProfileId" IS NOT NULL)
)
```

During additive backfill, both constraints are initially NOT VALID or omitted until every required agreement is mapped. Existing territoryId remains required for the legacy path until cutover design authorizes otherwise.

## Effective Period Semantics

Use UTC DateTime/TIMESTAMP(3), matching the repository. Periods are half-open: effectiveFrom inclusive, effectiveTo exclusive. Null effectiveTo means infinity. A successor normally starts exactly when its predecessor ends.

Historical ACTIVE/ENDED records are immutable except through a controlled correction command that creates auditable compensating/version records. Do not mutate effectiveFrom, target, Partner, coverage, or termsSnapshot after financial use.

## Agreement Overlap

Conflict key: tenantId + hierarchy target + purposeCode. Same-purpose effective periods may not overlap once an agreement is approved/active under the future lifecycle.

Preferred defense:

- Service starts a serializable transaction or takes a target-purpose advisory lock.
- Service queries overlapping effective ranges and fails closed.
- PostgreSQL exclusion constraints provide a final guard after target classification.
- Open-ended effectiveTo maps to infinity.

Conceptual per-target exclusion:

```sql
EXCLUDE USING gist (
  "tenantId" WITH =,
  "stateFranchiseId" WITH =,
  "purposeCode" WITH =,
  tstzrange("effectiveFrom", COALESCE("effectiveTo", 'infinity'), '[)') WITH &&
) WHERE ("agreementLevel" = 'STATE' AND target_is_enforceable);

-- Equivalent constraints for cityFranchiseId and outletProfileId.
```

This likely requires btree_gist. The implementation review must verify extension policy and managed-database support. If unavailable, retain transactional service validation plus concurrency tests and a reconciliation query; do not claim equivalent DB enforcement.

## State Coverage Overlap

WHOLE_STATE conflicts with every effective State assignment for the same tenant/state. PINCODE_SET conflicts when any canonical pincode is claimed by another effective State assignment in the same tenant/state.

Because whole-state versus pincode rows spans tables, enforce through a locked activation transaction:

1. Validate State and pincode geographic consistency.
2. Lock active/effective assignments for tenant/state.
3. Reject overlap against WHOLE_STATE or intersecting pincode periods.
4. Insert/activate atomically.

Optional DB exclusion on StateFranchisePincode protects pincode-to-pincode conflicts:

```sql
EXCLUDE USING gist (
  "tenantId" WITH =,
  "pincodeId" WITH =,
  tstzrange("effectiveFrom", COALESCE("effectiveTo", 'infinity'), '[)') WITH &&
)
```

## City Coverage Overlap

Pincode is the V1 enforcement unit. For each tenant/city/pincode, effective City coverage may not overlap. CityFranchisePincode effective periods must fit inside the owning CityFranchise and its State parent periods.

Use an exclusion constraint equivalent to the State pincode constraint, keyed by tenantId + pincodeId. Service validation also confirms the pincode belongs to CityFranchise.cityId. Named-area-only overlap cannot be proven; activation requires at least one pincode and treats normalized area names as labels, not boundary evidence.

Multiple CityFranchise rows in the same city remain valid. There is no unique constraint on cityId alone.

## Business Identity And Uniqueness

- StateFranchise PK: immutable id; tenant code unique.
- CityFranchise PK: immutable id.
- City business version uniqueness: tenantId + stateFranchiseId + cityId + areaCode + effectiveFrom.
- Area name uniqueness: tenantId + cityFranchiseId + normalizedName.
- Coverage version uniqueness: owner + pincode + effectiveFrom.
- Outlet Profile retains unique tenantId + branchId.
- Outlet assignment version uniqueness: tenantId + outletProfileId + effectiveFrom.
- Agreement version uniqueness should be tenantId + supersession lineage/version or an immutable agreement-series identifier in implementation review.

Do not use global City uniqueness or tenantId + cityId uniqueness.

## Outlet Activation And Reassignment

Activation transaction requires:

- Outlet Profile, Branch, Outlet Partner, City, State, and tenant all consistent.
- Branch active.
- City and State effective/ACTIVE for the requested start.
- exactly one non-overlapping Outlet assignment for the timestamp.
- currentCityFranchiseId equals the open active assignment.

Reassignment transaction:

1. Lock Outlet Profile and current assignment.
2. Validate transfer time is after old effectiveFrom.
3. End old assignment at transfer time.
4. Insert successor at the same time.
5. Update currentCityFranchiseId.
6. Record transfer reference/audit event.
7. Never modify historical Invoice or Settlement links.

A database trigger could synchronize the current pointer, but the recommended V1 is one transactional service plus reconciliation checks, avoiding hidden trigger behavior. The pointer is a denormalized convenience; assignment history is authoritative.

## Child Lifecycle

State cannot transition to ENDED while an effective ACTIVE/SUSPENDED City child remains unresolved. City cannot transition to ENDED while an effective Outlet assignment remains unresolved. End sequence is children first, then parent, in one controlled workflow. No ON DELETE CASCADE is permitted for hierarchy assignments, coverage, agreements, or Outlet history.

Suspension may block new activation/transactions without rewriting child history. Exact operational behavior during suspension is an application design concern, not a cascade delete.

## Partner And Conflict Approval

Partner remains separate from every assignment. State, City, and Outlet Partners may differ. When the same Partner holds related State and City roles, City activation requires conflictApprovedAt, conflictApprovedBy, and conflictApprovalReference. Approval values must reference an authorized audit actor/evidence under the future implementation.

No automatic commercial inheritance, payer/payee inference, or netting follows from identical Partner IDs.

## Agreement Immutability

Once financially referenced or active/approved:

- target, Partner, purpose, effective dates, commercial columns, and termsSnapshot cannot be edited in place;
- amendment inserts a successor with version + 1 and supersedesAgreementId;
- predecessor effectiveTo aligns with successor effectiveFrom;
- settlements retain agreementId and termsSnapshot.

Unused DRAFT rows may be deleted. The exact agreement approval state machine remains PENDING FH-21; schema implementation must not invent maker-checker semantics.

## Grace Period

FH-16 permits bounded grace but no duration is approved. graceDurationDays is nullable and has no default. Activation/use of a grace state fails unless an explicit positive business value and authority reference exist. Duration is **BUSINESS VALUE REQUIRED**. No 7/15/30-day assumption is allowed.

## Branch And Outlet

Branch is an operational location and may be corporate/non-franchise. FranchiseOutletProfile is optional per Branch and remains unique by tenant/branch. A Branch does not become an Outlet merely because it has Territory. Outlet history references Outlet Profile, not Branch directly.

## Settlement And Reporting Compatibility

Current settlement path remains unchanged and authoritative. Hierarchy constraints must not alter FranchiseAgreementOutlet, Branch.territoryId, Agreement.territoryId, existing commercial terms, or Settlement uniqueness during additive phases.

Compatibility reads should:

- return legacy results unchanged;
- optionally attach mapped State/City labels;
- fail closed for hierarchy-only consumers when mappings are missing;
- never route legacy settlement through unapproved hierarchy cascade logic.

The three current UI/read defects (lazy Branch context, unloaded Partner agreement KPI, Branch-based Outlet count) remain independently fixable under current architecture and are not FH-2 schema changes.

## Pending Decision Firewall

No FH-2 constraint may encode:

- FH-21 agreement approver roles/workflow;
- FH-09 cascade model;
- FH-10 payer/payee direction;
- FH-22 commercial precedence;
- FH-23 calculation/royalty base;
- FH-24 share composition;
- FH-25 settlement periods;
- FH-26 tax/GST/TDS/invoice direction;
- FH-27 negative/carry behavior.

Director royalty/profit allocation is also excluded.

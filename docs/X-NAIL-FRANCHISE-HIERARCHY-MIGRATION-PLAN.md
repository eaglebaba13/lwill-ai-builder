# X Nail Franchise Hierarchy Migration Plan

**Status:** P0 BUSINESS DECISIONS APPROVED - FH-2 SCHEMA DESIGN AUTHORIZED
**Type:** Plan only; no migration or production-data authorization
**Date:** 2026-09-17

## Preconditions

P0 business decisions were approved by Dheeraj Narula, Board of Director, on 2026-09-17. FH-2 schema design is authorized. Migration implementation remains unauthorized and requires technical review after FH-2. Appoint data owner and rollback authority; inventory production franchise records; define reconciliation tolerances; back up and test restore. Existing behavior remains authoritative until cutover acceptance.

## Migration Phases

### Phase A - Parallel foundation
Add approved models and optional compatibility references without behavior changes. Accept when rehearsed and tenant/FK checks pass.

### Phase B - State mapping
Business owners map geography/Partners to approved State assignments. Require evidence, coverage, lifecycle, reviewer, and collision resolution.

### Phase C - City mapping
Create approved City assignments under State parents with canonical city and area coverage. Require parent/tenant integrity and approved overlap/uniqueness checks.

### Phase D - Outlet attachment
Attach current Outlet Profiles while legacy reads continue. Every active Outlet must have exactly one reviewed proposed City parent.

### Phase E - Agreement classification
Classify every Agreement target as State, City, or Outlet with purpose and dates. Never infer target from Territory name. Require one reviewed target and no unresolved overlap.

### Phase F - Compatibility reads
Introduce versioned comparison reads without changing settlement writes. Require parity reports and fail-closed handling of unmapped records.

### Phase G - Validation/reconciliation
Reconcile counts, parentage, portfolios, invoice attribution, agreement coverage, and historical references. Require zero unexplained records, business/finance sign-off, and rollback rehearsal.

### Phase H - Mandatory relationships
Require City parentage for operational Outlets and enforce approved temporal/tenant constraints only after reconciliation.

### Phase I - Legacy retirement
Retire legacy Territory interpretation after an observation period, zero consumers, archived mapping evidence, and explicit approval.

## Manual Mapping Requirement

A Territory such as "Surat City" is geography, not a City Franchise. It cannot identify State holder, City holder, area boundary, agreement target/purpose, commercial relationship, dates, or payer/payee. Branch territory, Partner, Outlet profile, and agreement links may conflict and require adjudication.

Mapping register: legacy ID/type/name, tenant, proposed hierarchy IDs, canonical geography, coverage, Partner role, agreement target/purpose, dates, evidence, mapper, reviewer, status, exception. Ambiguous records remain unmapped and cannot enter hierarchy settlement.

## Compatibility And Rollback

Use additive parallel models, dual-read comparison, feature-controlled consumers, immutable mapping batches, and reconciliation snapshots. Before cutover, rollback disables hierarchy reads and keeps legacy behavior. After authoritative hierarchy writes, recover by forward remediation from audit events, never destructive deletion. Do not switch settlement during backfill.

## Implementation Roadmap

| Phase | Scope | Acceptance criteria |
|---|---|---|
| FH-1 | Business approvals | P0 approved; P1/P2 owners and deadlines recorded |
| FH-2 | Schema foundation | Reviewed migration; typed targets; temporal/tenant constraints |
| FH-3 | Services/validation | Tenant-safe commands; overlap/lifecycle tests; audit events |
| FH-4 | Compatibility API/read model | Versioned responses; parity; unmapped fail-closed |
| FH-5 | Mapping/backfill | Approved register; zero unexplained active Outlets |
| FH-6 | Hierarchy UI | State-City-Outlet views, history, approval-aware actions |
| FH-7 | Reports/exports | Canonical dated counts and attribution reconcile |
| FH-8 | Settlement specification | FH-09/10/22-27 and tax/legal approved |
| FH-9 | Settlement migration | Shadow calculation, finance sign-off, controlled cutover |

## Settlement Boundary

Future trace may be Invoice -> Outlet assignment/agreement -> City/agreement -> State/agreement. Calculations stay BLOCKED pending commercial decisions. Current settlement and historical output remain unchanged.

## Defect Separation

The lazy Branch pending issue, unloaded Partner agreement KPI, and Branch-based Outlet count are safe current-architecture fixes with tests; they are not migration prerequisites. Hierarchy-aware metric definitions wait.

## Risks

Incorrect mapping, ambiguous coverage, overlapping agreements, history loss, mixed semantics, and premature settlement cutover. Mitigate with maker-checker mapping, immutable evidence, constraints, compatibility comparison, explicit gates, backups, and rehearsed rollback.

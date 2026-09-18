# X Nail Franchise Hierarchy Architecture Decision

**Status:** APPROVED FOR FH-2 SCHEMA DESIGN
**Date:** 2026-09-17
**Implementation:** Schema design authorized; migration and application implementation not authorized

## Context

The current flat Territory, Partner, Branch, Outlet Profile, and Agreement model does not represent approved State -> City -> Outlet parentage, area-wise same-city assignments, or independent agreement targets. Geography, legal party, operational location, assignment, and contract must remain distinct.

## Proposed Decision

Tenant contains StateFranchise records (partner, state coverage, lifecycle). Each State contains CityFranchise records (partner, required State parent, city, area coverage, lifecycle). Each City contains FranchiseOutletProfile records (required City parent after migration, Branch, explicit operator/Partner roles, lifecycle). FranchisePartner remains the legal/business party. Branch remains the operational location.

FranchiseAgreement targets exactly one StateFranchise, CityFranchise, or Outlet assignment and is immutable/effective-dated after approval.

## Agreement Target Alternatives

A. Separate nullable target FKs plus agreementLevel enum. Real FKs preserve referential integrity; a PostgreSQL CHECK and service validation enforce exactly one target and enum match. Prisma can model every relation. **Recommended.**

B. targetType plus polymorphic targetId. A normal FK cannot reference three tables, moving integrity into application code and permitting dangling targets. Not recommended.

C. Separate agreement tables. Strong typed FKs but duplicates terms, lifecycle, approvals, queries, and settlement references. Defer unless contracts diverge materially.

Approach A is safest, subject to FH-07/FH-08. Enforce exactly one target, matching level, same tenant, valid dates, and no prohibited target/purpose overlap.

## Coverage

V1 should use canonical State/City references, State coverage mode (whole or approved partial), and City named zone plus normalized pincode collection. Same-city assignments require distinct area codes/coverage. Avoid geometry/PostGIS until demonstrated operational requirements justify it. Overlap behavior is blocked on FH-04.

## Effective Dating And Versioning

Assignments use effectiveFrom, nullable effectiveTo, and status with half-open periods [from,to). Reassignment closes the old assignment and creates a successor; history is never overwritten. Approved/active agreements are immutable. Amendments create linked effective-dated versions. Historical invoice/settlement resolution uses the assignment and agreement valid for target, purpose, and transaction/service date; never latest-row fallback.

## Integrity Constraints

- City State parent required; Outlet City parent required after controlled migration.
- Parent, Partner, Branch, agreement target, and agreement share tenant.
- End follows start; active child periods fit within parent periods.
- Exactly one agreement target; enum and FK agree.
- Active Outlet requires active City parent, subject to FH-15 migration exception.
- No duplicate active assignment or prohibited coverage/agreement overlap.
- Deletion restricted per FH-20.
- Coverage, concurrency, uniqueness, and lifecycle details remain conditional on FH approvals.

## Settlement Impact

Future conceptual resolution is Invoice -> dated Outlet assignment/agreement -> City/agreement -> State/agreement. Calculation and payer/payee behavior are BLOCKED by FH-09, FH-10, and FH-22-FH-27. Existing settlement remains unchanged until controlled migration and reconciliation.

## Current Production Defects

Safe to fix under current architecture with focused tests: Branch context pending from lazy Branch state; Partner active-agreement KPI reading unloaded agreement state; Franchise Overview Outlet KPI using Branch count instead of canonical Outlet Profiles. They do not require hierarchy implementation. Any redefinition by State/City waits.

## Consequences

Typed integrity, legal-party separation, historical correctness, deterministic resolution, and scalable reporting improve. Costs include temporal validation, compatibility reads, and manual mapping. This proposal does not supersede commercial ADRs or approve settlement behavior.

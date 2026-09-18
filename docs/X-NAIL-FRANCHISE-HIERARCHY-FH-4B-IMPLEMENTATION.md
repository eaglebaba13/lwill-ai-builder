# X Nail Franchise Hierarchy FH-4B Domain Service

**Status:** IMPLEMENTED LOCALLY - NOT EXPOSED
**Phase:** FH-4B
**Approval basis:** FH P0 decisions approved by Dheeraj Narula, Board of Director, 2026-09-17

## Responsibilities

The Prisma-backed `franchise-hierarchy-service.ts` provides tenant-scoped State and City Franchise draft management, activation and end-date validation, canonical geography and pincode validation, effective-dated Outlet assignment history, reassignment, and transaction-time hierarchy resolution.

Legacy Territory, Agreement, Agreement Outlet, commercial calculations, settlement calculations, APIs, and UI remain unchanged.

## Conflict Rule

A City Franchise whose Partner is also the Partner of its direct State Franchise parent cannot activate without all three conflict evidence fields. State activation applies the equivalent check when an active City role for the same Partner already exists in that State. This implements FH-03 evidence only; it does not introduce maker-checker workflow.

## Temporal And Coverage Rules

Periods are half-open: `[effectiveFrom, effectiveTo)`. Adjacent periods do not overlap. State coverage supports `WHOLE_STATE` or explicit `PINCODE_SET`; City enforcement uses canonical pincodes while named areas remain descriptive. Multiple assignments in one canonical City remain supported.

Parent end operations fail while effective active children remain. Outlet reassignment end-dates the prior history row, creates a successor, and synchronizes the current pointer in one transaction. History is authoritative.

## Concurrency Strategy

Overlap-sensitive State activation, City activation, Outlet assignment, and Outlet reassignment run in Prisma interactive transactions with PostgreSQL SERIALIZABLE isolation. Expected Prisma P2034 serialization/write conflicts are retried at most three times. Retry exhaustion becomes the deterministic CONCURRENT_WRITE hierarchy error; Prisma details are not exposed through compatibility APIs.

Focused mock-level tests verify the requested isolation option, bounded retry path, deterministic conflict mapping, and that competing City activation and Outlet assignment calls cannot both succeed under simulated serialization conflicts. These tests do not prove real PostgreSQL scheduling behavior. PostgreSQL integration verification remains required before production activation. Database exclusion constraints and row/advisory locks remain absent and require separate authorization.

## Deferred

- FH-4C compatibility APIs and RBAC exposure.
- Production migration, mapping, seed, or backfill.
- Database exclusion constraints and extension review.
- Agreement hierarchy targets and FH-21 workflow.
- FH-09, FH-10, and FH-22 through FH-27 commercial decisions.
- Grace duration remains **BUSINESS VALUE REQUIRED**.

# X Nail Franchise Hierarchy FH-4D Implementation

**Status:** Mapping and dry-run tooling implemented locally
**Production migration/backfill authorization:** None

## Scope

FH-4D adds internal server-side workbook and preview tooling only. It does not expose an HTTP endpoint, access Prisma directly, write hierarchy records, modify Agreements, apply migrations, seed data, or change settlement/commercial behavior.

## Mapping format

Template version 1 is a genuine XLSX workbook with an Instructions sheet and deterministic sheets:

- State Mapping: workbook mapping key, legacy Territory, canonical State, Partner, coverage mode, effective period, and notes.
- City Mapping: workbook mapping key, legacy Territory, parent State mapping key, canonical City, Partner, effective period, and notes.
- Coverage: City mapping key, named area, and normalized six-digit pincode.
- Outlet Mapping: Outlet Profile, Branch, City mapping key, effective period, and notes.
- Agreement Classification: Agreement, proposed level and target mapping key, purpose code, effective period, and notes.

Formula cells are rejected and never evaluated. Files must be XLSX, no larger than 5 MB, with at most 1000 rows per mapping sheet. Template version, exact headers, required cells, UUIDs, ISO timestamps, duplicate keys, and cross-sheet references are validated.

## Preview behavior

The preview accepts an immutable tenant-scoped reference snapshot. It returns typed row results with VALID, WARNING, ERROR, or AMBIGUOUS status, messages, and resolved references.

Validation covers tenant ownership, legacy Territory and Partner existence, canonical State/City/pincode relationships, parent-period containment, State and City coverage conflicts, duplicate pincode ownership, Outlet/Branch identity, Outlet assignment overlap, and Agreement classification evidence. Territory names are never used as authoritative mapping evidence.

State coverage validation compares proposed rows with both existing State hierarchy and every other proposed State row using half-open periods and WHOLE_STATE/PINCODE_SET semantics. City coverage validation compares proposed rows with both proposed peers and existingCityFranchises by overlapping effective period and shared canonical pincode. Same-city assignments with distinct pincode coverage remain valid.

Agreement processing is classification only. Results use DETERMINISTIC, AMBIGUOUS, UNMAPPABLE, or BUSINESS REVIEW REQUIRED. Agreement, terms, commercial values, settlement values, invoices, payments, royalty, tax, and commission are never changed.

## Reconciliation and gates

Read-only reconciliation reports legacy and proposed counts, mapped/unmapped/ambiguous/invalid results, and unchanged financial reference counts. Genuine XLSX and PDF exports are available and spreadsheet text is formula-escaped.

Hierarchy backfill is blocked by active unmapped Outlets or invalid hierarchy rows. Future Agreement migration blockers are reported separately, so unresolved Agreement classification does not falsely authorize or execute hierarchy writes.

## Non-mutation guarantee

The module has no database client, writer callback, commit function, API route, background task, or startup hook. Preview returns mutationCount 0. Focused tests verify input reference data remains unchanged and no commit surface exists.

## Files

- apps/web/src/lib/crm/franchise-hierarchy-mapping.ts
- apps/web/src/test/franchise-hierarchy-mapping.test.ts
- docs/X-NAIL-FRANCHISE-HIERARCHY-FH-4D-IMPLEMENTATION.md

No dependencies were added. schema.prisma and the FH-4A migration were not changed by FH-4D.

## Remaining review

Actual production-shaped mapping workbooks have not been supplied or reviewed. FH-21, FH-09, FH-10, FH-22 through FH-27, and grace duration remain pending. No production migration, backfill, hierarchy cutover, Agreement migration, or settlement change is authorized.

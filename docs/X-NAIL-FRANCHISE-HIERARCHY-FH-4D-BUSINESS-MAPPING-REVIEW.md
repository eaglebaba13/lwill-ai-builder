# X Nail Franchise Hierarchy FH-4D-B Business Mapping Review

**Gate:** DATA REQUIRED
**Prepared:** 2026-09-17
**Production access:** Not authorized and not attempted

## Data source assessment

- Source type: none available
- Environment: local repository only
- Database/schema: not connected
- Read-only status: no connection configured
- Connection method: none
- Production: no
- Authorization: production read access was not supplied
- Dataset date/time: unavailable

The environment had no DATABASE_URL and no environment file or approved local/dev snapshot. No database connection was attempted and no credentials were read or printed.

## Required extraction package

Supply an approved, tenant-scoped, read-only production-shaped snapshot containing only:

- Territory: id, name, code, isActive
- FranchisePartner: id, name, isActive, approved non-sensitive business identifiers needed for review
- FranchiseOutletProfile: id, partnerId, branchId, territoryId, outletType, isActive
- Branch: id, name, slug, territoryId, businessUnitId, isActive
- FranchiseAgreement: id, partnerId, territoryId, startDate, endDate, effectiveFrom, effectiveTo, isActive
- FranchiseAgreementOutlet: agreementId, branchId
- Canonical geography: State ID/code, City ID/code/stateId, Pincode ID/value/cityId/stateId
- Existing hierarchy records, if the isolated snapshot includes FH-4A: IDs, tenant-safe references, coverage, and effective periods only
- Read-only Invoice, Settlement, and Payment counts only; no financial values are required

Exclude customers, authentication records, payroll, personal credentials, payment details, and unrelated tenant data.

## Review package

The internal generator creates a genuine XLSX with:

1. Instructions
2. State Mapping
3. City Mapping
4. Coverage
5. Outlet Mapping
6. Agreement Classification
7. Issues - Review Queue
8. Reconciliation Summary

The mapping sheets include evidence, status, approval, approver authority/date, and review-note fields. No approval is preselected. The blank package is explicitly labeled DATA REQUIRED.

When a dry-run preview is supplied, all five mapping sheets are populated from its source IDs, mapping keys, resolved references, validation status, errors/warnings, and Agreement classification. Evidence absent from the preview contract remains blank and is never inferred. User-controlled text remains formula-escaped. The existing package/template version remains 1 because headers and workbook compatibility are unchanged.

The PDF summary likewise reports DATA REQUIRED when no preview exists. Spreadsheet exports use formula-safe text handling and contain no formulas.

## Review queue and gates

Invalid, ambiguous, and warning rows remain unresolved. Queue status is PENDING BUSINESS REVIEW or NEEDS DATA; the generator never assigns APPROVED.

The hierarchy zero-condition reports:

- active Outlet without City
- City without State
- tenant errors
- geography errors
- coverage overlaps
- Outlet overlaps
- effective-period errors
- mandatory hierarchy mapping errors

Agreement ambiguity is reported separately and does not by itself fail an otherwise clean hierarchy-foundation gate.

## Mapping totals

All production-shaped totals are unknown because no authorized dataset was available. No deterministic, pending, ambiguous, invalid, approved, rejected, mapped, or unmapped production records are claimed.

## Approval metadata

No mapping approval was supplied. Every future populated mapping remains PENDING BUSINESS REVIEW until approver, role/authority, date, mapping IDs, evidence, and notes are explicitly recorded.

## Non-mutation result

No database was connected. No StateFranchise, CityFranchise, FranchiseOutletAssignment, FranchiseAgreement, or currentCityFranchiseId record was read or changed. Review functions accept immutable in-memory preview data and expose no writer, endpoint, startup task, or background worker.

## Restrictions

No production migration, production write, backfill, cutover, Agreement migration, settlement change, commercial cascade, API, UI, staging, commit, push, or deployment is authorized by FH-4D-B.

FH-21, FH-09, FH-10, FH-22 through FH-27, and grace duration remain pending.

# X Nail Data Transfer Capability Matrix

Status values: **YES** = implemented in the current repository, **NO** = intentionally unsupported, **PLANNED** = applicable but not yet implemented, **NOT APPLICABLE** = bulk data transfer does not fit the current module.

Billing financial-record imports are explicitly excluded from the current implementation. Invoice creation must continue through the authorized invoice service because it owns validation, totals, tax inputs, line items, branch attribution, audit logging, and inventory side effects.

| Module | Import | Template | Excel | PDF | Notes |
|---|---|---|---|---|---|
| Overview | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | PLANNED | Dashboard summary export may be considered as a report, not an import. |
| Customers | PLANNED | PLANNED | PLANNED | PLANNED | Customer master data is a candidate for validated create-only import. |
| Leads | PLANNED | PLANNED | PLANNED | PLANNED | Candidate for validated create-only import using CRM services. |
| Pipeline | NO | NO | PLANNED | PLANNED | Pipeline structure and opportunity transitions should not be bulk-overwritten. |
| Follow-ups | PLANNED | PLANNED | PLANNED | PLANNED | Import requires explicit create-only rules and row validation. |
| Communications | NO | NO | PLANNED | PLANNED | Export-only audit/history surface; import could misrepresent interactions. |
| Tags & Notes | PLANNED | PLANNED | PLANNED | PLANNED | Tags may support create-only import; notes and attachments need separate rules. |
| Services | PLANNED | PLANNED | PLANNED | PLANNED | Service master data is suitable after uniqueness and money-unit rules are approved. |
| Packages | PLANNED | PLANNED | PLANNED | PLANNED | Import must validate service composition through package domain services. |
| Memberships | PLANNED | PLANNED | PLANNED | PLANNED | Import requires customer/package resolution and lifecycle validation. |
| Inventory | YES | YES | YES | YES | Product master is atomic create-only import. Stock balances, movements, transfers, and adjustments remain transactional and are not imported. |
| Purchases | NO | NO | YES | YES | Purchase receipts create stock movements inside a transaction; spreadsheet import/template is intentionally unsupported. |
| Staff | PLANNED | PLANNED | PLANNED | PLANNED | Staff master import requires branch and identity validation. |
| Attendance | NO | NO | PLANNED | PLANNED | Attendance is high-risk operational history and remains export-only. |
| Appointments | PLANNED | PLANNED | PLANNED | PLANNED | Import requires timezone, customer, service, staff, and branch validation. |
| Billing | NO | NO | YES | YES | Invoice and payment registers export as genuine XLSX/PDF. Financial import requires separate approval. |
| Branches | PLANNED | PLANNED | PLANNED | PLANNED | Import requires business-unit hierarchy and slug/tenant validation. |
| Reports | NOT APPLICABLE | NOT APPLICABLE | PLANNED | PLANNED | Report outputs are export-only. |
| Settings | NO | NO | PLANNED | PLANNED | Export only where non-sensitive and meaningful; bulk settings import is unsafe by default. |
| Notifications | NO | NO | PLANNED | PLANNED | Notification history/configuration is export-only pending field-level security review. |
| Users & Access | NO | NO | PLANNED | PLANNED | Export requires sensitive-field controls; role assignments are not bulk-importable by default. |
| Gateway Accounts | NO | NO | NO | PLANNED | Secret-bearing gateway configuration must never be spreadsheet-exported. Sanitized audit PDF may be considered. |
| Marketplace | NO | NO | PLANNED | PLANNED | Installation/audit data may be exported; package installation is not a data import. |
| Franchise Overview | NOT APPLICABLE | NOT APPLICABLE | PLANNED | PLANNED | Aggregated report export only. |
| Financials | NO | NO | PLANNED | PLANNED | Generated financial records remain export-only. |
| Territories | PLANNED | PLANNED | PLANNED | PLANNED | Master-data import requires approved uniqueness and hierarchy rules. |
| Partners | PLANNED | PLANNED | PLANNED | PLANNED | Import requires identity, tenant, and contractual validation. |
| Agreements | NO | NO | PLANNED | PLANNED | Legal/commercial records remain export-only. |
| Outlets | PLANNED | PLANNED | PLANNED | PLANNED | Import requires validated branch, partner, and agreement relationships. |
| Franchise Settlement | NO | NO | PLANNED | PLANNED | Generated financial settlement records remain export-only. |

## Current Billing Export Contract

- Routes: `GET /api/exports/billing/invoices/xlsx`, `GET /api/exports/billing/invoices/pdf`, `GET /api/exports/billing/payments/xlsx`, and `GET /api/exports/billing/payments/pdf`.
- Authorization: `invoice.read` through the existing server authentication and authorization boundary.
- Scope: invoices are loaded through the tenant-scoped invoice service; payments are loaded only for those authorized invoices.
- XLSX: generated server-side with explicit columns, date formats, INR money formats, frozen headers, and spreadsheet formula-trigger escaping.
- PDF: generated server-side as valid paginated PDF documents with restrained X Nail branding.
- Cache policy: private, no-store, with attachment disposition and `nosniff`.
- Invoice detail PDF: **PLANNED**. The current invoice read service does not return line items, so a complete invoice-detail document cannot yet be produced without an approved read-contract extension.
- Filters: the current Billing register has no user-controlled filters or pagination. Exports therefore match the full authorized tenant scope currently exposed by the register.

## Current Inventory And Purchasing Transfer Contract

- Routes: `GET /api/imports/inventory/template`, `POST /api/imports/inventory/preview`, `POST /api/imports/inventory/commit`, plus `GET /api/exports/inventory/{inventory|purchases}/{xlsx|pdf}`.
- Authorization: product template, preview, and commit require `product.write`; product exports require `product.read`; purchase exports require `purchaseReceipt.read`.
- Product import: **CREATE ONLY** and atomic whole-file. The server re-parses and revalidates the workbook on confirmation, then invokes the existing product domain service inside one database transaction.
- Template: version 1, `Products` worksheet, column-name parsing, 5 MB file limit, and 500-row limit. Supported fields match the current schema: category ID, product name, SKU, unit, selling price, and active state.
- Validation: unsupported versions, missing/duplicate/unknown headers, formulas, malformed money, invalid active values, unauthorized category IDs, existing tenant SKU conflicts, and workbook SKU duplicates are rejected with row-level issues.
- Stock boundary: the current product schema has no barcode or cost field. Quantities belong to branch-scoped stock records and are therefore excluded from product-master import.
- Purchase boundary: receipt import/template is **NO** because receipt creation atomically records stock-in movements. Purchase XLSX/PDF are authorized register exports only.
- Scope: current product, stock, branch, and purchase services are tenant-scoped. No broader client-provided tenant or branch identity is trusted by transfer routes.
- Output security: genuine XLSX/PDF is generated server-side with formula-trigger escaping, sanitized attachment names, private `no-store`, and `nosniff`.
- Filters: the current Inventory workspace exposes no persisted server-side filter contract; exports match the full authorized tenant scope exposed by the existing list services.
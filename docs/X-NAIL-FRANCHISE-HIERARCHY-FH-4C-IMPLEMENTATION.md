# X Nail Franchise Hierarchy FH-4C Implementation

## Scope

FH-4C adds a compatibility HTTP API over the FH-4B franchise hierarchy domain service. The implementation is additive and limited to API route adapters, request validation, response projection, and focused tests.

It does not change the Prisma schema, migration history, tenant model, hierarchy rules, settlement or commercial targets, authentication contracts, or authorization contracts. It does not apply the pending FH-4A migration or perform a production data backfill.

## API surface

The compatibility routes are under /api/franchise/hierarchy and expose:

- State franchise list, create, read, update, activate, and end operations.
- City franchise list, create, read, update, activate, and end operations.
- Outlet assignment history, assignment creation, current assignment lookup, reassignment, and point-in-time resolution.

The routes call the FH-4B service rather than querying or mutating hierarchy tables directly. Geography remains an identifier supplied to validated service operations; FH-4C does not add a separate geography mutation or lookup API because no approved FH-4B geography service boundary exists.

## Security and validation

- Tenant identity is derived from the authenticated server context and is never accepted from request payloads.
- Read operations require franchise.read; mutation operations require franchise.write.
- Request bodies reject unexpected fields, including tenantId.
- Route identifiers are validated as UUIDs and timestamps require explicit ISO date-time values.
- Responses expose compatibility-safe hierarchy fields and omit tenant and internal audit data.
- Domain validation and conflict errors map to stable HTTP status categories without exposing internal server details.
- Exhausted hierarchy serialization retries map to deterministic HTTP 409 CONCURRENT_WRITE responses.
- Runtime adapters use explicit FH service input types; no as-never casts remain.

## Files introduced

- apps/web/src/lib/crm/franchise-hierarchy-route-handlers.ts
- apps/web/src/lib/crm/franchise-hierarchy-runtime.ts
- Route modules under apps/web/src/app/api/franchise/hierarchy/
- apps/web/src/test/franchise-hierarchy-route-handlers.test.ts

## Verification

Focused FH-4C route-handler tests, FH-4B service tests, and existing franchise commercial and settlement regression tests were added to the verification sequence. Full repository verification results are reported in the task handover.

## Remaining work

The FH-4A database migration remains unapplied. Production migration, data backfill, UI integration, and any broader tenant-code migration remain separate explicitly approved work.
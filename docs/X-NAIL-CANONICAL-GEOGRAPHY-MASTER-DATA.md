# Canonical Geography Master Data

## Overview

The Canonical Geography Master Data is **LWILL global master data** (no `tenantId`). It provides a shared reference for Country → State → City → Pincode hierarchy that all tenants (including X Nail) consume.

**Initial supported country:** India (ISO 3166-1 alpha-2: `IN`, alpha-3: `IND`)

## Data Model (Prisma)

```prisma
model GeoCountry {
  code   String     @id @db.Char(2)
  name   String
  states GeoState[]
}

model GeoState {
  id              String           @id @default(uuid()) @db.Uuid
  countryCode     String           @db.Char(2)
  code            String
  name            String
  country         GeoCountry       @relation(fields: [countryCode], references: [code], onDelete: Restrict)
  cities          GeoCity[]
  pincodes        GeoPincode[]
  stateFranchises StateFranchise[]

  @@unique([countryCode, code])
}

model GeoCity {
  id             String          @id @default(uuid()) @db.Uuid
  stateId        String          @db.Uuid
  code           String
  name           String
  state          GeoState        @relation(fields: [stateId], references: [id], onDelete: Restrict)
  pincodes       GeoPincode[]
  cityFranchises CityFranchise[]

  @@unique([stateId, id])
  @@unique([stateId, code])
  @@index([stateId, name])
}

model GeoPincode {
  id                     String                  @id @default(uuid()) @db.Uuid
  stateId                String                  @db.Uuid
  cityId                 String                  @db.Uuid
  value                  String                  @db.Char(6)
  state                  GeoState                @relation(fields: [stateId], references: [id], onDelete: Restrict)
  city                   GeoCity                 @relation(fields: [stateId, cityId], references: [stateId, id], onDelete: Restrict)
  stateFranchisePincodes StateFranchisePincode[]
  cityFranchisePincodes  CityFranchisePincode[]

  @@unique([value])
  @@index([cityId, value])
}
```

**Key constraints:**
- `GeoCountry.code` = ISO 3166-1 alpha-2 (2 chars)
- `GeoState.code` = stable source code (Census 2011 2-letter code), unique per country
- `GeoCity.code` = stable source code (Census 2011 location code), unique per state
- `GeoPincode.value` = 6-digit ASCII numeric string, globally unique
- No `tenantId` on any geography model — global reference data

## Authoritative Data Sources

| Layer | Source | Version | Reference |
|-------|--------|---------|-----------|
| Country | ISO 3166-1 | 2024 | https://www.iso.org/obp/ui/#iso:code:3166:IN |
| States/UTs | Census 2011 Location Code Directory (PC11_TV_DIR) | 2011 (current admin boundaries as of 2024) | https://censusindia.gov.in/census.website/data/census-tables |
| Cities | Census 2011 Location Code Directory (PC11_TV_DIR) | 2011 | https://censusindia.gov.in/census.website/data/census-tables |
| Pincodes | All India Pincode Directory / Department of Posts / data.gov.in | 2024 monthly update | https://data.gov.in/resource/all-india-pincode-directory |

## Data Artifacts

Stored in repository at `data/geography/india/`:

| File | Description |
|------|-------------|
| `METADATA.json` | Source metadata, versions, notes |
| `COUNTRY.json` | India country record |
| `STATES.json` | 36 States/UTs with Census 2011 codes |
| `CITIES.json` | Representative cities with stateCode + city code |
| `PINCODES.json` | Representative pincodes with stateCode + cityCode + 6-digit value |

**Note:** These are snapshot files. Full datasets (~4,000 cities, ~19,000 pincodes) should be obtained from official sources for production import.

## Normalization Rules

1. **Country code**: ISO 3166-1 alpha-2 (uppercase, 2 chars)
2. **State code**: Census 2011 2-letter code (uppercase), preserved as-is
3. **City code**: Census 2011 location code (2-4 uppercase letters), preserved as-is
4. **Pincode**: Exactly 6 ASCII digits (`/^[0-9]{6}$/`)
5. **Names**: Trimmed, non-empty
6. **Relationships**: State → Country, City → State, Pincode → State + City must exist

## Import Command

```bash
# From repository root
pnpm --filter authentication-context-prisma bootstrap:geography
```

This runs `packages/authentication-context-prisma/src/geography-bootstrap-cli.ts` which:
1. Loads JSON data from `data/geography/india/`
2. Validates all records
3. Upserts in transaction: Country → States → Cities → Pincodes
4. Reports created/skipped counts
5. Is idempotent — rerunning produces same result

## Validation Rules (Enforced at Import)

| Check | Error Behavior |
|-------|----------------|
| ISO country code format (2 uppercase letters) | Fail |
| State code format (2 uppercase letters) | Fail |
| Required names non-empty | Fail |
| State → Country relationship exists | Fail |
| City → State relationship exists | Fail |
| Pincode format (6 digits) | Fail |
| Duplicate source codes (country/state/city) | Skip (idempotent) |
| Duplicate pincode value | Skip (unique constraint) |
| Orphan city (missing state) | Fail |
| Orphan pincode (missing city/state) | Fail |

## API Access

```
GET /api/franchise/hierarchy/geography
```

Returns:
```json
{
  "states": [{ "id", "code", "name", "countryCode" }],
  "cities": [{ "id", "code", "name", "stateId" }],
  "pincodes": [{ "id", "value", "stateId", "cityId" }]
}
```

- **Authentication required** (401 if unauthenticated)
- **No tenant filtering** — global data
- **Limit: 500 records** per type (pagination/search needed for full dataset)
- UI should implement: State selection → filtered City selection

## Production Bootstrap Procedure

1. **Implement & test locally** (done)
2. **Verify counts** match expectations
3. **Commit & push** code changes
4. **Deploy via Coolify**
5. **Execute production bootstrap** (run once):
   ```bash
   pnpm --filter authentication-context-prisma bootstrap:geography
   ```
6. **Verify API** returns data
7. **Monitor** for any import errors

## Update Procedure

1. Obtain updated official source data
2. Update JSON files in `data/geography/india/` with new version/date
3. Commit data changes
4. Run import command (idempotent — only new/changed records added)
5. Verify counts

## Rollback/Recovery

- **No automatic rollback** — geography data is append-only reference data
- If corruption: truncate tables and re-run bootstrap (idempotent)
- Backup: `pg_dump` geography tables before major updates

## Adding Future Countries

1. Add new country JSON to `data/geography/{ISO_CODE}/`
2. Follow same structure: `METADATA.json`, `COUNTRY.json`, `STATES.json`, `CITIES.json`, `PINCODES.json`
3. Use ISO 3166-1 alpha-2 for country code
4. Use official national sources for state/city/pincode codes
5. Run bootstrap — multi-country supported by schema

## Files Changed (This Implementation)

| File | Purpose |
|------|---------|
| `data/geography/india/METADATA.json` | Source metadata & versions |
| `data/geography/india/COUNTRY.json` | India country record |
| `data/geography/india/STATES.json` | 36 States/UTs |
| `data/geography/india/CITIES.json` | Representative cities |
| `data/geography/india/PINCODES.json` | Representative pincodes |
| `packages/authentication-context-prisma/src/geography-bootstrap.ts` | Core bootstrap logic |
| `packages/authentication-context-prisma/src/geography-bootstrap-cli.ts` | CLI entry point |
| `packages/authentication-context-prisma/src/geography-bootstrap.test.ts` | 11 unit tests |
| `packages/authentication-context-prisma/package.json` | Added `bootstrap:geography` script |

## Test Results

```
Test Files  91 passed (91)
Tests       884 passed (884)
```

Including 11 geography-specific tests covering:
- India bootstrap creation
- Idempotent rerun
- Invalid pincode rejection
- Orphan city/pincode rejection
- Invalid code format rejection
- Missing relationship rejection
- Duplicate pincode skip (unique constraint)
- Source code stability
- Empty input handling

## Current Counts (Sample Data)

| Entity | Count |
|--------|-------|
| Countries | 1 (India) |
| States/UTs | 36 |
| Cities | 70 (representative sample) |
| Pincodes | 29 (representative sample) |

**Full production dataset:** ~36 states, ~4,000 cities, ~19,000 pincodes

## Remaining Production Step

After code deployment via Coolify, execute:
```bash
pnpm --filter authentication-context-prisma bootstrap:geography
```

This will populate the production database with India geography master data.
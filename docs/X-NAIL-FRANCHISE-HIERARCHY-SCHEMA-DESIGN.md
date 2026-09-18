# X Nail Franchise Hierarchy Schema Design

**Status:** DESIGN ONLY - NOT APPLIED
**Phase:** FH-2
**Approval basis:** 21/21 P0 decisions approved by Dheeraj Narula, Board of Director, 2026-09-17
**Implementation authorization:** None

## Scope And Boundaries

This document specifies the proposed Prisma design. It does not modify schema.prisma, create a migration, authorize production data changes, or change settlement behavior. FH-21 and FH-09, FH-10, FH-22 through FH-27 remain pending. Director profit distribution is a separate Company Ownership/Profit Allocation domain.

## Current Model Inventory

| Model | Current identity and tenant key | Relations and constraints | Lifecycle / settlement use |
|---|---|---|---|
| Tenant | UUID PK | Owns all franchise rows | isActive; tenant boundary root |
| BusinessUnit | UUID PK; tenantId | composite tenant/id and tenant/slug uniqueness; has Branches | isActive; no franchise settlement role |
| Branch | UUID PK; tenantId; businessUnitId | composite tenant FKs; optional Territory; Outlet Profiles and Agreement Outlets | isActive; Invoice source and current settlement join |
| Territory | UUID PK; tenantId | unique tenant/name; Branches, Outlet Profiles, Agreements | isActive; flat geography and current royalty/report scope |
| FranchisePartner | UUID PK; tenantId | optional globally unique userId; Outlet Profiles, Agreements, Settlements | isActive; legal/business party |
| FranchiseOutletProfile | UUID PK; tenantId | required Partner and Branch; optional Territory; unique tenant/branch | isActive; current Outlet/profile identity |
| FranchiseAgreement | UUID PK; tenantId | required Partner and Territory; Agreement Outlets and Settlements | start/end, isActive, effective dates, termsSnapshot |
| FranchiseAgreementOutlet | UUID PK; tenantId | Agreement-to-Branch junction; unique agreement/branch | current Invoice -> Branch -> Agreement path |
| FranchiseSettlement | UUID PK; tenantId | Agreement and Partner; unique agreement/period | current calculated/approved financial record |
| FranchiseSettlementLine | UUID PK; tenantId | belongs to Settlement | settlement detail; cascade only from Settlement |
| FranchisePayment | UUID PK; tenantId | belongs to Settlement | payment state; current settlement domain |

Current deletion behavior is mostly Restrict; AgreementOutlet and SettlementLine use Cascade from owning aggregate. No current hierarchy model, temporal Outlet parent history, exactly-one agreement target, or overlap constraint exists.

## Design Principles

- Geography, assignment, Partner, Branch, and agreement are separate.
- IDs are immutable UUID identities; display names are not identities.
- Every tenant-owned relation uses composite tenantId/id references where feasible.
- Effective periods use half-open timestamps: [effectiveFrom, effectiveTo).
- Active history is end-dated, never overwritten.
- Initial rollout is additive. Legacy Territory and settlement paths remain authoritative until controlled cutover.
- Database constraints protect row-local and temporal invariants; services protect cross-aggregate workflow.

## Proposed Enums

```prisma
enum FranchiseAssignmentStatus {
  DRAFT
  ACTIVE
  SUSPENDED
  ENDED
}

enum FranchiseCoverageMode {
  WHOLE_STATE
  PINCODE_SET
}

enum FranchiseAgreementLevel {
  STATE
  CITY
  OUTLET
}
```

Agreement purpose remains a required normalized String code in FH-2 because FH-07 requires distinct purposes but the purpose taxonomy is not approved. Agreement approval workflow/status remains PENDING FH-21.

## Minimum Canonical Geography

Use compact reference tables rather than GIS. Country uses ISO-3166 alpha-2; State and City use stable source codes; Pincode is normalized to six ASCII digits for India.

```prisma
model GeoCountry {
  code      String @id @db.Char(2)
  name      String
  states    GeoState[]
}

model GeoState {
  id          String @id @default(uuid()) @db.Uuid
  countryCode String @db.Char(2)
  code        String
  name        String
  country     GeoCountry @relation(fields: [countryCode], references: [code], onDelete: Restrict)
  cities      GeoCity[]
  pincodes    GeoPincode[]
  @@unique([countryCode, code])
}

model GeoCity {
  id       String @id @default(uuid()) @db.Uuid
  stateId  String @db.Uuid
  code     String
  name     String
  state    GeoState @relation(fields: [stateId], references: [id], onDelete: Restrict)
  pincodes GeoPincode[]
  @@unique([stateId, code])
  @@index([stateId, name])
}

model GeoPincode {
  id      String @id @default(uuid()) @db.Uuid
  stateId String @db.Uuid
  cityId  String @db.Uuid
  value   String @db.Char(6)
  state   GeoState @relation(fields: [stateId], references: [id], onDelete: Restrict)
  city    GeoCity @relation(fields: [cityId], references: [id], onDelete: Restrict)
  @@unique([value])
  @@index([cityId, value])
}
```

A migration must validate pincode format and City-State consistency. No polygon/PostGIS field is proposed.

## State Franchise

```prisma
model StateFranchise {
  id          String @id @default(uuid()) @db.Uuid
  tenantId    String @db.Uuid
  partnerId   String @db.Uuid
  stateId     String @db.Uuid
  code        String
  displayName String
  coverageMode FranchiseCoverageMode
  effectiveFrom DateTime
  effectiveTo DateTime?
  status      FranchiseAssignmentStatus @default(DRAFT)
  conflictApprovedAt DateTime?
  conflictApprovedBy String?
  conflictApprovalReference String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant  Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  partner FranchisePartner @relation(fields: [tenantId, partnerId], references: [tenantId, id], onDelete: Restrict)
  state   GeoState @relation(fields: [stateId], references: [id], onDelete: Restrict)
  cities  CityFranchise[]
  pincodes StateFranchisePincode[]

  @@unique([tenantId, id])
  @@unique([tenantId, code])
  @@index([tenantId, stateId, status])
  @@index([tenantId, partnerId, status])
  @@index([tenantId, effectiveFrom, effectiveTo])
}

model StateFranchisePincode {
  id String @id @default(uuid()) @db.Uuid
  tenantId String @db.Uuid
  stateFranchiseId String @db.Uuid
  pincodeId String @db.Uuid
  effectiveFrom DateTime
  effectiveTo DateTime?
  stateFranchise StateFranchise @relation(fields: [tenantId, stateFranchiseId], references: [tenantId, id], onDelete: Restrict)
  pincode GeoPincode @relation(fields: [pincodeId], references: [id], onDelete: Restrict)
  @@unique([tenantId, stateFranchiseId, pincodeId, effectiveFrom])
  @@index([tenantId, pincodeId, effectiveFrom, effectiveTo])
}
```

WHOLE_STATE rows have no pincode coverage rows. PINCODE_SET rows require at least one pincode, enforced by activation service validation. Overlap is prohibited for the same tenant/state/pincode/effective period. Whole-state coverage conflicts with every overlapping assignment for that state.

## City Franchise And Coverage

```prisma
model CityFranchise {
  id String @id @default(uuid()) @db.Uuid
  tenantId String @db.Uuid
  stateFranchiseId String @db.Uuid
  partnerId String @db.Uuid
  cityId String @db.Uuid
  areaCode String
  displayName String
  effectiveFrom DateTime
  effectiveTo DateTime?
  status FranchiseAssignmentStatus @default(DRAFT)
  conflictApprovedAt DateTime?
  conflictApprovedBy String?
  conflictApprovalReference String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  stateFranchise StateFranchise @relation(fields: [tenantId, stateFranchiseId], references: [tenantId, id], onDelete: Restrict)
  partner FranchisePartner @relation(fields: [tenantId, partnerId], references: [tenantId, id], onDelete: Restrict)
  city GeoCity @relation(fields: [cityId], references: [id], onDelete: Restrict)
  areas CityFranchiseArea[]
  pincodes CityFranchisePincode[]
  outletAssignments FranchiseOutletAssignment[]

  @@unique([tenantId, id])
  @@unique([tenantId, stateFranchiseId, cityId, areaCode, effectiveFrom])
  @@index([tenantId, cityId, status])
  @@index([tenantId, stateFranchiseId, status])
  @@index([tenantId, partnerId, status])
  @@index([tenantId, effectiveFrom, effectiveTo])
}

model CityFranchiseArea {
  id String @id @default(uuid()) @db.Uuid
  tenantId String @db.Uuid
  cityFranchiseId String @db.Uuid
  name String
  normalizedName String
  cityFranchise CityFranchise @relation(fields: [tenantId, cityFranchiseId], references: [tenantId, id], onDelete: Restrict)
  @@unique([tenantId, id])
  @@unique([tenantId, cityFranchiseId, normalizedName])
}

model CityFranchisePincode {
  id String @id @default(uuid()) @db.Uuid
  tenantId String @db.Uuid
  cityFranchiseId String @db.Uuid
  areaId String? @db.Uuid
  pincodeId String @db.Uuid
  effectiveFrom DateTime
  effectiveTo DateTime?
  cityFranchise CityFranchise @relation(fields: [tenantId, cityFranchiseId], references: [tenantId, id], onDelete: Restrict)
  area CityFranchiseArea? @relation(fields: [tenantId, areaId], references: [tenantId, id], onDelete: Restrict)
  pincode GeoPincode @relation(fields: [pincodeId], references: [id], onDelete: Restrict)
  @@unique([tenantId, cityFranchiseId, pincodeId, effectiveFrom])
  @@index([tenantId, pincodeId, effectiveFrom, effectiveTo])
}
```

City must belong to the State parent geographic state. Multiple CityFranchise rows per city are allowed; areaCode distinguishes business identity. Pincode is the V1 enforceable overlap unit. Named-area overlap cannot be mathematically proven and remains a reviewed business label.

## Outlet Identity And Parent History

Retain FranchiseOutletProfile and its ID/Branch relation. Existing partnerId is the explicit Outlet Partner for compatibility; do not add vague duplicate owner/operator fields until role semantics require them.

Proposed additive fields:

```prisma
model FranchiseOutletProfile {
  // existing fields remain
  currentCityFranchiseId String? @db.Uuid // nullable only through migration/draft
  assignmentStatus FranchiseAssignmentStatus @default(DRAFT)
  currentCityFranchise CityFranchise? @relation(fields: [tenantId, currentCityFranchiseId], references: [tenantId, id], onDelete: Restrict)
  hierarchyAssignments FranchiseOutletAssignment[]
}

model FranchiseOutletAssignment {
  id String @id @default(uuid()) @db.Uuid
  tenantId String @db.Uuid
  outletProfileId String @db.Uuid
  cityFranchiseId String @db.Uuid
  effectiveFrom DateTime
  effectiveTo DateTime?
  status FranchiseAssignmentStatus @default(DRAFT)
  transferReference String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  outletProfile FranchiseOutletProfile @relation(fields: [tenantId, outletProfileId], references: [tenantId, id], onDelete: Restrict)
  cityFranchise CityFranchise @relation(fields: [tenantId, cityFranchiseId], references: [tenantId, id], onDelete: Restrict)

  @@unique([tenantId, id])
  @@unique([tenantId, outletProfileId, effectiveFrom])
  @@index([tenantId, outletProfileId, effectiveFrom, effectiveTo])
  @@index([tenantId, cityFranchiseId, status])
}
```

FranchiseOutletAssignment is canonical history; currentCityFranchiseId is a synchronized current-read pointer, not historical truth. Activation requires exactly one active assignment. Reassignment closes the old period and inserts a successor transactionally. Historical Invoice resolution uses Invoice/appointment business timestamp and the assignment period. Branch remains physical/operational; not every Branch is a franchise Outlet, and the tables are not merged.

## Agreement Target And Version Design

```prisma
model FranchiseAgreement {
  // existing commercial and legacy fields remain during compatibility
  agreementLevel FranchiseAgreementLevel?
  purposeCode String?
  stateFranchiseId String? @db.Uuid
  cityFranchiseId String? @db.Uuid
  outletProfileId String? @db.Uuid
  version Int @default(1)
  supersedesAgreementId String? @db.Uuid
  graceDurationDays Int? // BUSINESS VALUE REQUIRED; no default
  // existing effectiveFrom/effectiveTo and termsSnapshot retained
  // target relations use composite tenant FKs
  @@index([tenantId, agreementLevel, purposeCode, effectiveFrom, effectiveTo])
  @@index([tenantId, stateFranchiseId])
  @@index([tenantId, cityFranchiseId])
  @@index([tenantId, outletProfileId])
}
```

Exactly one hierarchy target is required after classification, and agreementLevel must match it. These new fields begin nullable. territoryId and FranchiseAgreementOutlet remain during compatibility because current settlement requires them. Approved/active termsSnapshot and commercial columns are immutable; amendment creates a successor version. Agreement lifecycle/maker-checker columns are PENDING FH-21.

## Cross-Level Conflict Approval

When the same Partner would hold related State and City assignments, activation requires conflictApprovedAt, conflictApprovedBy, and conflictApprovalReference on the child assignment. Services verify the approval is present and auditable. These fields record FH-03 governance only; they do not implement the pending FH-21 agreement approval workflow.

## Legacy Territory And Compatibility

Recommend option D: Territory becomes compatibility-only during rollout and is retired only after all consumers and membership scopes have migrated. It is not converted into canonical geography because a Territory name does not identify Partner, hierarchy level, coverage, or agreement target.

Current settlement remains Invoice -> Branch -> FranchiseAgreementOutlet -> Agreement -> Partner -> Settlement. New hierarchy writes and reads operate in shadow/compatibility mode. No layered settlement, payer/payee, tax, period, precedence, or share composition is introduced before P2 approval.

Reports using Branch.territoryId, Agreement.territoryId, or AgreementOutlet continue unchanged initially. Compatibility projections may expose State/City labels alongside legacy values. Later report cutover requires parity checks and explicit authorization.

## Approved P0 Traceability

| Decision | Design response |
|---|---|
| FH-01 | Multiple dated StateFranchise rows; overlap controls |
| FH-02 | Partner-to-City one-to-many |
| FH-03 | Cross-level conflict approval evidence |
| FH-04 | City pincode temporal overlap prohibition |
| FH-05 | CityFranchiseArea plus normalized CityFranchisePincode |
| FH-06 | Effective-dated FranchiseOutletAssignment successor |
| FH-07 | Required purposeCode; concurrency only across purposes |
| FH-08 | Same target/purpose exclusion |
| FH-11 | Immutable ID plus State/City/areaCode business identity |
| FH-12 | Independent explicit Partner relation at each level |
| FH-13 | One required canonical city per CityFranchise |
| FH-14 | WHOLE_STATE or PINCODE_SET coverage |
| FH-15 | Nullable migration pointer; activation requires one parent |
| FH-16 | Nullable graceDurationDays; BUSINESS VALUE REQUIRED |
| FH-17 | Existing Outlet Partner remains explicit and independent |
| FH-18 | Partner-to-Outlet one-to-many |
| FH-19 | Half-open effective periods and immutable history |
| FH-20 | Restrict deletion; unused drafts only |
| FH-28 | Transactional dated relocation/reassignment |
| FH-29 | Canonical Country/State/City/Pincode references |
| FH-30 | Child-first end sequence; no cascade delete |

## Pending Boundaries

- FH-21: agreement maker-checker states, approver roles, and transitions.
- FH-09/FH-10/FH-22-FH-27: cascade, payment direction, precedence, calculation bases, composition, periods, tax, and carry-forward.
- City agreement grace duration: BUSINESS VALUE REQUIRED.
- Director financial rules remain outside franchise schema.

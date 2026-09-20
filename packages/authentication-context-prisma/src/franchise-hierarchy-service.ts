import type { PrismaClient } from "@lwill/database/client";

export type HierarchyStatus = "DRAFT" | "ACTIVE" | "SUSPENDED" | "ENDED";
export type CoverageMode = "WHOLE_STATE" | "PINCODE_SET";
export type HierarchyErrorCode =
  | "NOT_FOUND" | "INVALID_PARENT" | "INVALID_LIFECYCLE"
  | "INVALID_EFFECTIVE_PERIOD" | "INVALID_GEOGRAPHY" | "INVALID_COVERAGE"
  | "COVERAGE_OVERLAP" | "ASSIGNMENT_OVERLAP"
  | "CONFLICT_APPROVAL_REQUIRED" | "ACTIVE_CHILDREN" | "CONCURRENT_WRITE";

export class FranchiseHierarchyError extends Error {
  constructor(readonly code: HierarchyErrorCode, message: string) {
    super(message);
    this.name = "FranchiseHierarchyError";
  }
}

export interface EffectivePeriod {
  readonly effectiveFrom: Date;
  readonly effectiveTo: Date | null;
}

export interface StateFranchiseInput extends EffectivePeriod {
  readonly tenantId: string;
  readonly partnerId: string;
  readonly stateId: string;
  readonly code: string;
  readonly displayName: string;
  readonly coverageMode: CoverageMode;
  readonly pincodeIds?: readonly string[];
  readonly conflictApprovedAt?: Date | null;
  readonly conflictApprovedBy?: string | null;
  readonly conflictApprovalReference?: string | null;
}

export interface CityAreaInput {
  readonly name: string;
  readonly pincodeIds: readonly string[];
}

export interface CityFranchiseInput extends EffectivePeriod {
  readonly tenantId: string;
  readonly stateFranchiseId: string | null;
  readonly partnerId: string;
  readonly cityId: string;
  readonly areaCode: string;
  readonly displayName: string;
  readonly areas: readonly CityAreaInput[];
  readonly conflictApprovedAt?: Date | null;
  readonly conflictApprovedBy?: string | null;
  readonly conflictApprovalReference?: string | null;
}

type Db = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;
type RootDb = PrismaClient;
type StateRecord = Awaited<ReturnType<Db["stateFranchise"]["findUnique"]>>;
type CityRecord = Awaited<ReturnType<Db["cityFranchise"]["findUnique"]>>;

const activeStatuses: readonly HierarchyStatus[] = ["ACTIVE", "SUSPENDED"];
const SERIALIZABLE_RETRY_LIMIT = 3;

export function periodsOverlap(left: EffectivePeriod, right: EffectivePeriod): boolean {
  const leftEnd = left.effectiveTo?.getTime() ?? Number.POSITIVE_INFINITY;
  const rightEnd = right.effectiveTo?.getTime() ?? Number.POSITIVE_INFINITY;
  return left.effectiveFrom.getTime() < rightEnd && right.effectiveFrom.getTime() < leftEnd;
}

function containsPeriod(parent: EffectivePeriod, child: EffectivePeriod): boolean {
  const parentEnd = parent.effectiveTo?.getTime() ?? Number.POSITIVE_INFINITY;
  const childEnd = child.effectiveTo?.getTime() ?? Number.POSITIVE_INFINITY;
  return parent.effectiveFrom.getTime() <= child.effectiveFrom.getTime() && childEnd <= parentEnd;
}

function activeAt(period: EffectivePeriod, at: Date): boolean {
  return period.effectiveFrom <= at && (period.effectiveTo === null || at < period.effectiveTo);
}

function assertPeriod(period: EffectivePeriod): void {
  if (Number.isNaN(period.effectiveFrom.getTime()) ||
      (period.effectiveTo !== null &&
       (Number.isNaN(period.effectiveTo.getTime()) || period.effectiveTo <= period.effectiveFrom))) {
    throw new FranchiseHierarchyError("INVALID_EFFECTIVE_PERIOD", "Effective period must be a valid non-empty half-open interval.");
  }
}

function approval(input: Pick<StateFranchiseInput, "conflictApprovedAt" | "conflictApprovedBy" | "conflictApprovalReference">) {
  return {
    conflictApprovedAt: input.conflictApprovedAt ?? null,
    conflictApprovedBy: input.conflictApprovedBy?.trim() || null,
    conflictApprovalReference: input.conflictApprovalReference?.trim() || null,
  };
}

function hasApproval(record: { conflictApprovedAt: Date | null; conflictApprovedBy: string | null; conflictApprovalReference: string | null }): boolean {
  return Boolean(record.conflictApprovedAt && record.conflictApprovedBy?.trim() && record.conflictApprovalReference?.trim());
}

function unique(ids: readonly string[], label: string): string[] {
  if (new Set(ids).size !== ids.length) {
    throw new FranchiseHierarchyError("INVALID_COVERAGE", `Duplicate ${label} is not allowed.`);
  }
  return [...ids];
}

async function requirePartner(db: Db, tenantId: string, partnerId: string) {
  const value = await db.franchisePartner.findUnique({ where: { id: partnerId } });
  if (!value || value.tenantId !== tenantId || !value.isActive) {
    throw new FranchiseHierarchyError("NOT_FOUND", "Franchise Partner was not found for this tenant.");
  }
  return value;
}

async function requireStateFranchise(db: Db, tenantId: string, id: string) {
  const value = await db.stateFranchise.findUnique({ where: { id } });
  if (!value || value.tenantId !== tenantId) {
    throw new FranchiseHierarchyError("NOT_FOUND", "State Franchise was not found for this tenant.");
  }
  return value;
}

async function requireCityFranchise(db: Db, tenantId: string, id: string) {
  const value = await db.cityFranchise.findUnique({ where: { id } });
  if (!value || value.tenantId !== tenantId) {
    throw new FranchiseHierarchyError("NOT_FOUND", "City Franchise was not found for this tenant.");
  }
  return value;
}

async function requireOutlet(db: Db, tenantId: string, id: string) {
  const value = await db.franchiseOutletProfile.findUnique({ where: { id } });
  if (!value || value.tenantId !== tenantId) {
    throw new FranchiseHierarchyError("NOT_FOUND", "Franchise Outlet Profile was not found for this tenant.");
  }
  return value;
}

async function validatePincodes(db: Db, ids: readonly string[], stateId: string, cityId?: string) {
  const values = unique(ids, "pincode");
  const rows = await db.geoPincode.findMany({ where: { id: { in: values } } });
  if (rows.length !== values.length ||
      rows.some((row) => !/^[0-9]{6}$/.test(row.value) || row.stateId !== stateId || (cityId && row.cityId !== cityId))) {
    throw new FranchiseHierarchyError("INVALID_GEOGRAPHY", "Pincode does not belong to the selected canonical geography.");
  }
  return values;
}

async function writeStateCoverage(db: Db, id: string, input: StateFranchiseInput) {
  const ids = input.pincodeIds ?? [];
  if (input.coverageMode === "PINCODE_SET" && ids.length === 0) {
    throw new FranchiseHierarchyError("INVALID_COVERAGE", "PINCODE_SET requires at least one canonical pincode.");
  }
  if (input.coverageMode === "WHOLE_STATE" && ids.length !== 0) {
    throw new FranchiseHierarchyError("INVALID_COVERAGE", "WHOLE_STATE cannot contain partial pincode rows.");
  }
  if (ids.length) {
    const valid = await validatePincodes(db, ids, input.stateId);
    await db.stateFranchisePincode.createMany({ data: valid.map((pincodeId) => ({
      tenantId: input.tenantId, stateFranchiseId: id, pincodeId,
      effectiveFrom: input.effectiveFrom, effectiveTo: input.effectiveTo,
    })) });
  }
}

async function writeCityCoverage(db: Db, id: string, input: CityFranchiseInput, stateId: string) {
  const ids = unique(input.areas.flatMap((area) => area.pincodeIds), "pincode");
  if (!input.areas.length || !ids.length) {
    throw new FranchiseHierarchyError("INVALID_COVERAGE", "City coverage requires a named area and canonical pincode.");
  }
  await validatePincodes(db, ids, stateId, input.cityId);
  for (const area of input.areas) {
    const name = area.name.trim();
    if (!name) throw new FranchiseHierarchyError("INVALID_COVERAGE", "Named area cannot be empty.");
    const created = await db.cityFranchiseArea.create({ data: {
      tenantId: input.tenantId, cityFranchiseId: id, name,
      normalizedName: name.toLocaleLowerCase("en-IN"),
    } });
    await db.cityFranchisePincode.createMany({ data: area.pincodeIds.map((pincodeId) => ({
      tenantId: input.tenantId, cityFranchiseId: id, areaId: created.id, pincodeId,
      effectiveFrom: input.effectiveFrom, effectiveTo: input.effectiveTo,
    })) });
  }
}

async function resolveCityGeography(db: Db, input: CityFranchiseInput | Omit<CityFranchiseInput, "tenantId">, parent: NonNullable<StateRecord> | null) {
  const city = await db.geoCity.findUnique({ where: { id: input.cityId } });
  if (!city) {
    throw new FranchiseHierarchyError("INVALID_GEOGRAPHY", "Canonical City was not found.");
  }
  if (parent && city.stateId !== parent.stateId) {
    throw new FranchiseHierarchyError("INVALID_GEOGRAPHY", "Canonical City does not belong to the parent State.");
  }
  return city;
}

async function assertStateCoverageAvailable(db: Db, record: NonNullable<StateRecord>) {
  const candidates = await db.stateFranchise.findMany({ where: {
    tenantId: record.tenantId, stateId: record.stateId,
    status: { in: [...activeStatuses] }, id: { not: record.id },
  } });
  if (record.coverageMode === "WHOLE_STATE" &&
      candidates.some((item) => periodsOverlap(record, item))) {
    throw new FranchiseHierarchyError("COVERAGE_OVERLAP", "Whole-State coverage overlaps an active State Franchise.");
  }
  if (record.coverageMode === "PINCODE_SET" &&
      candidates.some((item) => item.coverageMode === "WHOLE_STATE" && periodsOverlap(record, item))) {
    throw new FranchiseHierarchyError("COVERAGE_OVERLAP", "Partial coverage overlaps active whole-State coverage.");
  }
  if (record.coverageMode === "PINCODE_SET") {
    const own = await db.stateFranchisePincode.findMany({ where: { tenantId: record.tenantId, stateFranchiseId: record.id } });
    const others = await db.stateFranchisePincode.findMany({ where: {
      tenantId: record.tenantId, pincodeId: { in: own.map((row) => row.pincodeId) },
      stateFranchiseId: { not: record.id }, stateFranchise: { status: { in: [...activeStatuses] } },
    } });
    if (own.some((a) => others.some((b) => a.pincodeId === b.pincodeId && periodsOverlap(a, b)))) {
      throw new FranchiseHierarchyError("COVERAGE_OVERLAP", "State pincode coverage overlaps an active assignment.");
    }
  }
}

async function assertCityCoverageAvailable(db: Db, record: NonNullable<CityRecord>) {
  const own = await db.cityFranchisePincode.findMany({ where: { tenantId: record.tenantId, cityFranchiseId: record.id } });
  const others = await db.cityFranchisePincode.findMany({ where: {
    tenantId: record.tenantId, pincodeId: { in: own.map((row) => row.pincodeId) },
    cityFranchiseId: { not: record.id }, cityFranchise: { status: { in: [...activeStatuses] } },
  } });
  if (own.some((a) => others.some((b) => a.pincodeId === b.pincodeId && periodsOverlap(a, b)))) {
    throw new FranchiseHierarchyError("COVERAGE_OVERLAP", "City pincode coverage overlaps an active City Franchise.");
  }
}

async function assertOutletAvailable(db: Db, tenantId: string, outletProfileId: string, period: EffectivePeriod, excludedId?: string) {
  const rows = await db.franchiseOutletAssignment.findMany({ where: {
    tenantId, outletProfileId, ...(excludedId ? { id: { not: excludedId } } : {}),
  } });
  if (rows.some((row) => periodsOverlap(row, period))) {
    throw new FranchiseHierarchyError("ASSIGNMENT_OVERLAP", "Outlet assignment overlaps existing history.");
  }
}

export function createFranchiseHierarchyService(prisma: RootDb) {
  const tx = <T>(run: (db: Db) => Promise<T>) =>
    prisma.$transaction((db) => run(db as unknown as Db));
  const serializableTx = async <T>(run: (db: Db) => Promise<T>): Promise<T> => {
    for (let attempt = 1; attempt <= SERIALIZABLE_RETRY_LIMIT; attempt += 1) {
      try {
        return await prisma.$transaction(
          (db) => run(db as unknown as Db),
          { isolationLevel: "Serializable" },
        );
      } catch (error) {
        const isWriteConflict = typeof error === "object" && error !== null &&
          "code" in error && error.code === "P2034";
        if (!isWriteConflict) throw error;
        if (attempt === SERIALIZABLE_RETRY_LIMIT) {
          throw new FranchiseHierarchyError(
            "CONCURRENT_WRITE",
            "A concurrent hierarchy change prevented this operation. Retry with current hierarchy data.",
          );
        }
      }
    }
    throw new FranchiseHierarchyError("CONCURRENT_WRITE", "A concurrent hierarchy change prevented this operation.");
  };
  return {
    async createStateFranchise(input: StateFranchiseInput) {
      assertPeriod(input);
      return tx(async (db) => {
        await requirePartner(db, input.tenantId, input.partnerId);
        if (!await db.geoState.findUnique({ where: { id: input.stateId } })) {
          throw new FranchiseHierarchyError("INVALID_GEOGRAPHY", "Canonical State was not found.");
        }
        const record = await db.stateFranchise.create({ data: {
          tenantId: input.tenantId, partnerId: input.partnerId, stateId: input.stateId,
          code: input.code, displayName: input.displayName, coverageMode: input.coverageMode,
          effectiveFrom: input.effectiveFrom, effectiveTo: input.effectiveTo, ...approval(input),
        } });
        await writeStateCoverage(db, record.id, input);
        return record;
      });
    },

    async getStateFranchise(args: { tenantId: string; stateFranchiseId: string }) {
      const row = await prisma.stateFranchise.findUnique({ where: { id: args.stateFranchiseId } });
      return row?.tenantId === args.tenantId ? row : null;
    },

    listStateFranchises(args: { tenantId: string }) {
      return prisma.stateFranchise.findMany({ where: { tenantId: args.tenantId } });
    },

    async updateDraftStateFranchise(args: { tenantId: string; stateFranchiseId: string; input: Omit<StateFranchiseInput, "tenantId"> }) {
      assertPeriod(args.input);
      return tx(async (db) => {
        const old = await requireStateFranchise(db, args.tenantId, args.stateFranchiseId);
        if (old.status !== "DRAFT") throw new FranchiseHierarchyError("INVALID_LIFECYCLE", "Only a draft State Franchise can be updated.");
        await requirePartner(db, args.tenantId, args.input.partnerId);
        if (!await db.geoState.findUnique({ where: { id: args.input.stateId } })) {
          throw new FranchiseHierarchyError("INVALID_GEOGRAPHY", "Canonical State was not found.");
        }
        await db.stateFranchisePincode.deleteMany({ where: { tenantId: args.tenantId, stateFranchiseId: old.id } });
        const input = { ...args.input, tenantId: args.tenantId };
        const row = await db.stateFranchise.update({ where: { id: old.id }, data: {
          partnerId: input.partnerId, stateId: input.stateId, code: input.code,
          displayName: input.displayName, coverageMode: input.coverageMode,
          effectiveFrom: input.effectiveFrom, effectiveTo: input.effectiveTo, ...approval(input),
        } });
        await writeStateCoverage(db, old.id, input);
        return row;
      });
    },

    activateStateFranchise(args: { tenantId: string; stateFranchiseId: string }) {
      return serializableTx(async (db) => {
        const row = await requireStateFranchise(db, args.tenantId, args.stateFranchiseId);
        if (row.status !== "DRAFT") throw new FranchiseHierarchyError("INVALID_LIFECYCLE", "Only a draft State Franchise can be activated.");
        await assertStateCoverageAvailable(db, row);
        const conflict = await db.cityFranchise.findFirst({ where: {
          tenantId: args.tenantId, partnerId: row.partnerId, status: { in: [...activeStatuses] },
          stateFranchise: { stateId: row.stateId },
        } });
        if (conflict && !hasApproval(row)) {
          throw new FranchiseHierarchyError("CONFLICT_APPROVAL_REQUIRED", "Cross-level Partner activation requires conflict approval evidence.");
        }
        return db.stateFranchise.update({ where: { id: row.id }, data: { status: "ACTIVE" } });
      });
    },

    endStateFranchise(args: { tenantId: string; stateFranchiseId: string; effectiveTo: Date }) {
      return tx(async (db) => {
        const row = await requireStateFranchise(db, args.tenantId, args.stateFranchiseId);
        assertPeriod({ effectiveFrom: row.effectiveFrom, effectiveTo: args.effectiveTo });
        if (!activeStatuses.includes(row.status)) throw new FranchiseHierarchyError("INVALID_LIFECYCLE", "Only an active or suspended State Franchise can be ended.");
        const child = await db.cityFranchise.findFirst({ where: {
          tenantId: args.tenantId, stateFranchiseId: row.id, status: { in: [...activeStatuses] },
          effectiveFrom: { lt: args.effectiveTo },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: args.effectiveTo } }],
        } });
        if (child) throw new FranchiseHierarchyError("ACTIVE_CHILDREN", "State Franchise cannot end while effective City children remain.");
        return db.stateFranchise.update({ where: { id: row.id }, data: { status: "ENDED", effectiveTo: args.effectiveTo } });
      });
    },

    async createCityFranchise(input: CityFranchiseInput) {
      assertPeriod(input);
      return tx(async (db) => {
        await requirePartner(db, input.tenantId, input.partnerId);
        const parent = input.stateFranchiseId
          ? await requireStateFranchise(db, input.tenantId, input.stateFranchiseId)
          : null;
        const canonicalCity = await resolveCityGeography(db, input, parent);
        if (parent && !containsPeriod(parent, input)) throw new FranchiseHierarchyError("INVALID_PARENT", "City period must be contained by its State parent.");
        const row = await db.cityFranchise.create({ data: {
          tenantId: input.tenantId, stateFranchiseId: input.stateFranchiseId,
          partnerId: input.partnerId, cityId: input.cityId, areaCode: input.areaCode,
          displayName: input.displayName, effectiveFrom: input.effectiveFrom,
          effectiveTo: input.effectiveTo, ...approval(input),
        } });
        await writeCityCoverage(db, row.id, input, canonicalCity.stateId);
        return row;
      });
    },

    async getCityFranchise(args: { tenantId: string; cityFranchiseId: string }) {
      const row = await prisma.cityFranchise.findUnique({ where: { id: args.cityFranchiseId } });
      return row?.tenantId === args.tenantId ? row : null;
    },

    listCityFranchises(args: { tenantId: string; stateFranchiseId?: string }) {
      return prisma.cityFranchise.findMany({ where: {
        tenantId: args.tenantId, ...(args.stateFranchiseId ? { stateFranchiseId: args.stateFranchiseId } : {}),
      } });
    },

    async updateDraftCityFranchise(args: { tenantId: string; cityFranchiseId: string; input: Omit<CityFranchiseInput, "tenantId"> }) {
      assertPeriod(args.input);
      return tx(async (db) => {
        const old = await requireCityFranchise(db, args.tenantId, args.cityFranchiseId);
        if (old.status !== "DRAFT") throw new FranchiseHierarchyError("INVALID_LIFECYCLE", "Only a draft City Franchise can be updated.");
        await requirePartner(db, args.tenantId, args.input.partnerId);
        const parent = args.input.stateFranchiseId
          ? await requireStateFranchise(db, args.tenantId, args.input.stateFranchiseId)
          : null;
        const canonicalCity = await resolveCityGeography(db, args.input, parent);
        if (parent && !containsPeriod(parent, args.input)) throw new FranchiseHierarchyError("INVALID_PARENT", "City period must be contained by its State parent.");
        await db.cityFranchisePincode.deleteMany({ where: { tenantId: args.tenantId, cityFranchiseId: old.id } });
        await db.cityFranchiseArea.deleteMany({ where: { tenantId: args.tenantId, cityFranchiseId: old.id } });
        const input = { ...args.input, tenantId: args.tenantId };
        const row = await db.cityFranchise.update({ where: { id: old.id }, data: {
          stateFranchiseId: input.stateFranchiseId, partnerId: input.partnerId,
          cityId: input.cityId, areaCode: input.areaCode, displayName: input.displayName,
          effectiveFrom: input.effectiveFrom, effectiveTo: input.effectiveTo, ...approval(input),
        } });
        await writeCityCoverage(db, old.id, input, canonicalCity.stateId);
        return row;
      });
    },

    activateCityFranchise(args: { tenantId: string; cityFranchiseId: string }) {
      return serializableTx(async (db) => {
        const row = await requireCityFranchise(db, args.tenantId, args.cityFranchiseId);
        if (row.status !== "DRAFT") throw new FranchiseHierarchyError("INVALID_LIFECYCLE", "Only a draft City Franchise can be activated.");
        if (row.stateFranchiseId) {
          const parent = await requireStateFranchise(db, args.tenantId, row.stateFranchiseId);
          if (parent.status !== "ACTIVE" || !containsPeriod(parent, row)) {
            throw new FranchiseHierarchyError("INVALID_PARENT", "City Franchise requires an active effective State parent.");
          }
          if (parent.partnerId === row.partnerId && !hasApproval(row)) {
            throw new FranchiseHierarchyError("CONFLICT_APPROVAL_REQUIRED", "Related State and City Partner roles require conflict approval evidence.");
          }
        }
        await assertCityCoverageAvailable(db, row);
        return db.cityFranchise.update({ where: { id: row.id }, data: { status: "ACTIVE" } });
      });
    },

    endCityFranchise(args: { tenantId: string; cityFranchiseId: string; effectiveTo: Date }) {
      return tx(async (db) => {
        const row = await requireCityFranchise(db, args.tenantId, args.cityFranchiseId);
        assertPeriod({ effectiveFrom: row.effectiveFrom, effectiveTo: args.effectiveTo });
        if (!activeStatuses.includes(row.status)) throw new FranchiseHierarchyError("INVALID_LIFECYCLE", "Only an active or suspended City Franchise can be ended.");
        const child = await db.franchiseOutletAssignment.findFirst({ where: {
          tenantId: args.tenantId, cityFranchiseId: row.id, status: { in: [...activeStatuses] },
          effectiveFrom: { lt: args.effectiveTo },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: args.effectiveTo } }],
        } });
        if (child) throw new FranchiseHierarchyError("ACTIVE_CHILDREN", "City Franchise cannot end while effective Outlet assignments remain.");
        return db.cityFranchise.update({ where: { id: row.id }, data: { status: "ENDED", effectiveTo: args.effectiveTo } });
      });
    },
    assignOutletToCityFranchise(input: { tenantId: string; outletProfileId: string; cityFranchiseId: string; effectiveFrom: Date; effectiveTo?: Date | null; transferReference?: string | null }) {
      const period = { effectiveFrom: input.effectiveFrom, effectiveTo: input.effectiveTo ?? null };
      assertPeriod(period);
      return serializableTx(async (db) => {
        await requireOutlet(db, input.tenantId, input.outletProfileId);
        const city = await requireCityFranchise(db, input.tenantId, input.cityFranchiseId);
        if (city.status !== "ACTIVE" || !containsPeriod(city, period)) {
          throw new FranchiseHierarchyError("INVALID_PARENT", "Outlet assignment requires an active effective City Franchise.");
        }
        await assertOutletAvailable(db, input.tenantId, input.outletProfileId, period);
        const row = await db.franchiseOutletAssignment.create({ data: {
          tenantId: input.tenantId, outletProfileId: input.outletProfileId,
          cityFranchiseId: input.cityFranchiseId, effectiveFrom: period.effectiveFrom,
          effectiveTo: period.effectiveTo, status: "ACTIVE",
          transferReference: input.transferReference ?? null,
        } });
        await db.franchiseOutletProfile.update({ where: { id: input.outletProfileId }, data: {
          currentCityFranchiseId: period.effectiveTo === null ? input.cityFranchiseId : null,
          assignmentStatus: period.effectiveTo === null ? "ACTIVE" : "ENDED",
        } });
        return row;
      });
    },

    reassignOutletToCityFranchise(input: { tenantId: string; outletProfileId: string; cityFranchiseId: string; effectiveFrom: Date; transferReference?: string | null }) {
      if (Number.isNaN(input.effectiveFrom.getTime())) throw new FranchiseHierarchyError("INVALID_EFFECTIVE_PERIOD", "Reassignment timestamp is invalid.");
      return serializableTx(async (db) => {
        await requireOutlet(db, input.tenantId, input.outletProfileId);
        const city = await requireCityFranchise(db, input.tenantId, input.cityFranchiseId);
        if (city.status !== "ACTIVE" || !activeAt(city, input.effectiveFrom)) {
          throw new FranchiseHierarchyError("INVALID_PARENT", "Reassignment requires an active City Franchise at the transfer time.");
        }
        const current = await db.franchiseOutletAssignment.findFirst({ where: {
          tenantId: input.tenantId, outletProfileId: input.outletProfileId,
          status: { in: [...activeStatuses] }, effectiveFrom: { lte: input.effectiveFrom },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: input.effectiveFrom } }],
        } });
        if (!current) throw new FranchiseHierarchyError("NOT_FOUND", "No current Outlet assignment exists at the transfer time.");
        if (current.effectiveFrom >= input.effectiveFrom) {
          throw new FranchiseHierarchyError("INVALID_EFFECTIVE_PERIOD", "Reassignment must occur after the current assignment starts.");
        }
        await assertOutletAvailable(db, input.tenantId, input.outletProfileId,
          { effectiveFrom: input.effectiveFrom, effectiveTo: null }, current.id);
        await db.franchiseOutletAssignment.update({ where: { id: current.id }, data: {
          effectiveTo: input.effectiveFrom, status: "ENDED",
        } });
        const successor = await db.franchiseOutletAssignment.create({ data: {
          tenantId: input.tenantId, outletProfileId: input.outletProfileId,
          cityFranchiseId: input.cityFranchiseId, effectiveFrom: input.effectiveFrom,
          effectiveTo: null, status: "ACTIVE", transferReference: input.transferReference ?? null,
        } });
        await db.franchiseOutletProfile.update({ where: { id: input.outletProfileId }, data: {
          currentCityFranchiseId: input.cityFranchiseId, assignmentStatus: "ACTIVE",
        } });
        return successor;
      });
    },

    getCurrentOutletAssignment(args: { tenantId: string; outletProfileId: string; at?: Date }) {
      return this.getOutletAssignmentAt({ ...args, timestamp: args.at ?? new Date() });
    },

    async getOutletAssignmentAt(args: { tenantId: string; outletProfileId: string; timestamp: Date }) {
      await requireOutlet(prisma, args.tenantId, args.outletProfileId);
      const rows = await prisma.franchiseOutletAssignment.findMany({ where: {
        tenantId: args.tenantId, outletProfileId: args.outletProfileId,
        effectiveFrom: { lte: args.timestamp },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: args.timestamp } }],
      } });
      if (rows.length > 1) throw new FranchiseHierarchyError("ASSIGNMENT_OVERLAP", "Multiple Outlet assignments resolve at the requested timestamp.");
      return rows[0] ?? null;
    },

    async listOutletAssignmentHistory(args: { tenantId: string; outletProfileId: string }) {
      await requireOutlet(prisma, args.tenantId, args.outletProfileId);
      return prisma.franchiseOutletAssignment.findMany({
        where: { tenantId: args.tenantId, outletProfileId: args.outletProfileId },
        orderBy: { effectiveFrom: "asc" },
      });
    },

    async resolveOutletHierarchyAt(args: { tenantId: string; outletProfileId: string; timestamp: Date }) {
      const outlet = await requireOutlet(prisma, args.tenantId, args.outletProfileId);
      const assignments = await prisma.franchiseOutletAssignment.findMany({ where: {
        tenantId: args.tenantId, outletProfileId: args.outletProfileId,
        effectiveFrom: { lte: args.timestamp },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: args.timestamp } }],
      } });
      if (assignments.length > 1) throw new FranchiseHierarchyError("ASSIGNMENT_OVERLAP", "Multiple Outlet assignments resolve at the requested timestamp.");
      const assignment = assignments[0];
      if (!assignment) return null;
      const cityFranchise = await requireCityFranchise(prisma, args.tenantId, assignment.cityFranchiseId);
      const stateFranchise = cityFranchise.stateFranchiseId
        ? await requireStateFranchise(prisma, args.tenantId, cityFranchise.stateFranchiseId)
        : null;
      return { outlet, assignment, cityFranchise, stateFranchise };
    },
  };
}

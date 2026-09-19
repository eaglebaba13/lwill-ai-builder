import "server-only";
import { FranchiseHierarchyError } from "../../../../../packages/authentication-context-prisma/src/franchise-hierarchy-service";

export type HierarchyAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string; readonly userId: string };

export interface HierarchyRouteServices {
  authorize(permission: string): Promise<HierarchyAuthorization>;
  listStates(tenantId: string): Promise<unknown[]>;
  getState(tenantId: string, id: string): Promise<unknown | null>;
  createState(tenantId: string, input: Record<string, unknown>): Promise<unknown>;
  updateState(tenantId: string, id: string, input: Record<string, unknown>): Promise<unknown>;
  activateState(tenantId: string, id: string): Promise<unknown>;
  endState(tenantId: string, id: string, effectiveTo: Date): Promise<unknown>;
  listCities(tenantId: string, stateFranchiseId?: string): Promise<unknown[]>;
  getCity(tenantId: string, id: string): Promise<unknown | null>;
  createCity(tenantId: string, input: Record<string, unknown>): Promise<unknown>;
  updateCity(tenantId: string, id: string, input: Record<string, unknown>): Promise<unknown>;
  activateCity(tenantId: string, id: string): Promise<unknown>;
  endCity(tenantId: string, id: string, effectiveTo: Date): Promise<unknown>;
  assignOutlet(tenantId: string, outletId: string, input: Record<string, unknown>): Promise<unknown>;
  reassignOutlet(tenantId: string, outletId: string, input: Record<string, unknown>): Promise<unknown>;
  getCurrentAssignment(tenantId: string, outletId: string, at?: Date): Promise<unknown | null>;
  listAssignmentHistory(tenantId: string, outletId: string): Promise<unknown[]>;
  resolveOutlet(tenantId: string, outletId: string, timestamp: Date): Promise<unknown | null>;
}

const headers = { "cache-control": "no-store" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function response(status: number, body?: unknown) {
  return body === undefined
    ? new Response(null, { status, headers })
    : Response.json(body, { status, headers });
}

function authorize(result: HierarchyAuthorization): { response: Response } | { tenantId: string } {
  if (result.outcome === "unauthenticated") return { response: response(401) };
  if (result.outcome === "forbidden") return { response: response(403) };
  return { tenantId: result.tenantId };
}

function domainError(error: unknown): Response {
  if (!(error instanceof FranchiseHierarchyError)) {
    return response(500, { error: { code: "INTERNAL_ERROR", message: "Request could not be completed." } });
  }
  const conflict = new Set([
    "COVERAGE_OVERLAP", "ASSIGNMENT_OVERLAP", "CONFLICT_APPROVAL_REQUIRED",
    "ACTIVE_CHILDREN", "INVALID_LIFECYCLE", "CONCURRENT_WRITE",
  ]);
  const status = error.code === "NOT_FOUND" ? 404 : conflict.has(error.code) ? 409 : 400;
  return response(status, { error: { code: error.code, message: error.message } });
}

async function body(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function allowed(value: Record<string, unknown>, keys: readonly string[]) {
  return !Object.keys(value).some((key) => !keys.includes(key));
}

function string(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 200;
}

function id(value: unknown): value is string {
  return typeof value === "string" && uuid.test(value);
}

function date(value: unknown, nullable = false): Date | null | undefined {
  if (value === null && nullable) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function ids(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(id);
}

function project(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(project);
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  const keys = [
    "id", "partnerId", "stateId", "stateFranchiseId", "cityId", "code",
    "displayName", "coverageMode", "areaCode", "effectiveFrom", "effectiveTo",
    "status", "outletProfileId", "cityFranchiseId", "transferReference",
    "currentCityFranchiseId", "assignmentStatus", "ownershipMode", "outletType",
  ];
  return Object.fromEntries(keys.filter((key) => key in record).map((key) => [key, record[key]]));
}

function stateInput(value: Record<string, unknown>, tenantId: string) {
  const keys = ["partnerId", "stateId", "code", "displayName", "coverageMode", "pincodeIds",
    "effectiveFrom", "effectiveTo", "conflictApprovedAt", "conflictApprovedBy", "conflictApprovalReference"];
  if (!allowed(value, keys) || !id(value.partnerId) || !id(value.stateId) ||
      !string(value.code) || !string(value.displayName) ||
      !["WHOLE_STATE", "PINCODE_SET"].includes(String(value.coverageMode)) ||
      !ids(value.pincodeIds ?? [])) return null;
  const effectiveFrom = date(value.effectiveFrom);
  const effectiveTo = date(value.effectiveTo ?? null, true);
  const conflictApprovedAt = value.conflictApprovedAt === undefined ? null : date(value.conflictApprovedAt, true);
  if (!effectiveFrom || effectiveTo === undefined || conflictApprovedAt === undefined) return null;
  if (value.conflictApprovedBy != null && !string(value.conflictApprovedBy)) return null;
  if (value.conflictApprovalReference != null && !string(value.conflictApprovalReference)) return null;
  return { ...value, tenantId, effectiveFrom, effectiveTo, conflictApprovedAt };
}

function cityInput(value: Record<string, unknown>, tenantId: string) {
  const keys = ["stateFranchiseId", "partnerId", "cityId", "areaCode", "displayName",
    "areas", "effectiveFrom", "effectiveTo", "conflictApprovedAt",
    "conflictApprovedBy", "conflictApprovalReference"];
  if (!allowed(value, keys) || !id(value.stateFranchiseId) || !id(value.partnerId) ||
      !id(value.cityId) || !string(value.areaCode) || !string(value.displayName) ||
      !Array.isArray(value.areas) || !value.areas.every((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return false;
        const area = item as Record<string, unknown>;
        return allowed(area, ["name", "pincodeIds"]) && string(area.name) && ids(area.pincodeIds);
      })) return null;
  const effectiveFrom = date(value.effectiveFrom);
  const effectiveTo = date(value.effectiveTo ?? null, true);
  const conflictApprovedAt = value.conflictApprovedAt === undefined ? null : date(value.conflictApprovedAt, true);
  if (!effectiveFrom || effectiveTo === undefined || conflictApprovedAt === undefined) return null;
  return { ...value, tenantId, effectiveFrom, effectiveTo, conflictApprovedAt };
}

async function runWrite(
  request: Request,
  services: HierarchyRouteServices,
  parse: (value: Record<string, unknown>, tenantId: string) => Record<string, unknown> | null,
  action: (tenantId: string, value: Record<string, unknown>) => Promise<unknown>,
  key: string,
  created = false,
) {
  const auth = authorize(await services.authorize("franchise.write"));
  if ("response" in auth) return auth.response;
  const raw = await body(request);
  if (!raw || "tenantId" in raw) return response(400, { error: { code: "INVALID_REQUEST", message: "Invalid request body." } });
  const input = parse(raw, auth.tenantId);
  if (!input) return response(400, { error: { code: "INVALID_REQUEST", message: "Invalid request body." } });
  try {
    return response(created ? 201 : 200, { [key]: project(await action(auth.tenantId, input)) });
  } catch (error) {
    return domainError(error);
  }
}
export async function handleListStateFranchises(request: Request, services: HierarchyRouteServices) {
  const auth = authorize(await services.authorize("franchise.read"));
  if ("response" in auth) return auth.response;
  const rows = await services.listStates(auth.tenantId);
  return response(200, { stateFranchises: project(rows) });
}

export async function handleGetStateFranchise(_request: Request, services: HierarchyRouteServices, stateId: string) {
  const auth = authorize(await services.authorize("franchise.read"));
  if ("response" in auth) return auth.response;
  if (!id(stateId)) return response(400, { error: { code: "INVALID_REQUEST", message: "Invalid State Franchise ID." } });
  const row = await services.getState(auth.tenantId, stateId);
  return row ? response(200, { stateFranchise: project(row) }) : response(404);
}

export function handleCreateStateFranchise(request: Request, services: HierarchyRouteServices) {
  return runWrite(request, services, stateInput,
    (tenantId, input) => services.createState(tenantId, input), "stateFranchise", true);
}

export function handleUpdateStateFranchise(request: Request, services: HierarchyRouteServices, stateId: string) {
  if (!id(stateId)) return Promise.resolve(response(400, { error: { code: "INVALID_REQUEST", message: "Invalid State Franchise ID." } }));
  return runWrite(request, services, stateInput,
    (tenantId, input) => services.updateState(tenantId, stateId, input), "stateFranchise");
}

async function lifecycle(
  request: Request, services: HierarchyRouteServices, entityId: string,
  kind: "state" | "city", action: "activate" | "end",
) {
  const auth = authorize(await services.authorize("franchise.write"));
  if ("response" in auth) return auth.response;
  if (!id(entityId)) return response(400, { error: { code: "INVALID_REQUEST", message: "Invalid hierarchy ID." } });
  try {
    if (action === "activate") {
      const row = kind === "state"
        ? await services.activateState(auth.tenantId, entityId)
        : await services.activateCity(auth.tenantId, entityId);
      return response(200, { [kind === "state" ? "stateFranchise" : "cityFranchise"]: project(row) });
    }
    const raw = await body(request);
    if (!raw || !allowed(raw, ["effectiveTo"]) || "tenantId" in raw) {
      return response(400, { error: { code: "INVALID_REQUEST", message: "Invalid request body." } });
    }
    const effectiveTo = date(raw.effectiveTo);
    if (!effectiveTo) return response(400, { error: { code: "INVALID_REQUEST", message: "effectiveTo must be an ISO timestamp." } });
    const row = kind === "state"
      ? await services.endState(auth.tenantId, entityId, effectiveTo)
      : await services.endCity(auth.tenantId, entityId, effectiveTo);
    return response(200, { [kind === "state" ? "stateFranchise" : "cityFranchise"]: project(row) });
  } catch (error) {
    return domainError(error);
  }
}

export const handleActivateStateFranchise = (request: Request, services: HierarchyRouteServices, id: string) =>
  lifecycle(request, services, id, "state", "activate");
export const handleEndStateFranchise = (request: Request, services: HierarchyRouteServices, id: string) =>
  lifecycle(request, services, id, "state", "end");

export async function handleListCityFranchises(request: Request, services: HierarchyRouteServices) {
  const auth = authorize(await services.authorize("franchise.read"));
  if ("response" in auth) return auth.response;
  const parent = new URL(request.url).searchParams.get("stateFranchiseId") ?? undefined;
  if (parent && !id(parent)) return response(400, { error: { code: "INVALID_REQUEST", message: "Invalid State Franchise filter." } });
  return response(200, { cityFranchises: project(await services.listCities(auth.tenantId, parent)) });
}

export async function handleGetCityFranchise(_request: Request, services: HierarchyRouteServices, cityId: string) {
  const auth = authorize(await services.authorize("franchise.read"));
  if ("response" in auth) return auth.response;
  if (!id(cityId)) return response(400, { error: { code: "INVALID_REQUEST", message: "Invalid City Franchise ID." } });
  const row = await services.getCity(auth.tenantId, cityId);
  return row ? response(200, { cityFranchise: project(row) }) : response(404);
}

export function handleCreateCityFranchise(request: Request, services: HierarchyRouteServices) {
  return runWrite(request, services, cityInput,
    (tenantId, input) => services.createCity(tenantId, input), "cityFranchise", true);
}

export function handleUpdateCityFranchise(request: Request, services: HierarchyRouteServices, cityId: string) {
  if (!id(cityId)) return Promise.resolve(response(400, { error: { code: "INVALID_REQUEST", message: "Invalid City Franchise ID." } }));
  return runWrite(request, services, cityInput,
    (tenantId, input) => services.updateCity(tenantId, cityId, input), "cityFranchise");
}

export const handleActivateCityFranchise = (request: Request, services: HierarchyRouteServices, id: string) =>
  lifecycle(request, services, id, "city", "activate");
export const handleEndCityFranchise = (request: Request, services: HierarchyRouteServices, id: string) =>
  lifecycle(request, services, id, "city", "end");

function assignmentInput(value: Record<string, unknown>, tenantId: string, reassign: boolean) {
  const keys = ["cityFranchiseId", "effectiveFrom", "effectiveTo", "transferReference"];
  if (!allowed(value, keys) || !id(value.cityFranchiseId) ||
      (value.transferReference != null && !string(value.transferReference)) ||
      (reassign && value.effectiveTo !== undefined)) return null;
  const effectiveFrom = date(value.effectiveFrom);
  const effectiveTo = reassign ? undefined : date(value.effectiveTo ?? null, true);
  if (!effectiveFrom || (!reassign && effectiveTo === undefined)) return null;
  return { tenantId, cityFranchiseId: value.cityFranchiseId, effectiveFrom,
    ...(reassign ? {} : { effectiveTo }), transferReference: value.transferReference ?? null };
}

export async function handleAssignOutlet(request: Request, services: HierarchyRouteServices, outletId: string) {
  if (!id(outletId)) return response(400, { error: { code: "INVALID_REQUEST", message: "Invalid Outlet ID." } });
  return runWrite(request, services, (value, tenantId) => assignmentInput(value, tenantId, false),
    (tenantId, input) => services.assignOutlet(tenantId, outletId, input), "assignment", true);
}

export async function handleReassignOutlet(request: Request, services: HierarchyRouteServices, outletId: string) {
  if (!id(outletId)) return response(400, { error: { code: "INVALID_REQUEST", message: "Invalid Outlet ID." } });
  return runWrite(request, services, (value, tenantId) => assignmentInput(value, tenantId, true),
    (tenantId, input) => services.reassignOutlet(tenantId, outletId, input), "assignment");
}

export async function handleListOutletAssignments(_request: Request, services: HierarchyRouteServices, outletId: string) {
  const auth = authorize(await services.authorize("franchise.read"));
  if ("response" in auth) return auth.response;
  if (!id(outletId)) return response(400, { error: { code: "INVALID_REQUEST", message: "Invalid Outlet ID." } });
  try {
    return response(200, { assignments: project(await services.listAssignmentHistory(auth.tenantId, outletId)) });
  } catch (error) { return domainError(error); }
}

export async function handleGetCurrentOutletAssignment(request: Request, services: HierarchyRouteServices, outletId: string) {
  const auth = authorize(await services.authorize("franchise.read"));
  if ("response" in auth) return auth.response;
  if (!id(outletId)) return response(400, { error: { code: "INVALID_REQUEST", message: "Invalid Outlet ID." } });
  const value = new URL(request.url).searchParams.get("at");
  const at = value === null ? undefined : date(value);
  if (value !== null && !at) return response(400, { error: { code: "INVALID_REQUEST", message: "at must be an ISO timestamp." } });
  try {
    const row = await services.getCurrentAssignment(auth.tenantId, outletId, at ?? undefined);
    return response(200, { assignment: project(row) });
  } catch (error) { return domainError(error); }
}

export async function handleResolveOutletHierarchy(request: Request, services: HierarchyRouteServices, outletId: string) {
  const auth = authorize(await services.authorize("franchise.read"));
  if ("response" in auth) return auth.response;
  if (!id(outletId)) return response(400, { error: { code: "INVALID_REQUEST", message: "Invalid Outlet ID." } });
  const timestamp = date(new URL(request.url).searchParams.get("timestamp"));
  if (!timestamp) return response(400, { error: { code: "INVALID_REQUEST", message: "timestamp must be an ISO timestamp." } });
  try {
    const result = await services.resolveOutlet(auth.tenantId, outletId, timestamp);
    if (!result) return response(404);
    const value = result as Record<string, unknown>;
    return response(200, { hierarchy: {
      outlet: project(value.outlet), assignment: project(value.assignment),
      cityFranchise: project(value.cityFranchise), stateFranchise: project(value.stateFranchise),
    } });
  } catch (error) { return domainError(error); }
}

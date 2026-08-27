import "server-only";

export type StaffAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface StaffWriteInput {
  readonly displayName: string;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly branchId?: string | null;
  readonly isActive?: boolean;
}

export interface StaffUpdateInput {
  readonly displayName?: string;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly branchId?: string | null;
  readonly isActive?: boolean;
}

export interface StaffRouteServices {
  readonly authorize: (permissionCode: string) => Promise<StaffAuthorization>;
  readonly listStaff: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getStaff: (tenantId: string, staffId: string) => Promise<unknown | null>;
  readonly createStaff: (tenantId: string, input: StaffWriteInput) => Promise<unknown>;
  readonly updateStaff: (
    tenantId: string,
    staffId: string,
    input: StaffUpdateInput,
  ) => Promise<unknown | null>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: StaffAuthorization,
): { readonly ok: true; readonly tenantId: string } | { readonly ok: false; readonly response: Response } {
  if (authorization.outcome === "unauthenticated") {
    return { ok: false, response: response(401) };
  }
  if (authorization.outcome === "forbidden") {
    return { ok: false, response: response(403) };
  }
  return { ok: true, tenantId: authorization.tenantId };
}

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function isOptionalBoolean(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === "boolean";
}

function parseCreateInput(input: unknown): StaffWriteInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["displayName", "email", "phone", "branchId", "isActive"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (typeof record.displayName !== "string" || record.displayName.trim() === "") {
    return null;
  }
  if (!isOptionalString(record.email)) {
    return null;
  }
  if (!isOptionalString(record.phone)) {
    return null;
  }
  if (!isOptionalString(record.branchId)) {
    return null;
  }
  if (!isOptionalBoolean(record.isActive)) {
    return null;
  }
  return {
    displayName: record.displayName,
    email: record.email ?? null,
    phone: record.phone ?? null,
    branchId: record.branchId ?? null,
    isActive: record.isActive,
  };
}

function parseUpdateInput(input: unknown): StaffUpdateInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["displayName", "email", "phone", "branchId", "isActive"]);
  if (Object.keys(record).length === 0) {
    return null;
  }
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (record.displayName !== undefined && (typeof record.displayName !== "string" || record.displayName.trim() === "")) {
    return null;
  }
  if (!isOptionalString(record.email)) {
    return null;
  }
  if (!isOptionalString(record.phone)) {
    return null;
  }
  if (!isOptionalString(record.branchId)) {
    return null;
  }
  if (!isOptionalBoolean(record.isActive)) {
    return null;
  }
  const update: {
    displayName?: string;
    email?: string | null;
    phone?: string | null;
    branchId?: string | null;
    isActive?: boolean;
  } = {};
  if (record.displayName !== undefined) update.displayName = record.displayName;
  if (record.email !== undefined) update.email = record.email as string | null;
  if (record.phone !== undefined) update.phone = record.phone as string | null;
  if (record.branchId !== undefined) update.branchId = record.branchId as string | null;
  if (record.isActive !== undefined) update.isActive = record.isActive as boolean;
  return update;
}

const INVALID_JSON = Symbol("invalid-json");

async function readJsonBody(request: Request): Promise<unknown | typeof INVALID_JSON> {
  try {
    return await request.json();
  } catch {
    return INVALID_JSON;
  }
}

export async function handleListStaff(
  _request: Request,
  services: StaffRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("staff.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const staffList = await services.listStaff(authResult.tenantId);
  return response(200, { staff: staffList });
}

export async function handleCreateStaff(
  request: Request,
  services: StaffRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("staff.write");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const body = await readJsonBody(request);
  if (body === INVALID_JSON) {
    return response(400);
  }
  const input = parseCreateInput(body);
  if (input === null) {
    return response(400);
  }
  const staff = await services.createStaff(authResult.tenantId, input);
  return response(201, { staff });
}

export async function handleGetStaff(
  _request: Request,
  services: StaffRouteServices,
  staffId: string,
): Promise<Response> {
  const authorization = await services.authorize("staff.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const staff = await services.getStaff(authResult.tenantId, staffId);
  if (staff === null) {
    return response(404);
  }
  return response(200, { staff });
}

export async function handleUpdateStaff(
  request: Request,
  services: StaffRouteServices,
  staffId: string,
): Promise<Response> {
  const authorization = await services.authorize("staff.write");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const body = await readJsonBody(request);
  if (body === INVALID_JSON) {
    return response(400);
  }
  const input = parseUpdateInput(body);
  if (input === null) {
    return response(400);
  }
  const staff = await services.updateStaff(authResult.tenantId, staffId, input);
  if (staff === null) {
    return response(404);
  }
  return response(200, { staff });
}

import "server-only";

export type BranchAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface BranchWriteInput {
  readonly businessUnitId: string;
  readonly name: string;
  readonly slug: string;
  readonly isActive?: boolean;
}

export interface BranchUpdateInput {
  readonly businessUnitId?: string;
  readonly name?: string;
  readonly slug?: string;
  readonly isActive?: boolean;
}

export interface BranchRouteServices {
  readonly authorize: (permissionCode: string) => Promise<BranchAuthorization>;
  readonly listBranches: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getBranch: (tenantId: string, branchId: string) => Promise<unknown | null>;
  readonly createBranch: (tenantId: string, input: BranchWriteInput) => Promise<unknown>;
  readonly updateBranch: (
    tenantId: string,
    branchId: string,
    input: BranchUpdateInput,
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
  authorization: BranchAuthorization,
): { readonly ok: true; readonly tenantId: string } | { readonly ok: false; readonly response: Response } {
  if (authorization.outcome === "unauthenticated") {
    return { ok: false, response: response(401) };
  }
  if (authorization.outcome === "forbidden") {
    return { ok: false, response: response(403) };
  }
  return { ok: true, tenantId: authorization.tenantId };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function parseCreateInput(input: unknown): BranchWriteInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["businessUnitId", "name", "slug", "isActive"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (!isNonEmptyString(record.businessUnitId)) {
    return null;
  }
  if (!isNonEmptyString(record.name)) {
    return null;
  }
  if (!isNonEmptyString(record.slug)) {
    return null;
  }
  if (record.isActive !== undefined && typeof record.isActive !== "boolean") {
    return null;
  }
  return {
    businessUnitId: record.businessUnitId,
    name: record.name,
    slug: record.slug,
    isActive: record.isActive ?? true,
  };
}

function parseUpdateInput(input: unknown): BranchUpdateInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["businessUnitId", "name", "slug", "isActive"]);
  if (Object.keys(record).length === 0) {
    return null;
  }
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  const update: {
    businessUnitId?: string;
    name?: string;
    slug?: string;
    isActive?: boolean;
  } = {};
  if (record.businessUnitId !== undefined) {
    if (!isNonEmptyString(record.businessUnitId)) {
      return null;
    }
    update.businessUnitId = record.businessUnitId;
  }
  if (record.name !== undefined) {
    if (!isNonEmptyString(record.name)) {
      return null;
    }
    update.name = record.name;
  }
  if (record.slug !== undefined) {
    if (!isNonEmptyString(record.slug)) {
      return null;
    }
    update.slug = record.slug;
  }
  if (record.isActive !== undefined) {
    if (typeof record.isActive !== "boolean") {
      return null;
    }
    update.isActive = record.isActive;
  }
  return update as BranchUpdateInput;
}

const INVALID_JSON = Symbol("invalid-json");

async function readJsonBody(request: Request): Promise<unknown | typeof INVALID_JSON> {
  try {
    return await request.json();
  } catch {
    return INVALID_JSON;
  }
}

export async function handleListBranches(
  _request: Request,
  services: BranchRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("branch.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const branchList = await services.listBranches(authResult.tenantId);
  return response(200, { branches: branchList });
}

export async function handleCreateBranch(
  request: Request,
  services: BranchRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("branch.write");
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
  const branch = await services.createBranch(authResult.tenantId, input);
  return response(201, { branch });
}

export async function handleGetBranch(
  _request: Request,
  services: BranchRouteServices,
  branchId: string,
): Promise<Response> {
  const authorization = await services.authorize("branch.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const branch = await services.getBranch(authResult.tenantId, branchId);
  if (branch === null) {
    return response(404);
  }
  return response(200, { branch });
}

export async function handleUpdateBranch(
  request: Request,
  services: BranchRouteServices,
  branchId: string,
): Promise<Response> {
  const authorization = await services.authorize("branch.write");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const body = await readJsonBody(request);
  if (body === INVALID_JSON) {
    return response(400);
  }
  if (typeof body !== "object" || body === null || Object.keys(body).length === 0) {
    return response(400);
  }
  const input = parseUpdateInput(body);
  if (input === null) {
    return response(400);
  }
  const branch = await services.updateBranch(authResult.tenantId, branchId, input);
  if (branch === null) {
    return response(404);
  }
  return response(200, { branch });
}

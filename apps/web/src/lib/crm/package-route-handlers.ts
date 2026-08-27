import "server-only";

export type PackageAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface PackageWriteInput {
  readonly name: string;
  readonly serviceIds: string[];
  readonly priceCents?: number | null;
  readonly durationDays?: number | null;
  readonly isActive?: boolean;
}

export interface PackageUpdateInput {
  readonly name?: string;
  readonly serviceIds?: string[];
  readonly priceCents?: number | null;
  readonly durationDays?: number | null;
  readonly isActive?: boolean;
}

export interface PackageRouteServices {
  readonly authorize: (permissionCode: string) => Promise<PackageAuthorization>;
  readonly listPackages: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getPackage: (tenantId: string, packageId: string) => Promise<unknown | null>;
  readonly createPackage: (tenantId: string, input: PackageWriteInput) => Promise<unknown>;
  readonly updatePackage: (
    tenantId: string,
    packageId: string,
    input: PackageUpdateInput,
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
  authorization: PackageAuthorization,
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

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNonNegativeIntegerOrNull(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isInteger(value) && value >= 0);
}

const INVALID_JSON = Symbol("invalid-json");

function parseCreateInput(input: unknown): PackageWriteInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["name", "serviceIds", "priceCents", "durationDays", "isActive"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (!isNonEmptyString(record.name)) {
    return null;
  }
  if (!isStringArray(record.serviceIds)) {
    return null;
  }
  if (record.priceCents !== undefined && !isNonNegativeIntegerOrNull(record.priceCents)) {
    return null;
  }
  if (record.durationDays !== undefined && !isNonNegativeIntegerOrNull(record.durationDays)) {
    return null;
  }
  if (record.isActive !== undefined && typeof record.isActive !== "boolean") {
    return null;
  }
  return {
    name: record.name,
    serviceIds: record.serviceIds as string[],
    priceCents: record.priceCents as number | null | undefined,
    durationDays: record.durationDays as number | null | undefined,
    isActive: record.isActive as boolean | undefined,
  };
}

function parseUpdateInput(input: unknown): PackageUpdateInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["name", "serviceIds", "priceCents", "durationDays", "isActive"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (Object.keys(record).length === 0) {
    return null;
  }
  if (record.name !== undefined && !isNonEmptyString(record.name)) {
    return null;
  }
  if (record.serviceIds !== undefined && !isStringArray(record.serviceIds)) {
    return null;
  }
  if (record.priceCents !== undefined && !isNonNegativeIntegerOrNull(record.priceCents)) {
    return null;
  }
  if (record.durationDays !== undefined && !isNonNegativeIntegerOrNull(record.durationDays)) {
    return null;
  }
  if (record.isActive !== undefined && typeof record.isActive !== "boolean") {
    return null;
  }
  const update: {
    name?: string;
    serviceIds?: string[];
    priceCents?: number | null;
    durationDays?: number | null;
    isActive?: boolean;
  } = {};
  if (record.name !== undefined) update.name = record.name;
  if (record.serviceIds !== undefined) update.serviceIds = record.serviceIds as string[];
  if (record.priceCents !== undefined) update.priceCents = record.priceCents as number | null;
  if (record.durationDays !== undefined) update.durationDays = record.durationDays as number | null;
  if (record.isActive !== undefined) update.isActive = record.isActive as boolean;
  return update;
}

async function readJsonBody(request: Request): Promise<unknown | typeof INVALID_JSON> {
  try {
    return await request.json();
  } catch {
    return INVALID_JSON;
  }
}

export async function handleListPackages(
  _request: Request,
  services: PackageRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("package.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const packageList = await services.listPackages(authResult.tenantId);
  return response(200, { packages: packageList });
}

export async function handleCreatePackage(
  request: Request,
  services: PackageRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("package.write");
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
  const pkg = await services.createPackage(authResult.tenantId, input);
  return response(201, { package: pkg });
}

export async function handleGetPackage(
  _request: Request,
  services: PackageRouteServices,
  packageId: string,
): Promise<Response> {
  const authorization = await services.authorize("package.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const pkg = await services.getPackage(authResult.tenantId, packageId);
  if (pkg === null) {
    return response(404);
  }
  return response(200, { package: pkg });
}

export async function handleUpdatePackage(
  request: Request,
  services: PackageRouteServices,
  packageId: string,
): Promise<Response> {
  const authorization = await services.authorize("package.write");
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
  const pkg = await services.updatePackage(authResult.tenantId, packageId, input);
  if (pkg === null) {
    return response(404);
  }
  return response(200, { package: pkg });
}

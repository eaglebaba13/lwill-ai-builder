import "server-only";

export type BusinessUnitAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface BusinessUnitWriteInput {
  readonly name: string;
  readonly slug: string;
  readonly isActive?: boolean;
}

export interface BusinessUnitUpdateInput {
  readonly name?: string;
  readonly slug?: string;
  readonly isActive?: boolean;
}

export interface BusinessUnitRouteServices {
  readonly authorize: (permissionCode: string) => Promise<BusinessUnitAuthorization>;
  readonly listBusinessUnits: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getBusinessUnit: (tenantId: string, businessUnitId: string) => Promise<unknown | null>;
  readonly createBusinessUnit: (tenantId: string, input: BusinessUnitWriteInput) => Promise<unknown>;
  readonly updateBusinessUnit: (
    tenantId: string,
    businessUnitId: string,
    input: BusinessUnitUpdateInput,
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
  authorization: BusinessUnitAuthorization,
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

function parseCreateInput(input: unknown): BusinessUnitWriteInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["name", "slug", "isActive"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
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
    name: record.name,
    slug: record.slug,
    isActive: record.isActive ?? true,
  };
}

function parseUpdateInput(input: unknown): BusinessUnitUpdateInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["name", "slug", "isActive"]);
  if (Object.keys(record).length === 0) {
    return null;
  }
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  const update: {
    name?: string;
    slug?: string;
    isActive?: boolean;
  } = {};
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
  return update as BusinessUnitUpdateInput;
}

const INVALID_JSON = Symbol("invalid-json");

async function readJsonBody(request: Request): Promise<unknown | typeof INVALID_JSON> {
  try {
    return await request.json();
  } catch {
    return INVALID_JSON;
  }
}

export async function handleListBusinessUnits(
  _request: Request,
  services: BusinessUnitRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("business-unit.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const businessUnitList = await services.listBusinessUnits(authResult.tenantId);
  return response(200, { businessUnits: businessUnitList });
}

export async function handleCreateBusinessUnit(
  request: Request,
  services: BusinessUnitRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("business-unit.write");
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
  const businessUnit = await services.createBusinessUnit(authResult.tenantId, input);
  return response(201, { businessUnit });
}

export async function handleGetBusinessUnit(
  _request: Request,
  services: BusinessUnitRouteServices,
  businessUnitId: string,
): Promise<Response> {
  const authorization = await services.authorize("business-unit.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const businessUnit = await services.getBusinessUnit(authResult.tenantId, businessUnitId);
  if (businessUnit === null) {
    return response(404);
  }
  return response(200, { businessUnit });
}

export async function handleUpdateBusinessUnit(
  request: Request,
  services: BusinessUnitRouteServices,
  businessUnitId: string,
): Promise<Response> {
  const authorization = await services.authorize("business-unit.write");
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
  const businessUnit = await services.updateBusinessUnit(authResult.tenantId, businessUnitId, input);
  if (businessUnit === null) {
    return response(404);
  }
  return response(200, { businessUnit });
}

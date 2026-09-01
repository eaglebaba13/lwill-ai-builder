import "server-only";

export type WarehouseAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface WarehouseWriteInput {
  readonly name: string;
  readonly location?: string | null;
  readonly isActive?: boolean;
}

export interface WarehouseUpdateInput {
  readonly name?: string;
  readonly location?: string | null;
  readonly isActive?: boolean;
}

export interface WarehouseRouteServices {
  readonly authorize: (permissionCode: string) => Promise<WarehouseAuthorization>;
  readonly listWarehouses: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getWarehouse: (tenantId: string, warehouseId: string) => Promise<unknown | null>;
  readonly createWarehouse: (tenantId: string, input: WarehouseWriteInput) => Promise<unknown>;
  readonly updateWarehouse: (
    tenantId: string,
    warehouseId: string,
    input: WarehouseUpdateInput,
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
  authorization: WarehouseAuthorization,
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

function parseCreateInput(input: unknown): WarehouseWriteInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["name", "location", "isActive"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (!isNonEmptyString(record.name)) {
    return null;
  }
  if (record.location !== undefined && !isOptionalString(record.location)) {
    return null;
  }
  if (record.isActive !== undefined && typeof record.isActive !== "boolean") {
    return null;
  }
  return {
    name: record.name,
    location: record.location ?? null,
    isActive: record.isActive ?? true,
  };
}

function parseUpdateInput(input: unknown): WarehouseUpdateInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  if (Object.keys(record).length === 0) {
    return null;
  }
  const allowedKeys = new Set(["name", "location", "isActive"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  const update: { name?: string; location?: string | null; isActive?: boolean } = {};
  if (record.name !== undefined) {
    if (!isNonEmptyString(record.name)) {
      return null;
    }
    update.name = record.name;
  }
  if (record.location !== undefined) {
    if (!isOptionalString(record.location)) {
      return null;
    }
    update.location = record.location ?? null;
  }
  if (record.isActive !== undefined) {
    if (typeof record.isActive !== "boolean") {
      return null;
    }
    update.isActive = record.isActive;
  }
  return update as WarehouseUpdateInput;
}

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

const INVALID_JSON = Symbol("invalid-json");

async function readJsonBody(request: Request): Promise<unknown | typeof INVALID_JSON> {
  try {
    return await request.json();
  } catch {
    return INVALID_JSON;
  }
}

export async function handleListWarehouses(
  _request: Request,
  services: WarehouseRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("warehouse.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const warehouseList = await services.listWarehouses(authResult.tenantId);
  return response(200, { warehouses: warehouseList });
}

export async function handleCreateWarehouse(
  request: Request,
  services: WarehouseRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("warehouse.write");
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
  const warehouse = await services.createWarehouse(authResult.tenantId, input);
  return response(201, { warehouse });
}

export async function handleGetWarehouse(
  _request: Request,
  services: WarehouseRouteServices,
  warehouseId: string,
): Promise<Response> {
  const authorization = await services.authorize("warehouse.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const warehouse = await services.getWarehouse(authResult.tenantId, warehouseId);
  if (warehouse === null) {
    return response(404);
  }
  return response(200, { warehouse });
}

export async function handleUpdateWarehouse(
  request: Request,
  services: WarehouseRouteServices,
  warehouseId: string,
): Promise<Response> {
  const authorization = await services.authorize("warehouse.write");
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
  const warehouse = await services.updateWarehouse(authResult.tenantId, warehouseId, input);
  if (warehouse === null) {
    return response(404);
  }
  return response(200, { warehouse });
}

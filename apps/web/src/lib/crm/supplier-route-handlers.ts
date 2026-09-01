import "server-only";

export type SupplierAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface SupplierWriteInput {
  readonly name: string;
  readonly contactName?: string | null;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly address?: string | null;
  readonly isActive?: boolean;
}

export interface SupplierUpdateInput {
  readonly name?: string;
  readonly contactName?: string | null;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly address?: string | null;
  readonly isActive?: boolean;
}

export interface SupplierRouteServices {
  readonly authorize: (permissionCode: string) => Promise<SupplierAuthorization>;
  readonly listSuppliers: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getSupplier: (tenantId: string, supplierId: string) => Promise<unknown | null>;
  readonly createSupplier: (tenantId: string, input: SupplierWriteInput) => Promise<unknown>;
  readonly updateSupplier: (
    tenantId: string,
    supplierId: string,
    input: SupplierUpdateInput,
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
  authorization: SupplierAuthorization,
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

function parseCreateInput(input: unknown): SupplierWriteInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["name", "contactName", "email", "phone", "address", "isActive"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (!isNonEmptyString(record.name)) {
    return null;
  }
  if (record.contactName !== undefined && !isOptionalString(record.contactName)) {
    return null;
  }
  if (record.email !== undefined && !isOptionalString(record.email)) {
    return null;
  }
  if (record.phone !== undefined && !isOptionalString(record.phone)) {
    return null;
  }
  if (record.address !== undefined && !isOptionalString(record.address)) {
    return null;
  }
  if (record.isActive !== undefined && typeof record.isActive !== "boolean") {
    return null;
  }
  return {
    name: record.name,
    contactName: record.contactName ?? null,
    email: record.email ?? null,
    phone: record.phone ?? null,
    address: record.address ?? null,
    isActive: record.isActive ?? true,
  };
}

function parseUpdateInput(input: unknown): SupplierUpdateInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  if (Object.keys(record).length === 0) {
    return null;
  }
  const allowedKeys = new Set(["name", "contactName", "email", "phone", "address", "isActive"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  const update: { name?: string; contactName?: string | null; email?: string | null; phone?: string | null; address?: string | null; isActive?: boolean } = {};
  if (record.name !== undefined) {
    if (!isNonEmptyString(record.name)) {
      return null;
    }
    update.name = record.name;
  }
  if (record.contactName !== undefined) {
    if (!isOptionalString(record.contactName)) {
      return null;
    }
    update.contactName = record.contactName ?? null;
  }
  if (record.email !== undefined) {
    if (!isOptionalString(record.email)) {
      return null;
    }
    update.email = record.email ?? null;
  }
  if (record.phone !== undefined) {
    if (!isOptionalString(record.phone)) {
      return null;
    }
    update.phone = record.phone ?? null;
  }
  if (record.address !== undefined) {
    if (!isOptionalString(record.address)) {
      return null;
    }
    update.address = record.address ?? null;
  }
  if (record.isActive !== undefined) {
    if (typeof record.isActive !== "boolean") {
      return null;
    }
    update.isActive = record.isActive;
  }
  return update as SupplierUpdateInput;
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

export async function handleListSuppliers(
  _request: Request,
  services: SupplierRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("supplier.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const supplierList = await services.listSuppliers(authResult.tenantId);
  return response(200, { suppliers: supplierList });
}

export async function handleCreateSupplier(
  request: Request,
  services: SupplierRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("supplier.write");
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
  const supplier = await services.createSupplier(authResult.tenantId, input);
  return response(201, { supplier });
}

export async function handleGetSupplier(
  _request: Request,
  services: SupplierRouteServices,
  supplierId: string,
): Promise<Response> {
  const authorization = await services.authorize("supplier.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const supplier = await services.getSupplier(authResult.tenantId, supplierId);
  if (supplier === null) {
    return response(404);
  }
  return response(200, { supplier });
}

export async function handleUpdateSupplier(
  request: Request,
  services: SupplierRouteServices,
  supplierId: string,
): Promise<Response> {
  const authorization = await services.authorize("supplier.write");
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
  const supplier = await services.updateSupplier(authResult.tenantId, supplierId, input);
  if (supplier === null) {
    return response(404);
  }
  return response(200, { supplier });
}

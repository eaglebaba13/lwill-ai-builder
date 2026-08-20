import "server-only";

export type ServiceAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface ServiceWriteInput {
  readonly name: string;
  readonly durationMinutes: number;
  readonly priceCents: number;
  readonly description?: string | null;
}

export interface ServiceUpdateInput {
  readonly name?: string;
  readonly durationMinutes?: number;
  readonly priceCents?: number;
  readonly description?: string | null;
}

export interface ServiceRouteServices {
  readonly authorize: (permissionCode: string) => Promise<ServiceAuthorization>;
  readonly listServices: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getService: (tenantId: string, serviceId: string) => Promise<unknown | null>;
  readonly createService: (tenantId: string, input: ServiceWriteInput) => Promise<unknown>;
  readonly updateService: (
    tenantId: string,
    serviceId: string,
    input: ServiceUpdateInput,
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
  authorization: ServiceAuthorization,
): { readonly ok: true; readonly tenantId: string } | { readonly ok: false; readonly response: Response } {
  if (authorization.outcome === "unauthenticated") {
    return { ok: false, response: response(401) };
  }
  if (authorization.outcome === "forbidden") {
    return { ok: false, response: response(403) };
  }
  return { ok: true, tenantId: authorization.tenantId };
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function parseCreateInput(input: unknown): ServiceWriteInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["name", "durationMinutes", "priceCents", "description"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (typeof record.name !== "string" || record.name.trim() === "") {
    return null;
  }
  if (!isPositiveInteger(record.durationMinutes)) {
    return null;
  }
  if (!isNonNegativeInteger(record.priceCents)) {
    return null;
  }
  if (!isOptionalString(record.description)) {
    return null;
  }
  return {
    name: record.name,
    durationMinutes: record.durationMinutes,
    priceCents: record.priceCents,
    description: (record.description as string | null | undefined) ?? null,
  };
}

function parseUpdateInput(input: unknown): ServiceUpdateInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["name", "durationMinutes", "priceCents", "description"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (Object.keys(record).length === 0) {
    return null;
  }
  if (record.name !== undefined && (typeof record.name !== "string" || record.name.trim() === "")) {
    return null;
  }
  if (record.durationMinutes !== undefined && !isPositiveInteger(record.durationMinutes)) {
    return null;
  }
  if (record.priceCents !== undefined && !isNonNegativeInteger(record.priceCents)) {
    return null;
  }
  if (!isOptionalString(record.description)) {
    return null;
  }
  const update: {
    name?: string;
    durationMinutes?: number;
    priceCents?: number;
    description?: string | null;
  } = {};
  if (record.name !== undefined) update.name = record.name;
  if (record.durationMinutes !== undefined) update.durationMinutes = record.durationMinutes;
  if (record.priceCents !== undefined) update.priceCents = record.priceCents;
  if (record.description !== undefined) update.description = record.description as string | null;
  return update;
}

async function readJsonBody(request: Request): Promise<unknown | typeof INVALID_JSON> {
  try {
    return await request.json();
  } catch {
    return INVALID_JSON;
  }
}

const INVALID_JSON = Symbol("invalid-json");

export async function handleListServices(
  _request: Request,
  services: ServiceRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("service.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const serviceList = await services.listServices(authResult.tenantId);
  return response(200, { services: serviceList });
}

export async function handleCreateService(
  request: Request,
  services: ServiceRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("service.write");
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
  const service = await services.createService(authResult.tenantId, input);
  return response(201, { service });
}

export async function handleGetService(
  _request: Request,
  services: ServiceRouteServices,
  serviceId: string,
): Promise<Response> {
  const authorization = await services.authorize("service.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const service = await services.getService(authResult.tenantId, serviceId);
  if (service === null) {
    return response(404);
  }
  return response(200, { service });
}

export async function handleUpdateService(
  request: Request,
  services: ServiceRouteServices,
  serviceId: string,
): Promise<Response> {
  const authorization = await services.authorize("service.write");
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
  const service = await services.updateService(authResult.tenantId, serviceId, input);
  if (service === null) {
    return response(404);
  }
  return response(200, { service });
}

import "server-only";

export type CustomerAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface CustomerWriteInput {
  readonly name: string;
  readonly phone?: string | null;
  readonly email?: string | null;
  readonly notes?: string | null;
}

export interface CustomerRouteServices {
  readonly authorize: () => Promise<CustomerAuthorization>;
  readonly listCustomers: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getCustomer: (tenantId: string, customerId: string) => Promise<unknown | null>;
  readonly createCustomer: (tenantId: string, input: CustomerWriteInput) => Promise<unknown>;
  readonly updateCustomer: (
    tenantId: string,
    customerId: string,
    input: Partial<CustomerWriteInput> & { isActive?: boolean },
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
  authorization: CustomerAuthorization,
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

function parseWriteInput(input: unknown, requireName: boolean): CustomerWriteInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["name", "phone", "email", "notes"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (requireName && (typeof record.name !== "string" || record.name.trim() === "")) {
    return null;
  }
  if (
    !isOptionalString(record.phone)
    || !isOptionalString(record.email)
    || !isOptionalString(record.notes)
    || (record.name !== undefined && typeof record.name !== "string")
  ) {
    return null;
  }
  return {
    name: record.name as string,
    phone: (record.phone as string | null | undefined) ?? null,
    email: (record.email as string | null | undefined) ?? null,
    notes: (record.notes as string | null | undefined) ?? null,
  };
}

async function readJsonBody(request: Request): Promise<unknown | typeof INVALID_JSON> {
  try {
    return await request.json();
  } catch {
    return INVALID_JSON;
  }
}

const INVALID_JSON = Symbol("invalid-json");

export async function handleListCustomers(
  _request: Request,
  services: CustomerRouteServices,
): Promise<Response> {
  const authorization = await services.authorize();
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const customers = await services.listCustomers(authResult.tenantId);
  return response(200, { customers });
}

export async function handleCreateCustomer(
  request: Request,
  services: CustomerRouteServices,
): Promise<Response> {
  const authorization = await services.authorize();
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const body = await readJsonBody(request);
  if (body === INVALID_JSON) {
    return response(400);
  }
  const input = parseWriteInput(body, true);
  if (input === null) {
    return response(400);
  }
  const customer = await services.createCustomer(authResult.tenantId, input);
  return response(201, { customer });
}

export async function handleGetCustomer(
  _request: Request,
  services: CustomerRouteServices,
  customerId: string,
): Promise<Response> {
  const authorization = await services.authorize();
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const customer = await services.getCustomer(authResult.tenantId, customerId);
  if (customer === null) {
    return response(404);
  }
  return response(200, { customer });
}

export async function handleUpdateCustomer(
  request: Request,
  services: CustomerRouteServices,
  customerId: string,
): Promise<Response> {
  const authorization = await services.authorize();
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
  const record = body as Record<string, unknown>;
  const allowedKeys = new Set(["name", "phone", "email", "notes", "isActive"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return response(400);
  }
  if (record.isActive !== undefined && typeof record.isActive !== "boolean") {
    return response(400);
  }
  const input = parseWriteInput(
    { name: record.name, phone: record.phone, email: record.email, notes: record.notes },
    false,
  );
  if (input === null) {
    return response(400);
  }
  const update: {
    name?: string;
    phone?: string | null;
    email?: string | null;
    notes?: string | null;
    isActive?: boolean;
  } = {};
  if (record.name !== undefined) update.name = input.name;
  if (record.phone !== undefined) update.phone = input.phone;
  if (record.email !== undefined) update.email = input.email;
  if (record.notes !== undefined) update.notes = input.notes;
  if (record.isActive !== undefined) update.isActive = record.isActive as boolean;

  const customer = await services.updateCustomer(authResult.tenantId, customerId, update);
  if (customer === null) {
    return response(404);
  }
  return response(200, { customer });
}

import "server-only";

export type GatewayAccountAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface GatewayAccountCreateInput {
  readonly provider: string;
  readonly label?: string | null;
  readonly isActive?: boolean;
  readonly config?: Record<string, unknown> | null;
}

export interface GatewayAccountUpdateInput {
  readonly label?: string | null;
  readonly isActive?: boolean;
  readonly config?: Record<string, unknown> | null;
}

export interface GatewayAccountRouteServices {
  readonly authorize: (permissionCode: string) => Promise<GatewayAccountAuthorization>;
  readonly listGatewayAccounts: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getGatewayAccount: (tenantId: string, accountId: string) => Promise<unknown | null>;
  readonly createGatewayAccount: (tenantId: string, input: GatewayAccountCreateInput) => Promise<unknown>;
  readonly updateGatewayAccount: (tenantId: string, accountId: string, input: GatewayAccountUpdateInput) => Promise<unknown | null>;
  readonly deleteGatewayAccount: (tenantId: string, accountId: string) => Promise<boolean>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: GatewayAccountAuthorization,
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

const INVALID_JSON = Symbol("invalid-json");

async function readJsonBody(request: Request): Promise<unknown | typeof INVALID_JSON> {
  try {
    return await request.json();
  } catch {
    return INVALID_JSON;
  }
}

export async function handleListGatewayAccounts(
  _request: Request,
  services: GatewayAccountRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("tenant.manage");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const accountList = await services.listGatewayAccounts(authResult.tenantId);
  return response(200, { gatewayAccounts: accountList });
}

export async function handleGetGatewayAccount(
  _request: Request,
  services: GatewayAccountRouteServices,
  accountId: string,
): Promise<Response> {
  const authorization = await services.authorize("tenant.manage");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const account = await services.getGatewayAccount(authResult.tenantId, accountId);
  if (account === null) {
    return response(404);
  }
  return response(200, { gatewayAccount: account });
}

export async function handleCreateGatewayAccount(
  request: Request,
  services: GatewayAccountRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("tenant.manage");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const body = await readJsonBody(request);
  if (body === INVALID_JSON) {
    return response(400, { error: "Invalid JSON body" });
  }
  if (typeof body !== "object" || body === null) {
    return response(400, { error: "Request body must be an object" });
  }
  const record = body as Record<string, unknown>;
  const allowedKeys = new Set(["provider", "label", "isActive", "config"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return response(400, { error: "Only provider, label, isActive, and config are allowed" });
  }
  if (!isNonEmptyString(record.provider)) {
    return response(400, { error: "provider is required and must be a non-empty string" });
  }
  if (record.label !== undefined && record.label !== null && !isNonEmptyString(record.label)) {
    return response(400, { error: "label must be a non-empty string or null" });
  }
  if (record.isActive !== undefined && typeof record.isActive !== "boolean") {
    return response(400, { error: "isActive must be a boolean" });
  }
  if (record.config !== undefined && record.config !== null && typeof record.config !== "object") {
    return response(400, { error: "config must be an object or null" });
  }
  const input: GatewayAccountCreateInput = {
    provider: record.provider as string,
    label: (record.label as string | null | undefined) ?? null,
    isActive: record.isActive as boolean | undefined,
    config: (record.config as Record<string, unknown> | null | undefined) ?? null,
  };
  const account = await services.createGatewayAccount(authResult.tenantId, input);
  return response(201, { gatewayAccount: account });
}

export async function handleUpdateGatewayAccount(
  request: Request,
  services: GatewayAccountRouteServices,
  accountId: string,
): Promise<Response> {
  const authorization = await services.authorize("tenant.manage");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const body = await readJsonBody(request);
  if (body === INVALID_JSON) {
    return response(400, { error: "Invalid JSON body" });
  }
  if (typeof body !== "object" || body === null) {
    return response(400, { error: "Request body must be an object" });
  }
  const record = body as Record<string, unknown>;
  const allowedKeys = new Set(["label", "isActive", "config"]);
  if (Object.keys(record).length === 0) {
    return response(400, { error: "At least one field must be provided" });
  }
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return response(400, { error: "Only label, isActive, and config are allowed" });
  }
  if (record.label !== undefined && record.label !== null && !isNonEmptyString(record.label)) {
    return response(400, { error: "label must be a non-empty string or null" });
  }
  if (record.isActive !== undefined && typeof record.isActive !== "boolean") {
    return response(400, { error: "isActive must be a boolean" });
  }
  if (record.config !== undefined && record.config !== null && typeof record.config !== "object") {
    return response(400, { error: "config must be an object or null" });
  }
  const input: { label?: string | null; isActive?: boolean; config?: Record<string, unknown> | null } = {};
  if (record.label !== undefined) input.label = record.label as string | null;
  if (record.isActive !== undefined) input.isActive = record.isActive as boolean;
  if (record.config !== undefined) input.config = record.config as Record<string, unknown> | null;
  const account = await services.updateGatewayAccount(authResult.tenantId, accountId, input);
  if (account === null) {
    return response(404);
  }
  return response(200, { gatewayAccount: account });
}

export async function handleDeleteGatewayAccount(
  _request: Request,
  services: GatewayAccountRouteServices,
  accountId: string,
): Promise<Response> {
  const authorization = await services.authorize("tenant.manage");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const deleted = await services.deleteGatewayAccount(authResult.tenantId, accountId);
  if (!deleted) {
    return response(404);
  }
  return response(204);
}

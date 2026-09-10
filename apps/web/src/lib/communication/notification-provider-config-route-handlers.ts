import "server-only";

export type NotificationProviderConfigAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface NotificationProviderConfigCreateInput {
  readonly channel: string;
  readonly provider: string;
  readonly isActive?: boolean;
  readonly config?: Record<string, unknown> | null;
}

export interface NotificationProviderConfigUpdateInput {
  readonly provider?: string;
  readonly isActive?: boolean;
  readonly config?: Record<string, unknown> | null;
}

export interface NotificationProviderConfigRouteServices {
  readonly authorize: (permissionCode: string) => Promise<NotificationProviderConfigAuthorization>;
  readonly listNotificationProviderConfigs: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getNotificationProviderConfig: (tenantId: string, id: string) => Promise<unknown | null>;
  readonly createNotificationProviderConfig: (tenantId: string, input: NotificationProviderConfigCreateInput) => Promise<unknown>;
  readonly updateNotificationProviderConfig: (tenantId: string, id: string, input: NotificationProviderConfigUpdateInput) => Promise<unknown | null>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) return new Response(null, { status, headers: RESPONSE_HEADERS });
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: NotificationProviderConfigAuthorization,
): { readonly ok: true; readonly tenantId: string } | { readonly ok: false; readonly response: Response } {
  if (authorization.outcome === "unauthenticated") return { ok: false, response: response(401) };
  if (authorization.outcome === "forbidden") return { ok: false, response: response(403) };
  return { ok: true, tenantId: authorization.tenantId };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isConfig(value: unknown): value is Record<string, unknown> | null {
  return value === null || (typeof value === "object" && value !== null && !Array.isArray(value));
}

const INVALID_JSON = Symbol("invalid-json");

async function readJsonBody(request: Request): Promise<unknown | typeof INVALID_JSON> {
  try {
    return await request.json();
  } catch {
    return INVALID_JSON;
  }
}

function parseCreateInput(body: unknown): NotificationProviderConfigCreateInput | null {
  if (typeof body !== "object" || body === null) return null;
  const record = body as Record<string, unknown>;
  const allowedKeys = new Set(["channel", "provider", "isActive", "config"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) return null;
  if (!isNonEmptyString(record.channel) || !isNonEmptyString(record.provider)) return null;
  if (record.isActive !== undefined && typeof record.isActive !== "boolean") return null;
  if (record.config !== undefined && !isConfig(record.config)) return null;
  return {
    channel: record.channel,
    provider: record.provider,
    isActive: record.isActive as boolean | undefined,
    config: record.config as Record<string, unknown> | null | undefined,
  };
}

function parseUpdateInput(body: unknown): NotificationProviderConfigUpdateInput | null {
  if (typeof body !== "object" || body === null) return null;
  const record = body as Record<string, unknown>;
  const allowedKeys = new Set(["provider", "isActive", "config"]);
  if (Object.keys(record).length === 0 || Object.keys(record).some((key) => !allowedKeys.has(key))) return null;
  if (record.provider !== undefined && !isNonEmptyString(record.provider)) return null;
  if (record.isActive !== undefined && typeof record.isActive !== "boolean") return null;
  if (record.config !== undefined && !isConfig(record.config)) return null;
  return {
    provider: record.provider as string | undefined,
    isActive: record.isActive as boolean | undefined,
    config: record.config as Record<string, unknown> | null | undefined,
  };
}

export async function handleListNotificationProviderConfigs(
  _request: Request,
  services: NotificationProviderConfigRouteServices,
): Promise<Response> {
  const authResult = authorizationOutcome(await services.authorize("notification.read"));
  if (!authResult.ok) return authResult.response;
  return response(200, { notificationProviderConfigs: await services.listNotificationProviderConfigs(authResult.tenantId) });
}

export async function handleGetNotificationProviderConfig(
  _request: Request,
  services: NotificationProviderConfigRouteServices,
  id: string,
): Promise<Response> {
  const authResult = authorizationOutcome(await services.authorize("notification.read"));
  if (!authResult.ok) return authResult.response;
  const config = await services.getNotificationProviderConfig(authResult.tenantId, id);
  return config === null ? response(404) : response(200, { notificationProviderConfig: config });
}

export async function handleCreateNotificationProviderConfig(
  request: Request,
  services: NotificationProviderConfigRouteServices,
): Promise<Response> {
  const authResult = authorizationOutcome(await services.authorize("notification.write"));
  if (!authResult.ok) return authResult.response;
  const body = await readJsonBody(request);
  if (body === INVALID_JSON) return response(400, { error: "Invalid JSON body" });
  const input = parseCreateInput(body);
  if (input === null) return response(400, { error: "Invalid provider configuration" });
  return response(201, { notificationProviderConfig: await services.createNotificationProviderConfig(authResult.tenantId, input) });
}

export async function handleUpdateNotificationProviderConfig(
  request: Request,
  services: NotificationProviderConfigRouteServices,
  id: string,
): Promise<Response> {
  const authResult = authorizationOutcome(await services.authorize("notification.write"));
  if (!authResult.ok) return authResult.response;
  const body = await readJsonBody(request);
  if (body === INVALID_JSON) return response(400, { error: "Invalid JSON body" });
  const input = parseUpdateInput(body);
  if (input === null) return response(400, { error: "Invalid provider configuration update" });
  const config = await services.updateNotificationProviderConfig(authResult.tenantId, id, input);
  return config === null ? response(404) : response(200, { notificationProviderConfig: config });
}

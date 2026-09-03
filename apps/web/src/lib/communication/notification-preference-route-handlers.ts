import "server-only";

export type NotificationPreferenceAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string; readonly userId: string };

export interface NotificationPreferenceCreateInput {
  readonly channel: string;
  readonly isEnabled?: boolean;
}

export interface NotificationPreferenceUpdateInput {
  readonly channel: string;
  readonly isEnabled?: boolean;
}

export interface NotificationPreferenceRouteServices {
  readonly authorize: (permissionCode: string) => Promise<NotificationPreferenceAuthorization>;
  readonly listNotificationPreferences: (tenantId: string, userId: string) => Promise<readonly unknown[]>;
  readonly createNotificationPreference: (tenantId: string, userId: string, input: NotificationPreferenceCreateInput) => Promise<unknown>;
  readonly updateNotificationPreference: (tenantId: string, userId: string, channel: string, input: { isEnabled?: boolean }) => Promise<unknown | null>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: NotificationPreferenceAuthorization,
): { readonly ok: true; readonly tenantId: string; readonly userId: string } | { readonly ok: false; readonly response: Response } {
  if (authorization.outcome === "unauthenticated") {
    return { ok: false, response: response(401) };
  }
  if (authorization.outcome === "forbidden") {
    return { ok: false, response: response(403) };
  }
  return { ok: true, tenantId: authorization.tenantId, userId: authorization.userId };
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

export async function handleListNotificationPreferences(
  _request: Request,
  services: NotificationPreferenceRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("notification.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const preferenceList = await services.listNotificationPreferences(authResult.tenantId, authResult.userId);
  return response(200, { notificationPreferences: preferenceList });
}

export async function handleCreateNotificationPreference(
  request: Request,
  services: NotificationPreferenceRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("notification.write");
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
  const allowedKeys = new Set(["channel", "isEnabled"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return response(400, { error: "Only channel and isEnabled are allowed" });
  }
  if (!isNonEmptyString(record.channel)) {
    return response(400, { error: "channel is required and must be a non-empty string" });
  }
  if (record.isEnabled !== undefined && typeof record.isEnabled !== "boolean") {
    return response(400, { error: "isEnabled must be a boolean" });
  }
  const input: NotificationPreferenceCreateInput = {
    channel: record.channel,
    isEnabled: record.isEnabled as boolean | undefined,
  };
  const preference = await services.createNotificationPreference(authResult.tenantId, authResult.userId, input);
  return response(201, { notificationPreference: preference });
}

export async function handleUpdateNotificationPreference(
  request: Request,
  services: NotificationPreferenceRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("notification.write");
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
  const allowedKeys = new Set(["channel", "isEnabled"]);
  if (Object.keys(record).length === 0) {
    return response(400, { error: "At least one field must be provided" });
  }
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return response(400, { error: "Only channel and isEnabled are allowed" });
  }
  if (!isNonEmptyString(record.channel)) {
    return response(400, { error: "channel is required and must be a non-empty string" });
  }
  if (record.isEnabled !== undefined && typeof record.isEnabled !== "boolean") {
    return response(400, { error: "isEnabled must be a boolean" });
  }
  if (record.isEnabled === undefined) {
    return response(400, { error: "isEnabled is required for update" });
  }
  const preference = await services.updateNotificationPreference(
    authResult.tenantId,
    authResult.userId,
    record.channel,
    { isEnabled: record.isEnabled as boolean },
  );
  if (preference === null) {
    return response(404);
  }
  return response(200, { notificationPreference: preference });
}

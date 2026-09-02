import "server-only";

export type NotificationDispatchAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface NotificationDispatchRouteServices {
  readonly authorize: (permissionCode: string) => Promise<NotificationDispatchAuthorization>;
  readonly dispatchNotification: (input: {
    readonly tenantId: string;
    readonly templateId: string;
    readonly recipientId?: string | null;
    readonly variables?: Record<string, unknown> | null;
    readonly scheduledAt?: Date | null;
    readonly channel?: string | null;
  }) => Promise<{
    readonly success: boolean;
    readonly status: string;
    readonly queueId: string;
    readonly logId: string;
    readonly errorMessage: string | null;
  }>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: NotificationDispatchAuthorization,
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

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function isOptionalDate(value: unknown): value is Date | null | undefined {
  if (value === undefined || value === null) {
    return true;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return true;
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return true;
    }
  }
  return false;
}

function isOptionalObject(value: unknown): value is Record<string, unknown> | null | undefined {
  if (value === undefined || value === null) {
    return true;
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return true;
  }
  return false;
}

const INVALID_JSON = Symbol("invalid-json");

async function readJsonBody(request: Request): Promise<unknown | typeof INVALID_JSON> {
  try {
    return await request.json();
  } catch {
    return INVALID_JSON;
  }
}

export async function handleDispatchNotification(
  request: Request,
  services: NotificationDispatchRouteServices,
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

  if (!isNonEmptyString(record.templateId)) {
    return response(400, { error: "templateId is required" });
  }

  const input: {
    templateId: string;
    recipientId?: string | null;
    variables?: Record<string, unknown> | null;
    scheduledAt?: Date | null;
    channel?: string | null;
  } = {
    templateId: record.templateId,
    recipientId: isOptionalString(record.recipientId) ? (record.recipientId ?? null) : null,
    variables: isOptionalObject(record.variables) ? (record.variables ?? null) : null,
    scheduledAt: isOptionalDate(record.scheduledAt) ? (record.scheduledAt ?? null) : null,
    channel: isOptionalString(record.channel) ? (record.channel ?? null) : null,
  };

  if (input.variables === null || input.variables === undefined) {
    input.variables = null;
  }

  try {
    const result = await services.dispatchNotification({
      tenantId: authResult.tenantId,
      ...input,
    });
    return response(200, { dispatch: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "dispatch failed";
    const status = message.includes("not found") || message.includes("inactive") ? 404 : 500;
    return response(status, { error: message });
  }
}

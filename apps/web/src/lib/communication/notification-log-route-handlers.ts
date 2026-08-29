import "server-only";

export type NotificationLogAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface NotificationLogWriteInput {
  readonly recipientId?: string | null;
  readonly channel: string;
  readonly subject?: string | null;
  readonly body: string;
  readonly status: string;
  readonly errorMessage?: string | null;
  readonly sentAt?: Date | null;
  readonly deliveredAt?: Date | null;
  readonly readAt?: Date | null;
}

export interface NotificationLogRouteServices {
  readonly authorize: (permissionCode: string) => Promise<NotificationLogAuthorization>;
  readonly listNotificationLogs: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getNotificationLog: (tenantId: string, logId: string) => Promise<unknown | null>;
  readonly createNotificationLog: (tenantId: string, input: NotificationLogWriteInput) => Promise<unknown>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: NotificationLogAuthorization,
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

function parseCreateInput(input: unknown): NotificationLogWriteInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set([
    "recipientId",
    "channel",
    "subject",
    "body",
    "status",
    "errorMessage",
    "sentAt",
    "deliveredAt",
    "readAt",
  ]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (!isNonEmptyString(record.channel)) {
    return null;
  }
  if (!isNonEmptyString(record.body)) {
    return null;
  }
  if (!isNonEmptyString(record.status)) {
    return null;
  }
  if (record.recipientId !== undefined && !isOptionalString(record.recipientId)) {
    return null;
  }
  if (record.subject !== undefined && !isOptionalString(record.subject)) {
    return null;
  }
  if (record.errorMessage !== undefined && !isOptionalString(record.errorMessage)) {
    return null;
  }
  if (record.sentAt !== undefined && !isOptionalDate(record.sentAt)) {
    return null;
  }
  if (record.deliveredAt !== undefined && !isOptionalDate(record.deliveredAt)) {
    return null;
  }
  if (record.readAt !== undefined && !isOptionalDate(record.readAt)) {
    return null;
  }
  return {
    recipientId: record.recipientId ?? null,
    channel: record.channel,
    subject: record.subject ?? null,
    body: record.body,
    status: record.status,
    errorMessage: record.errorMessage ?? null,
    sentAt: toDate(record.sentAt),
    deliveredAt: toDate(record.deliveredAt),
    readAt: toDate(record.readAt),
  };
}

function toDate(value: unknown): Date | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
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

const INVALID_JSON = Symbol("invalid-json");

async function readJsonBody(request: Request): Promise<unknown | typeof INVALID_JSON> {
  try {
    return await request.json();
  } catch {
    return INVALID_JSON;
  }
}

export async function handleListNotificationLogs(
  _request: Request,
  services: NotificationLogRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("notification.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const logList = await services.listNotificationLogs(authResult.tenantId);
  return response(200, { notificationLogs: logList });
}

export async function handleGetNotificationLog(
  _request: Request,
  services: NotificationLogRouteServices,
  logId: string,
): Promise<Response> {
  const authorization = await services.authorize("notification.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const log = await services.getNotificationLog(authResult.tenantId, logId);
  if (log === null) {
    return response(404);
  }
  return response(200, { notificationLog: log });
}

export async function handleCreateNotificationLog(
  request: Request,
  services: NotificationLogRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("notification.write");
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
  const log = await services.createNotificationLog(authResult.tenantId, input);
  return response(201, { notificationLog: log });
}

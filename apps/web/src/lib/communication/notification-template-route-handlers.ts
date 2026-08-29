import "server-only";

export type NotificationTemplateAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface NotificationTemplateWriteInput {
  readonly name: string;
  readonly channel: string;
  readonly subject?: string | null;
  readonly body: string;
  readonly isActive?: boolean;
}

export interface NotificationTemplateUpdateInput {
  readonly name?: string;
  readonly channel?: string;
  readonly subject?: string | null;
  readonly body?: string;
  readonly isActive?: boolean;
}

export interface NotificationTemplateRouteServices {
  readonly authorize: (permissionCode: string) => Promise<NotificationTemplateAuthorization>;
  readonly listNotificationTemplates: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getNotificationTemplate: (tenantId: string, templateId: string) => Promise<unknown | null>;
  readonly createNotificationTemplate: (tenantId: string, input: NotificationTemplateWriteInput) => Promise<unknown>;
  readonly updateNotificationTemplate: (
    tenantId: string,
    templateId: string,
    input: NotificationTemplateUpdateInput,
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
  authorization: NotificationTemplateAuthorization,
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

function parseCreateInput(input: unknown): NotificationTemplateWriteInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["name", "channel", "subject", "body", "isActive"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (!isNonEmptyString(record.name)) {
    return null;
  }
  if (!isNonEmptyString(record.channel)) {
    return null;
  }
  if (record.subject !== undefined && !isOptionalString(record.subject)) {
    return null;
  }
  if (!isNonEmptyString(record.body)) {
    return null;
  }
  if (record.isActive !== undefined && typeof record.isActive !== "boolean") {
    return null;
  }
  return {
    name: record.name,
    channel: record.channel,
    subject: record.subject ?? null,
    body: record.body,
    isActive: record.isActive ?? true,
  };
}

function parseUpdateInput(input: unknown): NotificationTemplateUpdateInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["name", "channel", "subject", "body", "isActive"]);
  if (Object.keys(record).length === 0) {
    return null;
  }
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  const update: {
    name?: string;
    channel?: string;
    subject?: string | null;
    body?: string;
    isActive?: boolean;
  } = {};
  if (record.name !== undefined) {
    if (!isNonEmptyString(record.name)) {
      return null;
    }
    update.name = record.name;
  }
  if (record.channel !== undefined) {
    if (!isNonEmptyString(record.channel)) {
      return null;
    }
    update.channel = record.channel;
  }
  if (record.subject !== undefined) {
    if (!isOptionalString(record.subject)) {
      return null;
    }
    update.subject = record.subject;
  }
  if (record.body !== undefined) {
    if (!isNonEmptyString(record.body)) {
      return null;
    }
    update.body = record.body;
  }
  if (record.isActive !== undefined) {
    if (typeof record.isActive !== "boolean") {
      return null;
    }
    update.isActive = record.isActive;
  }
  return update;
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

export async function handleListNotificationTemplates(
  _request: Request,
  services: NotificationTemplateRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("notification.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const templateList = await services.listNotificationTemplates(authResult.tenantId);
  return response(200, { notificationTemplates: templateList });
}

export async function handleGetNotificationTemplate(
  _request: Request,
  services: NotificationTemplateRouteServices,
  templateId: string,
): Promise<Response> {
  const authorization = await services.authorize("notification.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const template = await services.getNotificationTemplate(authResult.tenantId, templateId);
  if (template === null) {
    return response(404);
  }
  return response(200, { notificationTemplate: template });
}

export async function handleCreateNotificationTemplate(
  request: Request,
  services: NotificationTemplateRouteServices,
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
  const template = await services.createNotificationTemplate(authResult.tenantId, input);
  return response(201, { notificationTemplate: template });
}

export async function handleUpdateNotificationTemplate(
  request: Request,
  services: NotificationTemplateRouteServices,
  templateId: string,
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
  const input = parseUpdateInput(body);
  if (input === null) {
    return response(400);
  }
  const template = await services.updateNotificationTemplate(authResult.tenantId, templateId, input);
  if (template === null) {
    return response(404);
  }
  return response(200, { notificationTemplate: template });
}

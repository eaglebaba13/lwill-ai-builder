import "server-only";

export type EventSubscriptionAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface EventSubscriptionCreateInput {
  readonly eventType: string;
  readonly notificationTemplateId?: string | null;
  readonly isEnabled?: boolean;
}

export interface EventSubscriptionUpdateInput {
  readonly notificationTemplateId?: string | null;
  readonly isEnabled?: boolean;
}

export interface EventSubscriptionRouteServices {
  readonly authorize: (permissionCode: string) => Promise<EventSubscriptionAuthorization>;
  readonly listEventSubscriptions: (tenantId: string, eventType?: string) => Promise<readonly unknown[]>;
  readonly getEventSubscription: (tenantId: string, subscriptionId: string) => Promise<unknown | null>;
  readonly createEventSubscription: (tenantId: string, input: EventSubscriptionCreateInput) => Promise<unknown>;
  readonly updateEventSubscription: (tenantId: string, subscriptionId: string, input: EventSubscriptionUpdateInput) => Promise<unknown | null>;
  readonly deleteEventSubscription: (tenantId: string, subscriptionId: string) => Promise<boolean>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: EventSubscriptionAuthorization,
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

export async function handleListEventSubscriptions(
  request: Request,
  services: EventSubscriptionRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("notification.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const url = new URL(request.url);
  const eventType = url.searchParams.get("eventType") ?? undefined;
  const subscriptionList = await services.listEventSubscriptions(authResult.tenantId, eventType);
  return response(200, { eventSubscriptions: subscriptionList });
}

export async function handleGetEventSubscription(
  _request: Request,
  services: EventSubscriptionRouteServices,
  subscriptionId: string,
): Promise<Response> {
  const authorization = await services.authorize("notification.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const subscription = await services.getEventSubscription(authResult.tenantId, subscriptionId);
  if (subscription === null) {
    return response(404);
  }
  return response(200, { eventSubscription: subscription });
}

export async function handleCreateEventSubscription(
  request: Request,
  services: EventSubscriptionRouteServices,
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
  const allowedKeys = new Set(["eventType", "notificationTemplateId", "isEnabled"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return response(400, { error: "Only eventType, notificationTemplateId, and isEnabled are allowed" });
  }
  if (!isNonEmptyString(record.eventType)) {
    return response(400, { error: "eventType is required and must be a non-empty string" });
  }
  if (record.notificationTemplateId !== undefined && record.notificationTemplateId !== null && !isNonEmptyString(record.notificationTemplateId)) {
    return response(400, { error: "notificationTemplateId must be a non-empty string or null" });
  }
  if (record.isEnabled !== undefined && typeof record.isEnabled !== "boolean") {
    return response(400, { error: "isEnabled must be a boolean" });
  }
  const input: EventSubscriptionCreateInput = {
    eventType: record.eventType as string,
    notificationTemplateId: (record.notificationTemplateId as string | null | undefined) ?? null,
    isEnabled: record.isEnabled as boolean | undefined,
  };
  const subscription = await services.createEventSubscription(authResult.tenantId, input);
  return response(201, { eventSubscription: subscription });
}

export async function handleUpdateEventSubscription(
  request: Request,
  services: EventSubscriptionRouteServices,
  subscriptionId: string,
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
  const allowedKeys = new Set(["notificationTemplateId", "isEnabled"]);
  if (Object.keys(record).length === 0) {
    return response(400, { error: "At least one field must be provided" });
  }
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return response(400, { error: "Only notificationTemplateId and isEnabled are allowed" });
  }
  if (record.notificationTemplateId !== undefined && record.notificationTemplateId !== null && !isNonEmptyString(record.notificationTemplateId)) {
    return response(400, { error: "notificationTemplateId must be a non-empty string or null" });
  }
  if (record.isEnabled !== undefined && typeof record.isEnabled !== "boolean") {
    return response(400, { error: "isEnabled must be a boolean" });
  }
  const input: { notificationTemplateId?: string | null; isEnabled?: boolean } = {};
  if (record.notificationTemplateId !== undefined) input.notificationTemplateId = record.notificationTemplateId as string | null;
  if (record.isEnabled !== undefined) input.isEnabled = record.isEnabled as boolean;
  const subscription = await services.updateEventSubscription(authResult.tenantId, subscriptionId, input);
  if (subscription === null) {
    return response(404);
  }
  return response(200, { eventSubscription: subscription });
}

export async function handleDeleteEventSubscription(
  _request: Request,
  services: EventSubscriptionRouteServices,
  subscriptionId: string,
): Promise<Response> {
  const authorization = await services.authorize("notification.write");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const deleted = await services.deleteEventSubscription(authResult.tenantId, subscriptionId);
  if (!deleted) {
    return response(404);
  }
  return response(204);
}

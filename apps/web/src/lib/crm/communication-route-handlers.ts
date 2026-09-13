import "server-only";

export type CommunicationAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string; readonly userId: string | null };

export interface CommunicationWriteInput {
  readonly channel: string;
  readonly direction: string;
  readonly contactName?: string | null;
  readonly subject?: string | null;
  readonly body: string;
  readonly communicatedAt: string;
  readonly leadId?: string | null;
  readonly customerId?: string | null;
  readonly opportunityId?: string | null;
}

export interface CommunicationRouteServices {
  readonly authorize: (permissionCode: string) => Promise<CommunicationAuthorization>;
  readonly listCommunications: (tenantId: string, channel?: string, direction?: string, leadId?: string, customerId?: string, opportunityId?: string) => Promise<readonly unknown[]>;
  readonly getCommunication: (tenantId: string, communicationId: string) => Promise<unknown | null>;
  readonly createCommunication: (tenantId: string, input: CommunicationWriteInput) => Promise<unknown>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: CommunicationAuthorization,
): { readonly ok: true; readonly tenantId: string; readonly userId: string | null } | { readonly ok: false; readonly response: Response } {
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

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

const VALID_CHANNELS = new Set(["email", "whatsapp", "sms", "phone", "in_person", "other"]);
const VALID_DIRECTIONS = new Set(["inbound", "outbound"]);

function parseCreateInput(input: unknown): CommunicationWriteInput | null {
  if (typeof input !== "object" || input === null) return null;
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["channel", "direction", "contactName", "subject", "body", "communicatedAt", "leadId", "customerId", "opportunityId"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) return null;
  if (!isNonEmptyString(record.channel) || !VALID_CHANNELS.has(record.channel)) return null;
  if (!isNonEmptyString(record.direction) || !VALID_DIRECTIONS.has(record.direction)) return null;
  if (!isNonEmptyString(record.body)) return null;
  if (!isNonEmptyString(record.communicatedAt)) return null;
  if (!isOptionalString(record.contactName)) return null;
  if (!isOptionalString(record.subject)) return null;
  if (!isOptionalString(record.leadId)) return null;
  if (!isOptionalString(record.customerId)) return null;
  if (!isOptionalString(record.opportunityId)) return null;
  return {
    channel: record.channel,
    direction: record.direction,
    contactName: record.contactName ?? null,
    subject: record.subject ?? null,
    body: record.body,
    communicatedAt: record.communicatedAt,
    leadId: record.leadId ?? null,
    customerId: record.customerId ?? null,
    opportunityId: record.opportunityId ?? null,
  };
}

export async function handleListCommunications(
  request: Request,
  services: CommunicationRouteServices,
): Promise<Response> {
  const auth = await services.authorize("customer.read");
  const authResult = authorizationOutcome(auth);
  if (!authResult.ok) return authResult.response;

  const url = new URL(request.url);
  const channel = url.searchParams.get("channel") ?? undefined;
  const direction = url.searchParams.get("direction") ?? undefined;
  const leadId = url.searchParams.get("leadId") ?? undefined;
  const customerId = url.searchParams.get("customerId") ?? undefined;
  const opportunityId = url.searchParams.get("opportunityId") ?? undefined;
  const communications = await services.listCommunications(authResult.tenantId, channel, direction, leadId, customerId, opportunityId);
  return response(200, { communications });
}

export async function handleGetCommunication(
  _request: Request,
  services: CommunicationRouteServices,
  communicationId: string,
): Promise<Response> {
  const auth = await services.authorize("customer.read");
  const authResult = authorizationOutcome(auth);
  if (!authResult.ok) return authResult.response;

  const communication = await services.getCommunication(authResult.tenantId, communicationId);
  if (communication === null) return response(404);
  return response(200, { communication });
}

export async function handleCreateCommunication(
  request: Request,
  services: CommunicationRouteServices,
): Promise<Response> {
  const auth = await services.authorize("customer.write");
  const authResult = authorizationOutcome(auth);
  if (!authResult.ok) return authResult.response;

  let body: unknown;
  try { body = await request.json(); } catch { return response(400); }
  const input = parseCreateInput(body);
  if (input === null) return response(400);

  const communication = await services.createCommunication(authResult.tenantId, input);
  return response(201, { communication });
}

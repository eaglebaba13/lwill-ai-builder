import "server-only";

export type AttachmentAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string; readonly userId: string | null };

export interface AttachmentWriteInput {
  readonly name: string;
  readonly url: string;
  readonly mimeType?: string | null;
  readonly sizeBytes?: number | null;
  readonly leadId?: string | null;
  readonly customerId?: string | null;
  readonly opportunityId?: string | null;
}

export interface AttachmentRouteServices {
  readonly authorize: (permissionCode: string) => Promise<AttachmentAuthorization>;
  readonly listAttachments: (tenantId: string, leadId?: string, customerId?: string, opportunityId?: string) => Promise<readonly unknown[]>;
  readonly getAttachment: (tenantId: string, attachmentId: string) => Promise<unknown | null>;
  readonly createAttachment: (tenantId: string, input: AttachmentWriteInput) => Promise<unknown>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) return new Response(null, { status, headers: RESPONSE_HEADERS });
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(auth: AttachmentAuthorization): { readonly ok: true; readonly tenantId: string; readonly userId: string | null } | { readonly ok: false; readonly response: Response } {
  if (auth.outcome === "unauthenticated") return { ok: false, response: response(401) };
  if (auth.outcome === "forbidden") return { ok: false, response: response(403) };
  return { ok: true, tenantId: auth.tenantId, userId: auth.userId };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

export async function handleListAttachments(request: Request, services: AttachmentRouteServices): Promise<Response> {
  const auth = await services.authorize("customer.read");
  const r = authorizationOutcome(auth);
  if (!r.ok) return r.response;
  const url = new URL(request.url);
  const leadId = url.searchParams.get("leadId") ?? undefined;
  const customerId = url.searchParams.get("customerId") ?? undefined;
  const opportunityId = url.searchParams.get("opportunityId") ?? undefined;
  const attachments = await services.listAttachments(r.tenantId, leadId, customerId, opportunityId);
  return response(200, { attachments });
}

export async function handleGetAttachment(_request: Request, services: AttachmentRouteServices, attachmentId: string): Promise<Response> {
  const auth = await services.authorize("customer.read");
  const r = authorizationOutcome(auth);
  if (!r.ok) return r.response;
  const attachment = await services.getAttachment(r.tenantId, attachmentId);
  if (attachment === null) return response(404);
  return response(200, { attachment });
}

export async function handleCreateAttachment(request: Request, services: AttachmentRouteServices): Promise<Response> {
  const auth = await services.authorize("customer.write");
  const r = authorizationOutcome(auth);
  if (!r.ok) return r.response;
  let body: unknown;
  try { body = await request.json(); } catch { return response(400); }
  if (typeof body !== "object" || body === null) return response(400);
  const record = body as Record<string, unknown>;
  const allowedKeys = new Set(["name", "url", "mimeType", "sizeBytes", "leadId", "customerId", "opportunityId"]);
  if (Object.keys(record).some((k) => !allowedKeys.has(k))) return response(400);
  if (!isNonEmptyString(record.name)) return response(400);
  if (!isNonEmptyString(record.url)) return response(400);
  if (!isOptionalString(record.mimeType)) return response(400);
  if (record.sizeBytes !== undefined && record.sizeBytes !== null && typeof record.sizeBytes !== "number") return response(400);
  if (!isOptionalString(record.leadId)) return response(400);
  if (!isOptionalString(record.customerId)) return response(400);
  if (!isOptionalString(record.opportunityId)) return response(400);
  const attachment = await services.createAttachment(r.tenantId, {
    name: record.name,
    url: record.url,
    mimeType: record.mimeType ?? null,
    sizeBytes: record.sizeBytes ?? null,
    leadId: record.leadId ?? null,
    customerId: record.customerId ?? null,
    opportunityId: record.opportunityId ?? null,
  });
  return response(201, { attachment });
}

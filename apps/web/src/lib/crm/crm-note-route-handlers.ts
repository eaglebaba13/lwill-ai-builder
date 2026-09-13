import "server-only";

export type CrmNoteAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string; readonly userId: string | null };

export interface CrmNoteWriteInput {
  readonly body: string;
  readonly leadId?: string | null;
  readonly customerId?: string | null;
  readonly opportunityId?: string | null;
}

export interface CrmNoteRouteServices {
  readonly authorize: (permissionCode: string) => Promise<CrmNoteAuthorization>;
  readonly listNotes: (tenantId: string, leadId?: string, customerId?: string, opportunityId?: string) => Promise<readonly unknown[]>;
  readonly getNote: (tenantId: string, noteId: string) => Promise<unknown | null>;
  readonly createNote: (tenantId: string, input: CrmNoteWriteInput) => Promise<unknown>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) return new Response(null, { status, headers: RESPONSE_HEADERS });
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(auth: CrmNoteAuthorization): { readonly ok: true; readonly tenantId: string; readonly userId: string | null } | { readonly ok: false; readonly response: Response } {
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

export async function handleListCrmNotes(request: Request, services: CrmNoteRouteServices): Promise<Response> {
  const auth = await services.authorize("customer.read");
  const r = authorizationOutcome(auth);
  if (!r.ok) return r.response;
  const url = new URL(request.url);
  const leadId = url.searchParams.get("leadId") ?? undefined;
  const customerId = url.searchParams.get("customerId") ?? undefined;
  const opportunityId = url.searchParams.get("opportunityId") ?? undefined;
  const notes = await services.listNotes(r.tenantId, leadId, customerId, opportunityId);
  return response(200, { notes });
}

export async function handleGetCrmNote(_request: Request, services: CrmNoteRouteServices, noteId: string): Promise<Response> {
  const auth = await services.authorize("customer.read");
  const r = authorizationOutcome(auth);
  if (!r.ok) return r.response;
  const note = await services.getNote(r.tenantId, noteId);
  if (note === null) return response(404);
  return response(200, { note });
}

export async function handleCreateCrmNote(request: Request, services: CrmNoteRouteServices): Promise<Response> {
  const auth = await services.authorize("customer.write");
  const r = authorizationOutcome(auth);
  if (!r.ok) return r.response;
  let body: unknown;
  try { body = await request.json(); } catch { return response(400); }
  if (typeof body !== "object" || body === null) return response(400);
  const record = body as Record<string, unknown>;
  const allowedKeys = new Set(["body", "leadId", "customerId", "opportunityId"]);
  if (Object.keys(record).some((k) => !allowedKeys.has(k))) return response(400);
  if (!isNonEmptyString(record.body)) return response(400);
  if (!isOptionalString(record.leadId)) return response(400);
  if (!isOptionalString(record.customerId)) return response(400);
  if (!isOptionalString(record.opportunityId)) return response(400);
  const note = await services.createNote(r.tenantId, {
    body: record.body,
    leadId: record.leadId ?? null,
    customerId: record.customerId ?? null,
    opportunityId: record.opportunityId ?? null,
  });
  return response(201, { note });
}

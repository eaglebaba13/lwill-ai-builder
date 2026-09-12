import "server-only";

export type FollowupAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string; readonly userId: string | null };

export interface FollowupWriteInput {
  readonly title: string;
  readonly notes?: string | null;
  readonly dueAt: string;
  readonly leadId?: string | null;
  readonly customerId?: string | null;
  readonly opportunityId?: string | null;
}

export interface FollowupUpdateInput {
  title?: string;
  notes?: string | null;
  dueAt?: string;
  status?: string;
}

export interface FollowupRouteServices {
  readonly authorize: (permissionCode: string) => Promise<FollowupAuthorization>;
  readonly listFollowups: (tenantId: string, status?: string, leadId?: string, customerId?: string, opportunityId?: string) => Promise<readonly unknown[]>;
  readonly getFollowup: (tenantId: string, followupId: string) => Promise<unknown | null>;
  readonly createFollowup: (tenantId: string, input: FollowupWriteInput) => Promise<unknown>;
  readonly updateFollowup: (tenantId: string, followupId: string, input: FollowupUpdateInput) => Promise<unknown | null>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: FollowupAuthorization,
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

function parseCreateInput(input: unknown): FollowupWriteInput | null {
  if (typeof input !== "object" || input === null) return null;
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["title", "notes", "dueAt", "leadId", "customerId", "opportunityId"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) return null;
  if (!isNonEmptyString(record.title)) return null;
  if (!isNonEmptyString(record.dueAt)) return null;
  if (!isOptionalString(record.notes)) return null;
  if (!isOptionalString(record.leadId)) return null;
  if (!isOptionalString(record.customerId)) return null;
  if (!isOptionalString(record.opportunityId)) return null;
  return {
    title: record.title,
    notes: record.notes ?? null,
    dueAt: record.dueAt,
    leadId: record.leadId ?? null,
    customerId: record.customerId ?? null,
    opportunityId: record.opportunityId ?? null,
  };
}

export async function handleListFollowups(
  request: Request,
  services: FollowupRouteServices,
): Promise<Response> {
  const auth = await services.authorize("customer.read");
  const authResult = authorizationOutcome(auth);
  if (!authResult.ok) return authResult.response;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const leadId = url.searchParams.get("leadId") ?? undefined;
  const customerId = url.searchParams.get("customerId") ?? undefined;
  const opportunityId = url.searchParams.get("opportunityId") ?? undefined;
  const followups = await services.listFollowups(authResult.tenantId, status, leadId, customerId, opportunityId);
  return response(200, { followups });
}

export async function handleGetFollowup(
  _request: Request,
  services: FollowupRouteServices,
  followupId: string,
): Promise<Response> {
  const auth = await services.authorize("customer.read");
  const authResult = authorizationOutcome(auth);
  if (!authResult.ok) return authResult.response;

  const followup = await services.getFollowup(authResult.tenantId, followupId);
  if (followup === null) return response(404);
  return response(200, { followup });
}

export async function handleCreateFollowup(
  request: Request,
  services: FollowupRouteServices,
): Promise<Response> {
  const auth = await services.authorize("customer.write");
  const authResult = authorizationOutcome(auth);
  if (!authResult.ok) return authResult.response;

  let body: unknown;
  try { body = await request.json(); } catch { return response(400); }
  const input = parseCreateInput(body);
  if (input === null) return response(400);

  const followup = await services.createFollowup(authResult.tenantId, input);
  return response(201, { followup });
}

export async function handleUpdateFollowup(
  request: Request,
  services: FollowupRouteServices,
  followupId: string,
): Promise<Response> {
  const auth = await services.authorize("customer.write");
  const authResult = authorizationOutcome(auth);
  if (!authResult.ok) return authResult.response;

  let body: unknown;
  try { body = await request.json(); } catch { return response(400); }
  if (typeof body !== "object" || body === null || Object.keys(body as object).length === 0) return response(400);

  const record = body as Record<string, unknown>;
  const allowedKeys = new Set(["title", "notes", "dueAt", "status"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) return response(400);

  const input: FollowupUpdateInput = {};
  if (record.title !== undefined) {
    if (!isNonEmptyString(record.title)) return response(400);
    input.title = record.title;
  }
  if (record.notes !== undefined) input.notes = record.notes as string | null;
  if (record.dueAt !== undefined) {
    if (!isNonEmptyString(record.dueAt)) return response(400);
    input.dueAt = record.dueAt;
  }
  if (record.status !== undefined) {
    if (!isNonEmptyString(record.status)) return response(400);
    if (!["PENDING", "COMPLETED", "CANCELLED"].includes(record.status)) return response(400);
    input.status = record.status;
  }

  const followup = await services.updateFollowup(authResult.tenantId, followupId, input);
  if (followup === null) return response(404);
  return response(200, { followup });
}

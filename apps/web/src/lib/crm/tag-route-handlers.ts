import "server-only";

export type TagAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string; readonly userId: string | null };

export interface TagWriteInput {
  readonly name: string;
}

export interface TagLinkInput {
  readonly entityType: string;
  readonly entityId: string;
}

export interface TagRouteServices {
  readonly authorize: (permissionCode: string) => Promise<TagAuthorization>;
  readonly listTags: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getTag: (tenantId: string, tagId: string) => Promise<unknown | null>;
  readonly createTag: (tenantId: string, input: TagWriteInput) => Promise<unknown>;
  readonly linkTag: (tagId: string, entityType: string, entityId: string) => Promise<unknown>;
  readonly unlinkTag: (tagId: string, entityType: string, entityId: string) => Promise<boolean>;
  readonly listTagsForEntity: (entityType: string, entityId: string) => Promise<readonly unknown[]>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) return new Response(null, { status, headers: RESPONSE_HEADERS });
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(auth: TagAuthorization): { readonly ok: true; readonly tenantId: string; readonly userId: string | null } | { readonly ok: false; readonly response: Response } {
  if (auth.outcome === "unauthenticated") return { ok: false, response: response(401) };
  if (auth.outcome === "forbidden") return { ok: false, response: response(403) };
  return { ok: true, tenantId: auth.tenantId, userId: auth.userId };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

const VALID_ENTITY_TYPES = new Set(["Lead", "Customer", "Opportunity"]);

export async function handleListTags(request: Request, services: TagRouteServices): Promise<Response> {
  const auth = await services.authorize("customer.read");
  const r = authorizationOutcome(auth);
  if (!r.ok) return r.response;
  const tags = await services.listTags(r.tenantId);
  return response(200, { tags });
}

export async function handleGetTag(_request: Request, services: TagRouteServices, tagId: string): Promise<Response> {
  const auth = await services.authorize("customer.read");
  const r = authorizationOutcome(auth);
  if (!r.ok) return r.response;
  const tag = await services.getTag(r.tenantId, tagId);
  if (tag === null) return response(404);
  return response(200, { tag });
}

export async function handleCreateTag(request: Request, services: TagRouteServices): Promise<Response> {
  const auth = await services.authorize("customer.write");
  const r = authorizationOutcome(auth);
  if (!r.ok) return r.response;
  let body: unknown;
  try { body = await request.json(); } catch { return response(400); }
  if (typeof body !== "object" || body === null) return response(400);
  const record = body as Record<string, unknown>;
  if (!isNonEmptyString(record.name)) return response(400);
  if (Object.keys(record).some((k) => k !== "name")) return response(400);
  const tag = await services.createTag(r.tenantId, { name: record.name });
  return response(201, { tag });
}

export async function handleLinkTag(request: Request, services: TagRouteServices, tagId: string): Promise<Response> {
  const auth = await services.authorize("customer.write");
  const r = authorizationOutcome(auth);
  if (!r.ok) return r.response;
  let body: unknown;
  try { body = await request.json(); } catch { return response(400); }
  if (typeof body !== "object" || body === null) return response(400);
  const record = body as Record<string, unknown>;
  if (!isNonEmptyString(record.entityType) || !VALID_ENTITY_TYPES.has(record.entityType)) return response(400);
  if (!isNonEmptyString(record.entityId)) return response(400);
  const link = await services.linkTag(tagId, record.entityType, record.entityId);
  return response(201, { link });
}

export async function handleUnlinkTag(request: Request, services: TagRouteServices, tagId: string): Promise<Response> {
  const auth = await services.authorize("customer.write");
  const r = authorizationOutcome(auth);
  if (!r.ok) return r.response;
  let body: unknown;
  try { body = await request.json(); } catch { return response(400); }
  if (typeof body !== "object" || body === null) return response(400);
  const record = body as Record<string, unknown>;
  if (!isNonEmptyString(record.entityType) || !VALID_ENTITY_TYPES.has(record.entityType)) return response(400);
  if (!isNonEmptyString(record.entityId)) return response(400);
  const result = await services.unlinkTag(tagId, record.entityType, record.entityId);
  if (!result) return response(404);
  return response(200, { unlinked: true });
}

export async function handleListTagsForEntity(request: Request, services: TagRouteServices): Promise<Response> {
  const auth = await services.authorize("customer.read");
  const r = authorizationOutcome(auth);
  if (!r.ok) return r.response;
  const url = new URL(request.url);
  const entityType = url.searchParams.get("entityType");
  const entityId = url.searchParams.get("entityId");
  if (!entityType || !VALID_ENTITY_TYPES.has(entityType)) return response(400);
  if (!entityId) return response(400);
  const tags = await services.listTagsForEntity(entityType, entityId);
  return response(200, { tags });
}

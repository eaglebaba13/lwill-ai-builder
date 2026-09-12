import "server-only";

export type LeadAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string; readonly userId: string | null };

export interface LeadWriteInput {
  readonly name: string;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly source?: string | null;
}

export interface LeadRouteServices {
  readonly authorize: (permissionCode: string) => Promise<LeadAuthorization>;
  readonly listLeads: (tenantId: string, status?: string) => Promise<readonly unknown[]>;
  readonly getLead: (tenantId: string, leadId: string) => Promise<unknown | null>;
  readonly createLead: (tenantId: string, input: LeadWriteInput, actorUserId: string | null) => Promise<unknown>;
  readonly updateLead: (tenantId: string, leadId: string, input: Partial<LeadWriteInput>) => Promise<unknown | null>;
  readonly convertLead: (tenantId: string, leadId: string, actorUserId: string | null) => Promise<unknown | null>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: LeadAuthorization,
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

function parseCreateInput(input: unknown): LeadWriteInput | null {
  if (typeof input !== "object" || input === null) return null;
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["name", "email", "phone", "source"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) return null;
  if (!isNonEmptyString(record.name)) return null;
  if (!isOptionalString(record.email)) return null;
  if (!isOptionalString(record.phone)) return null;
  if (!isOptionalString(record.source)) return null;
  return {
    name: record.name,
    email: record.email ?? null,
    phone: record.phone ?? null,
    source: record.source ?? null,
  };
}

export async function handleListLeads(
  request: Request,
  services: LeadRouteServices,
): Promise<Response> {
  const auth = await services.authorize("customer.read");
  const authResult = authorizationOutcome(auth);
  if (!authResult.ok) return authResult.response;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const leads = await services.listLeads(authResult.tenantId, status);
  return response(200, { leads });
}

export async function handleGetLead(
  _request: Request,
  services: LeadRouteServices,
  leadId: string,
): Promise<Response> {
  const auth = await services.authorize("customer.read");
  const authResult = authorizationOutcome(auth);
  if (!authResult.ok) return authResult.response;

  const lead = await services.getLead(authResult.tenantId, leadId);
  if (lead === null) return response(404);
  return response(200, { lead });
}

export async function handleCreateLead(
  request: Request,
  services: LeadRouteServices,
): Promise<Response> {
  const auth = await services.authorize("customer.write");
  const authResult = authorizationOutcome(auth);
  if (!authResult.ok) return authResult.response;

  let body: unknown;
  try { body = await request.json(); } catch { return response(400); }
  const input = parseCreateInput(body);
  if (input === null) return response(400);

  const lead = await services.createLead(authResult.tenantId, input, authResult.userId);
  return response(201, { lead });
}

export async function handleUpdateLead(
  request: Request,
  services: LeadRouteServices,
  leadId: string,
): Promise<Response> {
  const auth = await services.authorize("customer.write");
  const authResult = authorizationOutcome(auth);
  if (!authResult.ok) return authResult.response;

  let body: unknown;
  try { body = await request.json(); } catch { return response(400); }
  if (typeof body !== "object" || body === null || Object.keys(body as object).length === 0) return response(400);

  const record = body as Record<string, unknown>;
  const allowedKeys = new Set(["name", "email", "phone", "source"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) return response(400);

  const input: {
    name?: string;
    email?: string | null;
    phone?: string | null;
    source?: string | null;
  } = {};
  if (record.name !== undefined) {
    if (!isNonEmptyString(record.name)) return response(400);
    input.name = record.name;
  }
  if (record.email !== undefined) input.email = record.email as string | null;
  if (record.phone !== undefined) input.phone = record.phone as string | null;
  if (record.source !== undefined) input.source = record.source as string | null;

  const lead = await services.updateLead(authResult.tenantId, leadId, input);
  if (lead === null) return response(404);
  return response(200, { lead });
}

export async function handleConvertLead(
  _request: Request,
  services: LeadRouteServices,
  leadId: string,
): Promise<Response> {
  const auth = await services.authorize("customer.write");
  const authResult = authorizationOutcome(auth);
  if (!authResult.ok) return authResult.response;

  const result = await services.convertLead(authResult.tenantId, leadId, authResult.userId);
  if (result === null) return response(404);
  return response(200, result);
}

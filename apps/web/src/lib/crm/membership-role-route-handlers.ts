import "server-only";

export type MembershipRoleAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string; readonly userId: string };

export interface MembershipRoleCreateInput {
  readonly membershipId: string;
  readonly roleId: string;
  readonly scope:
    | { readonly kind: "tenant" }
    | { readonly kind: "business-unit"; readonly businessUnitId: string }
    | { readonly kind: "branch"; readonly businessUnitId: string; readonly branchId: string };
}

export interface MembershipRoleRemoveInput {
  readonly assignmentId: string;
  readonly scope: { readonly kind: "tenant" } | { readonly kind: "business-unit" } | { readonly kind: "branch" };
}

export interface MembershipRoleRouteServices {
  readonly authorize: (permissionCode: string) => Promise<MembershipRoleAuthorization>;
  readonly assignRole: (tenantId: string, input: MembershipRoleCreateInput, actorUserId: string) => Promise<unknown>;
  readonly removeRole: (tenantId: string, input: MembershipRoleRemoveInput, actorUserId: string) => Promise<boolean>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: MembershipRoleAuthorization,
): { readonly ok: true; readonly tenantId: string; readonly userId: string } | { readonly ok: false; readonly response: Response } {
  if (authorization.outcome === "unauthenticated") {
    return { ok: false, response: response(401) };
  }
  if (authorization.outcome === "forbidden") {
    return { ok: false, response: response(403) };
  }
  return { ok: true, tenantId: authorization.tenantId, userId: authorization.userId };
}

function parseScope(input: unknown): MembershipRoleCreateInput["scope"] | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const kind = record.kind;
  if (kind !== "tenant" && kind !== "business-unit" && kind !== "branch") {
    return null;
  }
  if (kind === "tenant") {
    return { kind: "tenant" };
  }
  if (kind === "business-unit") {
    if (typeof record.businessUnitId !== "string") {
      return null;
    }
    return { kind: "business-unit", businessUnitId: record.businessUnitId };
  }
  if (typeof record.businessUnitId !== "string" || typeof record.branchId !== "string") {
    return null;
  }
  return { kind: "branch", businessUnitId: record.businessUnitId, branchId: record.branchId };
}

function parseCreateInput(input: unknown): MembershipRoleCreateInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  if (typeof record.membershipId !== "string" || typeof record.roleId !== "string") {
    return null;
  }
  const scope = parseScope(record.scope);
  if (scope === null) {
    return null;
  }
  return { membershipId: record.membershipId, roleId: record.roleId, scope };
}

function parseRemoveInput(input: unknown): MembershipRoleRemoveInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  if (typeof record.assignmentId !== "string") {
    return null;
  }
  const scope = parseScope(record.scope);
  if (scope === null) {
    return null;
  }
  return { assignmentId: record.assignmentId, scope };
}

async function readJsonBody(request: Request): Promise<unknown | typeof INVALID_JSON> {
  try {
    return await request.json();
  } catch {
    return INVALID_JSON;
  }
}

const INVALID_JSON = Symbol("invalid-json");

export async function handleAssignRole(
  request: Request,
  services: MembershipRoleRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("tenant.manage");
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
  const assignment = await services.assignRole(authResult.tenantId, input, authResult.userId);
  return response(201, { assignment });
}

export async function handleRemoveRole(
  request: Request,
  services: MembershipRoleRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("tenant.manage");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const body = await readJsonBody(request);
  if (body === INVALID_JSON) {
    return response(400);
  }
  const input = parseRemoveInput(body);
  if (input === null) {
    return response(400);
  }
  const removed = await services.removeRole(authResult.tenantId, input, authResult.userId);
  if (!removed) {
    return response(404);
  }
  return response(204);
}

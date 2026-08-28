import "server-only";

export type RoleAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string; readonly userId: string };

export interface RoleUpdateInput {
  readonly name?: string;
  readonly description?: string | null;
  readonly isActive?: boolean;
}

export interface RoleRouteServices {
  readonly authorize: (permissionCode: string) => Promise<RoleAuthorization>;
  readonly listRoles: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getRole: (tenantId: string, roleId: string) => Promise<unknown | null>;
  readonly updateRole: (
    tenantId: string,
    roleId: string,
    input: RoleUpdateInput,
    actorUserId: string,
  ) => Promise<unknown | null>;
  readonly deleteRole: (tenantId: string, roleId: string, actorUserId: string) => Promise<boolean>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: RoleAuthorization,
): { readonly ok: true; readonly tenantId: string; readonly userId: string } | { readonly ok: false; readonly response: Response } {
  if (authorization.outcome === "unauthenticated") {
    return { ok: false, response: response(401) };
  }
  if (authorization.outcome === "forbidden") {
    return { ok: false, response: response(403) };
  }
  return { ok: true, tenantId: authorization.tenantId, userId: authorization.userId };
}

function parseUpdateInput(input: unknown): RoleUpdateInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["name", "description", "isActive"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (record.name !== undefined && typeof record.name !== "string") {
    return null;
  }
  if (record.isActive !== undefined && typeof record.isActive !== "boolean") {
    return null;
  }
  return {
    name: record.name as string | undefined,
    description: (record.description as string | null | undefined) ?? null,
    isActive: record.isActive as boolean | undefined,
  };
}

async function readJsonBody(request: Request): Promise<unknown | typeof INVALID_JSON> {
  try {
    return await request.json();
  } catch {
    return INVALID_JSON;
  }
}

const INVALID_JSON = Symbol("invalid-json");

export async function handleListRoles(
  _request: Request,
  services: RoleRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("tenant.manage");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const roles = await services.listRoles(authResult.tenantId);
  return response(200, { roles });
}

export async function handleGetRole(
  _request: Request,
  services: RoleRouteServices,
  roleId: string,
): Promise<Response> {
  const authorization = await services.authorize("tenant.manage");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const role = await services.getRole(authResult.tenantId, roleId);
  if (role === null) {
    return response(404);
  }
  return response(200, { role });
}

export async function handleUpdateRole(
  request: Request,
  services: RoleRouteServices,
  roleId: string,
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
  if (typeof body !== "object" || body === null || Object.keys(body).length === 0) {
    return response(400);
  }
  const input = parseUpdateInput(body);
  if (input === null) {
    return response(400);
  }
  const role = await services.updateRole(authResult.tenantId, roleId, input, authResult.userId);
  if (role === null) {
    return response(404);
  }
  return response(200, { role });
}

export async function handleDeleteRole(
  _request: Request,
  services: RoleRouteServices,
  roleId: string,
): Promise<Response> {
  const authorization = await services.authorize("tenant.manage");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const deleted = await services.deleteRole(authResult.tenantId, roleId, authResult.userId);
  if (!deleted) {
    return response(404);
  }
  return response(204);
}

import "server-only";

export type UserAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string; readonly userId: string };

export interface UserUpdateInput {
  readonly displayName?: string | null;
  readonly isActive?: boolean;
}

export interface UserRouteServices {
  readonly authorize: (permissionCode: string) => Promise<UserAuthorization>;
  readonly listUsers: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getUser: (tenantId: string, userId: string) => Promise<unknown | null>;
  readonly updateUser: (
    tenantId: string,
    userId: string,
    input: UserUpdateInput,
    actorUserId: string,
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
  authorization: UserAuthorization,
): { readonly ok: true; readonly tenantId: string; readonly userId: string } | { readonly ok: false; readonly response: Response } {
  if (authorization.outcome === "unauthenticated") {
    return { ok: false, response: response(401) };
  }
  if (authorization.outcome === "forbidden") {
    return { ok: false, response: response(403) };
  }
  return { ok: true, tenantId: authorization.tenantId, userId: authorization.userId };
}

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function parseUpdateInput(input: unknown): UserUpdateInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["displayName", "isActive"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (record.isActive !== undefined && typeof record.isActive !== "boolean") {
    return null;
  }
  if (record.displayName !== undefined && !isOptionalString(record.displayName)) {
    return null;
  }
  return {
    displayName: (record.displayName as string | null | undefined) ?? null,
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

export async function handleListUsers(
  _request: Request,
  services: UserRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("tenant.manage");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const users = await services.listUsers(authResult.tenantId);
  return response(200, { users });
}

export async function handleGetUser(
  _request: Request,
  services: UserRouteServices,
  userId: string,
): Promise<Response> {
  const authorization = await services.authorize("tenant.manage");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const user = await services.getUser(authResult.tenantId, userId);
  if (user === null) {
    return response(404);
  }
  return response(200, { user });
}

export async function handleUpdateUser(
  request: Request,
  services: UserRouteServices,
  userId: string,
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
  const user = await services.updateUser(authResult.tenantId, userId, input, authResult.userId);
  if (user === null) {
    return response(404);
  }
  return response(200, { user });
}

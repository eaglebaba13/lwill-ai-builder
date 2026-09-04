import "server-only";

export type TenantManagementAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly userId: string };

export interface TenantManagementRouteServices {
  readonly authorize: (permissionCode: string) => Promise<TenantManagementAuthorization>;
  readonly listTenants: () => Promise<unknown>;
  readonly getTenant: (tenantId: string) => Promise<unknown>;
  readonly createTenant: (data: Record<string, unknown>) => Promise<unknown>;
  readonly updateTenant: (tenantId: string, data: Record<string, unknown>) => Promise<unknown>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: TenantManagementAuthorization,
): { readonly ok: true; readonly userId: string } | { readonly ok: false; readonly response: Response } {
  if (authorization.outcome === "unauthenticated") {
    return { ok: false, response: response(401) };
  }
  if (authorization.outcome === "forbidden") {
    return { ok: false, response: response(403) };
  }
  return { ok: true, userId: authorization.userId };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isValidSlug(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export async function handleListTenants(
  _request: Request,
  services: TenantManagementRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("platform.manage");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const tenants = await services.listTenants();
  return response(200, { tenants });
}

export async function handleGetTenant(
  _request: Request,
  services: TenantManagementRouteServices,
  tenantId: string,
): Promise<Response> {
  const authorization = await services.authorize("platform.manage");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const tenant = await services.getTenant(tenantId);
  if (tenant === null) {
    return response(404);
  }
  return response(200, { tenant });
}

export async function handleCreateTenant(
  request: Request,
  services: TenantManagementRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("platform.manage");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const body = (await request.json()) as Record<string, unknown>;
  if (!isNonEmptyString(body.name)) {
    return response(400, { error: "name is required" });
  }
  if (!isValidSlug(body.slug)) {
    return response(400, { error: "slug is required and must be lowercase alphanumeric with hyphens" });
  }
  try {
    const tenant = await services.createTenant(body);
    return response(201, { tenant });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return response(409, { error: "A tenant with this slug already exists" });
    }
    throw error;
  }
}

export async function handleUpdateTenant(
  request: Request,
  services: TenantManagementRouteServices,
  tenantId: string,
): Promise<Response> {
  const authorization = await services.authorize("platform.manage");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const body = (await request.json()) as Record<string, unknown>;
  const input: Record<string, unknown> = {};
  if (body.name !== undefined) {
    if (!isNonEmptyString(body.name)) {
      return response(400, { error: "name must be a non-empty string" });
    }
    input.name = body.name;
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") {
      return response(400, { error: "isActive must be a boolean" });
    }
    input.isActive = body.isActive;
  }
  if (Object.keys(input).length === 0) {
    return response(400, { error: "No valid fields to update" });
  }
  const tenant = await services.updateTenant(tenantId, input);
  if (tenant === null) {
    return response(404);
  }
  return response(200, { tenant });
}

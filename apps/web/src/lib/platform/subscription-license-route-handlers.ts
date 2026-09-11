import "server-only";

export type SubscriptionLicenseAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly userId: string };

export interface SubscriptionLicenseRouteServices {
  readonly authorize: (permissionCode: string) => Promise<SubscriptionLicenseAuthorization>;
  readonly getSubscription: (tenantId: string) => Promise<unknown | null>;
  readonly createSubscription: (tenantId: string, input: Record<string, unknown>, actorUserId: string) => Promise<unknown>;
  readonly updateSubscription: (tenantId: string, input: Record<string, unknown>, actorUserId: string) => Promise<unknown | null>;
  readonly getLicense: (tenantId: string) => Promise<unknown | null>;
  readonly createLicense: (tenantId: string, input: Record<string, unknown>, actorUserId: string) => Promise<unknown>;
  readonly updateLicense: (tenantId: string, input: Record<string, unknown>, actorUserId: string) => Promise<unknown | null>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: SubscriptionLicenseAuthorization,
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

export async function handleGetSubscription(
  _request: Request,
  services: SubscriptionLicenseRouteServices,
  tenantId: string,
): Promise<Response> {
  const auth = await services.authorize("platform.manage");
  const authResult = authorizationOutcome(auth);
  if (!authResult.ok) return authResult.response;

  const subscription = await services.getSubscription(tenantId);
  if (subscription === null) return response(404);
  return response(200, { subscription });
}

export async function handleCreateSubscription(
  request: Request,
  services: SubscriptionLicenseRouteServices,
  tenantId: string,
): Promise<Response> {
  const auth = await services.authorize("platform.manage");
  const authResult = authorizationOutcome(auth);
  if (!authResult.ok) return authResult.response;

  let body: unknown;
  try { body = await request.json(); } catch { return response(400); }
  if (typeof body !== "object" || body === null) return response(400);

  const record = body as Record<string, unknown>;
  if (!isNonEmptyString(record.planName)) return response(400, { error: "planName is required" });

  const allowedKeys = new Set(["planName", "status", "renewsAt", "expiresAt"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) return response(400);

  try {
    const subscription = await services.createSubscription(tenantId, record, authResult.userId);
    return response(201, { subscription });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("already exists")) return response(409);
    if (error instanceof Error && error.message.includes("not found")) return response(404);
    throw error;
  }
}

export async function handleUpdateSubscription(
  request: Request,
  services: SubscriptionLicenseRouteServices,
  tenantId: string,
): Promise<Response> {
  const auth = await services.authorize("platform.manage");
  const authResult = authorizationOutcome(auth);
  if (!authResult.ok) return authResult.response;

  let body: unknown;
  try { body = await request.json(); } catch { return response(400); }
  if (typeof body !== "object" || body === null || Object.keys(body as object).length === 0) return response(400);

  const record = body as Record<string, unknown>;
  const allowedKeys = new Set(["planName", "status", "renewsAt", "expiresAt", "cancelledAt"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) return response(400);

  const subscription = await services.updateSubscription(tenantId, record, authResult.userId);
  if (subscription === null) return response(404);
  return response(200, { subscription });
}

export async function handleGetLicense(
  _request: Request,
  services: SubscriptionLicenseRouteServices,
  tenantId: string,
): Promise<Response> {
  const auth = await services.authorize("platform.manage");
  const authResult = authorizationOutcome(auth);
  if (!authResult.ok) return authResult.response;

  const license = await services.getLicense(tenantId);
  if (license === null) return response(404);
  return response(200, { license });
}

export async function handleCreateLicense(
  request: Request,
  services: SubscriptionLicenseRouteServices,
  tenantId: string,
): Promise<Response> {
  const auth = await services.authorize("platform.manage");
  const authResult = authorizationOutcome(auth);
  if (!authResult.ok) return authResult.response;

  let body: unknown;
  try { body = await request.json(); } catch { return response(400); }
  if (typeof body !== "object" || body === null) return response(400);

  const record = body as Record<string, unknown>;
  const allowedKeys = new Set(["status", "expiresAt", "features"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) return response(400);

  try {
    const license = await services.createLicense(tenantId, record, authResult.userId);
    return response(201, { license });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("already exists")) return response(409);
    if (error instanceof Error && error.message.includes("not found")) return response(404);
    throw error;
  }
}

export async function handleUpdateLicense(
  request: Request,
  services: SubscriptionLicenseRouteServices,
  tenantId: string,
): Promise<Response> {
  const auth = await services.authorize("platform.manage");
  const authResult = authorizationOutcome(auth);
  if (!authResult.ok) return authResult.response;

  let body: unknown;
  try { body = await request.json(); } catch { return response(400); }
  if (typeof body !== "object" || body === null || Object.keys(body as object).length === 0) return response(400);

  const record = body as Record<string, unknown>;
  const allowedKeys = new Set(["status", "expiresAt", "features"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) return response(400);

  const license = await services.updateLicense(tenantId, record, authResult.userId);
  if (license === null) return response(404);
  return response(200, { license });
}

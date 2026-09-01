import "server-only";

export type FranchiseAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string; readonly userId: string };

export interface FranchiseRouteServices {
  readonly authorize: (permissionCode: string) => Promise<FranchiseAuthorization>;
  readonly listTerritories: (tenantId: string) => Promise<unknown>;
  readonly getTerritory: (tenantId: string, territoryId: string) => Promise<unknown>;
  readonly createTerritory: (tenantId: string, data: Record<string, unknown>) => Promise<unknown>;
  readonly listPartners: (tenantId: string) => Promise<unknown>;
  readonly getPartner: (tenantId: string, partnerId: string) => Promise<unknown>;
  readonly createPartner: (tenantId: string, data: Record<string, unknown>) => Promise<unknown>;
  readonly listAgreements: (tenantId: string) => Promise<unknown>;
  readonly getAgreement: (tenantId: string, agreementId: string) => Promise<unknown>;
  readonly createAgreement: (tenantId: string, data: Record<string, unknown>) => Promise<unknown>;
  readonly listOutlets: (tenantId: string) => Promise<unknown>;
  readonly getOutlet: (tenantId: string, outletId: string) => Promise<unknown>;
  readonly createOutlet: (tenantId: string, data: Record<string, unknown>) => Promise<unknown>;
  readonly getDashboard: (tenantId: string) => Promise<unknown>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: FranchiseAuthorization,
): { readonly ok: true; readonly tenantId: string; readonly userId: string } | { readonly ok: false; readonly response: Response } {
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

export async function handleListTerritories(
  _request: Request,
  services: FranchiseRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("franchise.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const territories = await services.listTerritories(authResult.tenantId);
  return response(200, { territories });
}

export async function handleGetTerritory(
  _request: Request,
  services: FranchiseRouteServices,
  territoryId: string,
): Promise<Response> {
  const authorization = await services.authorize("franchise.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const territory = await services.getTerritory(authResult.tenantId, territoryId);
  if (territory === null) {
    return response(404);
  }
  return response(200, { territory });
}

export async function handleCreateTerritory(
  request: Request,
  services: FranchiseRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("franchise.write");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const body = (await request.json()) as Record<string, unknown>;
  if (body.tenantId !== undefined && body.tenantId !== authResult.tenantId) {
    return response(400, { error: "tenantId mismatch" });
  }
  if (!isNonEmptyString(body.name)) {
    return response(400, { error: "name is required" });
  }
  const territory = await services.createTerritory(authResult.tenantId, body);
  return response(201, { territory });
}

export async function handleListPartners(
  _request: Request,
  services: FranchiseRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("franchise.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const partners = await services.listPartners(authResult.tenantId);
  return response(200, { partners });
}

export async function handleGetPartner(
  _request: Request,
  services: FranchiseRouteServices,
  partnerId: string,
): Promise<Response> {
  const authorization = await services.authorize("franchise.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const partner = await services.getPartner(authResult.tenantId, partnerId);
  if (partner === null) {
    return response(404);
  }
  return response(200, { partner });
}

export async function handleCreatePartner(
  request: Request,
  services: FranchiseRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("franchise.write");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const body = (await request.json()) as Record<string, unknown>;
  if (body.tenantId !== undefined && body.tenantId !== authResult.tenantId) {
    return response(400, { error: "tenantId mismatch" });
  }
  if (!isNonEmptyString(body.name)) {
    return response(400, { error: "name is required" });
  }
  const partner = await services.createPartner(authResult.tenantId, body);
  return response(201, { partner });
}

export async function handleListAgreements(
  _request: Request,
  services: FranchiseRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("franchise.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const agreements = await services.listAgreements(authResult.tenantId);
  return response(200, { agreements });
}

export async function handleGetAgreement(
  _request: Request,
  services: FranchiseRouteServices,
  agreementId: string,
): Promise<Response> {
  const authorization = await services.authorize("franchise.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const agreement = await services.getAgreement(authResult.tenantId, agreementId);
  if (agreement === null) {
    return response(404);
  }
  return response(200, { agreement });
}

export async function handleCreateAgreement(
  request: Request,
  services: FranchiseRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("franchise.write");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const body = (await request.json()) as Record<string, unknown>;
  if (body.tenantId !== undefined && body.tenantId !== authResult.tenantId) {
    return response(400, { error: "tenantId mismatch" });
  }
  if (!isNonEmptyString(body.partnerId)) {
    return response(400, { error: "partnerId is required" });
  }
  if (!isNonEmptyString(body.territoryId)) {
    return response(400, { error: "territoryId is required" });
  }
  if (!isNonEmptyString(body.startDate)) {
    return response(400, { error: "startDate is required" });
  }
  const agreement = await services.createAgreement(authResult.tenantId, {
    ...body,
    startDate: new Date(body.startDate as string),
    endDate: body.endDate ? new Date(body.endDate as string) : null,
  });
  return response(201, { agreement });
}

export async function handleListOutlets(
  _request: Request,
  services: FranchiseRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("franchise.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const outlets = await services.listOutlets(authResult.tenantId);
  return response(200, { outlets });
}

export async function handleGetOutlet(
  _request: Request,
  services: FranchiseRouteServices,
  outletId: string,
): Promise<Response> {
  const authorization = await services.authorize("franchise.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const outlet = await services.getOutlet(authResult.tenantId, outletId);
  if (outlet === null) {
    return response(404);
  }
  return response(200, { outlet });
}

export async function handleCreateOutlet(
  request: Request,
  services: FranchiseRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("franchise.write");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const body = (await request.json()) as Record<string, unknown>;
  if (body.tenantId !== undefined && body.tenantId !== authResult.tenantId) {
    return response(400, { error: "tenantId mismatch" });
  }
  if (!isNonEmptyString(body.partnerId)) {
    return response(400, { error: "partnerId is required" });
  }
  if (!isNonEmptyString(body.branchId)) {
    return response(400, { error: "branchId is required" });
  }
  const outlet = await services.createOutlet(authResult.tenantId, body);
  return response(201, { outlet });
}

export async function handleGetFranchiseDashboard(
  _request: Request,
  services: FranchiseRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("franchise.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const dashboard = await services.getDashboard(authResult.tenantId);
  return response(200, { dashboard });
}

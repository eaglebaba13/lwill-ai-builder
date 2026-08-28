import "server-only";

export type StockMovementAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface StockMovementRouteServices {
  readonly authorize: (permissionCode: string) => Promise<StockMovementAuthorization>;
  readonly listStockMovements: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getStockMovement: (tenantId: string, stockMovementId: string) => Promise<unknown | null>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: StockMovementAuthorization,
): { readonly ok: true; readonly tenantId: string } | { readonly ok: false; readonly response: Response } {
  if (authorization.outcome === "unauthenticated") {
    return { ok: false, response: response(401) };
  }
  if (authorization.outcome === "forbidden") {
    return { ok: false, response: response(403) };
  }
  return { ok: true, tenantId: authorization.tenantId };
}

export async function handleListStockMovements(
  _request: Request,
  services: StockMovementRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("product.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const movementList = await services.listStockMovements(authResult.tenantId);
  return response(200, { stockMovements: movementList });
}

export async function handleGetStockMovement(
  _request: Request,
  services: StockMovementRouteServices,
  stockMovementId: string,
): Promise<Response> {
  const authorization = await services.authorize("product.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const movement = await services.getStockMovement(authResult.tenantId, stockMovementId);
  if (movement === null) {
    return response(404);
  }
  return response(200, { stockMovement: movement });
}

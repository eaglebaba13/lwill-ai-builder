import "server-only";

export type StockItemAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface StockItemRouteServices {
  readonly authorize: (permissionCode: string) => Promise<StockItemAuthorization>;
  readonly listStockItems: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getStockItem: (tenantId: string, stockItemId: string) => Promise<unknown | null>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: StockItemAuthorization,
): { readonly ok: true; readonly tenantId: string } | { readonly ok: false; readonly response: Response } {
  if (authorization.outcome === "unauthenticated") {
    return { ok: false, response: response(401) };
  }
  if (authorization.outcome === "forbidden") {
    return { ok: false, response: response(403) };
  }
  return { ok: true, tenantId: authorization.tenantId };
}

export async function handleListStockItems(
  _request: Request,
  services: StockItemRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("product.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const stockItemList = await services.listStockItems(authResult.tenantId);
  return response(200, { stockItems: stockItemList });
}

export async function handleGetStockItem(
  _request: Request,
  services: StockItemRouteServices,
  stockItemId: string,
): Promise<Response> {
  const authorization = await services.authorize("product.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const stockItem = await services.getStockItem(authResult.tenantId, stockItemId);
  if (stockItem === null) {
    return response(404);
  }
  return response(200, { stockItem });
}

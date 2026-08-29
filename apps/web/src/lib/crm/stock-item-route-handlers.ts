import "server-only";

export type StockItemAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface StockItemRouteServices {
  readonly authorize: (permissionCode: string) => Promise<StockItemAuthorization>;
  readonly listStockItems: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getStockItem: (tenantId: string, stockItemId: string) => Promise<unknown | null>;
  readonly createStockItem: (tenantId: string, input: StockItemWriteInput) => Promise<unknown>;
  readonly updateStockItem: (tenantId: string, stockItemId: string, input: StockItemUpdateInput) => Promise<unknown | null>;
}

export interface StockItemWriteInput {
  readonly productId: string;
  readonly branchId: string;
  readonly quantity?: number;
}

export interface StockItemUpdateInput {
  readonly quantity?: number;
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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function parseCreateInput(input: unknown): StockItemWriteInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["productId", "branchId", "quantity"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (!isNonEmptyString(record.productId)) {
    return null;
  }
  if (!isNonEmptyString(record.branchId)) {
    return null;
  }
  if (record.quantity !== undefined && !isInteger(record.quantity)) {
    return null;
  }
  return {
    productId: record.productId,
    branchId: record.branchId,
    quantity: record.quantity ?? 0,
  };
}

function parseUpdateInput(input: unknown): StockItemUpdateInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["quantity"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (Object.keys(record).length === 0) {
    return null;
  }
  const update: { quantity?: number } = {};
  if (record.quantity !== undefined) {
    if (!isInteger(record.quantity)) {
      return null;
    }
    update.quantity = record.quantity;
  }
  return update;
}

const INVALID_JSON = Symbol("invalid-json");

async function readJsonBody(request: Request): Promise<unknown | typeof INVALID_JSON> {
  try {
    return await request.json();
  } catch {
    return INVALID_JSON;
  }
}

export async function handleCreateStockItem(
  request: Request,
  services: StockItemRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("product.write");
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
  try {
    const stockItem = await services.createStockItem(authResult.tenantId, input);
    return response(201, { stockItem });
  } catch (error) {
    if (error instanceof Error && error.message === "stock item already exists for this product and branch") {
      return response(409, { error: "Stock item already exists for this product and branch" });
    }
    throw error;
  }
}

export async function handleUpdateStockItem(
  request: Request,
  services: StockItemRouteServices,
  stockItemId: string,
): Promise<Response> {
  const authorization = await services.authorize("product.write");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const body = await readJsonBody(request);
  if (body === INVALID_JSON) {
    return response(400);
  }
  const input = parseUpdateInput(body);
  if (input === null) {
    return response(400);
  }
  const stockItem = await services.updateStockItem(authResult.tenantId, stockItemId, input);
  if (stockItem === null) {
    return response(404);
  }
  return response(200, { stockItem });
}

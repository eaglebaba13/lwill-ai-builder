import "server-only";

export type StockAdjustmentAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface StockAdjustmentLineItemInput {
  readonly productId: string;
  readonly quantity: number;
}

export interface StockAdjustmentWriteInput {
  readonly branchId: string;
  readonly direction: "IN" | "OUT";
  readonly notes?: string | null;
  readonly items: readonly StockAdjustmentLineItemInput[];
}

export interface StockAdjustmentRouteServices {
  readonly authorize: (permissionCode: string) => Promise<StockAdjustmentAuthorization>;
  readonly listStockAdjustments: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getStockAdjustment: (tenantId: string, stockAdjustmentId: string) => Promise<unknown | null>;
  readonly createStockAdjustment: (tenantId: string, input: StockAdjustmentWriteInput) => Promise<unknown>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: StockAdjustmentAuthorization,
): { readonly ok: true; readonly tenantId: string } | { readonly ok: false; readonly response: Response } {
  if (authorization.outcome === "unauthenticated") {
    return { ok: false, response: response(401) };
  }
  if (authorization.outcome === "forbidden") {
    return { ok: false, response: response(403) };
  }
  return { ok: true, tenantId: authorization.tenantId };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function parseLineItem(input: unknown): StockAdjustmentLineItemInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["productId", "quantity"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (!isNonEmptyString(record.productId)) {
    return null;
  }
  if (!isPositiveInteger(record.quantity)) {
    return null;
  }
  return { productId: record.productId, quantity: record.quantity };
}

function parseCreateInput(input: unknown): StockAdjustmentWriteInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["branchId", "direction", "notes", "items"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (!isNonEmptyString(record.branchId)) {
    return null;
  }
  if (record.direction !== "IN" && record.direction !== "OUT") {
    return null;
  }
  if (record.notes !== undefined && !isOptionalString(record.notes)) {
    return null;
  }
  if (!Array.isArray(record.items) || record.items.length === 0) {
    return null;
  }
  const items: StockAdjustmentLineItemInput[] = [];
  for (const item of record.items) {
    const parsed = parseLineItem(item);
    if (parsed === null) {
      return null;
    }
    items.push(parsed);
  }
  return {
    branchId: record.branchId,
    direction: record.direction,
    notes: record.notes ?? null,
    items,
  };
}

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

const INVALID_JSON = Symbol("invalid-json");

async function readJsonBody(request: Request): Promise<unknown | typeof INVALID_JSON> {
  try {
    return await request.json();
  } catch {
    return INVALID_JSON;
  }
}

export async function handleListStockAdjustments(
  _request: Request,
  services: StockAdjustmentRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("stockAdjustment.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const adjustmentList = await services.listStockAdjustments(authResult.tenantId);
  return response(200, { stockAdjustments: adjustmentList });
}

export async function handleCreateStockAdjustment(
  request: Request,
  services: StockAdjustmentRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("stockAdjustment.write");
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
    const adjustment = await services.createStockAdjustment(authResult.tenantId, input);
    return response(201, { stockAdjustment: adjustment });
  } catch (error) {
    if (error instanceof Error) {
      return response(400, { error: error.message });
    }
    return response(500);
  }
}

export async function handleGetStockAdjustment(
  _request: Request,
  services: StockAdjustmentRouteServices,
  stockAdjustmentId: string,
): Promise<Response> {
  const authorization = await services.authorize("stockAdjustment.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const adjustment = await services.getStockAdjustment(authResult.tenantId, stockAdjustmentId);
  if (adjustment === null) {
    return response(404);
  }
  return response(200, { stockAdjustment: adjustment });
}

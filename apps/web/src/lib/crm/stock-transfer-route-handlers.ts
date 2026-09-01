import "server-only";

export type StockTransferAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface StockTransferLineItemInput {
  readonly productId: string;
  readonly quantity: number;
}

export interface StockTransferWriteInput {
  readonly fromWarehouseId: string;
  readonly toWarehouseId: string;
  readonly fromBranchId: string;
  readonly toBranchId: string;
  readonly notes?: string | null;
  readonly items: readonly StockTransferLineItemInput[];
}

export interface StockTransferRouteServices {
  readonly authorize: (permissionCode: string) => Promise<StockTransferAuthorization>;
  readonly listStockTransfers: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getStockTransfer: (tenantId: string, stockTransferId: string) => Promise<unknown | null>;
  readonly createStockTransfer: (tenantId: string, input: StockTransferWriteInput) => Promise<unknown>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: StockTransferAuthorization,
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

function parseLineItem(input: unknown): StockTransferLineItemInput | null {
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

function parseCreateInput(input: unknown): StockTransferWriteInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["fromWarehouseId", "toWarehouseId", "fromBranchId", "toBranchId", "notes", "items"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (!isNonEmptyString(record.fromWarehouseId)) {
    return null;
  }
  if (!isNonEmptyString(record.toWarehouseId)) {
    return null;
  }
  if (!isNonEmptyString(record.fromBranchId)) {
    return null;
  }
  if (!isNonEmptyString(record.toBranchId)) {
    return null;
  }
  if (record.notes !== undefined && !isOptionalString(record.notes)) {
    return null;
  }
  if (!Array.isArray(record.items) || record.items.length === 0) {
    return null;
  }
  const items: StockTransferLineItemInput[] = [];
  for (const item of record.items) {
    const parsed = parseLineItem(item);
    if (parsed === null) {
      return null;
    }
    items.push(parsed);
  }
  return {
    fromWarehouseId: record.fromWarehouseId,
    toWarehouseId: record.toWarehouseId,
    fromBranchId: record.fromBranchId,
    toBranchId: record.toBranchId,
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

export async function handleListStockTransfers(
  _request: Request,
  services: StockTransferRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("stockTransfer.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const transferList = await services.listStockTransfers(authResult.tenantId);
  return response(200, { stockTransfers: transferList });
}

export async function handleCreateStockTransfer(
  request: Request,
  services: StockTransferRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("stockTransfer.write");
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
    const transfer = await services.createStockTransfer(authResult.tenantId, input);
    return response(201, { stockTransfer: transfer });
  } catch (error) {
    if (error instanceof Error) {
      return response(400, { error: error.message });
    }
    return response(500);
  }
}

export async function handleGetStockTransfer(
  _request: Request,
  services: StockTransferRouteServices,
  stockTransferId: string,
): Promise<Response> {
  const authorization = await services.authorize("stockTransfer.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const transfer = await services.getStockTransfer(authResult.tenantId, stockTransferId);
  if (transfer === null) {
    return response(404);
  }
  return response(200, { stockTransfer: transfer });
}

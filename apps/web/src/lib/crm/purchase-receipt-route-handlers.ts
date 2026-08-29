import "server-only";

export type PurchaseReceiptAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface PurchaseReceiptLineItemInput {
  readonly productId: string;
  readonly quantity: number;
}

export interface PurchaseReceiptWriteInput {
  readonly supplierId?: string | null;
  readonly warehouseId: string;
  readonly branchId: string;
  readonly receivedBy?: string | null;
  readonly receivedAt?: Date;
  readonly notes?: string | null;
  readonly items: readonly PurchaseReceiptLineItemInput[];
}

export interface PurchaseReceiptRouteServices {
  readonly authorize: (permissionCode: string) => Promise<PurchaseReceiptAuthorization>;
  readonly listPurchaseReceipts: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getPurchaseReceipt: (tenantId: string, purchaseReceiptId: string) => Promise<unknown | null>;
  readonly createPurchaseReceipt: (tenantId: string, input: PurchaseReceiptWriteInput) => Promise<unknown>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: PurchaseReceiptAuthorization,
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

function parseLineItem(input: unknown): PurchaseReceiptLineItemInput | null {
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

function parseCreateInput(input: unknown): PurchaseReceiptWriteInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["supplierId", "warehouseId", "branchId", "receivedBy", "receivedAt", "notes", "items"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (!isNonEmptyString(record.warehouseId)) {
    return null;
  }
  if (!isNonEmptyString(record.branchId)) {
    return null;
  }
  if (record.supplierId !== undefined && !isOptionalString(record.supplierId)) {
    return null;
  }
  if (record.receivedBy !== undefined && !isOptionalString(record.receivedBy)) {
    return null;
  }
  if (record.notes !== undefined && !isOptionalString(record.notes)) {
    return null;
  }
  if (!Array.isArray(record.items) || record.items.length === 0) {
    return null;
  }
  const items: PurchaseReceiptLineItemInput[] = [];
  for (const item of record.items) {
    const parsed = parseLineItem(item);
    if (parsed === null) {
      return null;
    }
    items.push(parsed);
  }
  return {
    supplierId: record.supplierId ?? null,
    warehouseId: record.warehouseId,
    branchId: record.branchId,
    receivedBy: record.receivedBy ?? null,
    receivedAt: record.receivedAt instanceof Date ? record.receivedAt : new Date(record.receivedAt as string),
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

export async function handleListPurchaseReceipts(
  _request: Request,
  services: PurchaseReceiptRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("branch.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const receiptList = await services.listPurchaseReceipts(authResult.tenantId);
  return response(200, { purchaseReceipts: receiptList });
}

export async function handleCreatePurchaseReceipt(
  request: Request,
  services: PurchaseReceiptRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("branch.write");
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
    const receipt = await services.createPurchaseReceipt(authResult.tenantId, input);
    return response(201, { purchaseReceipt: receipt });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("must belong to the same tenant")) {
        return response(403, { error: error.message });
      }
      if (error.message === "quantity must be positive") {
        return response(400, { error: error.message });
      }
    }
    throw error;
  }
}

export async function handleGetPurchaseReceipt(
  _request: Request,
  services: PurchaseReceiptRouteServices,
  purchaseReceiptId: string,
): Promise<Response> {
  const authorization = await services.authorize("branch.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const receipt = await services.getPurchaseReceipt(authResult.tenantId, purchaseReceiptId);
  if (receipt === null) {
    return response(404);
  }
  return response(200, { purchaseReceipt: receipt });
}

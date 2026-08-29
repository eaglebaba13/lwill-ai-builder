import "server-only";

export type StockMovementAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface StockMovementRouteServices {
  readonly authorize: (permissionCode: string) => Promise<StockMovementAuthorization>;
  readonly listStockMovements: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getStockMovement: (tenantId: string, stockMovementId: string) => Promise<unknown | null>;
  readonly createStockMovement: (tenantId: string, input: StockMovementWriteInput) => Promise<unknown>;
}

export interface StockMovementWriteInput {
  readonly productId: string;
  readonly branchId: string;
  readonly movementType: string;
  readonly quantity: number;
  readonly referenceType?: string | null;
  readonly referenceId?: string | null;
  readonly notes?: string | null;
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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function parseCreateInput(input: unknown): StockMovementWriteInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["productId", "branchId", "movementType", "quantity", "referenceType", "referenceId", "notes"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (!isNonEmptyString(record.productId)) {
    return null;
  }
  if (!isNonEmptyString(record.branchId)) {
    return null;
  }
  if (!isNonEmptyString(record.movementType)) {
    return null;
  }
  if (!isInteger(record.quantity)) {
    return null;
  }
  if (record.quantity === 0) {
    return null;
  }
  if (!isOptionalString(record.referenceType)) {
    return null;
  }
  if (!isOptionalString(record.referenceId)) {
    return null;
  }
  if (!isOptionalString(record.notes)) {
    return null;
  }
  return {
    productId: record.productId,
    branchId: record.branchId,
    movementType: record.movementType,
    quantity: record.quantity,
    referenceType: record.referenceType ?? null,
    referenceId: record.referenceId ?? null,
    notes: record.notes ?? null,
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

export async function handleCreateStockMovement(
  request: Request,
  services: StockMovementRouteServices,
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
    const stockItem = await services.createStockMovement(authResult.tenantId, input);
    return response(201, { stockItem });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "product must belong to the same tenant" || error.message === "branch must belong to the same tenant") {
        return response(403, { error: error.message });
      }
    }
    throw error;
  }
}

import "server-only";

export type ProductAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface ProductWriteInput {
  readonly categoryId: string;
  readonly name: string;
  readonly sku: string;
  readonly unit?: string;
  readonly priceCents: number;
  readonly isActive?: boolean;
}

export interface ProductUpdateInput {
  readonly categoryId?: string;
  readonly name?: string;
  readonly sku?: string;
  readonly unit?: string;
  readonly priceCents?: number;
  readonly isActive?: boolean;
}

export interface ProductRouteServices {
  readonly authorize: (permissionCode: string) => Promise<ProductAuthorization>;
  readonly listProducts: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getProduct: (tenantId: string, productId: string) => Promise<unknown | null>;
  readonly createProduct: (tenantId: string, input: ProductWriteInput) => Promise<unknown>;
  readonly updateProduct: (
    tenantId: string,
    productId: string,
    input: ProductUpdateInput,
  ) => Promise<unknown | null>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: ProductAuthorization,
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

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function parseCreateInput(input: unknown): ProductWriteInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["categoryId", "name", "sku", "unit", "priceCents", "isActive"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (!isNonEmptyString(record.categoryId)) {
    return null;
  }
  if (!isNonEmptyString(record.name)) {
    return null;
  }
  if (!isNonEmptyString(record.sku)) {
    return null;
  }
  if (!isOptionalString(record.unit)) {
    return null;
  }
  if (!isNonNegativeInteger(record.priceCents)) {
    return null;
  }
  if (record.isActive !== undefined && typeof record.isActive !== "boolean") {
    return null;
  }
  return {
    categoryId: record.categoryId,
    name: record.name,
    sku: record.sku,
    unit: record.unit ?? "pcs",
    priceCents: record.priceCents,
    isActive: record.isActive ?? true,
  };
}

function parseUpdateInput(input: unknown): ProductUpdateInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["categoryId", "name", "sku", "unit", "priceCents", "isActive"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (Object.keys(record).length === 0) {
    return null;
  }
  const update: {
    categoryId?: string;
    name?: string;
    sku?: string;
    unit?: string;
    priceCents?: number;
    isActive?: boolean;
  } = {};
  if (record.categoryId !== undefined) {
    if (!isNonEmptyString(record.categoryId)) {
      return null;
    }
    update.categoryId = record.categoryId;
  }
  if (record.name !== undefined) {
    if (!isNonEmptyString(record.name)) {
      return null;
    }
    update.name = record.name;
  }
  if (record.sku !== undefined) {
    if (!isNonEmptyString(record.sku)) {
      return null;
    }
    update.sku = record.sku;
  }
  if (record.unit !== undefined) {
    if (!isOptionalString(record.unit)) {
      return null;
    }
    update.unit = record.unit ?? "pcs";
  }
  if (record.priceCents !== undefined) {
    if (!isNonNegativeInteger(record.priceCents)) {
      return null;
    }
    update.priceCents = record.priceCents;
  }
  if (record.isActive !== undefined) {
    if (typeof record.isActive !== "boolean") {
      return null;
    }
    update.isActive = record.isActive;
  }
  return update as ProductUpdateInput;
}

const INVALID_JSON = Symbol("invalid-json");

async function readJsonBody(request: Request): Promise<unknown | typeof INVALID_JSON> {
  try {
    return await request.json();
  } catch {
    return INVALID_JSON;
  }
}

export async function handleListProducts(
  _request: Request,
  services: ProductRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("product.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const productList = await services.listProducts(authResult.tenantId);
  return response(200, { products: productList });
}

export async function handleCreateProduct(
  request: Request,
  services: ProductRouteServices,
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
  const product = await services.createProduct(authResult.tenantId, input);
  return response(201, { product });
}

export async function handleGetProduct(
  _request: Request,
  services: ProductRouteServices,
  productId: string,
): Promise<Response> {
  const authorization = await services.authorize("product.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const product = await services.getProduct(authResult.tenantId, productId);
  if (product === null) {
    return response(404);
  }
  return response(200, { product });
}

export async function handleUpdateProduct(
  request: Request,
  services: ProductRouteServices,
  productId: string,
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
  const product = await services.updateProduct(authResult.tenantId, productId, input);
  if (product === null) {
    return response(404);
  }
  return response(200, { product });
}

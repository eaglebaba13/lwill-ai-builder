import "server-only";

export type CategoryAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface CategoryWriteInput {
  readonly name: string;
  readonly description?: string | null;
  readonly isActive?: boolean;
}

export interface CategoryUpdateInput {
  readonly name?: string;
  readonly description?: string | null;
  readonly isActive?: boolean;
}

export interface CategoryRouteServices {
  readonly authorize: (permissionCode: string) => Promise<CategoryAuthorization>;
  readonly listCategories: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getCategory: (tenantId: string, categoryId: string) => Promise<unknown | null>;
  readonly createCategory: (tenantId: string, input: CategoryWriteInput) => Promise<unknown>;
  readonly updateCategory: (tenantId: string, categoryId: string, input: CategoryUpdateInput) => Promise<unknown | null>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: CategoryAuthorization,
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

function parseCreateInput(input: unknown): CategoryWriteInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["name", "description", "isActive"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (!isNonEmptyString(record.name)) {
    return null;
  }
  if (!isOptionalString(record.description)) {
    return null;
  }
  if (record.isActive !== undefined && typeof record.isActive !== "boolean") {
    return null;
  }
  return {
    name: record.name,
    description: record.description ?? null,
    isActive: record.isActive ?? true,
  };
}

function parseUpdateInput(input: unknown): CategoryUpdateInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["name", "description", "isActive"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (Object.keys(record).length === 0) {
    return null;
  }
  const update: {
    name?: string;
    description?: string | null;
    isActive?: boolean;
  } = {};
  if (record.name !== undefined) {
    if (!isNonEmptyString(record.name)) {
      return null;
    }
    update.name = record.name;
  }
  if (!isOptionalString(record.description)) {
    return null;
  }
  if (record.description !== undefined) {
    update.description = record.description ?? null;
  }
  if (record.isActive !== undefined) {
    if (typeof record.isActive !== "boolean") {
      return null;
    }
    update.isActive = record.isActive;
  }
  return update as CategoryUpdateInput;
}

const INVALID_JSON = Symbol("invalid-json");

async function readJsonBody(request: Request): Promise<unknown | typeof INVALID_JSON> {
  try {
    return await request.json();
  } catch {
    return INVALID_JSON;
  }
}

export async function handleListCategories(
  _request: Request,
  services: CategoryRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("product.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const categoryList = await services.listCategories(authResult.tenantId);
  return response(200, { categories: categoryList });
}

export async function handleCreateCategory(
  request: Request,
  services: CategoryRouteServices,
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
  const category = await services.createCategory(authResult.tenantId, input);
  return response(201, { category });
}

export async function handleGetCategory(
  _request: Request,
  services: CategoryRouteServices,
  categoryId: string,
): Promise<Response> {
  const authorization = await services.authorize("product.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const category = await services.getCategory(authResult.tenantId, categoryId);
  if (category === null) {
    return response(404);
  }
  return response(200, { category });
}

export async function handleUpdateCategory(
  request: Request,
  services: CategoryRouteServices,
  categoryId: string,
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
  const category = await services.updateCategory(authResult.tenantId, categoryId, input);
  if (category === null) {
    return response(404);
  }
  return response(200, { category });
}

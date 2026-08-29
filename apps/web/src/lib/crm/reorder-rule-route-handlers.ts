import "server-only";

export type ReorderRuleAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface ReorderRuleWriteInput {
  readonly productId: string;
  readonly branchId: string;
  readonly warehouseId: string;
  readonly minQuantity: number;
  readonly reorderQuantity: number;
  readonly isActive?: boolean;
}

export interface ReorderRuleUpdateInput {
  readonly minQuantity?: number;
  readonly reorderQuantity?: number;
  readonly isActive?: boolean;
}

export interface ReorderRuleRouteServices {
  readonly authorize: (permissionCode: string) => Promise<ReorderRuleAuthorization>;
  readonly listReorderRules: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getReorderRule: (tenantId: string, reorderRuleId: string) => Promise<unknown | null>;
  readonly createReorderRule: (tenantId: string, input: ReorderRuleWriteInput) => Promise<unknown>;
  readonly updateReorderRule: (
    tenantId: string,
    reorderRuleId: string,
    input: ReorderRuleUpdateInput,
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
  authorization: ReorderRuleAuthorization,
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

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function parseCreateInput(input: unknown): ReorderRuleWriteInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["productId", "branchId", "warehouseId", "minQuantity", "reorderQuantity", "isActive"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (!isNonEmptyString(record.productId)) {
    return null;
  }
  if (!isNonEmptyString(record.branchId)) {
    return null;
  }
  if (!isNonEmptyString(record.warehouseId)) {
    return null;
  }
  if (!isInteger(record.minQuantity) || record.minQuantity < 0) {
    return null;
  }
  if (!isInteger(record.reorderQuantity) || record.reorderQuantity <= 0) {
    return null;
  }
  if (record.isActive !== undefined && typeof record.isActive !== "boolean") {
    return null;
  }
  return {
    productId: record.productId,
    branchId: record.branchId,
    warehouseId: record.warehouseId,
    minQuantity: record.minQuantity,
    reorderQuantity: record.reorderQuantity,
    isActive: record.isActive ?? true,
  };
}

function parseUpdateInput(input: unknown): ReorderRuleUpdateInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  if (Object.keys(record).length === 0) {
    return null;
  }
  const allowedKeys = new Set(["minQuantity", "reorderQuantity", "isActive"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  const update: { minQuantity?: number; reorderQuantity?: number; isActive?: boolean } = {};
  if (record.minQuantity !== undefined) {
    if (!isInteger(record.minQuantity) || record.minQuantity < 0) {
      return null;
    }
    update.minQuantity = record.minQuantity;
  }
  if (record.reorderQuantity !== undefined) {
    if (!isInteger(record.reorderQuantity) || record.reorderQuantity <= 0) {
      return null;
    }
    update.reorderQuantity = record.reorderQuantity;
  }
  if (record.isActive !== undefined) {
    if (typeof record.isActive !== "boolean") {
      return null;
    }
    update.isActive = record.isActive;
  }
  return update as ReorderRuleUpdateInput;
}

const INVALID_JSON = Symbol("invalid-json");

async function readJsonBody(request: Request): Promise<unknown | typeof INVALID_JSON> {
  try {
    return await request.json();
  } catch {
    return INVALID_JSON;
  }
}

export async function handleListReorderRules(
  _request: Request,
  services: ReorderRuleRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("branch.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const ruleList = await services.listReorderRules(authResult.tenantId);
  return response(200, { reorderRules: ruleList });
}

export async function handleCreateReorderRule(
  request: Request,
  services: ReorderRuleRouteServices,
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
    const rule = await services.createReorderRule(authResult.tenantId, input);
    return response(201, { reorderRule: rule });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "product must belong to the same tenant" || error.message === "branch must belong to the same tenant" || error.message === "warehouse must belong to the same tenant") {
        return response(403, { error: error.message });
      }
      if (error.message === "minQuantity must be non-negative and reorderQuantity must be positive") {
        return response(400, { error: error.message });
      }
    }
    throw error;
  }
}

export async function handleGetReorderRule(
  _request: Request,
  services: ReorderRuleRouteServices,
  reorderRuleId: string,
): Promise<Response> {
  const authorization = await services.authorize("branch.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const rule = await services.getReorderRule(authResult.tenantId, reorderRuleId);
  if (rule === null) {
    return response(404);
  }
  return response(200, { reorderRule: rule });
}

export async function handleUpdateReorderRule(
  request: Request,
  services: ReorderRuleRouteServices,
  reorderRuleId: string,
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
  if (typeof body !== "object" || body === null || Object.keys(body).length === 0) {
    return response(400);
  }
  const input = parseUpdateInput(body);
  if (input === null) {
    return response(400);
  }
  try {
    const rule = await services.updateReorderRule(authResult.tenantId, reorderRuleId, input);
    if (rule === null) {
      return response(404);
    }
    return response(200, { reorderRule: rule });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "minQuantity must be non-negative" || error.message === "reorderQuantity must be positive") {
        return response(400, { error: error.message });
      }
    }
    throw error;
  }
}

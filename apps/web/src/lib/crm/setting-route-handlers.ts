import "server-only";

export type SettingAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface SettingWriteInput {
  readonly key: string;
  readonly value: string;
  readonly isActive?: boolean;
}

export interface SettingUpdateInput {
  readonly key?: string;
  readonly value?: string;
  readonly isActive?: boolean;
}

export interface SettingRouteServices {
  readonly authorize: (permissionCode: string) => Promise<SettingAuthorization>;
  readonly listSettings: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getSetting: (tenantId: string, settingId: string) => Promise<unknown | null>;
  readonly createSetting: (tenantId: string, input: SettingWriteInput) => Promise<unknown>;
  readonly updateSetting: (
    tenantId: string,
    settingId: string,
    input: SettingUpdateInput,
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
  authorization: SettingAuthorization,
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

function parseCreateInput(input: unknown): SettingWriteInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["key", "value", "isActive"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (!isNonEmptyString(record.key)) {
    return null;
  }
  if (!isNonEmptyString(record.value)) {
    return null;
  }
  if (record.isActive !== undefined && typeof record.isActive !== "boolean") {
    return null;
  }
  return {
    key: record.key,
    value: record.value,
    isActive: record.isActive ?? true,
  };
}

function parseUpdateInput(input: unknown): SettingUpdateInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["key", "value", "isActive"]);
  if (Object.keys(record).length === 0) {
    return null;
  }
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  const update: { key?: string; value?: string; isActive?: boolean } = {};
  if (record.key !== undefined) {
    if (!isNonEmptyString(record.key)) {
      return null;
    }
    update.key = record.key;
  }
  if (record.value !== undefined) {
    if (!isNonEmptyString(record.value)) {
      return null;
    }
    update.value = record.value;
  }
  if (record.isActive !== undefined) {
    if (typeof record.isActive !== "boolean") {
      return null;
    }
    update.isActive = record.isActive;
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

export async function handleListSettings(
  _request: Request,
  services: SettingRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("setting.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const settingList = await services.listSettings(authResult.tenantId);
  return response(200, { settings: settingList });
}

export async function handleGetSetting(
  _request: Request,
  services: SettingRouteServices,
  settingId: string,
): Promise<Response> {
  const authorization = await services.authorize("setting.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const setting = await services.getSetting(authResult.tenantId, settingId);
  if (setting === null) {
    return response(404);
  }
  return response(200, { setting });
}

export async function handleCreateSetting(
  request: Request,
  services: SettingRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("setting.write");
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
  const setting = await services.createSetting(authResult.tenantId, input);
  return response(201, { setting });
}

export async function handleUpdateSetting(
  request: Request,
  services: SettingRouteServices,
  settingId: string,
): Promise<Response> {
  const authorization = await services.authorize("setting.write");
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
  const setting = await services.updateSetting(authResult.tenantId, settingId, input);
  if (setting === null) {
    return response(404);
  }
  return response(200, { setting });
}

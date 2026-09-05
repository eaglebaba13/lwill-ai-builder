import "server-only";

export type MarketplaceAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface MarketplaceAssetWriteInput {
  readonly name: string;
  readonly slug: string;
  readonly description?: string | null;
  readonly type: string;
  readonly category?: string | null;
  readonly authorName?: string | null;
  readonly iconUrl?: string | null;
}

export interface MarketplaceInstallInput {
  readonly assetId: string;
  readonly versionId: string;
  readonly config?: Record<string, unknown> | null;
}

export interface MarketplaceRouteServices {
  readonly authorize: (permissionCode: string) => Promise<MarketplaceAuthorization>;
  readonly listAssets: (args: { type?: string }) => Promise<readonly unknown[]>;
  readonly getAsset: (args: { assetId: string }) => Promise<unknown | null>;
  readonly createAsset: (input: MarketplaceAssetWriteInput) => Promise<unknown>;
  readonly listVersions: (args: { assetId: string }) => Promise<readonly unknown[]>;
  readonly createVersion: (args: { assetId: string; version: string; changelog?: string | null; manifest?: Record<string, unknown> | null }) => Promise<unknown>;
  readonly listInstallations: (tenantId: string) => Promise<readonly unknown[]>;
  readonly installAsset: (tenantId: string, input: MarketplaceInstallInput) => Promise<unknown>;
  readonly rollbackAsset: (tenantId: string, assetId: string, versionId: string) => Promise<unknown | null>;
  readonly uninstallAsset: (tenantId: string, assetId: string, actorUserId?: string | null) => Promise<boolean>;
  readonly getAvailableUpdates: (tenantId: string) => Promise<readonly unknown[]>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: MarketplaceAuthorization,
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

function parseCreateAssetInput(input: unknown): MarketplaceAssetWriteInput | null {
  if (typeof input !== "object" || input === null) return null;
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["name", "slug", "description", "type", "category", "authorName", "iconUrl"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) return null;
  if (!isNonEmptyString(record.name)) return null;
  if (!isNonEmptyString(record.slug)) return null;
  if (!isNonEmptyString(record.type)) return null;
  if (!isOptionalString(record.description)) return null;
  if (!isOptionalString(record.category)) return null;
  if (!isOptionalString(record.authorName)) return null;
  if (!isOptionalString(record.iconUrl)) return null;
  return {
    name: record.name,
    slug: record.slug,
    description: record.description ?? null,
    type: record.type,
    category: record.category ?? null,
    authorName: record.authorName ?? null,
    iconUrl: record.iconUrl ?? null,
  };
}

function parseInstallInput(input: unknown): MarketplaceInstallInput | null {
  if (typeof input !== "object" || input === null) return null;
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["assetId", "versionId", "config"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) return null;
  if (!isNonEmptyString(record.assetId)) return null;
  if (!isNonEmptyString(record.versionId)) return null;
  return {
    assetId: record.assetId,
    versionId: record.versionId,
    config: (record.config as Record<string, unknown> | null | undefined) ?? null,
  };
}

const INVALID_JSON = Symbol("invalid-json");

async function readJsonBody(request: Request): Promise<unknown | typeof INVALID_JSON> {
  try {
    return await request.json();
  } catch {
    return INVALID_JSON;
  }
}

export async function handleListMarketplaceAssets(
  request: Request,
  services: MarketplaceRouteServices,
): Promise<Response> {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? undefined;
  const assets = await services.listAssets({ type });
  return response(200, { assets });
}

export async function handleGetMarketplaceAsset(
  _request: Request,
  services: MarketplaceRouteServices,
  assetId: string,
): Promise<Response> {
  const asset = await services.getAsset({ assetId });
  if (asset === null) return response(404);
  return response(200, { asset });
}

export async function handleCreateMarketplaceAsset(
  request: Request,
  services: MarketplaceRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("tenant.manage");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) return authResult.response;
  const body = await readJsonBody(request);
  if (body === INVALID_JSON) return response(400);
  const input = parseCreateAssetInput(body);
  if (input === null) return response(400);
  const asset = await services.createAsset(input);
  return response(201, { asset });
}

export async function handleListAssetVersions(
  _request: Request,
  services: MarketplaceRouteServices,
  assetId: string,
): Promise<Response> {
  const versions = await services.listVersions({ assetId });
  return response(200, { versions });
}

export async function handleCreateAssetVersion(
  request: Request,
  services: MarketplaceRouteServices,
  assetId: string,
): Promise<Response> {
  const authorization = await services.authorize("tenant.manage");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) return authResult.response;
  const body = await readJsonBody(request);
  if (body === INVALID_JSON) return response(400);
  if (typeof body !== "object" || body === null) return response(400);
  const record = body as Record<string, unknown>;
  if (!isNonEmptyString(record.version)) return response(400);
  const version = await services.createVersion({
    assetId,
    version: record.version,
    changelog: (record.changelog as string | null | undefined) ?? null,
    manifest: (record.manifest as Record<string, unknown> | null | undefined) ?? null,
  });
  return response(201, { version });
}

export async function handleListTenantInstallations(
  request: Request,
  services: MarketplaceRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("tenant.manage");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) return authResult.response;
  const installations = await services.listInstallations(authResult.tenantId);
  return response(200, { installations });
}

export async function handleInstallAsset(
  request: Request,
  services: MarketplaceRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("tenant.manage");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) return authResult.response;
  const body = await readJsonBody(request);
  if (body === INVALID_JSON) return response(400);
  const input = parseInstallInput(body);
  if (input === null) return response(400);
  const installation = await services.installAsset(authResult.tenantId, input);
  return response(201, { installation });
}

export async function handleRollbackAsset(
  request: Request,
  services: MarketplaceRouteServices,
  assetId: string,
): Promise<Response> {
  const authorization = await services.authorize("tenant.manage");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) return authResult.response;
  const body = await readJsonBody(request);
  if (body === INVALID_JSON) return response(400);
  if (typeof body !== "object" || body === null) return response(400);
  const record = body as Record<string, unknown>;
  if (!isNonEmptyString(record.versionId)) return response(400);
  const installation = await services.rollbackAsset(authResult.tenantId, assetId, record.versionId);
  if (installation === null) return response(404);
  return response(200, { installation });
}

export async function handleUninstallAsset(
  request: Request,
  services: MarketplaceRouteServices,
  assetId: string,
): Promise<Response> {
  const authorization = await services.authorize("tenant.manage");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) return authResult.response;
  const removed = await services.uninstallAsset(authResult.tenantId, assetId);
  if (!removed) return response(404);
  return response(204);
}

export async function handleGetAvailableUpdates(
  _request: Request,
  services: MarketplaceRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("tenant.manage");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) return authResult.response;
  const updates = await services.getAvailableUpdates(authResult.tenantId);
  return response(200, { updates });
}

import "server-only";

export type SettlementAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string; readonly userId: string };

export interface SettlementGenerateInput {
  readonly agreementId: string;
  readonly periodStart: string;
  readonly periodEnd: string;
}

export interface SettlementRouteServices {
  readonly authorize: (permissionCode: string) => Promise<SettlementAuthorization>;
  readonly generateSettlement: (tenantId: string, input: SettlementGenerateInput, userId: string) => Promise<unknown>;
  readonly getSettlement: (tenantId: string, settlementId: string) => Promise<unknown | null>;
  readonly listSettlements: (tenantId: string, filters: { agreementId?: string; partnerId?: string; status?: string }) => Promise<unknown>;
  readonly approveSettlement: (tenantId: string, settlementId: string, userId: string) => Promise<unknown>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) return new Response(null, { status, headers: RESPONSE_HEADERS });
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(auth: SettlementAuthorization): { readonly ok: true; readonly tenantId: string; readonly userId: string } | { readonly ok: false; readonly response: Response } {
  if (auth.outcome === "unauthenticated") return { ok: false, response: response(401) };
  if (auth.outcome === "forbidden") return { ok: false, response: response(403) };
  return { ok: true, tenantId: auth.tenantId, userId: auth.userId };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function parseGenerateInput(input: unknown): SettlementGenerateInput | null {
  if (typeof input !== "object" || input === null) return null;
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["agreementId", "periodStart", "periodEnd"]);
  if (Object.keys(record).some((k) => !allowedKeys.has(k))) return null;
  if (!isNonEmptyString(record.agreementId)) return null;
  if (!isNonEmptyString(record.periodStart)) return null;
  if (!isNonEmptyString(record.periodEnd)) return null;
  return { agreementId: record.agreementId, periodStart: record.periodStart, periodEnd: record.periodEnd };
}

export async function handleGenerateSettlement(request: Request, services: SettlementRouteServices): Promise<Response> {
  const auth = await services.authorize("settlement.generate");
  const r = authorizationOutcome(auth);
  if (!r.ok) return r.response;

  let body: unknown;
  try { body = await request.json(); } catch { return response(400); }
  const input = parseGenerateInput(body);
  if (input === null) return response(400);

  const result = await services.generateSettlement(r.tenantId, input, r.userId);
  if (typeof result === "object" && result !== null && "error" in result) {
    const err = result as { error: string; status: number };
    return response(err.status, { error: err.error });
  }
  return response(201, result);
}

export async function handleGetSettlement(_request: Request, services: SettlementRouteServices, settlementId: string): Promise<Response> {
  const auth = await services.authorize("settlement.view");
  const r = authorizationOutcome(auth);
  if (!r.ok) return r.response;

  const result = await services.getSettlement(r.tenantId, settlementId);
  if (result === null) return response(404);
  return response(200, result);
}

export async function handleListSettlements(request: Request, services: SettlementRouteServices): Promise<Response> {
  const auth = await services.authorize("settlement.view");
  const r = authorizationOutcome(auth);
  if (!r.ok) return r.response;

  const url = new URL(request.url);
  const agreementId = url.searchParams.get("agreementId") ?? undefined;
  const partnerId = url.searchParams.get("partnerId") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const settlements = await services.listSettlements(r.tenantId, { agreementId, partnerId, status });
  return response(200, { settlements });
}

export async function handleApproveSettlement(_request: Request, services: SettlementRouteServices, settlementId: string): Promise<Response> {
  const auth = await services.authorize("settlement.approve");
  const r = authorizationOutcome(auth);
  if (!r.ok) return r.response;

  const result = await services.approveSettlement(r.tenantId, settlementId, r.userId);
  if (typeof result === "object" && result !== null && "error" in result) {
    const err = result as { error: string; status: number };
    return response(err.status, { error: err.error });
  }
  return response(200, result);
}

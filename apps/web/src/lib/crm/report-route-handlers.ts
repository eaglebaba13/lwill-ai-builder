import "server-only";

export type ReportAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string; readonly userId: string };

export interface ReportRouteServices {
  readonly authorize: (permissionCode: string) => Promise<ReportAuthorization>;
  readonly getReportSummary: (tenantId: string) => Promise<unknown>;
  readonly getFranchiseOverview?: (tenantId: string, userId: string) => Promise<unknown>;
  readonly getFranchisePayout?: (tenantId: string, userId: string, year: number, month: number) => Promise<unknown>;
  readonly getInventoryStockReport: (tenantId: string, branchId?: string) => Promise<unknown>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: ReportAuthorization,
): { readonly ok: true; readonly tenantId: string; readonly userId: string } | { readonly ok: false; readonly response: Response } {
  if (authorization.outcome === "unauthenticated") {
    return { ok: false, response: response(401) };
  }
  if (authorization.outcome === "forbidden") {
    return { ok: false, response: response(403) };
  }
  return { ok: true, tenantId: authorization.tenantId, userId: authorization.userId };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

export async function handleGetReportSummary(
  _request: Request,
  services: ReportRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("report.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const summary = await services.getReportSummary(authResult.tenantId);
  return response(200, { report: summary });
}

export async function handleGetInventoryStockReport(
  request: Request,
  services: ReportRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("report.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const url = new URL(request.url);
  const branchId = url.searchParams.get("branchId");
  const report = await services.getInventoryStockReport(
    authResult.tenantId,
    branchId && isNonEmptyString(branchId) ? branchId : undefined,
  );
  return response(200, { report });
}
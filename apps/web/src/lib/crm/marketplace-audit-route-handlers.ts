import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

const authService = createAuthorizationService({ loadPermissionGrants });

export async function handleListMarketplaceAuditLogs(request: Request): Promise<Response> {
  const context = await getAuthenticationContext();
  if (!context.authenticated) return response(401);
  if (context.tenantContext === null) return response(403);
  const decision = await authorizeFromContext(
    context,
    { permissionCode: "tenant.manage", scope: { kind: "tenant", tenantId: context.tenantContext.tenantId } },
    authService,
  );
  if (!decision.allowed) return response(403);

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200);

  const logs = await (prisma as unknown as { auditLog: { findMany: (args: Record<string, unknown>) => Promise<unknown[]> } }).auditLog.findMany({
    where: {
      tenantId: context.tenantContext.tenantId,
      entityType: "MarketplaceAsset",
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return response(200, { logs });
}

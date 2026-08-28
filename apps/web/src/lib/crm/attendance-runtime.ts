import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createAttendanceService } from "../../../../../packages/authentication-context-prisma/src/attendance-service";
import type {
  AttendanceAuthorization,
  AttendanceRouteServices,
} from "./attendance-route-handlers";

const attendanceService = createAttendanceService(prisma as never);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<AttendanceAuthorization> {
  const context = await getAuthenticationContext();
  if (!context.authenticated) {
    return { outcome: "unauthenticated" };
  }
  if (context.tenantContext === null) {
    return { outcome: "forbidden" };
  }
  const decision = await authorizeFromContext(
    context,
    {
      permissionCode,
      scope: { kind: "tenant", tenantId: context.tenantContext.tenantId },
    },
    authService,
  );
  if (!decision.allowed) {
    return { outcome: "forbidden" };
  }
  return { outcome: "authorized", tenantId: context.tenantContext.tenantId };
}

export function createAttendanceRouteServices(): AttendanceRouteServices {
  return {
    authorize,
    listAttendance: (tenantId) => attendanceService.listAttendance({ tenantId }),
    getAttendance: (tenantId, attendanceId) => attendanceService.getAttendance({ tenantId, attendanceId }),
    createAttendance: (tenantId, input) => attendanceService.createAttendance({ tenantId, ...input }),
  };
}

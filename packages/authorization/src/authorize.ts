import type {
  AuthorizationDecision,
  AuthorizationRequest,
  AuthorizationScope,
  PermissionGrant,
} from "./types";

function scopeCovers(
  grant: AuthorizationScope,
  requested: AuthorizationScope,
): boolean {
  if (grant.tenantId !== requested.tenantId) {
    return false;
  }

  if (grant.kind === "tenant") {
    return true;
  }

  if (grant.kind === "business-unit") {
    if (requested.kind === "tenant") {
      return false;
    }

    return grant.businessUnitId === requested.businessUnitId;
  }

  if (requested.kind !== "branch") {
    return false;
  }

  return (
    grant.businessUnitId === requested.businessUnitId &&
    grant.branchId === requested.branchId
  );
}

export function authorize(
  request: AuthorizationRequest,
  grants: readonly PermissionGrant[],
): AuthorizationDecision {
  for (const grant of grants) {
    if (grant.permissionCode !== request.permissionCode) {
      continue;
    }

    if (scopeCovers(grant.scope, request.scope)) {
      return {
        allowed: true,
        matchedGrant: grant,
      };
    }
  }

  return {
    allowed: false,
    matchedGrant: null,
  };
}

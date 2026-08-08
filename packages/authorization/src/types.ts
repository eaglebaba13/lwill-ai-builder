export type AuthorizationScope =
  | { readonly kind: "tenant"; readonly tenantId: string }
  | {
      readonly kind: "business-unit";
      readonly tenantId: string;
      readonly businessUnitId: string;
    }
  | {
      readonly kind: "branch";
      readonly tenantId: string;
      readonly businessUnitId: string;
      readonly branchId: string;
    };

export interface PermissionGrant {
  readonly permissionCode: string;
  readonly scope: AuthorizationScope;
}

export interface AuthorizationRequest {
  readonly permissionCode: string;
  readonly scope: AuthorizationScope;
}

export interface AuthorizationDecision {
  readonly allowed: boolean;
  readonly matchedGrant: PermissionGrant | null;
}

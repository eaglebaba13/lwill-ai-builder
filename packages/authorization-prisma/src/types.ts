import type { PermissionGrant } from "@lwill/authorization/src/types";

export interface GrantLoaderInput {
  readonly tenantId: string;
  readonly userId: string;
}

export interface PermissionGrantLoader {
  loadPermissionGrants(
    input: GrantLoaderInput,
  ): Promise<readonly PermissionGrant[]>;
}

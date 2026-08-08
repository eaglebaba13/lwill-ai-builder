import { authorize } from "@lwill/authorization/src/authorize";
import type {
  AuthorizationDecision,
  AuthorizationRequest,
} from "@lwill/authorization/src/types";
import type {
  GrantLoaderInput,
  PermissionGrantLoader,
} from "@lwill/authorization-prisma/src/types";

export interface AuthorizationServiceRequest
  extends AuthorizationRequest {
  readonly userId: string;
  readonly tenantId: string;
}

export interface AuthorizationService {
  authorize(
    request: AuthorizationServiceRequest,
  ): Promise<AuthorizationDecision>;
}

export function createAuthorizationService(
  grantLoader: PermissionGrantLoader,
): AuthorizationService {
  return {
    async authorize(request) {
      try {
        const input: GrantLoaderInput = {
          tenantId: request.tenantId,
          userId: request.userId,
        };

        const grants = await grantLoader.loadPermissionGrants(input);

        return authorize(
          {
            permissionCode: request.permissionCode,
            scope: request.scope,
          },
          grants,
        );
      } catch {
        return {
          allowed: false,
          matchedGrant: null,
        };
      }
    },
  };
}

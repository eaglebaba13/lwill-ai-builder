import type { PermissionGrant } from "@lwill/authorization/src/types";
import { mapMembershipToPermissionGrants } from "./map-permission-grants";
import { prisma } from "@lwill/database/client";
import type { GrantLoaderInput } from "./types";

export async function loadPermissionGrants(
  input: GrantLoaderInput,
): Promise<readonly PermissionGrant[]> {
  const membership = await prisma.tenantMembership.findUnique({
    where: {
      tenantId_userId: {
        tenantId: input.tenantId,
        userId: input.userId,
      },
    },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
      businessUnitRoles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
      branchRoles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (membership === null) {
    return [];
  }

  return mapMembershipToPermissionGrants(input.tenantId, membership);

}

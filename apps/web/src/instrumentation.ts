export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  try {
    const { registerNativeAuthenticationProvider } = await import(
      "./lib/auth/native-auth-runtime"
    );
    registerNativeAuthenticationProvider();
    console.log("[auth] Native authentication provider registered");
  } catch (error) {
    console.error("[auth] Failed to register native authentication provider:", error);
    throw error;
  }

  try {
    const { bootstrapXnailRoles } = await import(
      "../../../packages/authentication-context-prisma/src/xnail-role-bootstrap"
    );
    const { prisma } = await import(
      "../../../packages/database/src/client"
    );
    const result = await bootstrapXnailRoles(prisma as never);
    console.log(
      `[rbac] X Nail role catalogue provisioned: ${result.rolesCreated} roles created, ${result.permissionsCreated} permissions created, ${result.rolePermissionsCreated} role-permissions created (tenantId=${result.tenantId})`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Expected exactly one active tenant")) {
      console.warn("[rbac] X Nail tenant not found; skipping role catalogue provisioning");
    } else {
      console.error("[rbac] Failed to provision X Nail role catalogue:", message);
    }
  }
}

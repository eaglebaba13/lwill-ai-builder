import { bootstrapXnailRoles, formatXnailRoleBootstrapResult } from "./xnail-role-bootstrap";
import { prisma } from "@lwill/database/client";

async function main() {
  try {
    const result = await bootstrapXnailRoles(prisma as never);
    console.log(formatXnailRoleBootstrapResult(result));
  } catch (error) {
    console.error("X Nail role bootstrap failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

void main();

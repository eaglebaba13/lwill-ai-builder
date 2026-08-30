import { describe, expect, it, vi } from "vitest";
import { createUserService } from "./user-service";

function createFixture() {
  type UserState = {
    id: string;
    email: string | null;
    displayName: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  type MembershipState = { id: string; tenantId: string; userId: string };
  const state = {
    users: new Map<string, UserState>(),
    memberships: new Map<string, MembershipState>(),
  };
  const prisma = {
    tenantMembership: {
      findMany: vi.fn(async ({ where }: { where: { tenantId: string } }) =>
        [...state.memberships.values()]
          .filter((m) => m.tenantId === where.tenantId)
          .map((m) => ({ id: m.id, user: state.users.get(m.userId) })),
      ),
      findUnique: vi.fn(async ({ where }: { where: { tenantId_userId: { tenantId: string; userId: string } } }) => {
        const membership = [...state.memberships.values()].find(
          (m) => m.tenantId === where.tenantId_userId.tenantId && m.userId === where.tenantId_userId.userId,
        );
        if (membership === undefined) {
          return null;
        }
        return { id: membership.id, user: state.users.get(membership.userId) };
      }),
    },
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => state.users.get(where.id) ?? null),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const existing = state.users.get(where.id);
        if (!existing) {
          throw new Error("not found");
        }
        const updated = { ...existing, ...data } as UserState;
        state.users.set(where.id, updated);
        return updated;
      }),
    },
  };
  return { prisma, state };
}

describe("user service (tenant-scoped)", () => {
  it("lists only users with memberships in the requesting tenant", async () => {
    const { prisma, state } = createFixture();
    state.users.set("user-1", { id: "user-1", email: "a@test.com", displayName: "A", isActive: true, createdAt: new Date(), updatedAt: new Date() });
    state.users.set("user-2", { id: "user-2", email: "b@test.com", displayName: "B", isActive: true, createdAt: new Date(), updatedAt: new Date() });
    state.memberships.set("m-1", { id: "m-1", tenantId: "tenant-1", userId: "user-1" });
    state.memberships.set("m-2", { id: "m-2", tenantId: "tenant-2", userId: "user-2" });
    const service = createUserService(prisma as never);

    const users = await service.listUsers({ tenantId: "tenant-1" });

    expect(users).toHaveLength(1);
    expect(users[0]?.id).toBe("user-1");
  });

  it("returns a user when the membership exists in the tenant", async () => {
    const { prisma, state } = createFixture();
    state.users.set("user-1", { id: "user-1", email: "a@test.com", displayName: "A", isActive: true, createdAt: new Date(), updatedAt: new Date() });
    state.memberships.set("m-1", { id: "m-1", tenantId: "tenant-1", userId: "user-1" });
    const service = createUserService(prisma as never);

    const user = await service.getUser({ tenantId: "tenant-1", userId: "user-1" });

    expect(user?.id).toBe("user-1");
  });

  it("returns null when the user has no membership in the tenant", async () => {
    const { prisma, state } = createFixture();
    state.users.set("user-1", { id: "user-1", email: "a@test.com", displayName: "A", isActive: true, createdAt: new Date(), updatedAt: new Date() });
    const service = createUserService(prisma as never);

    const user = await service.getUser({ tenantId: "tenant-1", userId: "user-1" });

    expect(user).toBeNull();
  });

  it("updates displayName and isActive for a tenant user", async () => {
    const { prisma, state } = createFixture();
    state.users.set("user-1", { id: "user-1", email: "a@test.com", displayName: "A", isActive: true, createdAt: new Date(), updatedAt: new Date() });
    state.memberships.set("m-1", { id: "m-1", tenantId: "tenant-1", userId: "user-1" });
    const service = createUserService(prisma as never);

    const updated = await service.updateUser({
      tenantId: "tenant-1",
      userId: "user-1",
      input: { displayName: "New Name", isActive: false },
    });

    expect(updated?.displayName).toBe("New Name");
    expect(updated?.isActive).toBe(false);
  });

  it("rejects update when the user is not in the tenant", async () => {
    const { prisma, state } = createFixture();
    state.users.set("user-1", { id: "user-1", email: "a@test.com", displayName: "A", isActive: true, createdAt: new Date(), updatedAt: new Date() });
    state.memberships.set("m-1", { id: "m-1", tenantId: "tenant-2", userId: "user-1" });
    const service = createUserService(prisma as never);

    const updated = await service.updateUser({
      tenantId: "tenant-1",
      userId: "user-1",
      input: { displayName: "Hijacked" },
    });

    expect(updated).toBeNull();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

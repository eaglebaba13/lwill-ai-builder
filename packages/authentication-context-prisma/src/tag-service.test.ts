import { describe, expect, it, vi } from "vitest";
import { createTagService } from "./tag-service";

function createPrisma(overrides: { tags?: Array<{ id: string; tenantId: string; name: string; createdAt: Date; updatedAt: Date }>; tagLinks?: Array<{ id: string; tagId: string; entityType: string; entityId: string; createdAt: Date }> } = {}) {
  const tags = overrides.tags === undefined ? [] : [...overrides.tags];
  const tagLinks = overrides.tagLinks === undefined ? [] : [...overrides.tagLinks];
  let idCounter = 0;

  const prisma = {
    tag: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = { id: `tag-${++idCounter}`, tenantId: data.tenantId as string, name: data.name as string, createdAt: new Date(), updatedAt: new Date() };
        tags.push(record);
        return record;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => tags.find((t) => t.id === where.id) ?? null),
      findMany: vi.fn(async ({ where }: { where?: Record<string, unknown> }) => {
        let filtered = tags;
        if (where?.tenantId) filtered = filtered.filter((t) => t.tenantId === where.tenantId);
        if (where?.id && typeof where.id === "object" && "in" in (where.id as Record<string, unknown>)) {
          const ids = (where.id as { in: string[] }).in;
          filtered = filtered.filter((t) => ids.includes(t.id));
        }
        return filtered;
      }),
    },
    tagLink: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = { id: `tl-${++idCounter}`, tagId: data.tagId as string, entityType: data.entityType as string, entityId: data.entityId as string, createdAt: new Date() };
        tagLinks.push(record);
        return record;
      }),
      deleteMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const before = tagLinks.length;
        const remaining = tagLinks.filter((l) => !(l.tagId === where.tagId && l.entityType === where.entityType && l.entityId === where.entityId));
        tagLinks.length = 0;
        tagLinks.push(...remaining);
        return { count: before - remaining.length };
      }),
      findMany: vi.fn(async ({ where }: { where?: Record<string, unknown> }) => {
        let filtered = tagLinks;
        if (where?.entityType) filtered = filtered.filter((l) => l.entityType === where.entityType);
        if (where?.entityId) filtered = filtered.filter((l) => l.entityId === where.entityId);
        return filtered;
      }),
    },
  };

  return { prisma: prisma as never, tags, tagLinks };
}

describe("tag service: createTag", () => {
  it("creates a tag", async () => {
    const { prisma, tags } = createPrisma();
    const service = createTagService(prisma);
    const tag = await service.createTag({ tenantId: "t1", input: { name: "VIP" } });
    expect(tag.name).toBe("VIP");
    expect(tags).toHaveLength(1);
  });
});

describe("tag service: getTag", () => {
  it("returns null for non-existent tag", async () => {
    const { prisma } = createPrisma();
    const service = createTagService(prisma);
    expect(await service.getTag({ tenantId: "t1", tagId: "missing" })).toBeNull();
  });

  it("returns null for cross-tenant access", async () => {
    const { prisma } = createPrisma({ tags: [{ id: "tag-1", tenantId: "t1", name: "VIP", createdAt: new Date(), updatedAt: new Date() }] });
    const service = createTagService(prisma);
    expect(await service.getTag({ tenantId: "t2", tagId: "tag-1" })).toBeNull();
  });
});

describe("tag service: linkTag / unlinkTag / listTagsForEntity", () => {
  it("links a tag to an entity", async () => {
    const { prisma, tagLinks } = createPrisma();
    const service = createTagService(prisma);
    await service.linkTag({ tagId: "tag-1", entityType: "Lead", entityId: "lead-1" });
    expect(tagLinks).toHaveLength(1);
    expect(tagLinks[0]?.entityType).toBe("Lead");
  });

  it("unlinks a tag from an entity", async () => {
    const { prisma, tagLinks } = createPrisma({ tagLinks: [{ id: "tl-1", tagId: "tag-1", entityType: "Lead", entityId: "lead-1", createdAt: new Date() }] });
    const service = createTagService(prisma);
    const result = await service.unlinkTag({ tagId: "tag-1", entityType: "Lead", entityId: "lead-1" });
    expect(result).toBe(true);
    expect(tagLinks).toHaveLength(0);
  });

  it("returns false when unlinking non-existent link", async () => {
    const { prisma } = createPrisma();
    const service = createTagService(prisma);
    expect(await service.unlinkTag({ tagId: "tag-1", entityType: "Lead", entityId: "lead-1" })).toBe(false);
  });

  it("lists tags for an entity", async () => {
    const { prisma } = createPrisma({ tags: [{ id: "tag-1", tenantId: "t1", name: "VIP", createdAt: new Date(), updatedAt: new Date() }, { id: "tag-2", tenantId: "t1", name: "Urgent", createdAt: new Date(), updatedAt: new Date() }], tagLinks: [{ id: "tl-1", tagId: "tag-1", entityType: "Lead", entityId: "lead-1", createdAt: new Date() }] });
    const service = createTagService(prisma);
    const result = await service.listTagsForEntity({ entityType: "Lead", entityId: "lead-1" });
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("VIP");
  });
});

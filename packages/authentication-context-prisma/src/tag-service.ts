export interface TagRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface TagLinkRecord {
  readonly id: string;
  readonly tagId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly createdAt: Date;
}

export interface TagCreateInput {
  readonly name: string;
}

export interface TagService {
  createTag(args: { tenantId: string; input: TagCreateInput }): Promise<TagRecord>;
  getTag(args: { tenantId: string; tagId: string }): Promise<TagRecord | null>;
  listTags(args: { tenantId: string }): Promise<readonly TagRecord[]>;
  linkTag(args: { tagId: string; entityType: string; entityId: string }): Promise<TagLinkRecord>;
  unlinkTag(args: { tagId: string; entityType: string; entityId: string }): Promise<boolean>;
  listTagsForEntity(args: { entityType: string; entityId: string }): Promise<readonly TagRecord[]>;
}

interface TagPrismaClient {
  readonly tag: {
    create: (args: { data: Record<string, unknown> }) => Promise<TagRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<TagRecord | null>;
    findMany: (args: { where?: Record<string, unknown>; orderBy?: Record<string, unknown> }) => Promise<TagRecord[]>;
  };
  readonly tagLink: {
    create: (args: { data: Record<string, unknown> }) => Promise<TagLinkRecord>;
    deleteMany: (args: { where: Record<string, unknown> }) => Promise<{ count: number }>;
    findMany: (args: { where?: Record<string, unknown> }) => Promise<readonly TagLinkRecord[]>;
  };
}

export function createTagService(prisma: TagPrismaClient): TagService {
  return {
    async createTag({ tenantId, input }) {
      return prisma.tag.create({
        data: { tenantId, name: input.name },
      });
    },

    async getTag({ tenantId, tagId }) {
      const tag = await prisma.tag.findUnique({ where: { id: tagId } });
      if (tag === null || tag.tenantId !== tenantId) return null;
      return tag;
    },

    async listTags({ tenantId }) {
      return prisma.tag.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
    },

    async linkTag({ tagId, entityType, entityId }) {
      return prisma.tagLink.create({
        data: { tagId, entityType, entityId },
      });
    },

    async unlinkTag({ tagId, entityType, entityId }) {
      const result = await prisma.tagLink.deleteMany({
        where: { tagId, entityType, entityId },
      });
      return result.count > 0;
    },

    async listTagsForEntity({ entityType, entityId }) {
      const links = await prisma.tagLink.findMany({
        where: { entityType, entityId },
      });
      if (links.length === 0) return [];
      const tagIds = links.map((l) => l.tagId);
      return prisma.tag.findMany({
        where: { id: { in: tagIds } },
        orderBy: { name: "asc" },
      });
    },
  };
}

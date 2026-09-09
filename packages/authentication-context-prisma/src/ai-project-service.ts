export interface AiProjectRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: string;
  readonly metadata: Record<string, unknown> | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AiProjectCreateInput {
  readonly tenantId: string;
  readonly name: string;
  readonly description?: string | null;
  readonly status?: string;
  readonly metadata?: Record<string, unknown> | null;
}

export interface AiProjectUpdateInput {
  readonly name?: string;
  readonly description?: string | null;
  readonly status?: string;
  readonly metadata?: Record<string, unknown> | null;
}

export interface AiProjectService {
  createProject(input: AiProjectCreateInput): Promise<AiProjectRecord>;
  getProject(args: { tenantId: string; projectId: string }): Promise<AiProjectRecord | null>;
  listProjects(args: { tenantId: string }): Promise<readonly AiProjectRecord[]>;
  updateProject(args: {
    tenantId: string;
    projectId: string;
    input: AiProjectUpdateInput;
  }): Promise<AiProjectRecord | null>;
}

interface AiProjectPrismaClient {
  readonly aiProject: {
    create: (args: { data: Record<string, unknown> }) => Promise<AiProjectRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<AiProjectRecord | null>;
    findMany: (args: { where?: Record<string, unknown> }) => Promise<AiProjectRecord[]>;
    update: (args: { data: Record<string, unknown>; where: { id: string } }) => Promise<AiProjectRecord>;
  };
}

export function createAiProjectService(prisma: AiProjectPrismaClient): AiProjectService {
  return {
    async createProject(input) {
      return prisma.aiProject.create({
        data: {
          tenantId: input.tenantId,
          name: input.name,
          description: input.description ?? null,
          status: input.status ?? "active",
          metadata: input.metadata ?? null,
        },
      });
    },
    async getProject({ tenantId, projectId }) {
      const project = await prisma.aiProject.findUnique({ where: { id: projectId } });
      if (project === null) {
        return null;
      }
      if (project.tenantId !== tenantId) {
        return null;
      }
      return project;
    },
    async listProjects({ tenantId }) {
      return prisma.aiProject.findMany({ where: { tenantId } });
    },
    async updateProject({ tenantId, projectId, input }) {
      const existing = await prisma.aiProject.findUnique({ where: { id: projectId } });
      if (existing === null || existing.tenantId !== tenantId) {
        return null;
      }
      const data: Record<string, unknown> = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.description !== undefined) data.description = input.description;
      if (input.status !== undefined) data.status = input.status;
      if (input.metadata !== undefined) data.metadata = input.metadata;
      return prisma.aiProject.update({ where: { id: projectId }, data });
    },
  };
}

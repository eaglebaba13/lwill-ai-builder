export interface CustomerRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly notes: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CustomerCreateInput {
  readonly tenantId: string;
  readonly name: string;
  readonly phone?: string | null;
  readonly email?: string | null;
  readonly notes?: string | null;
}

export interface CustomerUpdateInput {
  readonly name?: string;
  readonly phone?: string | null;
  readonly email?: string | null;
  readonly notes?: string | null;
  readonly isActive?: boolean;
}

export interface CustomerService {
  createCustomer(input: CustomerCreateInput): Promise<CustomerRecord>;
  getCustomer(args: { tenantId: string; customerId: string }): Promise<CustomerRecord | null>;
  listCustomers(args: { tenantId: string }): Promise<readonly CustomerRecord[]>;
  updateCustomer(args: {
    tenantId: string;
    customerId: string;
    input: CustomerUpdateInput;
  }): Promise<CustomerRecord | null>;
}

interface CustomerPrismaClient {
  readonly customer: {
    create: (args: { data: Record<string, unknown> }) => Promise<CustomerRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<CustomerRecord | null>;
    findMany: (args: { where?: Record<string, unknown> }) => Promise<CustomerRecord[]>;
    update: (args: { data: Record<string, unknown>; where: { id: string } }) => Promise<CustomerRecord>;
    delete: (args: { where: { id: string } }) => Promise<CustomerRecord>;
  };
}

export function createCustomerService(prisma: CustomerPrismaClient): CustomerService {
  return {
    async createCustomer(input) {
      return prisma.customer.create({
        data: {
          tenantId: input.tenantId,
          name: input.name,
          phone: input.phone ?? null,
          email: input.email ?? null,
          notes: input.notes ?? null,
          isActive: true,
        },
      });
    },
    async getCustomer({ tenantId, customerId }) {
      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (customer === null) {
        return null;
      }
      if (customer.tenantId !== tenantId) {
        return null;
      }
      return customer;
    },
    async listCustomers({ tenantId }) {
      return prisma.customer.findMany({ where: { tenantId } });
    },
    async updateCustomer({ tenantId, customerId, input }) {
      const existing = await prisma.customer.findUnique({ where: { id: customerId } });
      if (existing === null || existing.tenantId !== tenantId) {
        return null;
      }
      const data: Record<string, unknown> = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.phone !== undefined) data.phone = input.phone;
      if (input.email !== undefined) data.email = input.email;
      if (input.notes !== undefined) data.notes = input.notes;
      if (input.isActive !== undefined) data.isActive = input.isActive;
      return prisma.customer.update({ where: { id: customerId }, data });
    },
  };
}

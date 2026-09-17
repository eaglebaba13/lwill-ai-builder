import "server-only";
import { getAuthenticationContext } from "@/lib/auth/server-context";
import { authorizeFromContext } from "@/lib/auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createProductService } from "../../../../../packages/authentication-context-prisma/src/product-service";
import { createCategoryService } from "../../../../../packages/authentication-context-prisma/src/category-service";
import { createStockService } from "../../../../../packages/authentication-context-prisma/src/stock-service";
import { createBranchService } from "../../../../../packages/authentication-context-prisma/src/branch-service";
import { createPurchaseReceiptService } from "../../../../../packages/authentication-context-prisma/src/purchase-receipt-service";
import type { InventoryTransferAuthorization, InventoryTransferServices } from "./inventory-transfer-route-handlers";

const authService = createAuthorizationService({ loadPermissionGrants });
const productService = createProductService(prisma as never);
const categoryService = createCategoryService(prisma as never);
const stockItemService = createStockService(prisma as never);
const branchService = createBranchService(prisma as never);
const purchaseService = createPurchaseReceiptService(prisma as never);

async function authorize(permissionCode: string): Promise<InventoryTransferAuthorization> {
  const context = await getAuthenticationContext();
  if (!context.authenticated) return { outcome: "unauthenticated" };
  if (context.tenantContext === null) return { outcome: "forbidden" };
  const tenantId = context.tenantContext.tenantId;
  const decision = await authorizeFromContext(context, { permissionCode, scope: { kind: "tenant", tenantId } }, authService);
  return decision.allowed ? { outcome: "authorized", tenantId } : { outcome: "forbidden" };
}

type TransactionHost = { $transaction: <T>(callback: (tx: unknown) => Promise<T>) => Promise<T> };

export function createInventoryTransferServices(): InventoryTransferServices {
  return {
    authorize,
    listProducts: (tenantId) => productService.listProducts({ tenantId }),
    listCategories: (tenantId) => categoryService.listCategories({ tenantId }),
    listStockItems: (tenantId) => stockItemService.listStockItems({ tenantId }),
    listBranches: (tenantId) => branchService.listBranches({ tenantId }),
    listPurchaseReceipts: async (tenantId) => {
      const receipts = await purchaseService.listPurchaseReceipts({ tenantId });
      return receipts.map((receipt) => ({ ...receipt, receivedAt: new Date(receipt.receivedAt).toISOString() }));
    },
    importProducts: (tenantId, rows) => (prisma as unknown as TransactionHost).$transaction(async (tx) => {
      const transactionalService = createProductService(tx as never);
      for (const row of rows) {
        await transactionalService.createProduct({ tenantId, categoryId: row.categoryId, name: row.name, sku: row.sku, unit: row.unit, priceCents: row.priceCents, isActive: row.isActive });
      }
      return rows.length;
    }),
  };
}
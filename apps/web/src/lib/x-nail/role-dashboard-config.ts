export interface RoleDashboardConfig {
  readonly roleCode: string;
  readonly roleName: string;
  readonly tabs: readonly string[];
  readonly kpis: readonly KpiDefinition[];
}

export interface KpiDefinition {
  readonly key: string;
  readonly label: string;
  readonly source: KpiSource;
}

export type KpiSource =
  | { readonly type: "appointmentsToday" }
  | { readonly type: "revenue" }
  | { readonly type: "memberships" }
  | { readonly type: "staff" }
  | { readonly type: "customers" }
  | { readonly type: "lowStock" }
  | { readonly type: "branches" }
  | { readonly type: "attendance" }
  | { readonly type: "invoices" }
  | { readonly type: "purchaseReceipts" }
  | { readonly type: "stockTransfers" };

const ALL_TABS = [
  "Overview",
  "Customers",
  "Services",
  "Packages",
  "Memberships",
  "Inventory",
  "Staff",
  "Attendance",
  "Appointments",
  "Billing",
  "Branches",
  "Reports",
  "Settings",
  "Notifications",
  "Franchise Overview",
  "Financials",
  "Territories",
  "Partners",
  "Agreements",
  "Outlets",
] as const;

const ADMIN_TABS = ALL_TABS;
const BRANCH_TABS = [
  "Overview",
  "Customers",
  "Services",
  "Packages",
  "Memberships",
  "Inventory",
  "Staff",
  "Attendance",
  "Appointments",
  "Billing",
  "Reports",
] as const;
const STAFF_TABS = [
  "Overview",
  "Appointments",
  "Customers",
  "Services",
  "Memberships",
  "Attendance",
] as const;
const ACCOUNTS_TABS = [
  "Overview",
  "Billing",
  "Reports",
  "Settings",
] as const;
const FRANCHISE_TABS = [
  "Franchise Overview",
  "Financials",
  "Territories",
  "Partners",
  "Agreements",
  "Outlets",
  "Overview",
  "Branches",
  "Reports",
  "Inventory",
  "Appointments",
  "Customers",
] as const;

export const ROLE_DASHBOARD_CONFIGS: readonly RoleDashboardConfig[] = [
  {
    roleCode: "tenant-admin",
    roleName: "Admin",
    tabs: ADMIN_TABS,
    kpis: [
      { key: "appointmentsToday", label: "Today", source: { type: "appointmentsToday" } },
      { key: "revenue", label: "Revenue", source: { type: "revenue" } },
      { key: "memberships", label: "Members", source: { type: "memberships" } },
      { key: "staff", label: "Staff", source: { type: "staff" } },
      { key: "customers", label: "Customers", source: { type: "customers" } },
      { key: "lowStock", label: "Low stock", source: { type: "lowStock" } },
      { key: "branches", label: "Branches", source: { type: "branches" } },
    ],
  },
  {
    roleCode: "branch-manager",
    roleName: "Branch",
    tabs: BRANCH_TABS,
    kpis: [
      { key: "appointmentsToday", label: "Today", source: { type: "appointmentsToday" } },
      { key: "revenue", label: "Revenue", source: { type: "revenue" } },
      { key: "customers", label: "Customers", source: { type: "customers" } },
      { key: "staff", label: "Staff", source: { type: "staff" } },
      { key: "attendance", label: "Attendance", source: { type: "attendance" } },
      { key: "lowStock", label: "Low stock", source: { type: "lowStock" } },
      { key: "purchaseReceipts", label: "Purchases", source: { type: "purchaseReceipts" } },
    ],
  },
  {
    roleCode: "staff",
    roleName: "Staff",
    tabs: STAFF_TABS,
    kpis: [
      { key: "appointmentsToday", label: "Today", source: { type: "appointmentsToday" } },
      { key: "attendance", label: "Attendance", source: { type: "attendance" } },
      { key: "customers", label: "Customers", source: { type: "customers" } },
      { key: "memberships", label: "Members", source: { type: "memberships" } },
    ],
  },
  {
    roleCode: "accounts",
    roleName: "Accounts",
    tabs: ACCOUNTS_TABS,
    kpis: [
      { key: "revenue", label: "Revenue", source: { type: "revenue" } },
      { key: "invoices", label: "Invoices", source: { type: "invoices" } },
      { key: "memberships", label: "Members", source: { type: "memberships" } },
    ],
  },
  {
    roleCode: "franchise",
    roleName: "Franchise",
    tabs: FRANCHISE_TABS,
    kpis: [
      { key: "branches", label: "Branches", source: { type: "branches" } },
      { key: "appointmentsToday", label: "Appointments", source: { type: "appointmentsToday" } },
      { key: "customers", label: "Customers", source: { type: "customers" } },
      { key: "revenue", label: "Revenue", source: { type: "revenue" } },
      { key: "lowStock", label: "Low stock", source: { type: "lowStock" } },
    ],
  },
];

export function findRoleConfig(roleCode: string): RoleDashboardConfig | undefined {
  return ROLE_DASHBOARD_CONFIGS.find((config) => config.roleCode === roleCode);
}

export function deriveTabsFromPermissions(permissionCodes: readonly string[]): readonly string[] {
  const has = (code: string) => permissionCodes.includes(code);
  const tabs: string[] = ["Overview"];
  if (has("customer.read") || has("customer.write")) tabs.push("Customers");
  if (has("service.read") || has("service.write")) tabs.push("Services");
  if (has("package.read") || has("package.write")) tabs.push("Packages");
  if (has("membership.read") || has("membership.write")) tabs.push("Memberships");
  if (
    has("product.read") ||
    has("product.write") ||
    has("stockAdjustment.read") ||
    has("stockAdjustment.write") ||
    has("stockTransfer.read") ||
    has("stockTransfer.write") ||
    has("purchaseReceipt.read") ||
    has("purchaseReceipt.write") ||
    has("reorderRule.read") ||
    has("reorderRule.write") ||
    has("supplier.read") ||
    has("supplier.write") ||
    has("warehouse.read") ||
    has("warehouse.write")
  ) {
    tabs.push("Inventory");
  }
  if (has("staff.read") || has("staff.write")) tabs.push("Staff");
  if (has("attendance.read") || has("attendance.write")) tabs.push("Attendance");
  if (has("appointment.read") || has("appointment.write")) tabs.push("Appointments");
  if (has("invoice.read") || has("invoice.write")) tabs.push("Billing");
  if (has("branch.read") || has("branch.write") || has("business-unit.read") || has("business-unit.write")) tabs.push("Branches");
  if (has("report.read")) tabs.push("Reports");
  if (has("setting.read") || has("setting.write")) tabs.push("Settings");
  if (has("notification.read") || has("notification.write")) tabs.push("Notifications");
  if (has("franchise.read") || has("franchise.write") || has("report.read")) {
    tabs.push("Franchise Overview");
    tabs.push("Financials");
    tabs.push("Territories");
    tabs.push("Partners");
    tabs.push("Agreements");
    tabs.push("Outlets");
  }
  return tabs;
}

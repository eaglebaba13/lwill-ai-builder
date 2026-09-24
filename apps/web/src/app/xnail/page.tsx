"use client";

import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { AppSidebar, type SidebarIconKey, type SidebarSection } from "@/components/app-sidebar";
import { KpiCard as SharedKpiCard } from "@/components/kpi-card";
import { CrmBadge, CrmEmptyState, CrmPanel, CrmWorkspace } from "@/components/xnail/crm-workspace";
import { OperationsBadge, OperationsEmptyState, OperationsPanel, OperationsWorkspace } from "@/components/xnail/operations-workspace";
import { BillingDownloadActions, BillingEmptyState, BillingPanel, BillingStatusBadge, BillingTotals, BillingWorkspace, formatMoney } from "@/components/xnail/billing-workspace";
import { InventoryWorkspace } from "@/components/xnail/inventory-workspace";
import { HierarchyDashboard } from "@/components/xnail/hierarchy-dashboard";
import {
  invalidatePendingRefresh,
  loginWithNativeAuthentication,
  logoutFromNativeAuthentication,
  restoreNativeAuthentication,
} from "@/lib/auth/native-auth-client";
import {
  APPOINTMENT_STATUS_ORDER,
  transitionAppointmentStatus,
  type AppointmentStatus,
} from "@/lib/x-nail/operational-workflow";
import {
  deriveTabsFromPermissions,
  findRoleConfig,
  type RoleDashboardConfig,
} from "@/lib/x-nail/role-dashboard-config";

type CustomerRecord = {
  id: string;
  tenantId: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes?: string | null;
  isActive: boolean;
};

type LeadRecord = {
  id: string;
  tenantId: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: string;
  convertedToCustomerId: string | null;
  convertedAt: string | null;
};

type ServiceRecord = {
  id: string;
  tenantId: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  description: string | null;
  isActive: boolean;
};

type AppointmentRecord = {
  id: string;
  tenantId: string;
  customerId: string;
  serviceId: string;
  staffId: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
};

type PackageRecord = {
  id: string;
  name: string;
  serviceIds: string[];
  priceCents: number | null;
  durationDays: number | null;
  isActive: boolean;
};

type MembershipRecord = {
  id: string;
  customerId: string;
  packageId: string;
  startedAt: string;
  endsAt: string | null;
  status: string | null;
};

type StaffRecord = {
  id: string;
  tenantId: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  branchId: string | null;
  isActive: boolean;
};

function toLocalAppointment(apiRecord: {
  id: string;
  tenantId: string;
  customerId: string;
  serviceId: string;
  startsAt: string;
  endsAt: string;
  status: string;
}): AppointmentRecord {
  return {
    id: apiRecord.id,
    tenantId: apiRecord.tenantId,
    customerId: apiRecord.customerId,
    serviceId: apiRecord.serviceId,
    staffId: "",
    startsAt: apiRecord.startsAt,
    endsAt: apiRecord.endsAt,
    status: apiRecord.status as AppointmentStatus,
  };
}

type KpiContext = {
  readonly appointments: AppointmentRecord[];
  readonly invoices: Array<{ totalCents: number }>;
  readonly memberships: Array<{ id: string }>;
  readonly staff: Array<{ id: string }>;
  readonly customers: Array<{ id: string }>;
  readonly lowStockItems: Array<{ stockItemId: string; productId: string; branchId: string; quantity: number; minQuantity: number; reorderQuantity: number }>;
  readonly branches: Array<{ id: string }>;
  readonly attendance: Array<{ id: string; checkInAt: string }>;
  readonly purchaseReceipts: Array<{ id: string }>;
};

function MetricGlyph({ type }: { readonly type: RoleDashboardConfig["kpis"][number]["source"]["type"] }) {
  const common = "h-4 w-4";

  switch (type) {
    case "revenue":
    case "invoices":
      return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 7h16" /><path d="M6 7v12h12V7" /><path d="M9 11h6" /><path d="M9 15h4" /></svg>;
    case "lowStock":
    case "purchaseReceipts":
      return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 8l8-4 8 4-8 4-8-4Z" /><path d="M4 8v8l8 4 8-4V8" /></svg>;
    case "staff":
    case "attendance":
      return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>;
    case "branches":
      return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 21V5a2 2 0 0 1 2-2h8v18" /><path d="M14 9h4a2 2 0 0 1 2 2v10" /></svg>;
    case "customers":
    case "memberships":
      return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M7 8a4 4 0 1 0 0.01 0Z" /><path d="M17 10a3 3 0 1 0 0.01 0Z" /><path d="M3 20a4 4 0 0 1 8 0" /><path d="M14 20a3.5 3.5 0 0 1 7 0" /></svg>;
    case "appointmentsToday":
    default:
      return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M7 3v4" /><path d="M17 3v4" /><path d="M4 9h16" /><path d="M5 5h14v16H5z" /></svg>;
  }
}

function KpiCard({ definition, context }: { readonly definition: RoleDashboardConfig["kpis"][number]; readonly context: KpiContext }) {
  const today = new Date().toISOString().split("T")[0];
  let value: string | number = "";
  let subtitle: string | undefined;
  let tone: "default" | "gold" | "success" | "warning" | "danger" = "default";

  switch (definition.source.type) {
    case "appointmentsToday":
      value = context.appointments.filter((a) => a.startsAt.startsWith(today)).length;
      subtitle = "Appointments scheduled today";
      tone = "gold";
      break;
    case "revenue":
      value = `₹${(context.invoices.reduce((sum, inv) => sum + inv.totalCents, 0) / 100).toLocaleString("en-IN")}`;
      subtitle = "Gross sales from loaded invoices";
      tone = "gold";
      break;
    case "memberships":
      value = context.memberships.length;
      subtitle = "Membership records loaded";
      break;
    case "staff":
      value = context.staff.length;
      subtitle = "Staff records loaded";
      break;
    case "customers":
      value = context.customers.length;
      subtitle = "Customer records loaded";
      break;
    case "lowStock":
      value = context.lowStockItems.length;
      subtitle = "Low-stock alerts loaded";
      tone = context.lowStockItems.length > 0 ? "warning" : "success";
      break;
    case "branches":
      value = context.branches.length;
      subtitle = "Branch records loaded";
      break;
    case "attendance":
      value = context.attendance.filter((a) => a.checkInAt.startsWith(today)).length;
      subtitle = "Attendance entries today";
      break;
    case "invoices":
      value = context.invoices.length;
      subtitle = "Invoice records loaded";
      break;
    case "purchaseReceipts":
      value = context.purchaseReceipts.length;
      subtitle = "Purchase receipts loaded";
      break;
  }

  return <SharedKpiCard title={definition.label} value={value} subtitle={subtitle} icon={<MetricGlyph type={definition.source.type} />} tone={tone} meta="Live state" />;
}

const ALL_TABS = ["Overview", "Customers", "Leads", "Pipeline", "Follow-ups", "Communications", "Tags & Notes", "Services", "Packages", "Memberships", "Inventory", "Staff", "Attendance", "Appointments", "Billing", "Branches", "Reports", "Settings", "Notifications", "Users & Access", "Gateway Accounts", "Marketplace", "Franchise Overview", "Financials", "Territories", "Partners", "Agreements", "Outlets", "Franchise Settlement", "Hierarchy"] as const;
type XNailTab = (typeof ALL_TABS)[number];

type NavigationGroup = {
  readonly label: string;
  readonly icon: SidebarIconKey;
  readonly tabs: readonly XNailTab[];
};

const SIDEBAR_NAVIGATION_GROUPS: readonly NavigationGroup[] = [
  { label: "Workspace", icon: "overview", tabs: ["Overview"] },
  { label: "CRM", icon: "crm", tabs: ["Customers", "Leads", "Pipeline", "Follow-ups", "Communications", "Tags & Notes"] },
  { label: "Operations", icon: "operations", tabs: ["Appointments", "Services", "Packages", "Memberships", "Billing"] },
  { label: "Inventory", icon: "inventory", tabs: ["Inventory"] },
  { label: "Team", icon: "team", tabs: ["Staff", "Attendance"] },
  { label: "Business", icon: "business", tabs: ["Branches", "Reports", "Financials"] },
  { label: "Franchise", icon: "franchise", tabs: ["Franchise Overview", "Territories", "Partners", "Agreements", "Outlets", "Franchise Settlement", "Hierarchy"] },
  { label: "Platform", icon: "platform", tabs: ["Marketplace", "Gateway Accounts"] },
  { label: "Administration", icon: "admin", tabs: ["Notifications", "Users & Access", "Settings"] },
] as const;

function buildSidebarSections(visibleTabs: readonly XNailTab[], activeTab: XNailTab, onSelectTab: (tab: XNailTab) => void): SidebarSection[] {
  const visibleTabSet = new Set<XNailTab>(visibleTabs);

  return SIDEBAR_NAVIGATION_GROUPS.map((group) => ({
    label: group.label,
    items: group.tabs
      .filter((tab) => visibleTabSet.has(tab))
      .map((tab) => ({
        label: tab,
        active: activeTab === tab,
        icon: group.icon,
        onClick: () => onSelectTab(tab),
      })),
  })).filter((section) => section.items.length > 0);
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<(typeof ALL_TABS)[number]>("Overview");
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const authenticationRequestId = useRef(0);
  const isLoginInProgress = useRef(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [passwordResetMode, setPasswordResetMode] = useState<"login" | "request" | "reset">("login");
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [userRoles, setUserRoles] = useState<Array<{
    id: string;
    code: string;
    name: string;
    scope: { kind: string; businessUnitId?: string | null; branchId?: string | null };
    permissions: Array<{ code: string }>;
  }>>([]);
  const [effectiveRole, setEffectiveRole] = useState<RoleDashboardConfig | null>(null);
  const [userProfile, setUserProfile] = useState<{ userId: string; email: string | null; displayName: string | null } | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [permissionCodes, setPermissionCodes] = useState<string[]>([]);
  const [visibleTabs, setVisibleTabs] = useState<(typeof ALL_TABS)[number][]>([...ALL_TABS]);
  const [profileVersion, setProfileVersion] = useState(0);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadSource, setLeadSource] = useState("");
  type PipelineRecord = { id: string; tenantId: string; name: string; isActive: boolean };
  type StageRecord = { id: string; tenantId: string; pipelineId: string; name: string; position: number; isActive: boolean };
  type OpportunityRecord = { id: string; tenantId: string; pipelineId: string; stageId: string; name: string; customerId: string | null; leadId: string | null; valueCents: number; status: string; notes: string | null; pipeline?: PipelineRecord; stage?: StageRecord };
  const [pipelines, setPipelines] = useState<PipelineRecord[]>([]);
  const [stages, setStages] = useState<StageRecord[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [pipelineName, setPipelineName] = useState("");
  const [stageName, setStageName] = useState("");
  const [stagePosition, setStagePosition] = useState(0);
  const [oppName, setOppName] = useState("");
  const [oppStageId, setOppStageId] = useState("");
  const [oppValue, setOppValue] = useState("");
  const [opportunityError, setOpportunityError] = useState<string | null>(null);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  type FollowupRecord = { id: string; tenantId: string; title: string; notes: string | null; dueAt: string; status: string; leadId: string | null; customerId: string | null; opportunityId: string | null };
  const [followups, setFollowups] = useState<FollowupRecord[]>([]);
  const [followupTitle, setFollowupTitle] = useState("");
  const [followupDueAt, setFollowupDueAt] = useState("");
  const [followupError, setFollowupError] = useState<string | null>(null);
  type CommunicationRecord = { id: string; tenantId: string; channel: string; direction: string; contactName: string | null; subject: string | null; body: string; communicatedAt: string; leadId: string | null; customerId: string | null; opportunityId: string | null };
  const [communications, setCommunications] = useState<CommunicationRecord[]>([]);
  const [commChannel, setCommChannel] = useState("email");
  const [commDirection, setCommDirection] = useState("outbound");
  const [commBody, setCommBody] = useState("");
  const [commSubject, setCommSubject] = useState("");
  const [commContactName, setCommContactName] = useState("");
  const [commError, setCommError] = useState<string | null>(null);
  type TagRecord = { id: string; tenantId: string; name: string };
  type CrmNoteRecord = { id: string; tenantId: string; body: string; leadId: string | null; customerId: string | null; opportunityId: string | null; createdAt: string };
  type AttachmentRecord = { id: string; tenantId: string; name: string; url: string; mimeType: string | null; sizeBytes: number | null; leadId: string | null; customerId: string | null; opportunityId: string | null; createdAt: string };
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [crmNotes, setCrmNotes] = useState<CrmNoteRecord[]>([]);
  const [attachments, setAttachments] = useState<AttachmentRecord[]>([]);
  const [tagName, setTagName] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [attName, setAttName] = useState("");
  const [attUrl, setAttUrl] = useState("");
  const [tagError, setTagError] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  const [packageError, setPackageError] = useState<string | null>(null);
  const [packageName, setPackageName] = useState("");
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [editingPackageName, setEditingPackageName] = useState("");
  const [memberships, setMemberships] = useState<MembershipRecord[]>([]);
  const [isLoadingMemberships, setIsLoadingMemberships] = useState(false);
  const [membershipError, setMembershipError] = useState<string | null>(null);
  const [membershipCustomerId, setMembershipCustomerId] = useState("");
  const [membershipPackageId, setMembershipPackageId] = useState("");
  const [membershipStartedAt, setMembershipStartedAt] = useState(
    new Date().toISOString(),
  );
  const [membershipEndsAt, setMembershipEndsAt] = useState("");
  const [membershipStatus, setMembershipStatus] = useState("");
  const [editingMembershipId, setEditingMembershipId] = useState<string | null>(null);
  const [editingMembershipStatus, setEditingMembershipStatus] = useState("");
  const [invoices, setInvoices] = useState<Array<{
    id: string;
    customerId: string;
    branchId?: string | null;
    issuedAt: string;
    subtotalCents: number;
    discountCents: number;
    gstCents: number;
    totalCents: number;
    notes: string | null;
    paidCents?: number;
  }>>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [invoiceCustomerId, setInvoiceCustomerId] = useState("");
  const [invoiceBranchId, setInvoiceBranchId] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editingInvoiceDiscountCents, setEditingInvoiceDiscountCents] = useState("0");
  const [editingInvoiceNotes, setEditingInvoiceNotes] = useState("");
  const [cartItems, setCartItems] = useState<Array<{ id: string; type: "product" | "service" | "package"; itemId: string; description: string; unitPriceCents: number; quantity: number }>>([]);
  const [cartItemType, setCartItemType] = useState<"product" | "service" | "package">("product");
  const [cartItemId, setCartItemId] = useState("");
  const [cartItemQuantity, setCartItemQuantity] = useState("1");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("offline");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [products, setProducts] = useState<Array<{ id: string; categoryId: string; name: string; sku: string; unit: string; priceCents: number; isActive: boolean }>>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [productSku, setProductSku] = useState("");
  const [productPrice, setProductPrice] = useState("1500");
  const [productCategoryId, setProductCategoryId] = useState("");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProductName, setEditingProductName] = useState("");
  const [editingProductSku, setEditingProductSku] = useState("");
  const [editingProductPrice, setEditingProductPrice] = useState("1500");
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string; description: string | null; isActive: boolean }>
  >([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingCategoryDescription, setEditingCategoryDescription] = useState("");
  const [stockItems, setStockItems] = useState<
    Array<{ id: string; productId: string; branchId: string; quantity: number }>
  >([]);
  const [isLoadingStockItems, setIsLoadingStockItems] = useState(false);
  const [stockItemError, setStockItemError] = useState<string | null>(null);
  const [stockItemProductId, setStockItemProductId] = useState("");
  const [stockItemBranchId, setStockItemBranchId] = useState("");
  const [stockItemQuantity, setStockItemQuantity] = useState("0");
  const [editingStockItemId, setEditingStockItemId] = useState<string | null>(null);
  const [editingStockItemQuantity, setEditingStockItemQuantity] = useState("0");
  const [stockMovements, setStockMovements] = useState<
    Array<{ id: string; productId: string; movementType: string; quantity: number; notes: string | null; createdAt: string }>
  >([]);
  const [isLoadingStockMovements, setIsLoadingStockMovements] = useState(false);
  const [stockMovementError, setStockMovementError] = useState<string | null>(null);
  const [stockMovementProductId, setStockMovementProductId] = useState("");
  const [stockMovementBranchId, setStockMovementBranchId] = useState("");
  const [stockMovementType, setStockMovementType] = useState("PURCHASE");
  const [stockMovementQuantity, setStockMovementQuantity] = useState("1");
  const [stockMovementNotes, setStockMovementNotes] = useState("");
  const [adjustmentDirection, setAdjustmentDirection] = useState<"IN" | "OUT">("IN");
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string; location: string | null; isActive: boolean }>>([]);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);
  const [warehouseError, setWarehouseError] = useState<string | null>(null);
  const [warehouseName, setWarehouseName] = useState("");
  const [warehouseLocation, setWarehouseLocation] = useState("");
  const [editingWarehouseId, setEditingWarehouseId] = useState<string | null>(null);
  const [editingWarehouseName, setEditingWarehouseName] = useState("");
  const [editingWarehouseLocation, setEditingWarehouseLocation] = useState("");
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string; contactName: string | null; email: string | null; phone: string | null; isActive: boolean }>>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [supplierError, setSupplierError] = useState<string | null>(null);
  const [supplierName, setSupplierName] = useState("");
  const [supplierContactName, setSupplierContactName] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [editingSupplierName, setEditingSupplierName] = useState("");
  const [editingSupplierContactName, setEditingSupplierContactName] = useState("");
  const [editingSupplierEmail, setEditingSupplierEmail] = useState("");
  const [editingSupplierPhone, setEditingSupplierPhone] = useState("");
  const [reorderRules, setReorderRules] = useState<Array<{ id: string; productId: string; branchId: string; warehouseId: string; minQuantity: number; reorderQuantity: number; isActive: boolean }>>([]);
  const [isLoadingReorderRules, setIsLoadingReorderRules] = useState(false);
  const [reorderRuleError, setReorderRuleError] = useState<string | null>(null);
  const [reorderRuleProductId, setReorderRuleProductId] = useState("");
  const [reorderRuleBranchId, setReorderRuleBranchId] = useState("");
  const [reorderRuleWarehouseId, setReorderRuleWarehouseId] = useState("");
  const [reorderRuleMinQuantity, setReorderRuleMinQuantity] = useState("10");
  const [reorderRuleReorderQuantity, setReorderRuleReorderQuantity] = useState("50");
  const [editingReorderRuleId, setEditingReorderRuleId] = useState<string | null>(null);
  const [editingReorderRuleProductId, setEditingReorderRuleProductId] = useState("");
  const [editingReorderRuleBranchId, setEditingReorderRuleBranchId] = useState("");
  const [editingReorderRuleWarehouseId, setEditingReorderRuleWarehouseId] = useState("");
  const [editingReorderRuleMinQuantity, setEditingReorderRuleMinQuantity] = useState("10");
  const [editingReorderRuleReorderQuantity, setEditingReorderRuleReorderQuantity] = useState("50");
  const [lowStockItems, setLowStockItems] = useState<Array<{ stockItemId: string; productId: string; branchId: string; quantity: number; minQuantity: number; reorderQuantity: number }>>([]);
  const [isLoadingLowStockItems, setIsLoadingLowStockItems] = useState(false);
  const [lowStockItemError, setLowStockItemError] = useState<string | null>(null);
  const [purchaseReceipts, setPurchaseReceipts] = useState<Array<{ id: string; supplierId: string | null; warehouseId: string; branchId: string; receivedBy: string | null; receivedAt: string; notes: string | null; lineItems: Array<{ id: string; productId: string; quantity: number }> }>>([]);
  const [isLoadingPurchaseReceipts, setIsLoadingPurchaseReceipts] = useState(false);
  const [purchaseReceiptError, setPurchaseReceiptError] = useState<string | null>(null);
  const [purchaseReceiptSupplierId, setPurchaseReceiptSupplierId] = useState("");
  const [purchaseReceiptWarehouseId, setPurchaseReceiptWarehouseId] = useState("");
  const [purchaseReceiptBranchId, setPurchaseReceiptBranchId] = useState("");
  const [purchaseReceiptReceivedBy, setPurchaseReceiptReceivedBy] = useState("");
  const [purchaseReceiptNotes, setPurchaseReceiptNotes] = useState("");
  const [purchaseReceiptProductId, setPurchaseReceiptProductId] = useState("");
  const [purchaseReceiptQuantity, setPurchaseReceiptQuantity] = useState("1");
  const [stockTransfers, setStockTransfers] = useState<Array<{ id: string; fromWarehouseId: string; toWarehouseId: string; fromBranchId: string; toBranchId: string; status: string; notes: string | null; lineItems: Array<{ id: string; productId: string; quantity: number }> }>>([]);
  const [isLoadingStockTransfers, setIsLoadingStockTransfers] = useState(false);
  const [stockTransferError, setStockTransferError] = useState<string | null>(null);
  const [stockTransferFromWarehouseId, setStockTransferFromWarehouseId] = useState("");
  const [stockTransferToWarehouseId, setStockTransferToWarehouseId] = useState("");
  const [stockTransferFromBranchId, setStockTransferFromBranchId] = useState("");
  const [stockTransferToBranchId, setStockTransferToBranchId] = useState("");
  const [stockTransferProductId, setStockTransferProductId] = useState("");
  const [stockTransferQuantity, setStockTransferQuantity] = useState("1");
  const [stockAdjustments, setStockAdjustments] = useState<Array<{ id: string; branchId: string; direction: string; notes: string | null; lineItems: Array<{ id: string; productId: string; quantity: number }> }>>([]);
  const [isLoadingStockAdjustments, setIsLoadingStockAdjustments] = useState(false);
  const [stockAdjustmentError, setStockAdjustmentError] = useState<string | null>(null);
  const [stockAdjustmentBranchId, setStockAdjustmentBranchId] = useState("");
  const [stockAdjustmentDirection, setStockAdjustmentDirection] = useState("IN");
  const [stockAdjustmentProductId, setStockAdjustmentProductId] = useState("");
  const [stockAdjustmentQuantity, setStockAdjustmentQuantity] = useState("1");
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffName, setStaffName] = useState("");
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editingStaffName, setEditingStaffName] = useState("");
  const [attendance, setAttendance] = useState<Array<{ id: string; staffId: string; checkInAt: string; checkOutAt: string | null; status: string | null }>>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [attendanceStaffId, setAttendanceStaffId] = useState("");
  const [attendanceCheckIn, setAttendanceCheckIn] = useState(new Date().toISOString());
  const [attendanceCheckOut, setAttendanceCheckOut] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState("");
  const [attendanceNotes, setAttendanceNotes] = useState("");
  const [editingAttendanceId, setEditingAttendanceId] = useState<string | null>(null);
  const [editingAttendanceStatus, setEditingAttendanceStatus] = useState("");
  const [editingAttendanceNotes, setEditingAttendanceNotes] = useState("");
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [editingAppointmentIndex, setEditingAppointmentIndex] = useState<number | null>(null);
  const [editingAppointmentStartsAt, setEditingAppointmentStartsAt] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [editingCustomerName, setEditingCustomerName] = useState("");
  const [editingCustomerPhone, setEditingCustomerPhone] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("1500");
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingServiceName, setEditingServiceName] = useState("");
  const [editingServicePrice, setEditingServicePrice] = useState("1500");
  const [appointmentCustomer, setAppointmentCustomer] = useState("");
  const [appointmentService, setAppointmentService] = useState("");
  const [appointmentStaff, setAppointmentStaff] = useState("");
  const [appointmentError, setAppointmentError] = useState<string | null>(null);
  const [businessUnits, setBusinessUnits] = useState<Array<{ id: string; name: string; slug: string; isActive: boolean }>>([]);
  const [isLoadingBusinessUnits, setIsLoadingBusinessUnits] = useState(false);
  const [businessUnitError, setBusinessUnitError] = useState<string | null>(null);
  const [businessUnitName, setBusinessUnitName] = useState("");
  const [businessUnitSlug, setBusinessUnitSlug] = useState("");
  const [editingBusinessUnitId, setEditingBusinessUnitId] = useState<string | null>(null);
  const [editingBusinessUnitName, setEditingBusinessUnitName] = useState("");
  const [editingBusinessUnitSlug, setEditingBusinessUnitSlug] = useState("");
  const [branches, setBranches] = useState<Array<{ id: string; businessUnitId: string; name: string; slug: string; isActive: boolean }>>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [branchName, setBranchName] = useState("");
  const [branchSlug, setBranchSlug] = useState("");
  const [branchBusinessUnitId, setBranchBusinessUnitId] = useState("");
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editingBranchName, setEditingBranchName] = useState("");
  const [editingBranchSlug, setEditingBranchSlug] = useState("");
  const [settings, setSettings] = useState<Array<{ id: string; key: string; value: string; isActive: boolean }>>([]);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [settingError, setSettingError] = useState<string | null>(null);
  const [settingKey, setSettingKey] = useState("");
  const [settingValue, setSettingValue] = useState("");
  const [editingSettingId, setEditingSettingId] = useState<string | null>(null);
  const [editingSettingKey, setEditingSettingKey] = useState("");
  const [editingSettingValue, setEditingSettingValue] = useState("");
  const [editingSettingIsActive, setEditingSettingIsActive] = useState(true);
  const [gatewayAccounts, setGatewayAccounts] = useState<Array<{ id: string; provider: string; label: string | null; isActive: boolean; createdAt: string }>>([]);
  const [isLoadingGatewayAccounts, setIsLoadingGatewayAccounts] = useState(false);
  const [gatewayAccountError, setGatewayAccountError] = useState<string | null>(null);
  const [newGatewayProvider, setNewGatewayProvider] = useState("");
  const [newGatewayLabel, setNewGatewayLabel] = useState("");
  const [newGatewayConfig, setNewGatewayConfig] = useState("{}");
  const [editingGatewayId, setEditingGatewayId] = useState<string | null>(null);
  const [editingGatewayLabel, setEditingGatewayLabel] = useState("");
  const [editingGatewayIsActive, setEditingGatewayIsActive] = useState(true);
  const [marketplaceAssets, setMarketplaceAssets] = useState<Array<{ id: string; name: string; slug: string; description: string | null; type: string; category: string | null; authorName: string | null; isActive: boolean; createdAt: string }>>([]);
  const [isLoadingMarketplace, setIsLoadingMarketplace] = useState(false);
  const [marketplaceError, setMarketplaceError] = useState<string | null>(null);
  const [installations, setInstallations] = useState<Array<{ id: string; assetId: string; versionId: string; isActive: boolean; installedAt: string }>>([]);
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetSlug, setNewAssetSlug] = useState("");
  const [newAssetType, setNewAssetType] = useState("module");
  const [newAssetDescription, setNewAssetDescription] = useState("");
  const [availableUpdates, setAvailableUpdates] = useState<Array<{ assetId: string; assetName: string; installedVersion: string; latestVersion: string; latestVersionId: string }>>([]);
  const [roleAssignmentUsers, setRoleAssignmentUsers] = useState<Array<{ id: string; membershipId: string; email: string | null; displayName: string | null; isActive: boolean }>>([]);
  const [isLoadingRoleAssignmentUsers, setIsLoadingRoleAssignmentUsers] = useState(false);
  const [roleAssignmentRoles, setRoleAssignmentRoles] = useState<Array<{ id: string; code: string; name: string; scopeType: string; requiresScope: boolean }>>([]);
  const [isLoadingRoleAssignmentRoles, setIsLoadingRoleAssignmentRoles] = useState(false);
  const [roleAssignmentUserId, setRoleAssignmentUserId] = useState("");
  const [roleAssignmentRoleId, setRoleAssignmentRoleId] = useState("");
  const [roleAssignmentScopeKind, setRoleAssignmentScopeKind] = useState<"tenant" | "business-unit" | "branch">("tenant");
  const [roleAssignmentBusinessUnitId, setRoleAssignmentBusinessUnitId] = useState("");
  const [roleAssignmentBranchId, setRoleAssignmentBranchId] = useState("");
  const [roleAssignmentTerritoryId, setRoleAssignmentTerritoryId] = useState("");
  const [isAssigningRole, setIsAssigningRole] = useState(false);
  const [roleAssignmentError, setRoleAssignmentError] = useState<string | null>(null);
  const [roleAssignmentSuccess, setRoleAssignmentSuccess] = useState<string | null>(null);
  const [addUserEmail, setAddUserEmail] = useState("");
  const [addUserDisplayName, setAddUserDisplayName] = useState("");
  const [addUserPassword, setAddUserPassword] = useState("");
  const [addUserRoleId, setAddUserRoleId] = useState("");
  const [addUserError, setAddUserError] = useState<string | null>(null);
  const [addUserSuccess, setAddUserSuccess] = useState<string | null>(null);
  const [notificationTemplates, setNotificationTemplates] = useState<Array<{ id: string; name: string; channel: string; subject: string | null; body: string; isActive: boolean }>>([]);
  const [isLoadingNotificationTemplates, setIsLoadingNotificationTemplates] = useState(false);
  const [notificationTemplateError, setNotificationTemplateError] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateChannel, setTemplateChannel] = useState("");
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateName, setEditingTemplateName] = useState("");
  const [editingTemplateChannel, setEditingTemplateChannel] = useState("");
  const [editingTemplateSubject, setEditingTemplateSubject] = useState("");
  const [editingTemplateBody, setEditingTemplateBody] = useState("");
  const [notificationLogs, setNotificationLogs] = useState<Array<{ id: string; channel: string; subject: string | null; body: string; status: string; sentAt: string | null; readAt: string | null }>>([]);
  const [isLoadingNotificationLogs, setIsLoadingNotificationLogs] = useState(false);
  const [notificationLogError, setNotificationLogError] = useState<string | null>(null);
  const [notificationPreferences, setNotificationPreferences] = useState<Array<{ id: string; channel: string; isEnabled: boolean }>>([]);
  const [isLoadingNotificationPreferences, setIsLoadingNotificationPreferences] = useState(false);
  const [notificationPreferenceError, setNotificationPreferenceError] = useState<string | null>(null);
  const [notificationPreferenceChannel, setNotificationPreferenceChannel] = useState("email");
  const [notificationPreferenceEnabled, setNotificationPreferenceEnabled] = useState(true);
  const [eventSubscriptions, setEventSubscriptions] = useState<Array<{ id: string; eventType: string; notificationTemplateId: string | null; isEnabled: boolean }>>([]);
  const [isLoadingEventSubscriptions, setIsLoadingEventSubscriptions] = useState(false);
  const [eventSubscriptionError, setEventSubscriptionError] = useState<string | null>(null);
  const [eventSubscriptionType, setEventSubscriptionType] = useState("appointment.created");
  const [eventSubscriptionTemplateId, setEventSubscriptionTemplateId] = useState("");
  const [report, setReport] = useState<{
    sales: { invoiceCount: number; totalRevenueCents: number };
    appointments: { total: number; statusBreakdown: Array<{ status: string; count: number }> };
    customers: { total: number };
    inventory: { stockItemCount: number; totalQuantity: number; movementCount: number };
  } | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [dailySales, setDailySales] = useState<Array<{ date: string; invoiceCount: number; totalRevenueCents: number }>>([]);
  const [isLoadingDailySales, setIsLoadingDailySales] = useState(false);
  const [dailySalesError, setDailySalesError] = useState<string | null>(null);
  const [appointmentReport, setAppointmentReport] = useState<Array<{ date: string; appointmentCount: number; statusBreakdown: Array<{ status: string; count: number }> }>>([]);
  const [isLoadingAppointmentReport, setIsLoadingAppointmentReport] = useState(false);
  const [appointmentReportError, setAppointmentReportError] = useState<string | null>(null);
  const [membershipReport, setMembershipReport] = useState<Array<{ status: string; count: number; packageBreakdown: Array<{ packageId: string; packageName: string; count: number }> }>>([]);
  const [isLoadingMembershipReport, setIsLoadingMembershipReport] = useState(false);
  const [membershipReportError, setMembershipReportError] = useState<string | null>(null);
  const [packageUtilizationReport, setPackageUtilizationReport] = useState<Array<{ packageId: string; packageName: string; totalMemberships: number; activeMemberships: number }>>([]);
  const [isLoadingPackageUtilizationReport, setIsLoadingPackageUtilizationReport] = useState(false);
  const [packageUtilizationReportError, setPackageUtilizationReportError] = useState<string | null>(null);
  const [gstSummary, setGstSummary] = useState<{ totalGstCents: number; totalTaxableCents: number; invoiceCount: number } | null>(null);
  const [isLoadingGstSummary, setIsLoadingGstSummary] = useState(false);
  const [gstSummaryError, setGstSummaryError] = useState<string | null>(null);
  const [branchPerformance, setBranchPerformance] = useState<Array<{ branchId: string; branchName: string; staffCount: number; attendanceCount: number }>>([]);
  const [isLoadingBranchPerformance, setIsLoadingBranchPerformance] = useState(false);
  const [branchPerformanceError, setBranchPerformanceError] = useState<string | null>(null);
  type LeadSourceRow = { source: string; count: number };
  type FunnelRow = { stageName: string; position: number; count: number; valueCents: number };
  type ConversionReport = { totalLeads: number; convertedLeads: number; conversionRate: number };
  type PendingFollowupRow = { id: string; title: string; dueAt: string; entityName: string | null; entityType: string | null };
  type CustomerGrowthRow = { month: string; count: number };
  const [crmLeadSource, setCrmLeadSource] = useState<LeadSourceRow[]>([]);
  const [crmSalesFunnel, setCrmSalesFunnel] = useState<FunnelRow[]>([]);
  const [crmConversion, setCrmConversion] = useState<ConversionReport | null>(null);
  const [crmPendingFollowups, setCrmPendingFollowups] = useState<PendingFollowupRow[]>([]);
  const [crmCustomerGrowth, setCrmCustomerGrowth] = useState<CustomerGrowthRow[]>([]);
  const [crmReportsLoading, setCrmReportsLoading] = useState(false);
  const [crmReportsError, setCrmReportsError] = useState<string | null>(null);
  const [franchiseOverview, setFranchiseOverview] = useState<{
    branches: Array<{ branchId: string; branchName: string; isActive: boolean; createdAt: string }>;
    sales: { invoiceCount: number; totalRevenueCents: number; dailyTrend: Array<{ date: string; invoiceCount: number; totalRevenueCents: number }> };
    appointments: { total: number; statusBreakdown: Array<{ status: string; count: number }> };
    customers: { total: number };
    inventory: { lowStockItems: Array<{ productId: string; productName: string; branchId: string; branchName: string; quantity: number }> };
    branchPerformance: Array<{ branchId: string; branchName: string; staffCount: number; attendanceCount: number }>;
  } | null>(null);
  const [isLoadingFranchiseOverview, setIsLoadingFranchiseOverview] = useState(false);
  const [franchiseOverviewError, setFranchiseOverviewError] = useState<string | null>(null);
  const [franchisePayout, setFranchisePayout] = useState<{
    year: number;
    month: number;
    payouts: Array<{
      partnerId: string;
      partnerName: string;
      agreementPayouts: Array<{
        agreementId: string;
        branchId: string;
        branchName: string;
        territoryId: string;
        territoryName: string;
        grossRevenueCents: number;
        revenueShareCents: number;
        eligibleRevenueSharePayoutCents: number;
      }>;
      totalRevenueSharePayoutCents: number;
      territoryRoyalties: Array<{
        territoryId: string;
        territoryName: string;
        territorySalesTurnoverCents: number;
        royaltyPoolCents: number;
        eligiblePartnerCount: number;
        individualRoyaltyCents: number;
      }>;
      totalTerritoryRoyaltyCents: number;
      totalEligiblePayoutCents: number;
    }>;
  } | null>(null);
  const [isLoadingFranchisePayout, setIsLoadingFranchisePayout] = useState(false);
  const [franchisePayoutError, setFranchisePayoutError] = useState<string | null>(null);

  const [territories, setTerritories] = useState<Array<{ id: string; name: string; code: string | null; isActive: boolean; outletCount: number; partnerCount: number }>>([]);
  const [isLoadingTerritories, setIsLoadingTerritories] = useState(false);
  const [territoriesError, setTerritoriesError] = useState<string | null>(null);

  const [partners, setPartners] = useState<Array<{ id: string; name: string; email: string | null; phone: string | null; isActive: boolean; outletCount: number; agreementCount: number }>>([]);
  const [isLoadingPartners, setIsLoadingPartners] = useState(false);
  const [partnersError, setPartnersError] = useState<string | null>(null);
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [partnerFormName, setPartnerFormName] = useState("");
  const [partnerFormEmail, setPartnerFormEmail] = useState("");
  const [partnerFormPhone, setPartnerFormPhone] = useState("");
  const [partnerFormAddress, setPartnerFormAddress] = useState("");
  const [partnerFormError, setPartnerFormError] = useState<string | null>(null);
  const [partnerFormLoading, setPartnerFormLoading] = useState(false);

  const [agreements, setAgreements] = useState<Array<{ id: string; partnerId: string; territoryId: string; partnerName: string; territoryName: string; startDate: string; endDate: string | null; isActive: boolean; outletCount: number }>>([]);
  const [isLoadingAgreements, setIsLoadingAgreements] = useState(false);
  const [agreementsError, setAgreementsError] = useState<string | null>(null);

  const [outlets, setOutlets] = useState<Array<{ id: string; partnerId: string | null; branchId: string; territoryId: string | null; partnerName: string | null; branchName: string; territoryName: string | null; outletType: string | null; isActive: boolean }>>([]);
  const [isLoadingOutlets, setIsLoadingOutlets] = useState(false);
  const [outletsError, setOutletsError] = useState<string | null>(null);
  const [showAddOutlet, setShowAddOutlet] = useState(false);
  const [outletFormBranchId, setOutletFormBranchId] = useState("");
  const [outletFormOwnershipMode, setOutletFormOwnershipMode] = useState<"UNDER_FRANCHISE_PARTNER" | "COMPANY_OWNED">("UNDER_FRANCHISE_PARTNER");
  const [outletFormPartnerId, setOutletFormPartnerId] = useState("");
  const [outletFormTerritoryId, setOutletFormTerritoryId] = useState("");
  const [outletFormType, setOutletFormType] = useState("");
  const [outletFormInvestment, setOutletFormInvestment] = useState("");
  const [outletFormError, setOutletFormError] = useState<string | null>(null);
  const [outletFormLoading, setOutletFormLoading] = useState(false);

  type SettlementRecord = {
    id: string; tenantId: string; agreementId: string; partnerId: string;
    periodStart: string; periodEnd: string; status: string;
    grossSalesCents: number; gstCents: number; netSalesCents: number;
    mgCents: number; variableReturnCents: number; payoutCents: number;
    royaltyCents: number; adjustmentCents: number; totalCents: number;
    termsSnapshot: Record<string, unknown> | null;
    generatedAt: string; generatedBy: string | null;
    approvedAt: string | null; approvedBy: string | null;
  };
  type SettlementLineRecord = { id: string; lineType: string; description: string; amountCents: number; metadata: Record<string, unknown> | null };
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [isLoadingSettlements, setIsLoadingSettlements] = useState(false);
  const [settlementsError, setSettlementsError] = useState<string | null>(null);
  const [selectedSettlement, setSelectedSettlement] = useState<SettlementRecord | null>(null);
  const [selectedSettlementLines, setSelectedSettlementLines] = useState<SettlementLineRecord[]>([]);
  const [settlementDetailLoading, setSettlementDetailLoading] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generateAgreementId, setGenerateAgreementId] = useState("");
  const [generateMonth, setGenerateMonth] = useState("");
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  const customerMap = new Map(customers.map((customer) => [customer.id, customer.name]));
  const productMap = new Map(products.map((product) => [product.id, product.name]));
  const branchMap = new Map(branches.map((branch) => [branch.id, branch.name]));
  const packageMap = new Map(packages.map((pkg) => [pkg.id, pkg.name]));
  const staffMap = new Map(staff.map((member) => [member.id, member.displayName]));
  const serviceMap = new Map(services.map((service) => [service.id, service.name]));
  const warehouseMap = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.name]));
  const registeredOutletBranchIds = new Set(outlets.map((outlet) => outlet.branchId));
  const availableOutletBranches = branches.filter((branch) => branch.isActive && !registeredOutletBranchIds.has(branch.id));

  useEffect(() => {
    let mounted = true;

    const restoreAuthentication = () => {
      if (isLoginInProgress.current) return;
      const requestId = ++authenticationRequestId.current;

      if (mounted) {
        setAuthenticated(null);
      }

      void restoreNativeAuthentication()
      .then((restored) => {
        if (mounted && requestId === authenticationRequestId.current) {
          setAuthenticated(restored);
        }
      })
      .catch(() => {
        if (mounted && requestId === authenticationRequestId.current) {
          setAuthenticated(false);
        }
      });
    };

    restoreAuthentication();
    const handlePageShow = () => restoreAuthentication();
    const handlePopState = () => restoreAuthentication();
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("popstate", handlePopState);

    return () => {
      mounted = false;
      authenticationRequestId.current += 1;
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (authenticated !== true) {
      return;
    }

    let mounted = true;
    let completed = false;
    const loadingTimer = window.setTimeout(() => {
      if (mounted && !completed) {
        setProfileError(null);
      }
    }, 0);

    void fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" })
      .then(async (result) => {
        if (!mounted) return;
        completed = true;
        if (result.status === 401) {
          setUserRoles([]);
          setEffectiveRole(null);
          setUserProfile(null);
          setVisibleTabs([...ALL_TABS]);
          setAuthenticated(false);
          return;
        }
        if (result.status === 403) {
          setUserRoles([]);
          setEffectiveRole(null);
          setUserProfile(null);
          setVisibleTabs([...ALL_TABS]);
          setProfileError("You are not authorized to view profile.");
          return;
        }
        if (!result.ok) {
          throw new Error("Profile request failed");
        }
        const body = (await result.json()) as {
          user?: { userId: string; email: string | null; displayName: string | null };
          tenantContext?: { tenantId: string; businessUnitId: string | null; branchId: string | null } | null;
          roles?: Array<{
            id: string;
            code: string;
            name: string;
            scope: { kind: string; businessUnitId?: string | null; branchId?: string | null };
            permissions: Array<{ code: string }>;
          }>;
          permissionCodes?: string[];
        };
        const roles = body.roles ?? [];
        const permissions = body.permissionCodes ?? [];
        const profile = body.user ?? null;
        const matchedRole = roles.find((role) => findRoleConfig(role.code));
        const config = matchedRole ? findRoleConfig(matchedRole.code) : null;
        const derivedTabs = config
          ? config.tabs
          : permissions.length > 0
            ? deriveTabsFromPermissions(permissions)
            : ALL_TABS;

        if (!mounted) return;
        setUserRoles(roles);
        setEffectiveRole(config ?? null);
        setUserProfile(profile);
        setPermissionCodes(permissions);
        setVisibleTabs(derivedTabs as (typeof ALL_TABS)[number][]);
        setActiveTab((current) => (derivedTabs.includes(current) ? current : "Overview"));
      })
      .catch(() => {
        if (mounted) {
          setUserRoles([]);
          setEffectiveRole(null);
          setUserProfile(null);
          setPermissionCodes([]);
          setVisibleTabs([...ALL_TABS]);
          setProfileError("Profile could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          window.clearTimeout(loadingTimer);
        }
      });

    return () => {
      mounted = false;
      window.clearTimeout(loadingTimer);
    };
  }, [authenticated, profileVersion]);

  useEffect(() => {
    if (authenticated !== true) {
      return;
    }

    let mounted = true;
    let completed = false;
    const loadingTimer = window.setTimeout(() => {
      if (mounted && !completed) {
        setIsLoadingCustomers(true);
        setCustomerError(null);
      }
    }, 0);
    void fetch("/api/customers", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        completed = true;
        if (result.status === 401) {
          setCustomers([]);
          setAuthenticated(false);
          return;
        }
        if (result.status === 403) {
          setCustomers([]);
          setCustomerError("You are not authorized to view customers.");
          return;
        }
        if (!result.ok) {
          throw new Error("Customer list request failed");
        }
        const body = await result.json() as { customers?: CustomerRecord[] };
        const loadedCustomers = Array.isArray(body.customers) ? body.customers : [];
        setCustomers(loadedCustomers);
        if (loadedCustomers[0]) {
          setAppointmentCustomer((current) => current || loadedCustomers[0].id);
        }
      })
      .catch(() => {
        completed = true;
        if (mounted) {
          setCustomers([]);
          setCustomerError("Customers could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          window.clearTimeout(loadingTimer);
          setIsLoadingCustomers(false);
        }
      });

    return () => {
      mounted = false;
      window.clearTimeout(loadingTimer);
    };
  }, [authenticated]);

  useEffect(() => {
    if (authenticated !== true || activeTab !== "Leads") {
      return;
    }

    let mounted = true;
    void fetch("/api/leads", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        if (result.status === 401) {
          setLeads([]);
          setAuthenticated(false);
          return;
        }
        if (!result.ok) return;
        const body = await result.json() as { leads?: LeadRecord[] };
        setLeads(Array.isArray(body.leads) ? body.leads : []);
      })
      .catch(() => {
        if (mounted) setLeads([]);
      });
    return () => { mounted = false; };
  }, [authenticated, activeTab]);

  useEffect(() => {
    if (authenticated !== true || activeTab !== "Pipeline") return;
    let mounted = true;
    void Promise.all([
      fetch("/api/pipelines", { credentials: "same-origin" }).then(async (r) => { if (!mounted || !r.ok) return []; const b = await r.json() as { pipelines?: PipelineRecord[] }; return Array.isArray(b.pipelines) ? b.pipelines : []; }),
      fetch("/api/opportunities", { credentials: "same-origin" }).then(async (r) => { if (!mounted || !r.ok) return []; const b = await r.json() as { opportunities?: OpportunityRecord[] }; return Array.isArray(b.opportunities) ? b.opportunities : []; }),
    ]).then(([p, o]) => { if (mounted) { setPipelines(p); setOpportunities(o); } }).catch(() => {});
    return () => { mounted = false; };
  }, [authenticated, activeTab]);

  useEffect(() => {
    if (authenticated !== true || activeTab !== "Follow-ups") return;
    let mounted = true;
    void fetch("/api/followups", { credentials: "same-origin" })
      .then(async (r) => { if (!mounted || !r.ok) return []; const b = await r.json() as { followups?: FollowupRecord[] }; return Array.isArray(b.followups) ? b.followups : []; })
      .then((f) => { if (mounted) setFollowups(f); })
      .catch(() => {});
    return () => { mounted = false; };
  }, [authenticated, activeTab]);

  useEffect(() => {
    if (authenticated !== true || activeTab !== "Communications") return;
    let mounted = true;
    void fetch("/api/communications", { credentials: "same-origin" })
      .then(async (r) => { if (!mounted || !r.ok) return []; const b = await r.json() as { communications?: CommunicationRecord[] }; return Array.isArray(b.communications) ? b.communications : []; })
      .then((c) => { if (mounted) setCommunications(c); })
      .catch(() => {});
    return () => { mounted = false; };
  }, [authenticated, activeTab]);

  useEffect(() => {
    if (authenticated !== true || activeTab !== "Tags & Notes") return;
    let mounted = true;
    void Promise.all([
      fetch("/api/tags", { credentials: "same-origin" }).then(async (r) => { if (!mounted || !r.ok) return []; const b = await r.json() as { tags?: TagRecord[] }; return Array.isArray(b.tags) ? b.tags : []; }),
      fetch("/api/crm-notes", { credentials: "same-origin" }).then(async (r) => { if (!mounted || !r.ok) return []; const b = await r.json() as { notes?: CrmNoteRecord[] }; return Array.isArray(b.notes) ? b.notes : []; }),
      fetch("/api/attachments", { credentials: "same-origin" }).then(async (r) => { if (!mounted || !r.ok) return []; const b = await r.json() as { attachments?: AttachmentRecord[] }; return Array.isArray(b.attachments) ? b.attachments : []; }),
    ]).then(([t, n, a]) => { if (mounted) { setTags(t); setCrmNotes(n); setAttachments(a); } }).catch(() => {});
    return () => { mounted = false; };
  }, [authenticated, activeTab]);

  useEffect(() => {
    if (authenticated !== true || activeTab !== "Settings" || (!permissionCodes.includes("setting.read") && !permissionCodes.includes("setting.write"))) {
      return;
    }

    let mounted = true;
    let completed = false;
    const loadingTimer = window.setTimeout(() => {
      if (mounted && !completed) {
        setIsLoadingServices(true);
        setServiceError(null);
      }
    }, 0);
    void fetch("/api/services", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        completed = true;
        if (result.status === 401) {
          setServices([]);
          setAuthenticated(false);
          return;
        }
        if (result.status === 403) {
          setServices([]);
          setServiceError("You are not authorized to view services.");
          return;
        }
        if (!result.ok) {
          throw new Error("Service list request failed");
        }
        const body = await result.json() as { services?: ServiceRecord[] };
        const loadedServices = Array.isArray(body.services) ? body.services : [];
        setServices(loadedServices);
        if (loadedServices[0]) {
          setAppointmentService((current) => current || loadedServices[0].id);
        }
      })
      .catch(() => {
        completed = true;
        if (mounted) {
          setServices([]);
          setServiceError("Services could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          window.clearTimeout(loadingTimer);
          setIsLoadingServices(false);
        }
      });

    return () => {
      mounted = false;
      window.clearTimeout(loadingTimer);
    };
  }, [authenticated, activeTab, permissionCodes]);

  useEffect(() => {
    if (authenticated !== true || activeTab !== "Appointments") {
      return;
    }

    let mounted = true;
    let completed = false;
    const loadingTimer = window.setTimeout(() => {
      if (mounted && !completed) {
        setIsLoadingAppointments(true);
        setAppointmentError(null);
      }
    }, 0);
    void fetch("/api/appointments", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        completed = true;
        if (result.status === 401) {
          setAppointments([]);
          setAuthenticated(false);
          return;
        }
        if (result.status === 403) {
          setAppointments([]);
          setAppointmentError("You are not authorized to view appointments.");
          return;
        }
        if (!result.ok) {
          throw new Error("Appointment list request failed");
        }
        const body = await result.json() as {
          appointments?: Array<{
            id: string;
            tenantId: string;
            customerId: string;
            serviceId: string;
            startsAt: string;
            endsAt: string;
            status: string;
          }>;
        };
        const loadedAppointments = Array.isArray(body.appointments)
          ? body.appointments.map(toLocalAppointment)
          : [];
        setAppointments(loadedAppointments);
      })
      .catch(() => {
        completed = true;
        if (mounted) {
          setAppointments([]);
          setAppointmentError("Appointments could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          window.clearTimeout(loadingTimer);
          setIsLoadingAppointments(false);
        }
      });

    return () => {
      mounted = false;
      window.clearTimeout(loadingTimer);
    };
  }, [authenticated, activeTab]);

  useEffect(() => {
    if (authenticated !== true || activeTab !== "Packages") {
      return;
    }

    let mounted = true;
    let completed = false;
    const loadingTimer = window.setTimeout(() => {
      if (mounted && !completed) {
        setIsLoadingPackages(true);
        setPackageError(null);
      }
    }, 0);
    void fetch("/api/packages", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        completed = true;
        if (result.status === 401) {
          setPackages([]);
          setAuthenticated(false);
          return;
        }
        if (result.status === 403) {
          setPackages([]);
          setPackageError("You are not authorized to view packages.");
          return;
        }
        if (!result.ok) {
          throw new Error("Package list request failed");
        }
        const body = await result.json() as {
          packages?: Array<{
            id: string;
            name: string;
            serviceIds: string[];
            priceCents: number | null;
            durationDays: number | null;
            isActive: boolean;
          }>;
        };
        const loadedPackages = Array.isArray(body.packages)
          ? body.packages.map((pkg) => ({
              ...pkg,
              priceCents: pkg.priceCents,
              durationDays: pkg.durationDays,
            }))
          : [];
        setPackages(loadedPackages);
      })
      .catch(() => {
        completed = true;
        if (mounted) {
          setPackages([]);
          setPackageError("Packages could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          window.clearTimeout(loadingTimer);
          setIsLoadingPackages(false);
        }
      });

    return () => {
      mounted = false;
      window.clearTimeout(loadingTimer);
    };
  }, [authenticated, activeTab]);

  useEffect(() => {
    if (authenticated !== true || activeTab !== "Memberships") {
      return;
    }

    let mounted = true;
    let completed = false;
    const loadingTimer = window.setTimeout(() => {
      if (mounted && !completed) {
        setIsLoadingMemberships(true);
        setMembershipError(null);
      }
    }, 0);
    void fetch("/api/memberships", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        completed = true;
        if (result.status === 401) {
          setMemberships([]);
          setAuthenticated(false);
          return;
        }
        if (result.status === 403) {
          setMemberships([]);
          setMembershipError("You are not authorized to view memberships.");
          return;
        }
        if (!result.ok) {
          throw new Error("Membership list request failed");
        }
        const body = await result.json() as {
          memberships?: Array<{
            id: string;
            customerId: string;
            packageId: string;
            startedAt: string;
            endsAt: string | null;
            status: string | null;
          }>;
        };
        const loadedMemberships = Array.isArray(body.memberships)
          ? body.memberships
          : [];
        setMemberships(loadedMemberships);
      })
      .catch(() => {
        completed = true;
        if (mounted) {
          setMemberships([]);
          setMembershipError("Memberships could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          window.clearTimeout(loadingTimer);
          setIsLoadingMemberships(false);
        }
      });

    return () => {
      mounted = false;
      window.clearTimeout(loadingTimer);
    };
  }, [authenticated, activeTab]);

  useEffect(() => {
    if (authenticated !== true || activeTab !== "Billing") {
      return;
    }

    let mounted = true;
    let completed = false;
    const loadingTimer = window.setTimeout(() => {
      if (mounted && !completed) {
        setIsLoadingInvoices(true);
        setInvoiceError(null);
      }
    }, 0);
    void fetch("/api/invoices", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        completed = true;
        if (result.status === 401) {
          setInvoices([]);
          setAuthenticated(false);
          return;
        }
        if (result.status === 403) {
          setInvoices([]);
          setInvoiceError("You are not authorized to view invoices.");
          return;
        }
        if (!result.ok) {
          throw new Error("Invoice list request failed");
        }
        const body = await result.json() as {
          invoices?: Array<{
            id: string;
            customerId: string;
            issuedAt: string;
            subtotalCents: number;
            discountCents: number;
            gstCents: number;
            totalCents: number;
            notes: string | null;
          }>;
        };
        const loadedInvoices = Array.isArray(body.invoices) ? body.invoices : [];
        setInvoices(loadedInvoices);
      })
      .catch(() => {
        completed = true;
        if (mounted) {
          setInvoices([]);
          setInvoiceError("Invoices could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          window.clearTimeout(loadingTimer);
          setIsLoadingInvoices(false);
        }
      });

    return () => {
      mounted = false;
      window.clearTimeout(loadingTimer);
    };
  }, [authenticated, activeTab]);

  useEffect(() => {
    if (authenticated !== true || activeTab !== "Inventory") {
      return;
    }

    let mounted = true;
    let completed = false;
    const loadingTimer = window.setTimeout(() => {
      if (mounted && !completed) {
        setIsLoadingProducts(true);
        setProductError(null);
      }
    }, 0);
    void fetch("/api/products", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        completed = true;
        if (result.status === 401) {
          setProducts([]);
          setAuthenticated(false);
          return;
        }
        if (result.status === 403) {
          setProducts([]);
          setProductError("You are not authorized to view products.");
          return;
        }
        if (!result.ok) {
          throw new Error("Product list request failed");
        }
        const body = await result.json() as {
          products?: Array<{
            id: string;
            categoryId: string;
            name: string;
            sku: string;
            unit: string;
            priceCents: number;
            isActive: boolean;
          }>;
        };
        const loadedProducts = Array.isArray(body.products) ? body.products : [];
        setProducts(loadedProducts);
      })
      .catch(() => {
        completed = true;
        if (mounted) {
          setProducts([]);
          setProductError("Products could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          window.clearTimeout(loadingTimer);
          setIsLoadingProducts(false);
        }
      });

    void fetch("/api/categories", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        if (result.status === 401) {
          setCategories([]);
          return;
        }
        if (result.status === 403) {
          setCategories([]);
          setCategoryError("You are not authorized to view categories.");
          return;
        }
        if (!result.ok) {
          throw new Error("Category list request failed");
        }
        const body = await result.json() as {
          categories?: Array<{
            id: string;
            name: string;
            description: string | null;
            isActive: boolean;
          }>;
        };
        const loadedCategories = Array.isArray(body.categories) ? body.categories : [];
        setCategories(loadedCategories);
      })
      .catch(() => {
        if (mounted) {
          setCategories([]);
          setCategoryError("Categories could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingCategories(false);
        }
      });

    void fetch("/api/stock-items", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        if (result.status === 401) {
          setStockItems([]);
          return;
        }
        if (result.status === 403) {
          setStockItems([]);
          setStockItemError("You are not authorized to view stock items.");
          return;
        }
        if (!result.ok) {
          throw new Error("Stock item list request failed");
        }
        const body = await result.json() as {
          stockItems?: Array<{
            id: string;
            productId: string;
            branchId: string;
            quantity: number;
          }>;
        };
        const loadedStockItems = Array.isArray(body.stockItems) ? body.stockItems : [];
        setStockItems(loadedStockItems);
      })
      .catch(() => {
        if (mounted) {
          setStockItems([]);
          setStockItemError("Stock items could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingStockItems(false);
        }
      });

    void fetch("/api/stock-movements", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        if (result.status === 401) {
          setStockMovements([]);
          return;
        }
        if (result.status === 403) {
          setStockMovements([]);
          setStockMovementError("You are not authorized to view stock movements.");
          return;
        }
        if (!result.ok) {
          throw new Error("Stock movement list request failed");
        }
        const body = await result.json() as {
          stockMovements?: Array<{
            id: string;
            productId: string;
            movementType: string;
            quantity: number;
            notes: string | null;
            createdAt: string;
          }>;
        };
        const loadedStockMovements = Array.isArray(body.stockMovements) ? body.stockMovements : [];
        setStockMovements(loadedStockMovements);
      })
      .catch(() => {
        if (mounted) {
          setStockMovements([]);
          setStockMovementError("Stock movements could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingStockMovements(false);
        }
      });

    void fetch("/api/warehouses", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        if (result.status === 401) {
          setWarehouses([]);
          return;
        }
        if (result.status === 403) {
          setWarehouses([]);
          setWarehouseError("You are not authorized to view warehouses.");
          return;
        }
        if (!result.ok) {
          throw new Error("Warehouse list request failed");
        }
        const body = await result.json() as {
          warehouses?: Array<{
            id: string;
            name: string;
            location: string | null;
            isActive: boolean;
          }>;
        };
        const loadedWarehouses = Array.isArray(body.warehouses) ? body.warehouses : [];
        setWarehouses(loadedWarehouses);
      })
      .catch(() => {
        if (mounted) {
          setWarehouses([]);
          setWarehouseError("Warehouses could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingWarehouses(false);
        }
      });

    void fetch("/api/suppliers", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        if (result.status === 401) {
          setSuppliers([]);
          return;
        }
        if (result.status === 403) {
          setSuppliers([]);
          setSupplierError("You are not authorized to view suppliers.");
          return;
        }
        if (!result.ok) {
          throw new Error("Supplier list request failed");
        }
        const body = await result.json() as {
          suppliers?: Array<{
            id: string;
            name: string;
            contactName: string | null;
            email: string | null;
            phone: string | null;
            isActive: boolean;
          }>;
        };
        const loadedSuppliers = Array.isArray(body.suppliers) ? body.suppliers : [];
        setSuppliers(loadedSuppliers);
      })
      .catch(() => {
        if (mounted) {
          setSuppliers([]);
          setSupplierError("Suppliers could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingSuppliers(false);
        }
      });

    void fetch("/api/reorder-rules", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        if (result.status === 401) {
          setReorderRules([]);
          return;
        }
        if (result.status === 403) {
          setReorderRules([]);
          setReorderRuleError("You are not authorized to view reorder rules.");
          return;
        }
        if (!result.ok) {
          throw new Error("Reorder rule list request failed");
        }
        const body = await result.json() as {
          reorderRules?: Array<{
            id: string;
            productId: string;
            branchId: string;
            warehouseId: string;
            minQuantity: number;
            reorderQuantity: number;
            isActive: boolean;
          }>;
        };
        const loadedReorderRules = Array.isArray(body.reorderRules) ? body.reorderRules : [];
        setReorderRules(loadedReorderRules);
      })
      .catch(() => {
        if (mounted) {
          setReorderRules([]);
          setReorderRuleError("Reorder rules could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingReorderRules(false);
        }
      });

    void fetch("/api/purchase-receipts", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        if (result.status === 401) {
          setPurchaseReceipts([]);
          return;
        }
        if (result.status === 403) {
          setPurchaseReceipts([]);
          setPurchaseReceiptError("You are not authorized to view purchase receipts.");
          return;
        }
        if (!result.ok) {
          throw new Error("Purchase receipt list request failed");
        }
        const body = await result.json() as {
          purchaseReceipts?: Array<{
            id: string;
            supplierId: string | null;
            warehouseId: string;
            branchId: string;
            receivedBy: string | null;
            receivedAt: string;
            notes: string | null;
            lineItems: Array<{ id: string; productId: string; quantity: number }>;
          }>;
        };
        const loadedPurchaseReceipts = Array.isArray(body.purchaseReceipts) ? body.purchaseReceipts : [];
        setPurchaseReceipts(loadedPurchaseReceipts);
      })
      .catch(() => {
        if (mounted) {
          setPurchaseReceipts([]);
          setPurchaseReceiptError("Purchase receipts could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingPurchaseReceipts(false);
        }
      });

    void fetch("/api/stock-transfers", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        if (result.status === 401) {
          setStockTransfers([]);
          return;
        }
        if (result.status === 403) {
          setStockTransfers([]);
          setStockTransferError("You are not authorized to view stock transfers.");
          return;
        }
        if (!result.ok) {
          throw new Error("Stock transfer list request failed");
        }
        const body = await result.json() as {
          stockTransfers?: Array<{
            id: string;
            fromWarehouseId: string;
            toWarehouseId: string;
            fromBranchId: string;
            toBranchId: string;
            status: string;
            notes: string | null;
            lineItems: Array<{ id: string; productId: string; quantity: number }>;
          }>;
        };
        const loadedStockTransfers = Array.isArray(body.stockTransfers) ? body.stockTransfers : [];
        setStockTransfers(loadedStockTransfers);
      })
      .catch(() => {
        if (mounted) {
          setStockTransfers([]);
          setStockTransferError("Stock transfers could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingStockTransfers(false);
        }
      });

    void fetch("/api/stock-adjustments", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        if (result.status === 401) {
          setStockAdjustments([]);
          return;
        }
        if (result.status === 403) {
          setStockAdjustments([]);
          setStockAdjustmentError("You are not authorized to view stock adjustments.");
          return;
        }
        if (!result.ok) {
          throw new Error("Stock adjustment list request failed");
        }
        const body = await result.json() as {
          stockAdjustments?: Array<{
            id: string;
            branchId: string;
            direction: string;
            notes: string | null;
            lineItems: Array<{ id: string; productId: string; quantity: number }>;
          }>;
        };
        const loadedStockAdjustments = Array.isArray(body.stockAdjustments) ? body.stockAdjustments : [];
        setStockAdjustments(loadedStockAdjustments);
      })
      .catch(() => {
        if (mounted) {
          setStockAdjustments([]);
          setStockAdjustmentError("Stock adjustments could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingStockAdjustments(false);
        }
      });

    void fetch("/api/reports/low-stock", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        if (result.status === 401) {
          setLowStockItems([]);
          return;
        }
        if (result.status === 403) {
          setLowStockItems([]);
          setLowStockItemError("You are not authorized to view low stock items.");
          return;
        }
        if (!result.ok) {
          throw new Error("Low stock list request failed");
        }
        const body = await result.json() as {
          lowStockItems?: Array<{ stockItemId: string; productId: string; branchId: string; quantity: number; minQuantity: number; reorderQuantity: number }>;
        };
        const loadedLowStockItems = Array.isArray(body.lowStockItems) ? body.lowStockItems : [];
        setLowStockItems(loadedLowStockItems);
      })
      .catch(() => {
        if (mounted) {
          setLowStockItems([]);
          setLowStockItemError("Low stock items could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingLowStockItems(false);
        }
      });

    return () => {
      mounted = false;
      window.clearTimeout(loadingTimer);
    };
  }, [authenticated, activeTab]);

  useEffect(() => {
    if (authenticated !== true || activeTab !== "Staff") {
      return;
    }

    let mounted = true;
    let completed = false;
    const loadingTimer = window.setTimeout(() => {
      if (mounted && !completed) {
        setIsLoadingStaff(true);
        setStaffError(null);
      }
    }, 0);
    void fetch("/api/staff", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        completed = true;
        if (result.status === 401) {
          setStaff([]);
          setAuthenticated(false);
          return;
        }
        if (result.status === 403) {
          setStaff([]);
          setStaffError("You are not authorized to view staff.");
          return;
        }
        if (!result.ok) {
          throw new Error("Staff list request failed");
        }
        const body = await result.json() as { staff?: StaffRecord[] };
        const loadedStaff = Array.isArray(body.staff) ? body.staff : [];
        setStaff(loadedStaff);
      })
      .catch(() => {
        completed = true;
        if (mounted) {
          setStaff([]);
          setStaffError("Staff could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          window.clearTimeout(loadingTimer);
          setIsLoadingStaff(false);
        }
      });

    return () => {
      mounted = false;
      window.clearTimeout(loadingTimer);
    };
  }, [authenticated, activeTab]);

  useEffect(() => {
    if (authenticated !== true || activeTab !== "Attendance") {
      return;
    }

    let mounted = true;
    let completed = false;
    const loadingTimer = window.setTimeout(() => {
      if (mounted && !completed) {
        setIsLoadingAttendance(true);
        setAttendanceError(null);
      }
    }, 0);
    void fetch("/api/attendance", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        completed = true;
        if (result.status === 401) {
          setAttendance([]);
          setAuthenticated(false);
          return;
        }
        if (result.status === 403) {
          setAttendance([]);
          setAttendanceError("You are not authorized to view attendance.");
          return;
        }
        if (!result.ok) {
          throw new Error("Attendance list request failed");
        }
        const body = await result.json() as {
          attendance?: Array<{
            id: string;
            staffId: string;
            checkInAt: string;
            checkOutAt: string | null;
            status: string | null;
          }>;
        };
        const loadedAttendance = Array.isArray(body.attendance) ? body.attendance : [];
        setAttendance(loadedAttendance);
      })
      .catch(() => {
        completed = true;
        if (mounted) {
          setAttendance([]);
          setAttendanceError("Attendance could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          window.clearTimeout(loadingTimer);
          setIsLoadingAttendance(false);
        }
      });

    return () => {
      mounted = false;
      window.clearTimeout(loadingTimer);
    };
  }, [authenticated, activeTab]);

  useEffect(() => {
    if (authenticated !== true || activeTab !== "Branches") {
      return;
    }

    let mounted = true;
    let completed = false;
    const loadingTimer = window.setTimeout(() => {
      if (mounted && !completed) {
        setIsLoadingBusinessUnits(true);
        setBusinessUnitError(null);
      }
    }, 0);
    void fetch("/api/business-units", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        completed = true;
        if (result.status === 401) {
          setBusinessUnits([]);
          setAuthenticated(false);
          return;
        }
        if (result.status === 403) {
          setBusinessUnits([]);
          setBusinessUnitError("You are not authorized to view business units.");
          return;
        }
        if (!result.ok) {
          throw new Error("Business unit list request failed");
        }
        const body = await result.json() as { businessUnits?: Array<{ id: string; name: string; slug: string; isActive: boolean }> };
        const loaded = Array.isArray(body.businessUnits) ? body.businessUnits : [];
        setBusinessUnits(loaded);
      })
      .catch(() => {
        completed = true;
        if (mounted) {
          setBusinessUnits([]);
          setBusinessUnitError("Business units could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          window.clearTimeout(loadingTimer);
          setIsLoadingBusinessUnits(false);
        }
      });

    return () => {
      mounted = false;
      window.clearTimeout(loadingTimer);
    };
  }, [authenticated, activeTab]);

  useEffect(() => {
    if (authenticated !== true || (activeTab !== "Branches" && activeTab !== "Outlets")) {
      return;
    }

    let mounted = true;
    let completed = false;
    const loadingTimer = window.setTimeout(() => {
      if (mounted && !completed) {
        setIsLoadingBranches(true);
        setBranchError(null);
      }
    }, 0);
    void fetch("/api/branches", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        completed = true;
        if (result.status === 401) {
          setBranches([]);
          setAuthenticated(false);
          return;
        }
        if (result.status === 403) {
          setBranches([]);
          setBranchError("You are not authorized to view branches.");
          return;
        }
        if (!result.ok) {
          throw new Error("Branch list request failed");
        }
        const body = await result.json() as { branches?: Array<{ id: string; businessUnitId: string; name: string; slug: string; isActive: boolean }> };
        const loaded = Array.isArray(body.branches) ? body.branches : [];
        setBranches(loaded);
      })
      .catch(() => {
        completed = true;
        if (mounted) {
          setBranches([]);
          setBranchError("Branches could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          window.clearTimeout(loadingTimer);
          setIsLoadingBranches(false);
        }
      });

    return () => {
      mounted = false;
      window.clearTimeout(loadingTimer);
    };
  }, [authenticated, activeTab]);

  useEffect(() => {
    if (authenticated !== true || activeTab !== "Settings") {
      return;
    }

    let mounted = true;
    let completed = false;
    const loadingTimer = window.setTimeout(() => {
      if (mounted && !completed) {
        setIsLoadingSettings(true);
        setSettingError(null);
      }
    }, 0);
    void fetch("/api/settings", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        completed = true;
        if (result.status === 401) {
          setSettings([]);
          setAuthenticated(false);
          return;
        }
        if (result.status === 403) {
          setSettings([]);
          setSettingError("You are not authorized to view settings.");
          return;
        }
        if (!result.ok) {
          throw new Error("Settings list request failed");
        }
        const body = await result.json() as { settings?: Array<{ id: string; key: string; value: string; isActive: boolean }> };
        const loaded = Array.isArray(body.settings) ? body.settings : [];
        setSettings(loaded);
      })
      .catch(() => {
        completed = true;
        if (mounted) {
          setSettings([]);
          setSettingError("Settings could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          window.clearTimeout(loadingTimer);
          setIsLoadingSettings(false);
        }
      });

    return () => {
      mounted = false;
      window.clearTimeout(loadingTimer);
    };
  }, [authenticated, activeTab]);

  useEffect(() => {
    if (authenticated !== true || activeTab !== "Gateway Accounts" || !permissionCodes.includes("tenant.manage")) {
      return;
    }

    let mounted = true;
    let completed = false;
    const loadingTimer = window.setTimeout(() => {
      if (mounted && !completed) {
        setIsLoadingGatewayAccounts(true);
        setGatewayAccountError(null);
      }
    }, 0);
    void fetch("/api/gateway-accounts", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        completed = true;
        if (result.status === 401) {
          setGatewayAccounts([]);
          return;
        }
        if (result.status === 403) {
          setGatewayAccountError("You are not authorized to view gateway accounts.");
          return;
        }
        if (!result.ok) {
          throw new Error("Gateway accounts request failed");
        }
        const body = await result.json() as { gatewayAccounts?: Array<{ id: string; provider: string; label: string | null; isActive: boolean; createdAt: string }> };
        setGatewayAccounts(Array.isArray(body.gatewayAccounts) ? body.gatewayAccounts : []);
      })
      .catch(() => {
        completed = true;
        if (mounted) {
          setGatewayAccounts([]);
          setGatewayAccountError("Gateway accounts could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          window.clearTimeout(loadingTimer);
          setIsLoadingGatewayAccounts(false);
        }
      });

    return () => {
      mounted = false;
      window.clearTimeout(loadingTimer);
    };
  }, [authenticated, activeTab, permissionCodes]);

  useEffect(() => {
    if (authenticated !== true || activeTab !== "Marketplace" || !permissionCodes.includes("tenant.manage")) {
      return;
    }

    let mounted = true;
    let completed = false;
    const loadingTimer = window.setTimeout(() => {
      if (mounted && !completed) {
        setIsLoadingMarketplace(true);
        setMarketplaceError(null);
      }
    }, 0);
    void Promise.all([
      fetch("/api/marketplace/assets", { credentials: "same-origin" }),
      fetch("/api/marketplace/installations", { credentials: "same-origin" }),
      fetch("/api/marketplace/updates", { credentials: "same-origin" }),
    ])
      .then(async ([assetsResult, installationsResult, updatesResult]) => {
        completed = true;
        if (!mounted) return;
        if (assetsResult.status === 401 || installationsResult.status === 401) {
          setAuthenticated(false);
          return;
        }
        if (!assetsResult.ok) {
          setMarketplaceError("Could not load marketplace assets.");
          return;
        }
        const assetsBody = await assetsResult.json() as { assets?: Array<{ id: string; name: string; slug: string; description: string | null; type: string; category: string | null; authorName: string | null; isActive: boolean; createdAt: string }> };
        setMarketplaceAssets(Array.isArray(assetsBody.assets) ? assetsBody.assets : []);
        if (installationsResult.ok) {
          const instBody = await installationsResult.json() as { installations?: Array<{ id: string; assetId: string; versionId: string; isActive: boolean; installedAt: string }> };
          setInstallations(Array.isArray(instBody.installations) ? instBody.installations : []);
        }
        if (updatesResult.ok) {
          const updBody = await updatesResult.json() as { updates?: Array<{ assetId: string; assetName: string; installedVersion: string; latestVersion: string; latestVersionId: string }> };
          setAvailableUpdates(Array.isArray(updBody.updates) ? updBody.updates : []);
        }
      })
      .catch(() => {
        if (mounted) {
          setMarketplaceAssets([]);
          setInstallations([]);
          setMarketplaceError("Marketplace could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          window.clearTimeout(loadingTimer);
          setIsLoadingMarketplace(false);
        }
      });

    return () => { mounted = false; window.clearTimeout(loadingTimer); };
  }, [authenticated, activeTab, permissionCodes]);

  useEffect(() => {
    if (authenticated !== true || activeTab !== "Users & Access") {
      return;
    }

    let mounted = true;
    let completed = false;
    const loadingTimer = window.setTimeout(() => {
      if (mounted && !completed) {
        setIsLoadingRoleAssignmentUsers(true);
        setIsLoadingRoleAssignmentRoles(true);
      }
    }, 0);

    void Promise.all([
      fetch("/api/users", { credentials: "same-origin", cache: "no-store" }),
      fetch("/api/roles", { credentials: "same-origin", cache: "no-store" }),
      fetch("/api/franchise/territories", { credentials: "same-origin", cache: "no-store" }),
    ])
      .then(async ([usersResult, rolesResult, territoriesResult]) => {
        if (!mounted) return;
        completed = true;

        if (usersResult.status === 401 || rolesResult.status === 401) {
          setRoleAssignmentUsers([]);
          setRoleAssignmentRoles([]);
          setAuthenticated(false);
          return;
        }
        if (usersResult.status === 403 || rolesResult.status === 403) {
          setRoleAssignmentUsers([]);
          setRoleAssignmentRoles([]);
          setRoleAssignmentError("You are not authorized to assign roles.");
          return;
        }

        const usersBody = await usersResult.json().catch(() => ({}));
        const rolesBody = await rolesResult.json().catch(() => ({}));
        const territoriesBody = await territoriesResult.json().catch(() => ({}));

        const loadedUsers = Array.isArray(usersBody.users) ? usersBody.users : [];
        const loadedRoles = Array.isArray(rolesBody.roles) ? rolesBody.roles : [];
        if (Array.isArray(territoriesBody.territories)) {
          setTerritories(territoriesBody.territories);
        }

        setRoleAssignmentUsers(
          loadedUsers.map((user: { id: string; membershipId: string; email: string | null; displayName: string | null; isActive: boolean }) => ({
            id: user.id,
            membershipId: user.membershipId,
            email: user.email,
            displayName: user.displayName,
            isActive: user.isActive,
          })),
        );
        setRoleAssignmentRoles(
          loadedRoles.map((role: { id: string; code: string; name: string; scopeType?: string; requiresScope?: boolean }) => ({
            id: role.id,
            code: role.code,
            name: role.name,
            scopeType: role.scopeType ?? "TENANT",
            requiresScope: role.requiresScope ?? false,
          })),
        );
      })
      .catch(() => {
        if (mounted) {
          setRoleAssignmentUsers([]);
          setRoleAssignmentRoles([]);
        }
      })
      .finally(() => {
        if (mounted) {
          window.clearTimeout(loadingTimer);
          setIsLoadingRoleAssignmentUsers(false);
          setIsLoadingRoleAssignmentRoles(false);
        }
      });

    return () => {
      mounted = false;
      window.clearTimeout(loadingTimer);
    };
  }, [authenticated, activeTab]);

  useEffect(() => {
    if (authenticated !== true || activeTab !== "Notifications") {
      return;
    }

    let mounted = true;
    const loadingTimer = window.setTimeout(() => {
      if (mounted) {
        setIsLoadingNotificationTemplates(true);
        setNotificationTemplateError(null);
        setIsLoadingNotificationLogs(true);
        setNotificationLogError(null);
        setIsLoadingEventSubscriptions(true);
        setEventSubscriptionError(null);
        setIsLoadingNotificationPreferences(true);
        setNotificationPreferenceError(null);
      }
    }, 0);
    void fetch("/api/notification-templates", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        if (result.status === 401) {
          setNotificationTemplates([]);
          setAuthenticated(false);
          return;
        }
        if (result.status === 403) {
          setNotificationTemplates([]);
          setNotificationTemplateError("You are not authorized to view notification templates.");
          return;
        }
        if (!result.ok) {
          throw new Error("Notification templates request failed");
        }
        const body = await result.json() as { notificationTemplates?: Array<{ id: string; name: string; channel: string; subject: string | null; body: string; isActive: boolean }> };
        const loaded = Array.isArray(body.notificationTemplates) ? body.notificationTemplates : [];
        setNotificationTemplates(loaded);
      })
      .catch(() => {
        if (mounted) {
          setNotificationTemplates([]);
          setNotificationTemplateError("Notification templates could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingNotificationTemplates(false);
        }
      });
    void fetch("/api/notification-logs", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        if (result.status === 401) {
          setNotificationLogs([]);
          setAuthenticated(false);
          return;
        }
        if (result.status === 403) {
          setNotificationLogs([]);
          setNotificationLogError("You are not authorized to view notification logs.");
          return;
        }
        if (!result.ok) {
          throw new Error("Notification logs request failed");
        }
        const body = await result.json() as { notificationLogs?: Array<{ id: string; channel: string; subject: string | null; body: string; status: string; sentAt: string | null; readAt: string | null }> };
        const loaded = Array.isArray(body.notificationLogs) ? body.notificationLogs : [];
        setNotificationLogs(loaded);
      })
      .catch(() => {
        if (mounted) {
          setNotificationLogs([]);
          setNotificationLogError("Notification logs could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingNotificationLogs(false);
        }
      });

    void fetch("/api/event-subscriptions", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        if (result.status === 401) {
          setEventSubscriptions([]);
          setAuthenticated(false);
          return;
        }
        if (result.status === 403) {
          setEventSubscriptions([]);
          setEventSubscriptionError("You are not authorized to view event subscriptions.");
          return;
        }
        if (!result.ok) {
          throw new Error("Event subscription list request failed");
        }
        const body = await result.json() as { eventSubscriptions?: Array<{ id: string; eventType: string; notificationTemplateId: string | null; isEnabled: boolean }> };
        setEventSubscriptions(Array.isArray(body.eventSubscriptions) ? body.eventSubscriptions : []);
      })
      .catch(() => {
        if (mounted) {
          setEventSubscriptions([]);
          setEventSubscriptionError("Event subscriptions could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingEventSubscriptions(false);
        }
      });

    void fetch("/api/notification-preferences", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        if (result.status === 401) {
          setNotificationPreferences([]);
          setAuthenticated(false);
          return;
        }
        if (result.status === 403) {
          setNotificationPreferences([]);
          setNotificationPreferenceError("You are not authorized to view notification preferences.");
          return;
        }
        if (!result.ok) throw new Error("Notification preference list request failed");
        const body = await result.json() as { notificationPreferences?: Array<{ id: string; channel: string; isEnabled: boolean }> };
        setNotificationPreferences(Array.isArray(body.notificationPreferences) ? body.notificationPreferences : []);
      })
      .catch(() => {
        if (mounted) {
          setNotificationPreferences([]);
          setNotificationPreferenceError("Notification preferences could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) setIsLoadingNotificationPreferences(false);
      });

    return () => {
      mounted = false;
      window.clearTimeout(loadingTimer);
    };
  }, [authenticated, activeTab]);

  useEffect(() => {
    if (authenticated !== true || activeTab !== "Reports") {
      return;
    }

    let mounted = true;
    const loadingTimer = window.setTimeout(() => {
      if (mounted) {
        setIsLoadingReport(true);
        setReportError(null);
        setCrmReportsLoading(true);
        setCrmReportsError(null);
      }
    }, 0);
    void fetch("/api/reports", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        if (result.status === 401) {
          setReport(null);
          setAuthenticated(false);
          return;
        }
        if (result.status === 403) {
          setReport(null);
          setReportError("You are not authorized to view reports.");
          return;
        }
        if (!result.ok) {
          throw new Error("Report summary request failed");
        }
        const body = await result.json() as {
          report?: {
            sales: { invoiceCount: number; totalRevenueCents: number };
            appointments: { total: number; statusBreakdown: Array<{ status: string; count: number }> };
            customers: { total: number };
            inventory: { stockItemCount: number; totalQuantity: number; movementCount: number };
          };
        };
        setReport(body.report ?? null);
      })
      .catch(() => {
        if (mounted) {
          setReport(null);
          setReportError("Reports could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          window.clearTimeout(loadingTimer);
          setIsLoadingReport(false);
        }
      });

    void fetch("/api/reports/daily-sales", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        if (result.status === 401) {
          setDailySales([]);
          return;
        }
        if (result.status === 403) {
          setDailySales([]);
          setDailySalesError("You are not authorized to view daily sales.");
          return;
        }
        if (!result.ok) {
          throw new Error("Daily sales request failed");
        }
        const body = await result.json() as {
          dailySales?: Array<{ date: string; invoiceCount: number; totalRevenueCents: number }>;
        };
        const loadedDailySales = Array.isArray(body.dailySales) ? body.dailySales : [];
        setDailySales(loadedDailySales);
      })
      .catch(() => {
        if (mounted) {
          setDailySales([]);
          setDailySalesError("Daily sales could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingDailySales(false);
        }
      });

    void fetch("/api/reports/appointments", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        if (result.status === 401) {
          setAppointmentReport([]);
          return;
        }
        if (result.status === 403) {
          setAppointmentReport([]);
          setAppointmentReportError("You are not authorized to view appointment reports.");
          return;
        }
        if (!result.ok) {
          throw new Error("Appointment report request failed");
        }
        const body = await result.json() as {
          appointmentReport?: Array<{ date: string; appointmentCount: number; statusBreakdown: Array<{ status: string; count: number }> }>;
        };
        const loadedAppointmentReport = Array.isArray(body.appointmentReport) ? body.appointmentReport : [];
        setAppointmentReport(loadedAppointmentReport);
      })
      .catch(() => {
        if (mounted) {
          setAppointmentReport([]);
          setAppointmentReportError("Appointment report could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingAppointmentReport(false);
        }
      });

    void fetch("/api/reports/memberships", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        if (result.status === 401) {
          setMembershipReport([]);
          return;
        }
        if (result.status === 403) {
          setMembershipReport([]);
          setMembershipReportError("You are not authorized to view membership reports.");
          return;
        }
        if (!result.ok) {
          throw new Error("Membership report request failed");
        }
        const body = await result.json() as {
          membershipReport?: Array<{ status: string; count: number; packageBreakdown: Array<{ packageId: string; packageName: string; count: number }> }>;
        };
        const loadedMembershipReport = Array.isArray(body.membershipReport) ? body.membershipReport : [];
        setMembershipReport(loadedMembershipReport);
      })
      .catch(() => {
        if (mounted) {
          setMembershipReport([]);
          setMembershipReportError("Membership report could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingMembershipReport(false);
        }
      });

    void fetch("/api/reports/package-utilization", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        if (result.status === 401) {
          setPackageUtilizationReport([]);
          return;
        }
        if (result.status === 403) {
          setPackageUtilizationReport([]);
          setPackageUtilizationReportError("You are not authorized to view package utilization reports.");
          return;
        }
        if (!result.ok) {
          throw new Error("Package utilization report request failed");
        }
        const body = await result.json() as {
          packageUtilizationReport?: Array<{ packageId: string; packageName: string; totalMemberships: number; activeMemberships: number }>;
        };
        const loadedPackageUtilizationReport = Array.isArray(body.packageUtilizationReport) ? body.packageUtilizationReport : [];
        setPackageUtilizationReport(loadedPackageUtilizationReport);
      })
      .catch(() => {
        if (mounted) {
          setPackageUtilizationReport([]);
          setPackageUtilizationReportError("Package utilization report could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingPackageUtilizationReport(false);
        }
      });

    void fetch("/api/reports/gst-summary", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        if (result.status === 401) {
          setGstSummary(null);
          return;
        }
        if (result.status === 403) {
          setGstSummary(null);
          setGstSummaryError("You are not authorized to view GST summary.");
          return;
        }
        if (!result.ok) {
          throw new Error("GST summary request failed");
        }
        const body = await result.json() as {
          gstSummary?: { totalGstCents: number; totalTaxableCents: number; invoiceCount: number };
        };
        setGstSummary(body.gstSummary ?? null);
      })
      .catch(() => {
        if (mounted) {
          setGstSummary(null);
          setGstSummaryError("GST summary could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingGstSummary(false);
        }
      });

    void fetch("/api/reports/branch-performance", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        if (result.status === 401) {
          setBranchPerformance([]);
          return;
        }
        if (result.status === 403) {
          setBranchPerformance([]);
          setBranchPerformanceError("You are not authorized to view branch performance reports.");
          return;
        }
        if (!result.ok) {
          throw new Error("Branch performance request failed");
        }
        const body = await result.json() as {
          branchPerformance?: Array<{ branchId: string; branchName: string; staffCount: number; attendanceCount: number }>;
        };
        const loadedBranchPerformance = Array.isArray(body.branchPerformance) ? body.branchPerformance : [];
        setBranchPerformance(loadedBranchPerformance);
      })
      .catch(() => {
        if (mounted) {
          setBranchPerformance([]);
          setBranchPerformanceError("Branch performance could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingBranchPerformance(false);
        }
      });

    void Promise.all([
      fetch("/api/reports/crm/lead-source", { credentials: "same-origin" }).then(async (r) => { if (!mounted || !r.ok) return []; return (await r.json() as LeadSourceRow[]); }),
      fetch("/api/reports/crm/sales-funnel", { credentials: "same-origin" }).then(async (r) => { if (!mounted || !r.ok) return []; return (await r.json() as FunnelRow[]); }),
      fetch("/api/reports/crm/conversion", { credentials: "same-origin" }).then(async (r) => { if (!mounted || !r.ok) return null; return (await r.json() as ConversionReport); }),
      fetch("/api/reports/crm/pending-followups", { credentials: "same-origin" }).then(async (r) => { if (!mounted || !r.ok) return []; return (await r.json() as PendingFollowupRow[]); }),
      fetch("/api/reports/crm/customer-growth", { credentials: "same-origin" }).then(async (r) => { if (!mounted || !r.ok) return []; return (await r.json() as CustomerGrowthRow[]); }),
    ]).then(([ls, sf, cv, pf, cg]) => {
      if (!mounted) return;
      setCrmLeadSource(Array.isArray(ls) ? ls : []);
      setCrmSalesFunnel(Array.isArray(sf) ? sf : []);
      setCrmConversion(cv);
      setCrmPendingFollowups(Array.isArray(pf) ? pf : []);
      setCrmCustomerGrowth(Array.isArray(cg) ? cg : []);
    }).catch(() => {
      if (mounted) setCrmReportsError("CRM reports could not be loaded.");
    }).finally(() => {
      if (mounted) setCrmReportsLoading(false);
    });

    return () => {
      mounted = false;
      window.clearTimeout(loadingTimer);
    };
  }, [authenticated, activeTab]);

  useEffect(() => {
    if (authenticated !== true || activeTab !== "Franchise Overview") {
      return;
    }

    let mounted = true;
    const loadingTimer = window.setTimeout(() => {
      if (mounted) {
        setIsLoadingFranchiseOverview(true);
        setFranchiseOverviewError(null);
      }
    }, 0);
    void fetch("/api/reports/franchise-overview", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        if (result.status === 401) {
          setFranchiseOverview(null);
          setAuthenticated(false);
          return;
        }
        if (result.status === 403) {
          setFranchiseOverview(null);
          setFranchiseOverviewError("You are not authorized to view the franchise overview.");
          return;
        }
        if (!result.ok) {
          throw new Error("Franchise overview request failed");
        }
        const body = await result.json() as {
          overview?: {
            branches: Array<{ branchId: string; branchName: string; isActive: boolean; createdAt: string }>;
            sales: { invoiceCount: number; totalRevenueCents: number; dailyTrend: Array<{ date: string; invoiceCount: number; totalRevenueCents: number }> };
            appointments: { total: number; statusBreakdown: Array<{ status: string; count: number }> };
            customers: { total: number };
            inventory: { lowStockItems: Array<{ productId: string; productName: string; branchId: string; branchName: string; quantity: number }> };
            branchPerformance: Array<{ branchId: string; branchName: string; staffCount: number; attendanceCount: number }>;
          };
        };
        setFranchiseOverview(body.overview ?? null);
      })
      .catch(() => {
        if (mounted) {
          setFranchiseOverview(null);
          setFranchiseOverviewError("Franchise overview could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          window.clearTimeout(loadingTimer);
          setIsLoadingFranchiseOverview(false);
        }
      });

    return () => {
      mounted = false;
      window.clearTimeout(loadingTimer);
    };
  }, [authenticated, activeTab]);

  useEffect(() => {
    if (authenticated !== true || activeTab !== "Financials") {
      return;
    }

    let mounted = true;
    const loadingTimer = window.setTimeout(() => {
      if (mounted) {
        setIsLoadingFranchisePayout(true);
        setFranchisePayoutError(null);
      }
    }, 0);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    void fetch(`/api/franchise/payout?year=${year}&month=${month}`, { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        if (result.status === 401) {
          setFranchisePayout(null);
          setAuthenticated(false);
          return;
        }
        if (result.status === 403) {
          setFranchisePayout(null);
          setFranchisePayoutError("You are not authorized to view franchise financials.");
          return;
        }
        if (!result.ok) {
          throw new Error("Franchise payout request failed");
        }
        const body = await result.json() as { payout?: typeof franchisePayout };
        setFranchisePayout(body.payout ?? null);
      })
      .catch(() => {
        if (mounted) {
          setFranchisePayout(null);
          setFranchisePayoutError("Franchise financials could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) {
          window.clearTimeout(loadingTimer);
          setIsLoadingFranchisePayout(false);
        }
      });

    return () => {
      mounted = false;
      window.clearTimeout(loadingTimer);
    };
  }, [authenticated, activeTab]);

  useEffect(() => {
    if (authenticated !== true || (activeTab !== "Territories" && activeTab !== "Outlets")) {
      return;
    }
    let mounted = true;
    const loadingTimer = window.setTimeout(() => {
      if (mounted) { setIsLoadingTerritories(true); setTerritoriesError(null); }
    }, 0);
    void fetch("/api/franchise/territories", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        if (result.status === 401) { setTerritories([]); setAuthenticated(false); return; }
        if (result.status === 403) { setTerritories([]); setTerritoriesError("You are not authorized to view territories."); return; }
        if (!result.ok) { throw new Error("Territories request failed"); }
        const body = await result.json() as { territories?: typeof territories };
        setTerritories(body.territories ?? []);
      })
      .catch(() => { if (mounted) { setTerritories([]); setTerritoriesError("Territories could not be loaded."); } })
      .finally(() => { if (mounted) { window.clearTimeout(loadingTimer); setIsLoadingTerritories(false); } });
    return () => { mounted = false; window.clearTimeout(loadingTimer); };
  }, [authenticated, activeTab]);

  useEffect(() => {
    if (authenticated !== true || (activeTab !== "Partners" && activeTab !== "Outlets")) {
      return;
    }
    let mounted = true;
    const loadingTimer = window.setTimeout(() => {
      if (mounted) { setIsLoadingPartners(true); setPartnersError(null); }
    }, 0);
    void fetch("/api/franchise/partners", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        if (result.status === 401) { setPartners([]); setAuthenticated(false); return; }
        if (result.status === 403) { setPartners([]); setPartnersError("You are not authorized to view partners."); return; }
        if (!result.ok) { throw new Error("Partners request failed"); }
        const body = await result.json() as { partners?: typeof partners };
        setPartners(body.partners ?? []);
      })
      .catch(() => { if (mounted) { setPartners([]); setPartnersError("Partners could not be loaded."); } })
      .finally(() => { if (mounted) { window.clearTimeout(loadingTimer); setIsLoadingPartners(false); } });
    return () => { mounted = false; window.clearTimeout(loadingTimer); };
  }, [authenticated, activeTab]);

  const createPartner = async () => {
    if (!partnerFormName.trim()) { setPartnerFormError("Name is required."); return; }
    setPartnerFormError(null);
    setPartnerFormLoading(true);
    const result = await fetch("/api/franchise/partners", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: partnerFormName.trim(), email: partnerFormEmail.trim() || null, phone: partnerFormPhone.trim() || null, address: partnerFormAddress.trim() || null }),
    });
    if (result.status === 401) { setAuthenticated(false); setPartnerFormLoading(false); return; }
    if (result.status === 403) { setPartnerFormError("You are not authorized to create partners."); setPartnerFormLoading(false); return; }
    if (!result.ok) { const body = await result.json().catch(() => ({})); setPartnerFormError(body?.error ?? "Partner could not be created."); setPartnerFormLoading(false); return; }
    const body = await result.json() as { partner: typeof partners[number] };
    setPartners((current) => [...current, { ...body.partner, outletCount: 0, agreementCount: 0 }]);
    setPartnerFormName(""); setPartnerFormEmail(""); setPartnerFormPhone(""); setPartnerFormAddress("");
    setShowAddPartner(false);
    setPartnerFormLoading(false);
  };

  const updatePartner = async (partnerId: string) => {
    if (!partnerFormName.trim()) { setPartnerFormError("Name is required."); return; }
    setPartnerFormError(null);
    setPartnerFormLoading(true);
    const result = await fetch(`/api/franchise/partners/${partnerId}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: partnerFormName.trim(), email: partnerFormEmail.trim() || null, phone: partnerFormPhone.trim() || null, address: partnerFormAddress.trim() || null }),
    });
    if (result.status === 401) { setAuthenticated(false); setPartnerFormLoading(false); return; }
    if (result.status === 403) { setPartnerFormError("You are not authorized to update partners."); setPartnerFormLoading(false); return; }
    if (result.status === 404) { setPartnerFormError("Partner not found."); setPartnerFormLoading(false); return; }
    if (!result.ok) { const body = await result.json().catch(() => ({})); setPartnerFormError(body?.error ?? "Partner could not be updated."); setPartnerFormLoading(false); return; }
    const body = await result.json() as { partner: typeof partners[number] };
    setPartners((current) => current.map((p) => (p.id === partnerId ? { ...p, ...body.partner } : p)));
    setPartnerFormName(""); setPartnerFormEmail(""); setPartnerFormPhone(""); setPartnerFormAddress("");
    setEditingPartnerId(null);
    setPartnerFormLoading(false);
  };

  const startEditPartner = (partner: typeof partners[number]) => {
    setEditingPartnerId(partner.id);
    setPartnerFormName(partner.name);
    setPartnerFormEmail(partner.email ?? "");
    setPartnerFormPhone(partner.phone ?? "");
    setPartnerFormAddress("");
    setPartnerFormError(null);
    setShowAddPartner(false);
  };

  const cancelPartnerForm = () => {
    setShowAddPartner(false);
    setEditingPartnerId(null);
    setPartnerFormName(""); setPartnerFormEmail(""); setPartnerFormPhone(""); setPartnerFormAddress("");
    setPartnerFormError(null);
  };

  useEffect(() => {
    if (authenticated !== true || activeTab !== "Agreements") {
      return;
    }
    let mounted = true;
    const loadingTimer = window.setTimeout(() => {
      if (mounted) { setIsLoadingAgreements(true); setAgreementsError(null); }
    }, 0);
    void fetch("/api/franchise/agreements", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        if (result.status === 401) { setAgreements([]); setAuthenticated(false); return; }
        if (result.status === 403) { setAgreements([]); setAgreementsError("You are not authorized to view agreements."); return; }
        if (!result.ok) { throw new Error("Agreements request failed"); }
        const body = await result.json() as { agreements?: typeof agreements };
        setAgreements(body.agreements ?? []);
      })
      .catch(() => { if (mounted) { setAgreements([]); setAgreementsError("Agreements could not be loaded."); } })
      .finally(() => { if (mounted) { window.clearTimeout(loadingTimer); setIsLoadingAgreements(false); } });
    return () => { mounted = false; window.clearTimeout(loadingTimer); };
  }, [authenticated, activeTab]);

  useEffect(() => {
    if (authenticated !== true || activeTab !== "Outlets") {
      return;
    }
    let mounted = true;
    const loadingTimer = window.setTimeout(() => {
      if (mounted) { setIsLoadingOutlets(true); setOutletsError(null); }
    }, 0);
    void fetch("/api/franchise/outlets", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
        if (result.status === 401) { setOutlets([]); setAuthenticated(false); return; }
        if (result.status === 403) { setOutlets([]); setOutletsError("You are not authorized to view outlets."); return; }
        if (!result.ok) { throw new Error("Outlets request failed"); }
        const body = await result.json() as { outlets?: typeof outlets };
        setOutlets(body.outlets ?? []);
      })
      .catch(() => { if (mounted) { setOutlets([]); setOutletsError("Outlets could not be loaded."); } })
      .finally(() => { if (mounted) { window.clearTimeout(loadingTimer); setIsLoadingOutlets(false); } });
    return () => { mounted = false; window.clearTimeout(loadingTimer); };
  }, [authenticated, activeTab]);

  useEffect(() => {
    if (authenticated !== true || activeTab !== "Franchise Settlement") return;
    let mounted = true;
    const loadingTimer = window.setTimeout(() => { if (mounted) { setIsLoadingSettlements(true); setSettlementsError(null); } }, 0);
    void fetch("/api/franchise/settlements", { credentials: "same-origin" })
      .then(async (r) => {
        if (!mounted) return;
        if (r.status === 401) { setSettlements([]); setAuthenticated(false); return; }
        if (r.status === 403) { setSettlements([]); setSettlementsError("You are not authorized to view settlements."); return; }
        if (!r.ok) throw new Error("Settlements request failed");
        const body = await r.json() as { settlements?: SettlementRecord[] };
        setSettlements(body.settlements ?? []);
      })
      .catch(() => { if (mounted) { setSettlements([]); setSettlementsError("Settlements could not be loaded."); } })
      .finally(() => { if (mounted) { window.clearTimeout(loadingTimer); setIsLoadingSettlements(false); } });
    return () => { mounted = false; window.clearTimeout(loadingTimer); };
  }, [authenticated, activeTab]);

  const generateSettlement = async () => {
    if (!generateAgreementId || !generateMonth) { setGenerateError("Agreement and month are required."); return; }
    const [year, month] = generateMonth.split("-").map(Number);
    if (!year || !month) { setGenerateError("Select a valid month."); return; }
    const periodStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const periodEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    setGenerateError(null);
    setGenerateLoading(true);
    const result = await fetch("/api/franchise/settlements/generate", {
      method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
      body: JSON.stringify({ agreementId: generateAgreementId, periodStart, periodEnd }),
    });
    if (result.status === 401) { setAuthenticated(false); setGenerateLoading(false); return; }
    if (result.status === 403) { setGenerateError("You are not authorized to generate settlements."); setGenerateLoading(false); return; }
    if (result.status === 409) { setGenerateError("A settlement already exists for this agreement and month."); setGenerateLoading(false); return; }
    if (!result.ok) { const body = await result.json().catch(() => ({})); setGenerateError(body?.error ?? "Settlement could not be generated."); setGenerateLoading(false); return; }
    const body = await result.json() as { settlement: SettlementRecord; lines: SettlementLineRecord[] };
    setSettlements((current) => [body.settlement, ...current]);
    setSelectedSettlement(body.settlement);
    setSelectedSettlementLines(body.lines);
    setShowGenerateDialog(false);
    setGenerateAgreementId("");
    setGenerateMonth("");
    setGenerateLoading(false);
  };

  const loadSettlementDetail = async (settlementId: string) => {
    setSettlementDetailLoading(true);
    setSelectedSettlement(null);
    setSelectedSettlementLines([]);
    try {
      const result = await fetch(`/api/franchise/settlements/${settlementId}`, { credentials: "same-origin" });
      if (result.status === 401) { setAuthenticated(false); return; }
      if (!result.ok) { setSettlementsError("Settlement detail could not be loaded."); return; }
      const body = await result.json() as { settlement: SettlementRecord; lines: SettlementLineRecord[] };
      setSelectedSettlement(body.settlement);
      setSelectedSettlementLines(body.lines);
    } catch {
      setSettlementsError("Settlement detail could not be loaded.");
    } finally {
      setSettlementDetailLoading(false);
    }
  };

  const approveSettlement = async (settlementId: string) => {
    setApproveError(null);
    setApproveLoading(true);
    const result = await fetch(`/api/franchise/settlements/${settlementId}/approve`, {
      method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
    });
    if (result.status === 401) { setAuthenticated(false); setApproveLoading(false); return; }
    if (result.status === 403) { setApproveError("You are not authorized to approve settlements."); setApproveLoading(false); return; }
    if (!result.ok) { const body = await result.json().catch(() => ({})); setApproveError(body?.error ?? "Settlement could not be approved."); setApproveLoading(false); return; }
    const body = await result.json() as SettlementRecord;
    setSelectedSettlement(body);
    setSettlements((current) => current.map((s) => (s.id === settlementId ? body : s)));
    setShowApproveConfirm(false);
    setApproveLoading(false);
  };

  const addSetting = async () => {
    if (!settingKey.trim()) return;
    setSettingError(null);
    const result = await fetch("/api/settings", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: settingKey, value: settingValue }),
    });
    if (result.status === 401) {
      setSettings([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setSettings([]);
      setSettingError("You are not authorized to create settings.");
      return;
    }
    if (!result.ok) {
      setSettingError("Setting could not be saved.");
      return;
    }
    const body = await result.json() as { setting: { id: string; key: string; value: string; isActive: boolean } };
    setSettings((current) => [body.setting, ...current]);
    setSettingKey("");
    setSettingValue("");
  };

  const updateSetting = async (settingId: string) => {
    if (!editingSettingKey.trim()) return;
    setSettingError(null);
    const result = await fetch(`/api/settings/${settingId}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: editingSettingKey, value: editingSettingValue, isActive: editingSettingIsActive }),
    });
    if (result.status === 401) {
      setSettings([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setSettingError("You are not authorized to update settings.");
      return;
    }
    if (!result.ok) {
      setSettingError("Setting could not be updated.");
      return;
    }
    const body = await result.json() as { setting: { id: string; key: string; value: string; isActive: boolean } };
    setSettings((current) => current.map((item) => (item.id === settingId ? body.setting : item)));
    setEditingSettingId(null);
  };

  const createGatewayAccount = async () => {
    if (!newGatewayProvider.trim()) return;
    setGatewayAccountError(null);
    let config: Record<string, unknown> | null = null;
    try {
      config = JSON.parse(newGatewayConfig);
    } catch {
      setGatewayAccountError("Config must be valid JSON.");
      return;
    }
    const result = await fetch("/api/gateway-accounts", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: newGatewayProvider, label: newGatewayLabel || null, isActive: true, config }),
    });
    if (result.status === 401) {
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setGatewayAccountError("You are not authorized to create gateway accounts.");
      return;
    }
    if (!result.ok) {
      setGatewayAccountError("Gateway account could not be created.");
      return;
    }
    const body = await result.json() as { gatewayAccount: { id: string; provider: string; label: string | null; isActive: boolean; createdAt: string } };
    setGatewayAccounts((current) => [body.gatewayAccount, ...current]);
    setNewGatewayProvider("");
    setNewGatewayLabel("");
    setNewGatewayConfig("{}");
  };

  const updateGatewayAccount = async (gatewayId: string) => {
    setGatewayAccountError(null);
    const result = await fetch(`/api/gateway-accounts/${gatewayId}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: editingGatewayLabel || null, isActive: editingGatewayIsActive }),
    });
    if (result.status === 401) {
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setGatewayAccountError("You are not authorized to update gateway accounts.");
      return;
    }
    if (!result.ok) {
      setGatewayAccountError("Gateway account could not be updated.");
      return;
    }
    const body = await result.json() as { gatewayAccount: { id: string; provider: string; label: string | null; isActive: boolean; createdAt: string } };
    setGatewayAccounts((current) => current.map((item) => (item.id === gatewayId ? body.gatewayAccount : item)));
    setEditingGatewayId(null);
  };

  const deleteGatewayAccount = async (gatewayId: string) => {
    setGatewayAccountError(null);
    const result = await fetch(`/api/gateway-accounts/${gatewayId}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (result.status === 401) {
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setGatewayAccountError("You are not authorized to delete gateway accounts.");
      return;
    }
    if (!result.ok && result.status !== 204) {
      setGatewayAccountError("Gateway account could not be deleted.");
      return;
    }
    setGatewayAccounts((current) => current.filter((item) => item.id !== gatewayId));
  };

  const createMarketplaceAsset = async () => {
    if (!newAssetName.trim() || !newAssetSlug.trim()) return;
    setMarketplaceError(null);
    const result = await fetch("/api/marketplace/assets", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: newAssetName, slug: newAssetSlug, type: newAssetType, description: newAssetDescription || null }),
    });
    if (result.status === 401) { setAuthenticated(false); return; }
    if (result.status === 403) { setMarketplaceError("You are not authorized to create marketplace assets."); return; }
    if (!result.ok) { setMarketplaceError("Asset could not be created."); return; }
    const body = await result.json() as { asset: { id: string; name: string; slug: string; description: string | null; type: string; category: string | null; authorName: string | null; isActive: boolean; createdAt: string } };
    setMarketplaceAssets((current) => [body.asset, ...current]);
    setNewAssetName("");
    setNewAssetSlug("");
    setNewAssetType("module");
    setNewAssetDescription("");
  };

  const installMarketplaceAsset = async (assetId: string) => {
    setMarketplaceError(null);
    const versionsResult = await fetch(`/api/marketplace/assets/${assetId}/versions`, { credentials: "same-origin" });
    if (!versionsResult.ok) { setMarketplaceError("Could not load asset versions."); return; }
    const versionsBody = await versionsResult.json() as { versions?: Array<{ id: string; version: string; isPublished: boolean }> };
    const publishedVersions = (versionsBody.versions ?? []).filter((v) => v.isPublished);
    if (publishedVersions.length === 0) { setMarketplaceError("No published versions available to install."); return; }
    const latestVersion = publishedVersions[0]!;
    const installResult = await fetch("/api/marketplace/installations", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assetId, versionId: latestVersion.id }),
    });
    if (installResult.status === 401) { setAuthenticated(false); return; }
    if (installResult.status === 403) { setMarketplaceError("You are not authorized to install assets."); return; }
    if (!installResult.ok) { setMarketplaceError("Installation failed."); return; }
    const installBody = await installResult.json() as { installation: { id: string; assetId: string; versionId: string; isActive: boolean; installedAt: string } };
    setInstallations((current) => [...current, installBody.installation]);
  };

  const uninstallMarketplaceAsset = async (assetId: string) => {
    setMarketplaceError(null);
    const result = await fetch(`/api/marketplace/installations/${assetId}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (result.status === 401) { setAuthenticated(false); return; }
    if (result.status === 403) { setMarketplaceError("You are not authorized to uninstall assets."); return; }
    if (!result.ok && result.status !== 204) { setMarketplaceError("Uninstall failed."); return; }
    setInstallations((current) => current.filter((inst) => inst.assetId !== assetId));
  };

  const rollbackMarketplaceAsset = async (assetId: string, versionId: string) => {
    setMarketplaceError(null);
    const result = await fetch(`/api/marketplace/installations/${assetId}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ versionId }),
    });
    if (result.status === 401) { setAuthenticated(false); return; }
    if (result.status === 403) { setMarketplaceError("You are not authorized to rollback assets."); return; }
    if (!result.ok) { setMarketplaceError("Rollback failed."); return; }
    const body = await result.json() as { installation: { id: string; assetId: string; versionId: string; isActive: boolean; installedAt: string } };
    setInstallations((current) => current.map((inst) => (inst.assetId === assetId ? body.installation : inst)));
    setAvailableUpdates((current) => current.filter((upd) => upd.assetId !== assetId));
  };

  const assignRole = async () => {
    if (!roleAssignmentUserId || !roleAssignmentRoleId) {
      setRoleAssignmentError("Select a user and a role.");
      return;
    }
    const selectedRole = roleAssignmentRoles.find((r) => r.id === roleAssignmentRoleId);
    if (selectedRole?.requiresScope) {
      if (selectedRole.scopeType === "BUSINESS_UNIT" && !roleAssignmentBusinessUnitId) {
        setRoleAssignmentError("Select a business unit for this role.");
        return;
      }
      if (selectedRole.scopeType === "BRANCH" && (!roleAssignmentBusinessUnitId || !roleAssignmentBranchId)) {
        setRoleAssignmentError("Select a business unit and branch for this role.");
        return;
      }
      if (selectedRole.scopeType === "TERRITORY" && !roleAssignmentTerritoryId) {
        setRoleAssignmentError("Select a territory for this role.");
        return;
      }
    }
    setRoleAssignmentError(null);
    setRoleAssignmentSuccess(null);
    setIsAssigningRole(true);

    const scopeType = selectedRole?.scopeType ?? "TENANT";
    const scope =
      scopeType === "BUSINESS_UNIT"
        ? { kind: "business-unit" as const, businessUnitId: roleAssignmentBusinessUnitId }
        : scopeType === "BRANCH"
          ? { kind: "branch" as const, businessUnitId: roleAssignmentBusinessUnitId, branchId: roleAssignmentBranchId }
          : scopeType === "TERRITORY"
            ? { kind: "territory" as const, territoryId: roleAssignmentTerritoryId }
            : { kind: "tenant" as const };

    const result = await fetch("/api/membership-roles", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        membershipId: roleAssignmentUsers.find((u) => u.id === roleAssignmentUserId)?.membershipId,
        roleId: roleAssignmentRoleId,
        scope,
      }),
    });

    if (result.status === 401) {
      setRoleAssignmentUsers([]);
      setRoleAssignmentRoles([]);
      setAuthenticated(false);
      setIsAssigningRole(false);
      return;
    }
    if (result.status === 403) {
      setRoleAssignmentError("You are not authorized to assign roles.");
      setIsAssigningRole(false);
      return;
    }
    if (!result.ok) {
      const body = await result.json().catch(() => ({}));
      setRoleAssignmentError(body?.error ?? "Role could not be assigned.");
      setIsAssigningRole(false);
      return;
    }

    setRoleAssignmentSuccess("Role assigned successfully.");
    setRoleAssignmentUserId("");
    setRoleAssignmentRoleId("");
    setRoleAssignmentScopeKind("tenant");
    setRoleAssignmentBusinessUnitId("");
    setRoleAssignmentBranchId("");
    setRoleAssignmentTerritoryId("");
    setIsAssigningRole(false);
    setProfileVersion((version) => version + 1);
  };

  const addUser = async () => {
    if (!addUserEmail.trim() || !addUserDisplayName.trim() || !addUserPassword.trim()) {
      setAddUserError("Email, display name, and password are required.");
      return;
    }
    if (addUserPassword.length < 8) {
      setAddUserError("Password must be at least 8 characters.");
      return;
    }
    setAddUserError(null);
    setAddUserSuccess(null);
    const result = await fetch("/api/users", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: addUserEmail, displayName: addUserDisplayName, password: addUserPassword, roleId: addUserRoleId || null }),
    });
    if (result.status === 401) { setAuthenticated(false); return; }
    if (result.status === 409) { setAddUserError("A user with this email already exists."); return; }
    if (!result.ok) {
      const body = await result.json().catch(() => ({}));
      setAddUserError(body?.error ?? "User could not be created.");
      return;
    }
    setAddUserSuccess("User created successfully.");
    setAddUserEmail("");
    setAddUserDisplayName("");
    setAddUserPassword("");
    setAddUserRoleId("");
    setProfileVersion((version) => version + 1);
  };

  const addNotificationTemplate = async () => {
    if (!templateName.trim() || !templateChannel.trim() || !templateBody.trim()) return;
    setNotificationTemplateError(null);
    const result = await fetch("/api/notification-templates", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: templateName, channel: templateChannel, subject: templateSubject || null, body: templateBody }),
    });
    if (result.status === 401) {
      setNotificationTemplates([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setNotificationTemplates([]);
      setNotificationTemplateError("You are not authorized to create notification templates.");
      return;
    }
    if (!result.ok) {
      setNotificationTemplateError("Notification template could not be saved.");
      return;
    }
    const body = await result.json() as { notificationTemplate: { id: string; name: string; channel: string; subject: string | null; body: string; isActive: boolean } };
    setNotificationTemplates((current) => [body.notificationTemplate, ...current]);
    setTemplateName("");
    setTemplateChannel("");
    setTemplateSubject("");
    setTemplateBody("");
  };

  const updateNotificationTemplate = async (id: string, name: string, channel: string, subject: string, templateBody: string) => {
    setNotificationTemplateError(null);
    const result = await fetch(`/api/notification-templates/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, channel, subject: subject || null, body: templateBody }),
    });
    if (result.status === 401) {
      setNotificationTemplates([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setNotificationTemplateError("You are not authorized to manage notification templates.");
      return;
    }
    if (!result.ok) {
      setNotificationTemplateError("Notification template could not be updated.");
      return;
    }
    const body = await result.json() as { notificationTemplate: { id: string; name: string; channel: string; subject: string | null; body: string; isActive: boolean } };
    setNotificationTemplates((current) => current.map((item) => (item.id === body.notificationTemplate.id ? body.notificationTemplate : item)));
  };

  const addEventSubscription = async () => {
    if (!eventSubscriptionType.trim() || !eventSubscriptionTemplateId) return;
    setEventSubscriptionError(null);
    const result = await fetch("/api/event-subscriptions", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventType: eventSubscriptionType, notificationTemplateId: eventSubscriptionTemplateId, isEnabled: true }),
    });
    if (result.status === 401) {
      setEventSubscriptions([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setEventSubscriptionError("You are not authorized to create event subscriptions.");
      return;
    }
    if (!result.ok) {
      setEventSubscriptionError("Event subscription could not be saved.");
      return;
    }
    const body = await result.json() as { eventSubscription: { id: string; eventType: string; notificationTemplateId: string | null; isEnabled: boolean } };
    setEventSubscriptions((current) => [body.eventSubscription, ...current]);
    setEventSubscriptionType("appointment.created");
    setEventSubscriptionTemplateId("");
  };

  const updateEventSubscription = async (subscription: { id: string; isEnabled: boolean }) => {
    setEventSubscriptionError(null);
    const result = await fetch(`/api/event-subscriptions/${encodeURIComponent(subscription.id)}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isEnabled: !subscription.isEnabled }),
    });
    if (result.status === 401) {
      setEventSubscriptions([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setEventSubscriptionError("You are not authorized to update event subscriptions.");
      return;
    }
    if (!result.ok) {
      setEventSubscriptionError("Event subscription could not be updated.");
      return;
    }
    const body = await result.json() as { eventSubscription: { id: string; eventType: string; notificationTemplateId: string | null; isEnabled: boolean } };
    setEventSubscriptions((current) => current.map((item) => (item.id === body.eventSubscription.id ? body.eventSubscription : item)));
  };

  const markNotificationAsRead = async (logId: string) => {
    setNotificationLogError(null);
    const result = await fetch(`/api/notification-logs/${encodeURIComponent(logId)}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    if (result.status === 401) {
      setNotificationLogs([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setNotificationLogError("You are not authorized to update notification logs.");
      return;
    }
    if (!result.ok) {
      setNotificationLogError("Notification could not be marked as read.");
      return;
    }
    const updated = await result.json() as { notificationLog: { id: string; readAt: string | null } };
    setNotificationLogs((current) => current.map((log) => (log.id === updated.notificationLog.id ? { ...log, readAt: updated.notificationLog.readAt } : log)));
  };

  const saveNotificationPreference = async (channel = notificationPreferenceChannel, enabled = notificationPreferenceEnabled) => {
    if (!channel.trim()) return;
    setNotificationPreferenceError(null);
    const existing = notificationPreferences.find((preference) => preference.channel === channel);
    const result = await fetch("/api/notification-preferences", {
      method: existing ? "PATCH" : "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channel, isEnabled: enabled }),
    });
    if (result.status === 401) {
      setNotificationPreferences([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setNotificationPreferenceError("You are not authorized to manage notification preferences.");
      return;
    }
    if (!result.ok) {
      setNotificationPreferenceError("Notification preference could not be saved.");
      return;
    }
    const body = await result.json() as { notificationPreference: { id: string; channel: string; isEnabled: boolean } };
    setNotificationPreferences((current) => {
      const withoutCurrent = current.filter((preference) => preference.channel !== body.notificationPreference.channel);
      return [body.notificationPreference, ...withoutCurrent];
    });
  };

  const resetOutletForm = () => {
    setOutletFormBranchId("");
    setOutletFormOwnershipMode("UNDER_FRANCHISE_PARTNER");
    setOutletFormPartnerId("");
    setOutletFormTerritoryId("");
    setOutletFormType("");
    setOutletFormInvestment("");
    setOutletFormError(null);
  };

  const cancelOutletForm = () => {
    resetOutletForm();
    setShowAddOutlet(false);
  };

  const createOutlet = async () => {
    const branchId = outletFormBranchId.trim();
    const partnerId = outletFormPartnerId.trim();
    const territoryId = outletFormTerritoryId.trim();
    const outletType = outletFormType.trim();
    const investmentValue = outletFormInvestment.trim();

    if (!branchId) {
      setOutletFormError("Select a branch for this outlet.");
      return;
    }
    if (registeredOutletBranchIds.has(branchId)) {
      setOutletFormError("This branch already has a registered franchise outlet.");
      return;
    }
    if (outletFormOwnershipMode === "UNDER_FRANCHISE_PARTNER" && !partnerId) {
      setOutletFormError("Select a franchise partner for this ownership mode.");
      return;
    }

    let investmentCents: number | null = null;
    if (investmentValue) {
      const parsedInvestment = Number(investmentValue);
      if (!Number.isFinite(parsedInvestment) || parsedInvestment < 0) {
        setOutletFormError("Investment amount must be a non-negative number.");
        return;
      }
      investmentCents = Math.round(parsedInvestment * 100);
    }

    setOutletFormLoading(true);
    setOutletFormError(null);
    const payload: Record<string, unknown> = {
      branchId,
      ownershipMode: outletFormOwnershipMode,
    };
    if (outletFormOwnershipMode === "UNDER_FRANCHISE_PARTNER") {
      payload.partnerId = partnerId;
    }
    if (territoryId) {
      payload.territoryId = territoryId;
    }
    if (outletType) {
      payload.outletType = outletType;
    }
    if (investmentCents !== null) {
      payload.investmentCents = investmentCents;
    }

    try {
      const result = await fetch("/api/franchise/outlets", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (result.status === 401) {
        setAuthenticated(false);
        setOutletFormLoading(false);
        return;
      }
      if (result.status === 403) {
        setOutletFormError("You are not authorized to create franchise outlets.");
        setOutletFormLoading(false);
        return;
      }
      if (!result.ok) {
        const body = await result.json().catch(() => ({}));
        setOutletFormError(typeof body?.error === "string" ? body.error : "Outlet could not be saved.");
        setOutletFormLoading(false);
        return;
      }

      const body = await result.json() as { outlet: { id: string; partnerId: string | null; branchId: string; territoryId: string | null } };
      const outletsResult = await fetch("/api/franchise/outlets", { credentials: "same-origin" });
      if (outletsResult.status === 401) {
        setAuthenticated(false);
        setOutletFormLoading(false);
        return;
      }
      if (outletsResult.status === 403) {
        setOutletsError("You are not authorized to view franchise outlets.");
      } else if (!outletsResult.ok) {
        setOutletsError("Outlets could not be loaded.");
      } else {
        const outletsBody = await outletsResult.json() as { outlets?: Array<{ id: string; partnerId: string | null; branchId: string; territoryId: string | null; partnerName: string | null; branchName: string; territoryName: string | null; outletType: string | null; isActive: boolean }> };
        setOutlets(Array.isArray(outletsBody.outlets) ? outletsBody.outlets : []);
        setOutletsError(null);
      }
      if (body.outlet.partnerId) {
        setPartners((current) => current.map((partner) => partner.id === body.outlet.partnerId ? { ...partner, outletCount: partner.outletCount + 1 } : partner));
      }
      if (body.outlet.territoryId) {
        setTerritories((current) => current.map((territory) => territory.id === body.outlet.territoryId ? { ...territory, outletCount: territory.outletCount + 1 } : territory));
      }
      resetOutletForm();
      setShowAddOutlet(false);
    } catch {
      setOutletFormError("Outlet could not be saved.");
    } finally {
      setOutletFormLoading(false);
    }
  };
  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    invalidatePendingRefresh();
    isLoginInProgress.current = true;
    const requestId = ++authenticationRequestId.current;
    setIsAuthenticating(true);
    try {
      const authenticatedSuccessfully = await loginWithNativeAuthentication({ email, password });
      if (requestId === authenticationRequestId.current) {
        setAuthenticated(authenticatedSuccessfully);
        setLoginError(authenticatedSuccessfully ? null : "Authentication failed.");
        if (authenticatedSuccessfully) {
          setPassword("");
        }
      }
    } catch {
      if (requestId === authenticationRequestId.current) {
        setAuthenticated(false);
        setLoginError("Authentication failed.");
      }
    } finally {
      isLoginInProgress.current = false;
      if (requestId === authenticationRequestId.current) {
        setIsAuthenticating(false);
      }
    }
  };

  const handleLogout = async () => {
    invalidatePendingRefresh();
    authenticationRequestId.current += 1;
    setAuthenticated(false);

    try {
      if (await logoutFromNativeAuthentication()) {
        setLoginError(null);
      }
    } catch {
      setLoginError("Sign out failed.");
    }
  };

  const handleRequestReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResetError(null);
    setResetMessage(null);
    setIsResetting(true);
    try {
      const result = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      if (result.ok) {
        setResetMessage("If an account exists with that email, a reset link has been sent.");
        setPasswordResetMode("reset");
      } else {
        setResetError("Request failed. Please try again.");
      }
    } catch {
      setResetError("Request failed. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResetError(null);
    setResetMessage(null);
    setIsResetting(true);
    try {
      const result = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: resetToken, newPassword: resetNewPassword }),
      });
      if (result.ok) {
        setResetMessage("Password reset successfully. You can now sign in.");
        setPasswordResetMode("login");
        setResetToken("");
        setResetNewPassword("");
      } else {
        setResetError("Invalid or expired reset token.");
      }
    } catch {
      setResetError("Reset failed. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };

  const addCustomer = async () => {
    if (!customerName.trim()) return;
    setCustomerError(null);
    const result = await fetch("/api/customers", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: customerName, phone: customerPhone || null }),
    });
    if (result.status === 401) {
      setCustomers([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setCustomers([]);
      setCustomerError("You are not authorized to create customers.");
      return;
    }
    if (!result.ok) {
      setCustomerError("Customer could not be saved.");
      return;
    }
    const body = await result.json() as { customer: CustomerRecord };
    setCustomers((current) => [body.customer, ...current]);
    setCustomerName("");
    setCustomerPhone("");
  };

  const updateCustomer = async (customerId: string) => {
    if (!editingCustomerName.trim()) return;
    setCustomerError(null);
    const result = await fetch(`/api/customers/${customerId}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: editingCustomerName, phone: editingCustomerPhone || null }),
    });
    if (result.status === 401) {
      setCustomers([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setCustomerError("You are not authorized to update customers.");
      return;
    }
    if (!result.ok) {
      setCustomerError("Customer could not be updated.");
      return;
    }
    const body = await result.json() as { customer: CustomerRecord };
    setCustomers((current) => current.map((item) => (item.id === customerId ? body.customer : item)));
    setEditingCustomerId(null);
  };

  const addLead = async () => {
    if (!leadName.trim()) return;
    setLeadError(null);
    const result = await fetch("/api/leads", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: leadName, email: leadEmail || null, phone: leadPhone || null, source: leadSource || null }),
    });
    if (result.status === 401) { setLeads([]); setAuthenticated(false); return; }
    if (!result.ok) { setLeadError("Lead could not be saved."); return; }
    const body = await result.json() as { lead: LeadRecord };
    setLeads((current) => [body.lead, ...current]);
    setLeadName("");
    setLeadEmail("");
    setLeadPhone("");
    setLeadSource("");
  };

  const convertLead = async (leadId: string) => {
    setLeadError(null);
    const result = await fetch(`/api/leads/${leadId}/convert`, {
      method: "POST",
      credentials: "same-origin",
    });
    if (result.status === 401) { setAuthenticated(false); return; }
    if (!result.ok) { setLeadError("Lead could not be converted."); return; }
    const body = await result.json() as { lead: LeadRecord; customer: { id: string } };
    setLeads((current) => current.map((item) => (item.id === leadId ? body.lead : item)));
    setCustomers((current) => {
      void fetch("/api/customers", { credentials: "same-origin" })
        .then(async (r) => { if (r.ok) { const b = await r.json() as { customers?: CustomerRecord[] }; if (b.customers) setCustomers(b.customers); } })
        .catch(() => {});
      return current;
    });
  };

  const addPipeline = async () => {
    if (!pipelineName.trim()) return;
    setOpportunityError(null);
    const result = await fetch("/api/pipelines", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: pipelineName }) });
    if (result.status === 401) { setAuthenticated(false); return; }
    if (!result.ok) { setOpportunityError("Pipeline could not be created."); return; }
    const body = await result.json() as { pipeline: PipelineRecord };
    setPipelines((current) => [...current, body.pipeline]);
    setPipelineName("");
  };

  const addStage = async () => {
    if (!stageName.trim() || !selectedPipelineId) return;
    setOpportunityError(null);
    const result = await fetch("/api/stages", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ pipelineId: selectedPipelineId, name: stageName, position: stagePosition }) });
    if (result.status === 401) { setAuthenticated(false); return; }
    if (!result.ok) { setOpportunityError("Stage could not be created."); return; }
    const body = await result.json() as { stage: StageRecord };
    setStages((current) => [...current, body.stage]);
    setStageName("");
    setStagePosition((p) => p + 1);
  };

  const addOpportunity = async () => {
    if (!oppName.trim() || !selectedPipelineId || !oppStageId) return;
    setOpportunityError(null);
    const result = await fetch("/api/opportunities", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ pipelineId: selectedPipelineId, stageId: oppStageId, name: oppName, valueCents: Math.round(parseFloat(oppValue || "0") * 100) || 0 }) });
    if (result.status === 401) { setAuthenticated(false); return; }
    if (!result.ok) { setOpportunityError("Opportunity could not be created."); return; }
    const body = await result.json() as { opportunity: OpportunityRecord };
    setOpportunities((current) => [...current, body.opportunity]);
    setOppName("");
    setOppValue("");
  };

  const moveOpportunity = async (opportunityId: string, newStageId: string) => {
    setOpportunityError(null);
    const result = await fetch(`/api/opportunities/${opportunityId}/move`, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ stageId: newStageId }) });
    if (result.status === 401) { setAuthenticated(false); return; }
    if (!result.ok) { setOpportunityError("Opportunity could not be moved."); return; }
    const body = await result.json() as { opportunity: OpportunityRecord };
    setOpportunities((current) => current.map((item) => (item.id === opportunityId ? { ...item, stageId: body.opportunity.stageId } : item)));
  };

  const loadStagesForPipeline = async (pipelineId: string) => {
    setSelectedPipelineId(pipelineId);
    const result = await fetch(`/api/stages?pipelineId=${pipelineId}`, { credentials: "same-origin" });
    if (!result.ok) return;
    const body = await result.json() as { stages?: StageRecord[] };
    setStages(Array.isArray(body.stages) ? body.stages : []);
  };

  const addFollowup = async () => {
    if (!followupTitle.trim() || !followupDueAt.trim()) return;
    setFollowupError(null);
    const result = await fetch("/api/followups", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: followupTitle, dueAt: followupDueAt }) });
    if (result.status === 401) { setAuthenticated(false); return; }
    if (!result.ok) { setFollowupError("Follow-up could not be created."); return; }
    const body = await result.json() as { followup: FollowupRecord };
    setFollowups((current) => [...current, body.followup]);
    setFollowupTitle("");
    setFollowupDueAt("");
  };

  const completeFollowup = async (followupId: string) => {
    setFollowupError(null);
    const result = await fetch(`/api/followups/${followupId}`, { method: "PATCH", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "COMPLETED" }) });
    if (result.status === 401) { setAuthenticated(false); return; }
    if (!result.ok) { setFollowupError("Follow-up could not be updated."); return; }
    setFollowups((current) => current.map((f) => (f.id === followupId ? { ...f, status: "COMPLETED" } : f)));
  };

  const addCommunication = async () => {
    if (!commBody.trim()) return;
    setCommError(null);
    const result = await fetch("/api/communications", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ channel: commChannel, direction: commDirection, contactName: commContactName || null, subject: commSubject || null, body: commBody, communicatedAt: new Date().toISOString() }) });
    if (result.status === 401) { setAuthenticated(false); return; }
    if (!result.ok) { setCommError("Communication could not be recorded."); return; }
    const body = await result.json() as { communication: CommunicationRecord };
    setCommunications((current) => [body.communication, ...current]);
    setCommBody("");
    setCommSubject("");
    setCommContactName("");
  };

  const addTag = async () => {
    if (!tagName.trim()) return;
    setTagError(null);
    const result = await fetch("/api/tags", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: tagName }) });
    if (result.status === 401) { setAuthenticated(false); return; }
    if (!result.ok) { setTagError("Tag could not be created."); return; }
    const body = await result.json() as { tag: TagRecord };
    setTags((current) => [...current, body.tag]);
    setTagName("");
  };

  const addCrmNote = async () => {
    if (!noteBody.trim()) return;
    setTagError(null);
    const result = await fetch("/api/crm-notes", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: noteBody }) });
    if (result.status === 401) { setAuthenticated(false); return; }
    if (!result.ok) { setTagError("Note could not be created."); return; }
    const resp = await result.json() as { note: CrmNoteRecord };
    setCrmNotes((current) => [resp.note, ...current]);
    setNoteBody("");
  };

  const addAttachment = async () => {
    if (!attName.trim() || !attUrl.trim()) return;
    setTagError(null);
    const result = await fetch("/api/attachments", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: attName, url: attUrl }) });
    if (result.status === 401) { setAuthenticated(false); return; }
    if (!result.ok) { setTagError("Attachment could not be recorded."); return; }
    const resp = await result.json() as { attachment: AttachmentRecord };
    setAttachments((current) => [resp.attachment, ...current]);
    setAttName("");
    setAttUrl("");
  };

  const addService = async () => {
    if (!serviceName.trim()) return;
    setServiceError(null);
    const result = await fetch("/api/services", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: serviceName,
        durationMinutes: 45,
        priceCents: Number(servicePrice) || 1500,
      }),
    });
    if (result.status === 401) {
      setServices([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setServices([]);
      setServiceError("You are not authorized to create services.");
      return;
    }
    if (!result.ok) {
      setServiceError("Service could not be saved.");
      return;
    }
    const body = await result.json() as { service: ServiceRecord };
    setServices((current) => [body.service, ...current]);
    setServiceName("");
    setServicePrice("1500");
  };

  const updateService = async (serviceId: string) => {
    if (!editingServiceName.trim()) return;
    setServiceError(null);
    const result = await fetch(`/api/services/${serviceId}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: editingServiceName,
        durationMinutes: 45,
        priceCents: Number(editingServicePrice) || 1500,
      }),
    });
    if (result.status === 401) {
      setServices([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setServiceError("You are not authorized to update services.");
      return;
    }
    if (!result.ok) {
      setServiceError("Service could not be updated.");
      return;
    }
    const body = await result.json() as { service: ServiceRecord };
    setServices((current) => current.map((item) => (item.id === serviceId ? body.service : item)));
    setEditingServiceId(null);
  };

  const addPackage = async () => {
    if (!packageName.trim()) return;
    setPackageError(null);
    const result = await fetch("/api/packages", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: packageName,
        serviceIds: [],
      }),
    });
    if (result.status === 401) {
      setPackages([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setPackages([]);
      setPackageError("You are not authorized to create packages.");
      return;
    }
    if (!result.ok) {
      setPackageError("Package could not be saved.");
      return;
    }
    const body = await result.json() as { package: PackageRecord };
    setPackages((current) => [body.package, ...current]);
    setPackageName("");
  };

  const updatePackage = async (packageId: string) => {
    if (!editingPackageName.trim()) return;
    setPackageError(null);
    const result = await fetch(`/api/packages/${packageId}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: editingPackageName,
        serviceIds: [],
      }),
    });
    if (result.status === 401) {
      setPackages([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setPackageError("You are not authorized to update packages.");
      return;
    }
    if (!result.ok) {
      setPackageError("Package could not be updated.");
      return;
    }
    const body = await result.json() as { package: PackageRecord };
    setPackages((current) => current.map((item) => (item.id === packageId ? body.package : item)));
    setEditingPackageId(null);
  };

  const addMembership = async () => {
    if (!membershipCustomerId.trim() || !membershipPackageId.trim()) return;
    setMembershipError(null);
    const result = await fetch("/api/memberships", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customerId: membershipCustomerId,
        packageId: membershipPackageId,
        startedAt: membershipStartedAt,
        endsAt: membershipEndsAt || null,
        status: membershipStatus || null,
      }),
    });
    if (result.status === 401) {
      setMemberships([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setMemberships([]);
      setMembershipError("You are not authorized to create memberships.");
      return;
    }
    if (!result.ok) {
      setMembershipError("Membership could not be saved.");
      return;
    }
    const body = await result.json() as { membership: MembershipRecord };
    setMemberships((current) => [body.membership, ...current]);
    setMembershipCustomerId("");
    setMembershipPackageId("");
    setMembershipStartedAt(new Date().toISOString());
    setMembershipEndsAt("");
    setMembershipStatus("");
  };

  const updateMembership = async (membershipId: string) => {
    setMembershipError(null);
    const result = await fetch(`/api/memberships/${membershipId}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status: editingMembershipStatus || null,
      }),
    });
    if (result.status === 401) {
      setMemberships([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setMembershipError("You are not authorized to update memberships.");
      return;
    }
    if (!result.ok) {
      setMembershipError("Membership could not be updated.");
      return;
    }
    const body = await result.json() as { membership: MembershipRecord };
    setMemberships((current) => current.map((item) => (item.id === membershipId ? body.membership : item)));
    setEditingMembershipId(null);
  };

  const addToCart = () => {
    if (!cartItemId) return;
    const item = cartItemType === "product"
      ? products.find((product) => product.id === cartItemId)
      : cartItemType === "service"
        ? services.find((service) => service.id === cartItemId)
        : packages.find((pkg) => pkg.id === cartItemId);

    if (!item) return;
    const quantity = Math.max(1, Number(cartItemQuantity) || 1);
    const cartEntry = {
      id: `${cartItemType}-${item.id}-${Date.now()}`,
      type: cartItemType,
      itemId: item.id,
      description: item.name,
      unitPriceCents: item.priceCents ?? 0,
      quantity,
    };
    setCartItems((current) => [...current, cartEntry]);
    setCartItemId("");
    setCartItemQuantity("1");
  };

  const removeFromCart = (cartId: string) => {
    setCartItems((current) => current.filter((item) => item.id !== cartId));
  };

  const cartSubtotalCents = cartItems.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);

  const checkout = async () => {
    if (!invoiceCustomerId.trim() || cartItems.length === 0) return;
    setIsCheckingOut(true);
    setCheckoutError(null);
    setInvoiceError(null);
    const result = await fetch("/api/invoices", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customerId: invoiceCustomerId,
        branchId: invoiceBranchId || null,
        issuedAt: new Date().toISOString(),
        items: cartItems.map((item) => ({
          description: item.description,
          productId: item.type === "product" ? item.itemId : null,
          serviceId: item.type === "service" ? item.itemId : null,
          packageId: item.type === "package" ? item.itemId : null,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
        })),
        notes: invoiceNotes || null,
      }),
    });
    if (result.status === 401) {
      setInvoices([]);
      setAuthenticated(false);
      setIsCheckingOut(false);
      return;
    }
    if (result.status === 403) {
      setInvoiceError("You are not authorized to create invoices.");
      setIsCheckingOut(false);
      return;
    }
    if (!result.ok) {
      setCheckoutError("Checkout failed. Please try again.");
      setIsCheckingOut(false);
      return;
    }
    const body = await result.json() as { invoice: { id: string; customerId: string; issuedAt: string; subtotalCents: number; discountCents: number; gstCents: number; totalCents: number; notes: string | null } };
    setInvoices((current) => [body.invoice, ...current]);
    setCartItems([]);
    setInvoiceNotes("");
    setIsCheckingOut(false);
  };

  const recordPayment = async () => {
    if (!payingInvoiceId || !paymentAmount.trim()) return;
    const amountCents = Math.round(Number(paymentAmount) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setPaymentError("Enter a valid positive amount.");
      return;
    }
    setPaymentError(null);
    setIsRecordingPayment(true);
    const result = await fetch("/api/payments", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        invoiceId: payingInvoiceId,
        amountCents,
        method: paymentMethod,
        notes: paymentNotes || null,
      }),
    });
    if (result.status === 401) { setAuthenticated(false); setIsRecordingPayment(false); return; }
    if (result.status === 403) { setPaymentError("You are not authorized to record payments."); setIsRecordingPayment(false); return; }
    if (result.status === 404) { setPaymentError("Invoice not found."); setIsRecordingPayment(false); return; }
    if (!result.ok) {
      const body = await result.json().catch(() => ({}));
      setPaymentError(body?.error ?? "Payment could not be recorded.");
      setIsRecordingPayment(false);
      return;
    }
    const paymentResult = await result.json() as { payment: { amountCents: number } };
    setInvoices((current) =>
      current.map((inv) =>
        inv.id === payingInvoiceId
          ? { ...inv, paidCents: (inv.paidCents ?? 0) + paymentResult.payment.amountCents }
          : inv,
      ),
    );
    setPayingInvoiceId(null);
    setPaymentAmount("");
    setPaymentNotes("");
    setIsRecordingPayment(false);
  };

  const addProduct = async () => {
    if (!productName.trim() || !productSku.trim() || !productCategoryId.trim()) return;
    setProductError(null);
    const result = await fetch("/api/products", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        categoryId: productCategoryId,
        name: productName,
        sku: productSku,
        unit: "pcs",
        priceCents: Number(productPrice) || 0,
        isActive: true,
      }),
    });
    if (result.status === 401) {
      setProducts([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setProducts([]);
      setProductError("You are not authorized to create products.");
      return;
    }
    if (!result.ok) {
      setProductError("Product could not be saved.");
      return;
    }
    const body = await result.json() as { product: { id: string; categoryId: string; name: string; sku: string; unit: string; priceCents: number; isActive: boolean } };
    setProducts((current) => [body.product, ...current]);
    setProductName("");
    setProductSku("");
    setProductPrice("1500");
    setProductCategoryId("");
  };

  const addCategory = async () => {
    if (!categoryName.trim()) return;
    setCategoryError(null);
    const result = await fetch("/api/categories", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: categoryName,
        description: categoryDescription || null,
        isActive: true,
      }),
    });
    if (result.status === 401) {
      setCategories([]);
      return;
    }
    if (result.status === 403) {
      setCategories([]);
      setCategoryError("You are not authorized to manage categories.");
      return;
    }
    if (!result.ok) {
      setCategoryError("Category could not be saved.");
      return;
    }
    const body = await result.json() as { category: { id: string; name: string; description: string | null; isActive: boolean } };
    setCategories((current) => [body.category, ...current]);
    setCategoryName("");
    setCategoryDescription("");
  };

  const addStockItem = async () => {
    if (!stockItemProductId.trim() || !stockItemBranchId.trim()) return;
    setStockItemError(null);
    const result = await fetch("/api/stock-items", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        productId: stockItemProductId,
        branchId: stockItemBranchId,
        quantity: Number(stockItemQuantity) || 0,
      }),
    });
    if (result.status === 401) {
      setStockItems([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setStockItems([]);
      setStockItemError("You are not authorized to manage stock items.");
      return;
    }
    if (!result.ok) {
      const body = await result.json().catch(() => ({}));
      setStockItemError(body?.error ?? "Stock item could not be saved.");
      return;
    }
    const body = await result.json() as { stockItem: { id: string; productId: string; branchId: string; quantity: number } };
    setStockItems((current) => [body.stockItem, ...current]);
    setStockItemProductId("");
    setStockItemBranchId("");
    setStockItemQuantity("0");
  };

  const addStockMovement = async () => {
    if (!stockMovementProductId.trim() || !stockMovementBranchId.trim() || !stockMovementType.trim()) return;
    if (stockMovementType === "ADJUSTMENT" && !adjustmentDirection) return;
    setStockMovementError(null);
    const result = await fetch("/api/stock-movements", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        productId: stockMovementProductId,
        branchId: stockMovementBranchId,
        movementType: stockMovementType,
        quantity: Number(stockMovementQuantity) || 0,
        notes: stockMovementNotes || null,
        adjustmentDirection: stockMovementType === "ADJUSTMENT" ? adjustmentDirection : null,
      }),
    });
    if (result.status === 401) {
      setStockMovements([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setStockMovements([]);
      setStockMovementError("You are not authorized to record stock movements.");
      return;
    }
    if (!result.ok) {
      const body = await result.json().catch(() => ({}));
      setStockMovementError(body?.error ?? "Stock movement could not be recorded.");
      return;
    }
    const body = await result.json() as { stockItem: { id: string; productId: string; branchId: string; quantity: number } };
    setStockItems((current) => {
      const existing = current.find((item) => item.productId === stockMovementProductId && item.branchId === stockMovementBranchId);
      if (existing) {
        return current.map((item) =>
          item.productId === stockMovementProductId && item.branchId === stockMovementBranchId
            ? { ...item, quantity: body.stockItem.quantity }
            : item,
        );
      }
      return [body.stockItem, ...current];
    });
    const movementsResult = await fetch("/api/stock-movements", { credentials: "same-origin" });
    if (movementsResult.ok) {
      const movementsBody = await movementsResult.json() as { stockMovements?: Array<{ id: string; productId: string; branchId: string; movementType: string; quantity: number; notes: string | null; createdAt: string }> };
      setStockMovements(movementsBody.stockMovements ?? []);
    }
    setStockMovementProductId("");
    setStockMovementBranchId("");
    setStockMovementQuantity("1");
    setStockMovementNotes("");
    setAdjustmentDirection("IN");
  };

  const updateCategory = async (id: string, name: string, description: string) => {
    setCategoryError(null);
    const result = await fetch(`/api/categories/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, description: description || null }),
    });
    if (result.status === 401) {
      setCategories([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setCategoryError("You are not authorized to manage categories.");
      return;
    }
    if (!result.ok) {
      setCategoryError("Category could not be updated.");
      return;
    }
    const body = await result.json() as { category: { id: string; name: string; description: string | null; isActive: boolean } };
    setCategories((current) => current.map((item) => (item.id === body.category.id ? body.category : item)));
  };

  const updateProduct = async (id: string, name: string, sku: string, priceCents: number) => {
    setProductError(null);
    const result = await fetch(`/api/products/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, sku, priceCents }),
    });
    if (result.status === 401) {
      setProducts([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setProductError("You are not authorized to manage products.");
      return;
    }
    if (!result.ok) {
      setProductError("Product could not be updated.");
      return;
    }
    const body = await result.json() as { product: { id: string; categoryId: string; name: string; sku: string; unit: string; priceCents: number; isActive: boolean } };
    setProducts((current) => current.map((item) => (item.id === body.product.id ? body.product : item)));
  };

  const updateStockItem = async (id: string, quantity: number) => {
    setStockItemError(null);
    const result = await fetch(`/api/stock-items/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    if (result.status === 401) {
      setStockItems([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setStockItemError("You are not authorized to manage stock items.");
      return;
    }
    if (!result.ok) {
      setStockItemError("Stock item could not be updated.");
      return;
    }
    const body = await result.json() as { stockItem: { id: string; productId: string; branchId: string; quantity: number } };
    setStockItems((current) => current.map((item) => (item.id === body.stockItem.id ? body.stockItem : item)));
  };

  const updateInvoice = async (id: string, discountCents: number, notes: string) => {
    setInvoiceError(null);
    const result = await fetch(`/api/invoices/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ discountCents, notes: notes || null }),
    });
    if (result.status === 401) {
      setInvoices([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setInvoiceError("You are not authorized to manage invoices.");
      return;
    }
    if (!result.ok) {
      setInvoiceError("Invoice could not be updated.");
      return;
    }
    const body = await result.json() as { invoice: { id: string; customerId: string; issuedAt: string; subtotalCents: number; discountCents: number; gstCents: number; totalCents: number; notes: string | null } };
    setInvoices((current) => current.map((item) => (item.id === body.invoice.id ? { ...item, ...body.invoice } : item)));
  };

  const updateBusinessUnit = async (id: string, name: string, slug: string) => {
    setBusinessUnitError(null);
    const result = await fetch(`/api/business-units/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, slug }),
    });
    if (result.status === 401) {
      setBusinessUnits([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setBusinessUnitError("You are not authorized to manage business units.");
      return;
    }
    if (!result.ok) {
      setBusinessUnitError("Business unit could not be updated.");
      return;
    }
    const body = await result.json() as { businessUnit: { id: string; name: string; slug: string; isActive: boolean } };
    setBusinessUnits((current) => current.map((item) => (item.id === body.businessUnit.id ? body.businessUnit : item)));
  };

  const updateBranch = async (id: string, name: string, slug: string) => {
    setBranchError(null);
    const result = await fetch(`/api/branches/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, slug }),
    });
    if (result.status === 401) {
      setBranches([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setBranchError("You are not authorized to manage branches.");
      return;
    }
    if (!result.ok) {
      setBranchError("Branch could not be updated.");
      return;
    }
    const body = await result.json() as { branch: { id: string; businessUnitId: string; name: string; slug: string; isActive: boolean } };
    setBranches((current) => current.map((item) => (item.id === body.branch.id ? body.branch : item)));
  };

  const addWarehouse = async () => {
    if (!warehouseName.trim()) return;
    setWarehouseError(null);
    const result = await fetch("/api/warehouses", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: warehouseName,
        location: warehouseLocation || null,
      }),
    });
    if (result.status === 401) {
      setWarehouses([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setWarehouses([]);
      setWarehouseError("You are not authorized to create warehouses.");
      return;
    }
    if (!result.ok) {
      const body = await result.json().catch(() => ({}));
      setWarehouseError(body?.error ?? "Warehouse could not be saved.");
      return;
    }
    const body = await result.json() as { warehouse: { id: string; name: string; location: string | null; isActive: boolean } };
    setWarehouses((current) => [body.warehouse, ...current]);
    setWarehouseName("");
    setWarehouseLocation("");
  };

  const updateWarehouse = async (id: string, name: string, location: string) => {
    setWarehouseError(null);
    const result = await fetch(`/api/warehouses/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, location: location || null }),
    });
    if (result.status === 401) {
      setWarehouses([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setWarehouseError("You are not authorized to manage warehouses.");
      return;
    }
    if (!result.ok) {
      setWarehouseError("Warehouse could not be updated.");
      return;
    }
    const body = await result.json() as { warehouse: { id: string; name: string; location: string | null; isActive: boolean } };
    setWarehouses((current) => current.map((item) => (item.id === body.warehouse.id ? body.warehouse : item)));
  };

  const addSupplier = async () => {
    if (!supplierName.trim()) return;
    setSupplierError(null);
    const result = await fetch("/api/suppliers", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: supplierName,
        contactName: supplierContactName || null,
        email: supplierEmail || null,
        phone: supplierPhone || null,
      }),
    });
    if (result.status === 401) {
      setSuppliers([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setSuppliers([]);
      setSupplierError("You are not authorized to create suppliers.");
      return;
    }
    if (!result.ok) {
      const body = await result.json().catch(() => ({}));
      setSupplierError(body?.error ?? "Supplier could not be saved.");
      return;
    }
    const body = await result.json() as { supplier: { id: string; name: string; contactName: string | null; email: string | null; phone: string | null; isActive: boolean } };
    setSuppliers((current) => [body.supplier, ...current]);
    setSupplierName("");
    setSupplierContactName("");
    setSupplierEmail("");
    setSupplierPhone("");
  };

  const updateSupplier = async (id: string, name: string, contactName: string, email: string, phone: string) => {
    setSupplierError(null);
    const result = await fetch(`/api/suppliers/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, contactName: contactName || null, email: email || null, phone: phone || null }),
    });
    if (result.status === 401) {
      setSuppliers([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setSupplierError("You are not authorized to manage suppliers.");
      return;
    }
    if (!result.ok) {
      setSupplierError("Supplier could not be updated.");
      return;
    }
    const body = await result.json() as { supplier: { id: string; name: string; contactName: string | null; email: string | null; phone: string | null; isActive: boolean } };
    setSuppliers((current) => current.map((item) => (item.id === body.supplier.id ? body.supplier : item)));
  };

  const addReorderRule = async () => {
    if (!reorderRuleProductId.trim() || !reorderRuleBranchId.trim() || !reorderRuleWarehouseId.trim()) return;
    setReorderRuleError(null);
    const result = await fetch("/api/reorder-rules", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        productId: reorderRuleProductId,
        branchId: reorderRuleBranchId,
        warehouseId: reorderRuleWarehouseId,
        minQuantity: Number(reorderRuleMinQuantity) || 0,
        reorderQuantity: Number(reorderRuleReorderQuantity) || 0,
      }),
    });
    if (result.status === 401) {
      setReorderRules([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setReorderRules([]);
      setReorderRuleError("You are not authorized to create reorder rules.");
      return;
    }
    if (!result.ok) {
      const body = await result.json().catch(() => ({}));
      setReorderRuleError(body?.error ?? "Reorder rule could not be saved.");
      return;
    }
    const body = await result.json() as { reorderRule: { id: string; productId: string; branchId: string; warehouseId: string; minQuantity: number; reorderQuantity: number; isActive: boolean } };
    setReorderRules((current) => [body.reorderRule, ...current]);
    setReorderRuleProductId("");
    setReorderRuleBranchId("");
    setReorderRuleWarehouseId("");
    setReorderRuleMinQuantity("10");
    setReorderRuleReorderQuantity("50");
  };

  const updateReorderRule = async (id: string, productId: string, branchId: string, warehouseId: string, minQuantity: number, reorderQuantity: number) => {
    setReorderRuleError(null);
    const result = await fetch(`/api/reorder-rules/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId, branchId, warehouseId, minQuantity, reorderQuantity }),
    });
    if (result.status === 401) {
      setReorderRules([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setReorderRuleError("You are not authorized to manage reorder rules.");
      return;
    }
    if (!result.ok) {
      setReorderRuleError("Reorder rule could not be updated.");
      return;
    }
    const body = await result.json() as { reorderRule: { id: string; productId: string; branchId: string; warehouseId: string; minQuantity: number; reorderQuantity: number; isActive: boolean } };
    setReorderRules((current) => current.map((item) => (item.id === body.reorderRule.id ? body.reorderRule : item)));
  };

  const addPurchaseReceipt = async () => {
    if (!purchaseReceiptWarehouseId.trim() || !purchaseReceiptBranchId.trim() || !purchaseReceiptProductId.trim()) return;
    setPurchaseReceiptError(null);
    const result = await fetch("/api/purchase-receipts", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        supplierId: purchaseReceiptSupplierId || null,
        warehouseId: purchaseReceiptWarehouseId,
        branchId: purchaseReceiptBranchId,
        receivedBy: purchaseReceiptReceivedBy || null,
        notes: purchaseReceiptNotes || null,
        items: [
          { productId: purchaseReceiptProductId, quantity: Number(purchaseReceiptQuantity) || 1 },
        ],
      }),
    });
    if (result.status === 401) {
      setPurchaseReceipts([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setPurchaseReceipts([]);
      setPurchaseReceiptError("You are not authorized to create purchase receipts.");
      return;
    }
    if (!result.ok) {
      const body = await result.json().catch(() => ({}));
      setPurchaseReceiptError(body?.error ?? "Purchase receipt could not be saved.");
      return;
    }
    const body = await result.json() as { purchaseReceipt: { id: string; supplierId: string | null; warehouseId: string; branchId: string; receivedBy: string | null; receivedAt: string; notes: string | null; lineItems: Array<{ id: string; productId: string; quantity: number }> } };
    setPurchaseReceipts((current) => [body.purchaseReceipt, ...current]);
    setPurchaseReceiptSupplierId("");
    setPurchaseReceiptWarehouseId("");
    setPurchaseReceiptBranchId("");
    setPurchaseReceiptReceivedBy("");
    setPurchaseReceiptNotes("");
    setPurchaseReceiptProductId("");
    setPurchaseReceiptQuantity("1");
  };

  const addStockTransfer = async () => {
    if (!stockTransferFromWarehouseId.trim() || !stockTransferToWarehouseId.trim() || !stockTransferFromBranchId.trim() || !stockTransferToBranchId.trim() || !stockTransferProductId.trim()) return;
    setStockTransferError(null);
    const result = await fetch("/api/stock-transfers", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fromWarehouseId: stockTransferFromWarehouseId,
        toWarehouseId: stockTransferToWarehouseId,
        fromBranchId: stockTransferFromBranchId,
        toBranchId: stockTransferToBranchId,
        items: [
          { productId: stockTransferProductId, quantity: Number(stockTransferQuantity) || 1 },
        ],
      }),
    });
    if (result.status === 401) {
      setStockTransfers([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setStockTransfers([]);
      setStockTransferError("You are not authorized to create stock transfers.");
      return;
    }
    if (!result.ok) {
      const body = await result.json().catch(() => ({}));
      setStockTransferError(body?.error ?? "Stock transfer could not be saved.");
      return;
    }
    const body = await result.json() as { stockTransfer: { id: string; fromWarehouseId: string; toWarehouseId: string; fromBranchId: string; toBranchId: string; status: string; notes: string | null; lineItems: Array<{ id: string; productId: string; quantity: number }> } };
    setStockTransfers((current) => [body.stockTransfer, ...current]);
    setStockTransferFromWarehouseId("");
    setStockTransferToWarehouseId("");
    setStockTransferFromBranchId("");
    setStockTransferToBranchId("");
    setStockTransferProductId("");
    setStockTransferQuantity("1");
  };

  const addStockAdjustment = async () => {
    if (!stockAdjustmentBranchId.trim() || !stockAdjustmentProductId.trim()) return;
    setStockAdjustmentError(null);
    const result = await fetch("/api/stock-adjustments", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        branchId: stockAdjustmentBranchId,
        direction: stockAdjustmentDirection,
        items: [
          { productId: stockAdjustmentProductId, quantity: Number(stockAdjustmentQuantity) || 1 },
        ],
      }),
    });
    if (result.status === 401) {
      setStockAdjustments([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setStockAdjustments([]);
      setStockAdjustmentError("You are not authorized to create stock adjustments.");
      return;
    }
    if (!result.ok) {
      const body = await result.json().catch(() => ({}));
      setStockAdjustmentError(body?.error ?? "Stock adjustment could not be saved.");
      return;
    }
    const body = await result.json() as { stockAdjustment: { id: string; branchId: string; direction: string; notes: string | null; lineItems: Array<{ id: string; productId: string; quantity: number }> } };
    setStockAdjustments((current) => [body.stockAdjustment, ...current]);
    setStockAdjustmentBranchId("");
    setStockAdjustmentDirection("IN");
    setStockAdjustmentProductId("");
    setStockAdjustmentQuantity("1");
  };

  const addStaff = async () => {
    if (!staffName.trim()) return;
    setStaffError(null);
    const result = await fetch("/api/staff", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: staffName,
        email: null,
        phone: null,
        branchId: null,
        isActive: true,
      }),
    });
    if (result.status === 401) {
      setStaff([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setStaffError("You are not authorized to manage staff.");
      return;
    }
    if (!result.ok) {
      setStaffError("Staff member could not be saved.");
      return;
    }
    const body = await result.json() as { staff: StaffRecord };
    setStaff((current) => [body.staff, ...current]);
    setStaffName("");
  };

  const updateStaff = async (id: string, displayName: string) => {
    setStaffError(null);
    const result = await fetch(`/api/staff/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName }),
    });
    if (result.status === 401) {
      setStaff([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setStaffError("You are not authorized to manage staff.");
      return;
    }
    if (!result.ok) {
      setStaffError("Staff member could not be updated.");
      return;
    }
    const body = await result.json() as { staff: StaffRecord };
    setStaff((current) => current.map((item) => (item.id === body.staff.id ? body.staff : item)));
  };

  const deleteStaff = async (id: string) => {
    setStaffError(null);
    const result = await fetch(`/api/staff/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (result.status === 401) {
      setStaff([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setStaffError("You are not authorized to manage staff.");
      return;
    }
    if (!result.ok) {
      setStaffError("Staff member could not be deleted.");
      return;
    }
    setStaff((current) => current.filter((item) => item.id !== id));
  };

  const addAttendance = async () => {
    if (!attendanceStaffId.trim() || !attendanceCheckIn.trim()) return;
    setAttendanceError(null);
    const result = await fetch("/api/attendance", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        staffId: attendanceStaffId,
        checkInAt: attendanceCheckIn,
        checkOutAt: attendanceCheckOut || null,
        status: attendanceStatus || null,
        notes: attendanceNotes || null,
      }),
    });
    if (result.status === 401) {
      setAttendance([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setAttendanceError("You are not authorized to record attendance.");
      return;
    }
    if (!result.ok) {
      setAttendanceError("Attendance could not be saved.");
      return;
    }
    const body = await result.json() as { attendance: { id: string; staffId: string; checkInAt: string; checkOutAt: string | null; status: string | null; notes: string | null } };
    setAttendance((current) => [body.attendance, ...current]);
    setAttendanceStaffId("");
    setAttendanceCheckIn(new Date().toISOString());
    setAttendanceCheckOut("");
    setAttendanceStatus("");
    setAttendanceNotes("");
  };

  const checkOutAttendance = async (attendanceId: string) => {
    setAttendanceError(null);
    const result = await fetch(`/api/attendance/${attendanceId}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        checkOutAt: new Date().toISOString(),
      }),
    });
    if (result.status === 401) {
      setAttendance([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setAttendanceError("You are not authorized to update attendance.");
      return;
    }
    if (!result.ok) {
      setAttendanceError("Attendance could not be updated.");
      return;
    }
    const body = (await result.json()) as {
      attendance: { id: string; staffId: string; checkInAt: string; checkOutAt: string | null; status: string | null };
    };
    setAttendance((current) =>
      current.map((record) => (record.id === attendanceId ? { ...record, checkOutAt: body.attendance.checkOutAt } : record)),
    );
  };

  const updateAttendance = async (attendanceId: string, status: string, notes: string) => {
    setAttendanceError(null);
    const result = await fetch(`/api/attendance/${attendanceId}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status: status || null,
        notes: notes || null,
      }),
    });
    if (result.status === 401) {
      setAttendance([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setAttendanceError("You are not authorized to update attendance.");
      return;
    }
    if (!result.ok) {
      setAttendanceError("Attendance could not be updated.");
      return;
    }
    const body = (await result.json()) as {
      attendance: { id: string; staffId: string; checkInAt: string; checkOutAt: string | null; status: string | null };
    };
    setAttendance((current) =>
      current.map((record) => (record.id === attendanceId ? { ...record, status: body.attendance.status } : record)),
    );
  };

  const deleteAttendance = async (attendanceId: string) => {
    setAttendanceError(null);
    const result = await fetch(`/api/attendance/${attendanceId}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (result.status === 401) {
      setAttendance([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setAttendanceError("You are not authorized to delete attendance.");
      return;
    }
    if (!result.ok) {
      setAttendanceError("Attendance could not be deleted.");
      return;
    }
    setAttendance((current) => current.filter((record) => record.id !== attendanceId));
  };

  const addAppointment = async () => {
    if (!appointmentCustomer || !appointmentService) return;
    setAppointmentError(null);
    const selectedService = services.find((service) => service.id === appointmentService);
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + (selectedService?.durationMinutes || 60) * 60 * 1000);
    const result = await fetch("/api/appointments", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customerId: appointmentCustomer,
        serviceId: appointmentService,
        staffId: appointmentStaff || null,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        status: "Booked",
        notes: null,
      }),
    });
    if (result.status === 401) {
      setAppointments([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setAppointments([]);
      setAppointmentError("You are not authorized to create appointments.");
      return;
    }
    if (!result.ok) {
      setAppointmentError("Appointment could not be saved.");
      return;
    }
    const body = (await result.json()) as {
      appointment: {
        id: string;
        tenantId: string;
        customerId: string;
        serviceId: string;
        startsAt: string;
        endsAt: string;
        status: string;
      };
    };
    setAppointments((current) => [toLocalAppointment(body.appointment), ...current]);
  };

  const advanceAppointment = (index: number) => {
    setAppointments((current) => {
      const item = current[index];
      const currentStatus = item.status;
      const nextStatus = APPOINTMENT_STATUS_ORDER[
        APPOINTMENT_STATUS_ORDER.indexOf(currentStatus) + 1
      ] ?? currentStatus;

      return current.map((appointment, appointmentIndex) =>
        appointmentIndex === index
          ? transitionAppointmentStatus(appointment, nextStatus)
          : appointment,
      );
    });
  };

  const updateAppointment = async (index: number, startsAt: string) => {
    setAppointmentError(null);
    const item = appointments[index];
    const result = await fetch(`/api/appointments/${item.id}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        startsAt,
      }),
    });
    if (result.status === 401) {
      setAppointments([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setAppointmentError("You are not authorized to update appointments.");
      return;
    }
    if (!result.ok) {
      setAppointmentError("Appointment could not be updated.");
      return;
    }
    const body = (await result.json()) as {
      appointment: {
        id: string;
        tenantId: string;
        customerId: string;
        serviceId: string;
        startsAt: string;
        endsAt: string;
        status: string;
      };
    };
    setAppointments((current) =>
      current.map((appointment, appointmentIndex) =>
        appointmentIndex === index ? toLocalAppointment(body.appointment) : appointment,
      ),
    );
  };

  const deleteAppointment = async (appointmentId: string) => {
    setAppointmentError(null);
    const result = await fetch(`/api/appointments/${appointmentId}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (result.status === 401) {
      setAppointments([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setAppointmentError("You are not authorized to delete appointments.");
      return;
    }
    if (!result.ok) {
      setAppointmentError("Appointment could not be deleted.");
      return;
    }
    setAppointments((current) => current.filter((appointment) => appointment.id !== appointmentId));
  };

  const addBusinessUnit = async () => {
    if (!businessUnitName.trim() || !businessUnitSlug.trim()) return;
    setBusinessUnitError(null);
    const result = await fetch("/api/business-units", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: businessUnitName,
        slug: businessUnitSlug,
        isActive: true,
      }),
    });
    if (result.status === 401) {
      setBusinessUnits([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setBusinessUnitError("You are not authorized to create business units.");
      return;
    }
    if (!result.ok) {
      setBusinessUnitError("Business unit could not be saved.");
      return;
    }
    const body = (await result.json()) as { businessUnit: { id: string; name: string; slug: string; isActive: boolean } };
    setBusinessUnits((current) => [body.businessUnit, ...current]);
    setBusinessUnitName("");
    setBusinessUnitSlug("");
  };

  const addBranch = async () => {
    if (!branchName.trim() || !branchSlug.trim() || !branchBusinessUnitId.trim()) return;
    setBranchError(null);
    const result = await fetch("/api/branches", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        businessUnitId: branchBusinessUnitId,
        name: branchName,
        slug: branchSlug,
        isActive: true,
      }),
    });
    if (result.status === 401) {
      setBranches([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setBranchError("You are not authorized to create branches.");
      return;
    }
    if (!result.ok) {
      setBranchError("Branch could not be saved.");
      return;
    }
    const body = (await result.json()) as { branch: { id: string; businessUnitId: string; name: string; slug: string; isActive: boolean } };
    setBranches((current) => [body.branch, ...current]);
    setBranchName("");
    setBranchSlug("");
    setBranchBusinessUnitId("");
  };

  const navigationSections = buildSidebarSections(visibleTabs, activeTab, setActiveTab);
  const todayKey = new Date().toISOString().split("T")[0];
  const todayAppointments = appointments.filter((appointment) => appointment.startsAt.startsWith(todayKey));
  const todaysAttendance = attendance.filter((entry) => entry.checkInAt.startsWith(todayKey));
  const totalRevenueCents = invoices.reduce((sum, invoice) => sum + invoice.totalCents, 0);
  const paidRevenueCents = invoices.reduce((sum, invoice) => sum + (invoice.paidCents ?? 0), 0);
  const openInvoiceCount = invoices.filter((invoice) => (invoice.paidCents ?? 0) < invoice.totalCents).length;
  const activeBranchCount = branches.filter((branch) => branch.isActive).length;
  const activeStaffCount = staff.filter((member) => member.isActive).length;
  const activeMembershipCount = memberships.filter((membership) => membership.status?.toLowerCase() === "active").length;
  const activeServiceCount = services.filter((service) => service.isActive).length;
  const activePackageCount = packages.filter((pkg) => pkg.isActive).length;
  const branchContextLabel = activeBranchCount > 0 ? `${activeBranchCount} active branch${activeBranchCount === 1 ? "" : "es"}` : "Branch context pending";
  const dashboardSubtitle = `${effectiveRole ? effectiveRole.roleName : "Operations"} workspace ?? ${branchContextLabel}`;
  const loadedModuleCount = [customers.length, appointments.length, invoices.length, lowStockItems.length, memberships.length, staff.length, branches.length].filter((count) => count > 0).length;
  if (authenticated === null) {
    return null;
  }

  if (!authenticated) {
    if (passwordResetMode === "request") {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[#080807] px-4 py-12 text-[#f5f1e6]">
          <div className="w-full max-w-md rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[#0d0c0a] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
            <div className="mb-6">
              <p className="text-xs font-semibold tracking-[0.22em] text-[#d4af37]">X NAIL</p>
              <h1 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.04em] text-[#f5f1e6]">Reset password</h1>
            </div>
            <form className="space-y-4" onSubmit={handleRequestReset}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#a39a86]">Email</span>
                <input type="email" name="email" autoComplete="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} required className="premium-input" />
              </label>
              {resetError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] px-3 py-2 text-sm text-[#d1554a]">{resetError}</div> : null}
              {resetMessage ? <div className="rounded-xl border border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.08)] px-3 py-2 text-sm text-[#d4af37]">{resetMessage}</div> : null}
              <button type="submit" disabled={isResetting} className="premium-btn-primary w-full py-3">{isResetting ? "Sending..." : "Send reset link"}</button>
              <button type="button" onClick={() => { setPasswordResetMode("login"); setResetError(null); setResetMessage(null); }} className="w-full text-center text-sm text-[#a39a86] underline-offset-2 hover:underline">Back to sign in</button>
            </form>
          </div>
        </main>
      );
    }

    if (passwordResetMode === "reset") {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[#080807] px-4 py-12 text-[#f5f1e6]">
          <div className="w-full max-w-md rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[#0d0c0a] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
            <div className="mb-6">
              <p className="text-xs font-semibold tracking-[0.22em] text-[#d4af37]">X NAIL</p>
              <h1 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.04em] text-[#f5f1e6]">Set new password</h1>
            </div>
            <form className="space-y-4" onSubmit={handleResetPassword}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#a39a86]">Reset token</span>
                <input type="text" name="token" autoComplete="off" value={resetToken} onChange={(event) => setResetToken(event.target.value)} required className="premium-input" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#a39a86]">New password</span>
                <input type="password" name="newPassword" autoComplete="new-password" value={resetNewPassword} onChange={(event) => setResetNewPassword(event.target.value)} required minLength={8} className="premium-input" />
              </label>
              {resetError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] px-3 py-2 text-sm text-[#d1554a]">{resetError}</div> : null}
              {resetMessage ? <div className="rounded-xl border border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.08)] px-3 py-2 text-sm text-[#d4af37]">{resetMessage}</div> : null}
              <button type="submit" disabled={isResetting} className="premium-btn-primary w-full py-3">{isResetting ? "Resetting..." : "Reset password"}</button>
              <button type="button" onClick={() => { setPasswordResetMode("login"); setResetError(null); setResetMessage(null); }} className="w-full text-center text-sm text-[#a39a86] underline-offset-2 hover:underline">Back to sign in</button>
            </form>
          </div>
        </main>
      );
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080807] px-4 py-12 text-[#f5f1e6]">
        <div className="w-full max-w-md rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[#0d0c0a] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
          <div className="mb-6">
            <p className="text-xs font-semibold tracking-[0.22em] text-[#d4af37]">X NAIL</p>
            <h1 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.04em] text-[#f5f1e6]">Operations login</h1>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#a39a86]">Email</span>
              <input
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="premium-input"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#a39a86]">Password</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="premium-input"
              />
            </label>

            {loginError ? (
              <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] px-3 py-2 text-sm text-[#d1554a]">
                {loginError}
              </div>
            ) : null}

            {resetMessage ? (
              <div className="rounded-xl border border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.08)] px-3 py-2 text-sm text-[#d4af37]">
                {resetMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isAuthenticating}
              className="premium-btn-primary w-full py-3"
            >
              {isAuthenticating ? "Signing in..." : "Sign in"}
            </button>

            <button
              type="button"
              onClick={() => { setPasswordResetMode("request"); setResetError(null); setResetMessage(null); setResetEmail(email); }}
              className="w-full text-center text-sm text-[#a39a86] underline-offset-2 hover:underline"
            >
              Forgot password?
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#080807] text-[#f5f1e6]">
      <AppHeader
        eyebrow="X Nail ERP"
        title={activeTab}
        subtitle={dashboardSubtitle}
        commandContent={(
          <div className="flex h-11 items-center gap-3 rounded-2xl border border-[rgba(212,175,55,0.14)] bg-[#0d0c0a] px-4 text-sm text-[#7a7266] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <svg className="h-4 w-4 shrink-0 text-[#d4af37]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m21 21-4.35-4.35" /><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z" /></svg>
            <span className="truncate">Command center preview</span>
            <span className="ml-auto rounded-md border border-[rgba(212,175,55,0.12)] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[#a39a86]">UI</span>
          </div>
        )}
        statusContent={effectiveRole ? <span className="premium-badge-success">{`${effectiveRole.roleName} dashboard`}</span> : <span className="premium-badge">Operations</span>}
        rightContent={(
          <>
            {userProfile?.displayName ? <span className="max-w-[12rem] truncate text-sm text-[#a39a86]">{userProfile.displayName}</span> : null}
            {userRoles.length > 1 ? <span className="premium-badge-warning">{userRoles.length} roles</span> : null}
            <button type="button" className="premium-btn-secondary px-3 py-2 text-xs" onClick={handleLogout}>Sign out</button>
          </>
        )}
      />

      {profileError ? (
        <div className="mx-auto w-full max-w-[112rem] px-4 pt-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] px-3 py-2 text-sm text-[#d1554a]">{profileError}</div>
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-[112rem] items-start gap-4 px-4 py-5 sm:gap-6 sm:px-6 sm:py-7 lg:px-8">
        <AppSidebar
          brandName="X Nail"
          brandSubtitle="ERP Preview"
          sections={navigationSections}
          workspaceLabel={effectiveRole ? `${effectiveRole.roleName} access` : "Operations access"}
        />

        <div className="dashboard-enter min-w-0 flex-1 pb-12">
        {activeTab === "Overview" ? (
          <section className="space-y-6">
            <div className="dashboard-card-enter overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.16)] bg-[#0d0c0a] shadow-[0_24px_80px_rgba(0,0,0,0.26)]">
              <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[1.45fr_0.55fr]">
                <div>
                  <div className="inline-flex rounded-full border border-[rgba(212,175,55,0.18)] bg-[rgba(212,175,55,0.07)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d4af37]">Live tenant preview</div>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#f5f1e6] sm:text-3xl">Operations dashboard</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#a39a86]">
                    Compact operating view for the current X Nail workspace. Values are drawn from already-loaded application state and remain permission-scoped to the signed-in user.
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-[rgba(212,175,55,0.10)] bg-[#12110f] p-4">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-[#7a7266]">Signed in as</div>
                      <div className="mt-2 truncate text-sm font-semibold text-[#f5f1e6]">{userProfile?.displayName ?? userProfile?.email ?? "Workspace user"}</div>
                    </div>
                    <div className="rounded-xl border border-[rgba(212,175,55,0.10)] bg-[#12110f] p-4">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-[#7a7266]">Effective role</div>
                      <div className="mt-2 truncate text-sm font-semibold text-[#f5f1e6]">{effectiveRole?.roleName ?? "Operations"}</div>
                    </div>
                    <div className="rounded-xl border border-[rgba(212,175,55,0.10)] bg-[#12110f] p-4">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-[#7a7266]">Workspace</div>
                      <div className="mt-2 truncate text-sm font-semibold text-[#f5f1e6]">{branchContextLabel}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[rgba(212,175,55,0.12)] bg-[#090908] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a39a86]">Platform state</div>
                      <div className="mt-2 text-3xl font-semibold text-[#d4af37]">{loadedModuleCount}</div>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(212,175,55,0.18)] bg-[rgba(212,175,55,0.08)] text-[#d4af37]">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 5h7v7H4z" /><path d="M13 5h7v7h-7z" /><path d="M4 14h7v5H4z" /><path d="M13 14h7v5h-7z" /></svg>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#a39a86]">Loaded data domains in this browser session. CRM detail modules remain lazy-loaded by active tab.</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {effectiveRole ? (
                effectiveRole.kpis.map((kpi) => (
                  <KpiCard key={kpi.key} definition={kpi} context={{ appointments, invoices, memberships, staff, customers, lowStockItems, branches, attendance, purchaseReceipts }} />
                ))
              ) : (
                <>
                  <SharedKpiCard title="Today" value={todayAppointments.length} subtitle="Appointments scheduled today" icon={<MetricGlyph type="appointmentsToday" />} tone="gold" meta="Live state" />
                  <SharedKpiCard title="Revenue" value={`₹${(totalRevenueCents / 100).toLocaleString("en-IN")}`} subtitle="Gross sales from loaded invoices" icon={<MetricGlyph type="revenue" />} tone="gold" meta="Live state" />
                  <SharedKpiCard title="Members" value={memberships.length} subtitle="Membership records loaded" icon={<MetricGlyph type="memberships" />} meta="Live state" />
                  <SharedKpiCard title="Staff" value={staff.length} subtitle="Staff records loaded" icon={<MetricGlyph type="staff" />} meta="Live state" />
                </>
              )}
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="dashboard-card-enter rounded-2xl border border-[rgba(212,175,55,0.14)] bg-[#12110f] p-5 shadow-[0_18px_54px_rgba(0,0,0,0.22)]">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-[#f5f1e6]">Today&apos;s floor</h3>
                  <span className="premium-badge">Operations</span>
                </div>
                <div className="mt-5 space-y-4">
                  <div className="flex items-center justify-between gap-4 border-b border-[rgba(212,175,55,0.08)] pb-3">
                    <span className="text-sm text-[#a39a86]">Appointments</span>
                    <span className="text-sm font-semibold text-[#f5f1e6]">{todayAppointments.length}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-[rgba(212,175,55,0.08)] pb-3">
                    <span className="text-sm text-[#a39a86]">Attendance check-ins</span>
                    <span className="text-sm font-semibold text-[#f5f1e6]">{todaysAttendance.length}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-[#a39a86]">Active services/packages</span>
                    <span className="text-sm font-semibold text-[#f5f1e6]">{activeServiceCount} / {activePackageCount}</span>
                  </div>
                </div>
              </div>

              <div className="dashboard-card-enter rounded-2xl border border-[rgba(212,175,55,0.14)] bg-[#12110f] p-5 shadow-[0_18px_54px_rgba(0,0,0,0.22)]">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-[#f5f1e6]">Billing posture</h3>
                  <span className="premium-badge">Loaded invoices</span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-[rgba(212,175,55,0.09)] bg-[#0d0c0a] p-3">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-[#7a7266]">Invoices</div>
                    <div className="mt-2 text-lg font-semibold text-[#f5f1e6]">{invoices.length}</div>
                  </div>
                  <div className="rounded-xl border border-[rgba(212,175,55,0.09)] bg-[#0d0c0a] p-3">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-[#7a7266]">Paid</div>
                    <div className="mt-2 text-lg font-semibold text-[#3fae6a]">₹{(paidRevenueCents / 100).toLocaleString("en-IN")}</div>
                  </div>
                  <div className="rounded-xl border border-[rgba(212,175,55,0.09)] bg-[#0d0c0a] p-3">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-[#7a7266]">Open</div>
                    <div className="mt-2 text-lg font-semibold text-[#e0a83b]">{openInvoiceCount}</div>
                  </div>
                </div>
              </div>

              <div className="dashboard-card-enter rounded-2xl border border-[rgba(212,175,55,0.14)] bg-[#12110f] p-5 shadow-[0_18px_54px_rgba(0,0,0,0.22)]">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-[#f5f1e6]">Network readiness</h3>
                  <span className="premium-badge">Scope</span>
                </div>
                <div className="mt-5 space-y-4">
                  <div className="flex items-center justify-between gap-4 border-b border-[rgba(212,175,55,0.08)] pb-3">
                    <span className="text-sm text-[#a39a86]">Active branches</span>
                    <span className="text-sm font-semibold text-[#f5f1e6]">{activeBranchCount}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-[rgba(212,175,55,0.08)] pb-3">
                    <span className="text-sm text-[#a39a86]">Active staff</span>
                    <span className="text-sm font-semibold text-[#f5f1e6]">{activeStaffCount}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-[#a39a86]">Active memberships</span>
                    <span className="text-sm font-semibold text-[#f5f1e6]">{activeMembershipCount}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-2xl border border-[rgba(212,175,55,0.14)] bg-[#12110f] p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-[#f5f1e6]">Inventory signals</h3>
                  <span className={lowStockItems.length > 0 ? "premium-badge-warning" : "premium-badge-success"}>{lowStockItems.length > 0 ? "Attention" : "Clear"}</span>
                </div>
                <div className="mt-4 text-sm leading-6 text-[#a39a86]">
                  {lowStockItems.length > 0 ? `${lowStockItems.length} low-stock item${lowStockItems.length === 1 ? "" : "s"} currently loaded for review.` : "No loaded low-stock alerts in the current session."}
                </div>
              </div>

              <div className="rounded-2xl border border-[rgba(212,175,55,0.14)] bg-[#12110f] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-[#f5f1e6]">Quick access</h3>
                    <p className="mt-1 text-sm text-[#a39a86]">Visible actions mirror the current permission-filtered navigation.</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(["Appointments", "Customers", "Billing", "Inventory", "Reports"] as const).filter((tab) => visibleTabs.includes(tab)).map((tab) => (
                    <button key={tab} type="button" aria-label={`Open ${tab}`} onClick={() => setActiveTab(tab)} className="rounded-xl border border-[rgba(212,175,55,0.14)] bg-[#0d0c0a] px-3 py-2 text-sm font-medium text-[#f5f1e6] transition-colors duration-200 hover:border-[rgba(212,175,55,0.32)] hover:bg-[#171511]">
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}
        {activeTab === "Customers" ? (
          <CrmWorkspace
            eyebrow="Customer intelligence"
            title="Customers"
            description="A permission-scoped customer workspace for loaded X Nail demo data, with visit context and invoicing history kept clearly separated from production ERP claims."
            stats={[
              { label: "Loaded", value: customers.length },
              { label: "Active", value: customers.filter((customer) => customer.isActive).length, tone: "success" },
              { label: "Selected", value: selectedCustomerId ? "1" : "None" },
            ]}
          >
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
              <CrmPanel title="Customer list" eyebrow="Directory" description="Select a customer to review their loaded appointment and invoice context.">
                <div className="space-y-3">
                  {isLoadingCustomers ? <div className="text-sm text-[#a39a86]">Loading customers...</div> : null}
                  {!isLoadingCustomers && customerError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{customerError}</div> : null}
                  {!isLoadingCustomers && !customerError && customers.length === 0 ? <CrmEmptyState title="No customers yet." description="Saved customers will appear here after they are created." /> : null}
                  {customers.map((customer) => {
                    const customerAppointments = appointments.filter((appointment) => appointment.customerId === customer.id);
                    const sortedAppointments = customerAppointments.slice().sort((a, b) => b.startsAt.localeCompare(a.startsAt));
                    const lastVisit = sortedAppointments.length > 0 ? sortedAppointments[0].startsAt : null;
                    const customerInvoiceList = invoices.filter((inv) => inv.customerId === customer.id);
                    const totalSpendCents = customerInvoiceList.reduce((sum, inv) => sum + inv.totalCents, 0);
                    const isSelected = selectedCustomerId === customer.id;
                    return (
                      <article
                        key={customer.id}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        onClick={() => setSelectedCustomerId(isSelected ? null : customer.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedCustomerId(isSelected ? null : customer.id);
                          }
                        }}
                        className={`cursor-pointer rounded-xl border p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(212,175,55,0.3)] hover:bg-[#1a1812] ${isSelected ? "border-[rgba(212,175,55,0.42)] bg-[rgba(212,175,55,0.07)] shadow-[0_12px_32px_rgba(0,0,0,0.18)]" : "border-[rgba(212,175,55,0.1)] bg-[#17150f]"}`}
                      >
                        {editingCustomerId === customer.id ? (
                          <div className="space-y-3" onClick={(event) => event.stopPropagation()}>
                            <input value={editingCustomerName} onChange={(event) => setEditingCustomerName(event.target.value)} placeholder="Customer name" aria-label="Customer name" className="premium-input" />
                            <input value={editingCustomerPhone} onChange={(event) => setEditingCustomerPhone(event.target.value)} placeholder="Phone" aria-label="Phone" className="premium-input" />
                            <div className="flex flex-wrap gap-2">
                              <button onClick={() => updateCustomer(customer.id)} className="premium-btn-primary px-3 py-2 text-sm">Save</button>
                              <button onClick={() => setEditingCustomerId(null)} className="premium-btn-secondary px-3 py-2 text-sm">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="font-medium text-[#f5f1e6]">{customer.name}</div>
                                <CrmBadge tone={customer.isActive ? "success" : "neutral"}>{customer.isActive ? "Active" : "Inactive"}</CrmBadge>
                              </div>
                              <div className="mt-1 text-sm text-[#a39a86]">{customer.phone || "No phone on file"}</div>
                              <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#807866]">
                                <span>Visits: {customerAppointments.length}</span>
                                <span>{lastVisit ? `Last: ${new Date(lastVisit).toLocaleDateString()}` : "No visits yet"}</span>
                                {totalSpendCents > 0 ? <span>Spent: Rs. {(totalSpendCents / 100).toLocaleString()}</span> : null}
                              </div>
                            </div>
                            <button onClick={(event) => { event.stopPropagation(); setEditingCustomerId(customer.id); setEditingCustomerName(customer.name); setEditingCustomerPhone(customer.phone || ""); }} className="premium-btn-secondary px-3 py-2 text-sm">Edit</button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </CrmPanel>

              <CrmPanel title={selectedCustomerId !== null ? "Customer profile" : "Add customer"} eyebrow={selectedCustomerId !== null ? "Context" : "Create"} description={selectedCustomerId !== null ? "Loaded visit and invoice history for the selected customer." : "Create a customer record using the existing approved customer API."}>
                {selectedCustomerId !== null ? (() => {
                  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
                  if (!selectedCustomer) return null;
                  const custAppts = appointments.filter((a) => a.customerId === selectedCustomerId).slice().sort((a, b) => b.startsAt.localeCompare(a.startsAt));
                  const custInvoices = invoices.filter((inv) => inv.customerId === selectedCustomerId);
                  const custTotalSpend = custInvoices.reduce((sum, inv) => sum + inv.totalCents, 0);
                  return (
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-xl font-semibold text-[#f5f1e6]">{selectedCustomer.name}</h4>
                          <div className="mt-2 space-y-1 text-sm text-[#a39a86]">
                            {selectedCustomer.phone ? <div>Phone: {selectedCustomer.phone}</div> : null}
                            {selectedCustomer.email ? <div>Email: {selectedCustomer.email}</div> : null}
                            {selectedCustomer.notes ? <div>Notes: {selectedCustomer.notes}</div> : null}
                            <div>Visits: {custAppts.length}{custTotalSpend > 0 ? ` - Total spend: Rs. ${(custTotalSpend / 100).toLocaleString()}` : ""}</div>
                          </div>
                        </div>
                        <button onClick={() => setSelectedCustomerId(null)} className="premium-btn-secondary px-3 py-2 text-xs">Close</button>
                      </div>
                      <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-1">
                        <div>
                          <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#d4af37]">Visit History</h4>
                          <div className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
                            {custAppts.length === 0 ? <CrmEmptyState title="No visits yet." /> : null}
                            {custAppts.map((appt) => {
                              const svc = services.find((s) => s.id === appt.serviceId);
                              const stf = staff.find((s) => s.id === appt.staffId);
                              return (
                                <div key={appt.id} className="rounded-lg border border-[rgba(212,175,55,0.08)] bg-[#17150f] p-3 text-xs">
                                  <div className="flex justify-between gap-3 text-[#f5f1e6]"><span>{svc?.name ?? "Service"}</span><span className="text-[#a39a86]">{new Date(appt.startsAt).toLocaleDateString()}</span></div>
                                  <div className="mt-1 text-[#a39a86]">{stf ? `Staff: ${stf.displayName}` : "Staff unassigned"} - {appt.status}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#d4af37]">Invoices</h4>
                          <div className="mt-2 max-h-44 space-y-2 overflow-y-auto pr-1">
                            {custInvoices.length === 0 ? <CrmEmptyState title="No invoices yet." /> : null}
                            {custInvoices.map((inv) => (<div key={inv.id} className="flex justify-between gap-3 rounded-lg border border-[rgba(212,175,55,0.08)] bg-[#17150f] p-3 text-xs"><span>{new Date(inv.issuedAt).toLocaleDateString()}</span><span className="font-semibold text-[#d4af37]">Rs. {(inv.totalCents / 100).toLocaleString()}</span></div>))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="space-y-3">
                    <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Customer name" aria-label="Customer name" className="premium-input" />
                    <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="Phone" aria-label="Phone" className="premium-input" />
                    <button onClick={addCustomer} className="premium-btn-primary w-full py-2.5 text-sm">Save customer</button>
                  </div>
                )}
              </CrmPanel>
            </div>
          </CrmWorkspace>
        ) : null}

        {activeTab === "Leads" ? (
          <CrmWorkspace eyebrow="Acquisition" title="Leads" description="A focused lead intake and conversion surface using the existing lead endpoints and loaded preview records." stats={[{ label: "Loaded", value: leads.length }, { label: "Active", value: leads.filter((lead) => lead.status === "ACTIVE").length, tone: "warning" }, { label: "Converted", value: leads.filter((lead) => lead.status === "CONVERTED").length, tone: "success" }]}>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
              <CrmPanel title="Lead pipeline" eyebrow="Queue" description="Track loaded leads and convert active records through the approved conversion endpoint.">
                <div className="space-y-3">
                  {isLoadingLeads ? <div className="text-sm text-[#a39a86]">Loading leads...</div> : null}
                  {!isLoadingLeads && leadError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{leadError}</div> : null}
                  {!isLoadingLeads && !leadError && leads.length === 0 ? <CrmEmptyState title="No leads yet." description="New lead records will appear in this queue." /> : null}
                  {leads.map((lead) => (<article key={lead.id} className="rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(212,175,55,0.3)] hover:bg-[#1a1812]"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div className="min-w-0"><div className="font-medium text-[#f5f1e6]">{lead.name}</div><div className="mt-1 text-sm text-[#a39a86]">{lead.email ?? "No email"} - {lead.phone ?? "No phone"}</div>{lead.source ? <div className="mt-2 text-xs text-[#807866]">Source: {lead.source}</div> : null}</div><div className="flex flex-wrap items-center gap-2"><CrmBadge tone={lead.status === "CONVERTED" ? "success" : "warning"}>{lead.status}</CrmBadge>{lead.status === "ACTIVE" ? (<button onClick={() => void convertLead(lead.id)} className="premium-btn-secondary px-3 py-2 text-xs">Convert</button>) : null}{lead.status === "CONVERTED" && lead.convertedToCustomerId ? <span className="text-xs text-[#807866]">Converted to customer</span> : null}</div></div></article>))}
                </div>
              </CrmPanel>
              <CrmPanel title="Add lead" eyebrow="Capture" description="Minimal intake fields only; no extra CRM workflow is introduced here.">
                <div className="space-y-3">
                  <input placeholder="Name" aria-label="Lead name" value={leadName} onChange={(e) => setLeadName(e.target.value)} className="premium-input w-full" />
                  <input placeholder="Email (optional)" aria-label="Lead email" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} className="premium-input w-full" />
                  <input placeholder="Phone (optional)" aria-label="Lead phone" value={leadPhone} onChange={(e) => setLeadPhone(e.target.value)} className="premium-input w-full" />
                  <input placeholder="Source (optional)" aria-label="Lead source" value={leadSource} onChange={(e) => setLeadSource(e.target.value)} className="premium-input w-full" />
                  <button onClick={() => void addLead()} className="premium-btn-primary w-full py-2">Add lead</button>
                </div>
              </CrmPanel>
            </div>
          </CrmWorkspace>
        ) : null}        {activeTab === "Pipeline" ? (
          <CrmWorkspace eyebrow="Revenue motion" title="Pipeline" description="Pipeline, stage, and opportunity controls remain backed by the existing CRM endpoints and preview data only." stats={[{ label: "Pipelines", value: pipelines.length }, { label: "Stages", value: stages.length }, { label: "Open", value: opportunities.filter((opp) => opp.status === "OPEN").length, tone: "warning" }]}>
            {opportunityError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{opportunityError}</div> : null}
            <div className="grid gap-5 xl:grid-cols-3">
              <CrmPanel title="Pipelines" eyebrow="Structure" description="Select a pipeline before managing its stages.">
                <div className="space-y-2">
                  {pipelines.length === 0 ? <CrmEmptyState title="No pipelines yet." /> : null}
                  {pipelines.map((p) => (<button key={p.id} onClick={() => void loadStagesForPipeline(p.id)} className={`block w-full rounded-lg border p-3 text-left text-sm transition-colors ${selectedPipelineId === p.id ? "border-[rgba(212,175,55,0.42)] bg-[rgba(212,175,55,0.09)] text-[#f5f1e6]" : "border-[rgba(212,175,55,0.1)] bg-[#17150f] text-[#d8d0bd] hover:bg-[rgba(212,175,55,0.05)]"}`}>{p.name}</button>))}
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row"><input placeholder="Pipeline name" aria-label="Pipeline name" value={pipelineName} onChange={(e) => setPipelineName(e.target.value)} className="premium-input flex-1" /><button onClick={() => void addPipeline()} className="premium-btn-primary px-4 py-2 text-sm">Add</button></div>
              </CrmPanel>
              <CrmPanel title="Stages" eyebrow="Flow" description="Stage ordering follows the existing position value.">
                <div className="space-y-2">
                  {!selectedPipelineId ? <CrmEmptyState title="Select a pipeline first." /> : null}
                  {selectedPipelineId && stages.length === 0 ? <CrmEmptyState title="No stages yet." /> : null}
                  {stages.slice().sort((a, b) => a.position - b.position).map((s) => (<div key={s.id} className="rounded-lg border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3 text-sm"><span className="mr-2 text-xs text-[#807866]">#{s.position}</span>{s.name}</div>))}
                </div>
                {selectedPipelineId ? (<div className="mt-4 flex flex-col gap-2 sm:flex-row"><input placeholder="Stage name" aria-label="Stage name" value={stageName} onChange={(e) => setStageName(e.target.value)} className="premium-input flex-1" /><button onClick={() => void addStage()} className="premium-btn-primary px-4 py-2 text-sm">Add</button></div>) : null}
              </CrmPanel>
              <CrmPanel title="New opportunity" eyebrow="Create" description="Creates an opportunity in the currently selected pipeline stage.">
                <div className="space-y-3"><input placeholder="Opportunity name" aria-label="Opportunity name" value={oppName} onChange={(e) => setOppName(e.target.value)} className="premium-input w-full" /><input placeholder="Value (Rs.)" aria-label="Opportunity value" type="number" value={oppValue} onChange={(e) => setOppValue(e.target.value)} className="premium-input w-full" /><select value={oppStageId} onChange={(e) => setOppStageId(e.target.value)} className="premium-input w-full" aria-label="Opportunity stage"><option value="">Select stage</option>{stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select><button onClick={() => void addOpportunity()} className="premium-btn-primary w-full py-2 text-sm">Create opportunity</button></div>
              </CrmPanel>
            </div>
            <CrmPanel title="Opportunities" eyebrow="Board" description="Loaded opportunities with status and stage controls.">
              <div className="space-y-3">{opportunities.length === 0 ? <CrmEmptyState title="No opportunities yet." /> : null}{opportunities.map((opp) => (<article key={opp.id} className="rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-4 transition duration-200 hover:border-[rgba(212,175,55,0.28)] hover:bg-[#1a1812]"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><div className="font-medium text-[#f5f1e6]">{opp.name}</div><div className="mt-1 text-sm text-[#a39a86]">{opp.pipeline?.name ?? "Unknown pipeline"} - Stage: {opp.stage?.name ?? "Unknown"}</div>{opp.valueCents > 0 ? <div className="mt-2 text-xs font-semibold text-[#d4af37]">Rs. {(opp.valueCents / 100).toLocaleString()}</div> : null}</div><div className="flex flex-wrap items-center gap-2"><CrmBadge tone={opp.status === "WON" ? "success" : opp.status === "LOST" ? "danger" : "warning"}>{opp.status}</CrmBadge>{selectedPipelineId && stages.length > 1 && opp.status === "OPEN" ? (<select value={opp.stageId} onChange={(e) => void moveOpportunity(opp.id, e.target.value)} className="premium-input min-w-[160px] py-2 text-xs" aria-label={`Move ${opp.name}`}>{stages.slice().sort((a, b) => a.position - b.position).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>) : null}</div></div></article>))}</div>
            </CrmPanel>
          </CrmWorkspace>
        ) : null}
        {activeTab === "Follow-ups" ? (
          <CrmWorkspace eyebrow="Retention" title="Follow-ups" description="Follow-up creation and completion stay within the existing CRM workflow and loaded task records." stats={[{ label: "Loaded", value: followups.length }, { label: "Pending", value: followups.filter((f) => f.status === "PENDING").length, tone: "warning" }, { label: "Completed", value: followups.filter((f) => f.status === "COMPLETED").length, tone: "success" }]}>
            {followupError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{followupError}</div> : null}
            <div className="grid gap-5 xl:grid-cols-[minmax(320px,0.75fr)_minmax(0,1.25fr)]"><CrmPanel title="New follow-up" eyebrow="Schedule" description="Creates a dated follow-up through the existing endpoint."><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><input placeholder="Follow-up title" aria-label="Follow-up title" value={followupTitle} onChange={(e) => setFollowupTitle(e.target.value)} className="premium-input" /><input type="datetime-local" aria-label="Follow-up due date" value={followupDueAt} onChange={(e) => setFollowupDueAt(e.target.value)} className="premium-input" /><button onClick={() => void addFollowup()} className="premium-btn-primary py-2 text-sm sm:col-span-2 xl:col-span-1">Add</button></div></CrmPanel><CrmPanel title="Follow-ups" eyebrow="Queue" description="Complete pending follow-ups without changing their underlying model."><div className="space-y-3">{followups.length === 0 ? <CrmEmptyState title="No follow-ups yet." /> : null}{followups.map((f) => (<article key={f.id} className="rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-4 transition duration-200 hover:border-[rgba(212,175,55,0.28)] hover:bg-[#1a1812]"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><div className="font-medium text-[#f5f1e6]">{f.title}</div><div className="mt-1 text-sm text-[#a39a86]">Due: {new Date(f.dueAt).toLocaleString()}</div>{f.notes ? <div className="mt-2 text-xs text-[#a39a86]">{f.notes}</div> : null}</div><div className="flex flex-wrap items-center gap-2"><CrmBadge tone={f.status === "COMPLETED" ? "success" : f.status === "CANCELLED" ? "danger" : "warning"}>{f.status}</CrmBadge>{f.status === "PENDING" ? <button onClick={() => void completeFollowup(f.id)} className="premium-btn-secondary px-3 py-2 text-xs">Complete</button> : null}</div></div></article>))}</div></CrmPanel></div>
          </CrmWorkspace>
        ) : null}
        {activeTab === "Communications" ? (
          <CrmWorkspace eyebrow="Client contact" title="Communications" description="Log and review communication records with clear channel and direction states, using the existing API contract." stats={[{ label: "Loaded", value: communications.length }, { label: "Inbound", value: communications.filter((c) => c.direction === "inbound").length, tone: "success" }, { label: "Outbound", value: communications.filter((c) => c.direction === "outbound").length, tone: "warning" }]}>
            {commError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{commError}</div> : null}
            <div className="grid gap-5 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]"><CrmPanel title="Log communication" eyebrow="Record" description="Adds a communication entry without sending messages or implying delivery integration."><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"><select value={commChannel} onChange={(e) => setCommChannel(e.target.value)} className="premium-input" aria-label="Communication channel"><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="sms">SMS</option><option value="phone">Phone</option><option value="in_person">In person</option><option value="other">Other</option></select><select value={commDirection} onChange={(e) => setCommDirection(e.target.value)} className="premium-input" aria-label="Communication direction"><option value="outbound">Outbound</option><option value="inbound">Inbound</option></select><input placeholder="Contact name (optional)" aria-label="Contact name" value={commContactName} onChange={(e) => setCommContactName(e.target.value)} className="premium-input" /><input placeholder="Subject (optional)" aria-label="Communication subject" value={commSubject} onChange={(e) => setCommSubject(e.target.value)} className="premium-input" /><textarea placeholder="Message body" aria-label="Message body" value={commBody} onChange={(e) => setCommBody(e.target.value)} className="premium-input sm:col-span-2 xl:col-span-1 2xl:col-span-2" rows={4} /><button onClick={() => void addCommunication()} className="premium-btn-primary px-3 py-2 text-sm sm:col-span-2 xl:col-span-1 2xl:col-span-2">Log communication</button></div></CrmPanel><CrmPanel title="Communication history" eyebrow="Timeline" description="Most recent loaded interactions are shown with channel and direction metadata."><div className="space-y-3">{communications.length === 0 ? <CrmEmptyState title="No communications yet." /> : null}{communications.map((c) => (<article key={c.id} className="rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-4 transition duration-200 hover:border-[rgba(212,175,55,0.28)] hover:bg-[#1a1812]"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap items-center gap-2"><CrmBadge tone={c.direction === "inbound" ? "success" : "warning"}>{c.direction}</CrmBadge><CrmBadge>{c.channel}</CrmBadge>{c.contactName ? <span className="text-sm text-[#a39a86]">{c.contactName}</span> : null}</div><div className="text-xs text-[#807866]">{new Date(c.communicatedAt).toLocaleString()}</div></div>{c.subject ? <div className="mt-3 font-medium text-sm text-[#f5f1e6]">{c.subject}</div> : null}<div className="mt-2 text-sm leading-6 text-[#a39a86]">{c.body}</div></article>))}</div></CrmPanel></div>
          </CrmWorkspace>
        ) : null}
        {activeTab === "Tags & Notes" ? (
          <CrmWorkspace eyebrow="Customer memory" title="Tags & Notes" description="Lightweight CRM memory surfaces for loaded tags, notes, and attachments. No new document storage behavior is introduced." stats={[{ label: "Tags", value: tags.length }, { label: "Notes", value: crmNotes.length }, { label: "Attachments", value: attachments.length }]}>
            {tagError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{tagError}</div> : null}
            <div className="grid gap-5 xl:grid-cols-3"><CrmPanel title="Tags" eyebrow="Segments" description="Create and review lightweight labels."><div className="space-y-2">{tags.length === 0 ? <CrmEmptyState title="No tags yet." /> : null}<div className="flex flex-wrap gap-2">{tags.map((t) => <CrmBadge key={t.id}>{t.name}</CrmBadge>)}</div></div><div className="mt-4 flex flex-col gap-2 sm:flex-row xl:flex-col 2xl:flex-row"><input placeholder="Tag name" aria-label="Tag name" value={tagName} onChange={(e) => setTagName(e.target.value)} className="premium-input flex-1" /><button onClick={() => void addTag()} className="premium-btn-primary px-4 py-2 text-sm">Add</button></div></CrmPanel><CrmPanel title="Notes" eyebrow="Internal" description="Keep short operational notes in the existing CRM notes surface."><div className="space-y-2">{crmNotes.length === 0 ? <CrmEmptyState title="No notes yet." /> : null}{crmNotes.slice(0, 10).map((n) => (<article key={n.id} className="rounded-lg border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3 text-sm"><div className="leading-6 text-[#f5f1e6]">{n.body}</div><div className="mt-2 text-xs text-[#807866]">{new Date(n.createdAt).toLocaleString()}</div></article>))}</div><div className="mt-4 space-y-2"><textarea placeholder="Add a note..." aria-label="Add a note" value={noteBody} onChange={(e) => setNoteBody(e.target.value)} className="premium-input w-full" rows={3} /><button onClick={() => void addCrmNote()} className="premium-btn-primary w-full py-2 text-sm">Add note</button></div></CrmPanel><CrmPanel title="Attachments" eyebrow="References" description="Save named links through the existing attachment endpoint."><div className="space-y-2">{attachments.length === 0 ? <CrmEmptyState title="No attachments yet." /> : null}{attachments.slice(0, 10).map((a) => (<article key={a.id} className="rounded-lg border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3 text-sm"><a href={a.url} target="_blank" rel="noopener noreferrer" className="font-medium text-[#d4af37] hover:underline">{a.name}</a>{a.mimeType ? <span className="ml-2 text-xs text-[#807866]">{a.mimeType}</span> : null}</article>))}</div><div className="mt-4 space-y-2"><input placeholder="File name" aria-label="File name" value={attName} onChange={(e) => setAttName(e.target.value)} className="premium-input w-full" /><input placeholder="File URL" aria-label="File URL" value={attUrl} onChange={(e) => setAttUrl(e.target.value)} className="premium-input w-full" /><button onClick={() => void addAttachment()} className="premium-btn-primary w-full py-2 text-sm">Add attachment</button></div></CrmPanel></div>
          </CrmWorkspace>
        ) : null}        {activeTab === "Services" ? (
          <OperationsWorkspace
            eyebrow="Operations catalog"
            title="Services"
            description="Manage the service menu used by appointments and billing. Prices are displayed in rupees while the existing API continues to store paise."
            stats={[
              { label: "Loaded", value: services.length },
              { label: "Active", value: services.filter((service) => service.isActive).length, tone: "success" },
              { label: "Inactive", value: services.filter((service) => !service.isActive).length },
            ]}
          >
            {serviceError ? <div role="alert" className="rounded-lg border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#e47a70]">{serviceError}</div> : null}
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]">
              <OperationsPanel eyebrow="Catalog" title="Service menu" description="Compact service records with their current duration, price, and availability.">
                {isLoadingServices ? (
                  <div className="space-y-2" aria-live="polite">
                    <div className="text-sm text-[#a39a86]">Loading services...</div>
                    {[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-lg bg-[#17150f]" />)}
                  </div>
                ) : !serviceError && services.length === 0 ? (
                  <OperationsEmptyState title="No services yet." description="Create the first service using the form alongside the catalog." />
                ) : (
                  <div className="divide-y divide-[rgba(212,175,55,0.1)]">
                    {services.map((service) => (
                      <article key={service.id} className="py-3 first:pt-0 last:pb-0">
                        {editingServiceId === service.id ? (
                          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px_auto] sm:items-end">
                            <label className="text-xs font-medium text-[#a39a86]">Service name<input aria-label="Edit service name" value={editingServiceName} onChange={(event) => setEditingServiceName(event.target.value)} placeholder="Service name" className="premium-input mt-1 w-full" /></label>
                            <label className="text-xs font-medium text-[#a39a86]">Price in paise<input aria-label="Edit service price in paise" inputMode="numeric" value={editingServicePrice} onChange={(event) => setEditingServicePrice(event.target.value)} placeholder="Price" className="premium-input mt-1 w-full" /></label>
                            <div className="flex gap-2">
                              <button onClick={() => updateService(service.id)} className="premium-btn-primary min-h-11 px-3 text-sm">Save</button>
                              <button onClick={() => setEditingServiceId(null)} className="premium-btn-secondary min-h-11 px-3 text-sm">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-medium text-[#f5f1e6]">{service.name}</h4>
                                <OperationsBadge tone={service.isActive ? "success" : "neutral"}>{service.isActive ? "Active" : "Inactive"}</OperationsBadge>
                              </div>
                              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#a39a86]">
                                <span>{service.durationMinutes} min</span>
                                {service.description ? <span className="truncate">{service.description}</span> : null}
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-4 sm:justify-end">
                              <div className="font-semibold tabular-nums text-[#f5f1e6]">₹{(service.priceCents / 100).toLocaleString("en-IN")}</div>
                              <button onClick={() => { setEditingServiceId(service.id); setEditingServiceName(service.name); setEditingServicePrice(String(service.priceCents)); }} className="premium-btn-secondary min-h-10 px-3 text-sm">Edit</button>
                            </div>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </OperationsPanel>
              <OperationsPanel eyebrow="Create" title="Add service" description="New services use the established 45-minute default and existing paise-based price contract.">
                <div className="space-y-4">
                  <label className="block text-xs font-medium text-[#a39a86]">Service name<input aria-label="Service name" value={serviceName} onChange={(event) => setServiceName(event.target.value)} placeholder="Service name" className="premium-input mt-1 w-full" /></label>
                  <label className="block text-xs font-medium text-[#a39a86]">Price in paise<input aria-label="Service price in paise" inputMode="numeric" value={servicePrice} onChange={(event) => setServicePrice(event.target.value)} placeholder="Price" className="premium-input mt-1 w-full" /></label>
                  <button onClick={addService} className="premium-btn-primary min-h-11 w-full px-4 text-sm">Save service</button>
                </div>
              </OperationsPanel>
            </div>
          </OperationsWorkspace>
        ) : null}

        {activeTab === "Packages" ? (
          <OperationsWorkspace
            eyebrow="Service bundles"
            title="Packages"
            description="Review package composition, price, validity, and availability without changing the current package rules."
            stats={[
              { label: "Loaded", value: packages.length },
              { label: "Active", value: packages.filter((pkg) => pkg.isActive).length, tone: "success" },
              { label: "Services linked", value: packages.reduce((total, pkg) => total + pkg.serviceIds.length, 0) },
            ]}
          >
            {packageError ? <div role="alert" className="rounded-lg border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#e47a70]">{packageError}</div> : null}
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]">
              <OperationsPanel eyebrow="Catalog" title="Package register" description="Administrative package records, not customer-facing offers.">
                {isLoadingPackages ? (
                  <div className="space-y-2" aria-live="polite"><div className="text-sm text-[#a39a86]">Loading packages...</div>{[0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-lg bg-[#17150f]" />)}</div>
                ) : !packageError && packages.length === 0 ? (
                  <OperationsEmptyState title="No packages yet." description="Create a package record using the form alongside the register." />
                ) : (
                  <div className="space-y-3">
                    {packages.map((pkg) => (
                      <article key={pkg.id} className="rounded-lg border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-4 transition-colors hover:border-[rgba(212,175,55,0.25)]">
                        {editingPackageId === pkg.id ? (
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <label className="flex-1 text-xs font-medium text-[#a39a86]">Package name<input aria-label="Edit package name" value={editingPackageName} onChange={(event) => setEditingPackageName(event.target.value)} placeholder="Package name" className="premium-input mt-1 w-full" /></label>
                            <div className="flex gap-2">
                              <button onClick={() => updatePackage(pkg.id)} className="premium-btn-primary min-h-11 px-3 text-sm">Save</button>
                              <button onClick={() => setEditingPackageId(null)} className="premium-btn-secondary min-h-11 px-3 text-sm">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-medium text-[#f5f1e6]">{pkg.name}</h4>
                                <OperationsBadge tone={pkg.isActive ? "success" : "neutral"}>{pkg.isActive ? "Active" : "Inactive"}</OperationsBadge>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {pkg.serviceIds.length === 0 ? <span className="text-sm text-[#807866]">No linked services</span> : pkg.serviceIds.map((serviceId) => <OperationsBadge key={serviceId}>{serviceMap.get(serviceId) ?? "Linked service"}</OperationsBadge>)}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="text-right text-sm text-[#a39a86]">
                                <div className="font-semibold tabular-nums text-[#f5f1e6]">{pkg.priceCents === null ? "Price not set" : `₹${(pkg.priceCents / 100).toLocaleString("en-IN")}`}</div>
                                <div>{pkg.durationDays === null ? "No validity set" : `${pkg.durationDays} days`}</div><div>{pkg.serviceIds.length} service(s)</div>
                              </div>
                              <button onClick={() => { setEditingPackageId(pkg.id); setEditingPackageName(pkg.name); }} className="premium-btn-secondary min-h-10 px-3 text-sm">Edit</button>
                            </div>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </OperationsPanel>
              <OperationsPanel eyebrow="Create" title="Add package" description="Creates the same empty package shell supported by the current API.">
                <div className="space-y-4">
                  <label className="block text-xs font-medium text-[#a39a86]">Package name<input aria-label="Package name" value={packageName} onChange={(event) => setPackageName(event.target.value)} placeholder="Package name" className="premium-input mt-1 w-full" /></label>
                  <button onClick={addPackage} className="premium-btn-primary min-h-11 w-full px-4 text-sm">Save package</button>
                </div>
              </OperationsPanel>
            </div>
          </OperationsWorkspace>
        ) : null}

        {activeTab === "Memberships" ? (
          <OperationsWorkspace
            eyebrow="Customer programs"
            title="Memberships"
            description="Manage customer package memberships using the existing dates, package relationships, and backend status values."
            stats={[
              { label: "Loaded", value: memberships.length },
              { label: "With end date", value: memberships.filter((membership) => membership.endsAt).length },
              { label: "Without status", value: memberships.filter((membership) => !membership.status).length, tone: "warning" },
            ]}
          >
            {membershipError ? <div role="alert" className="rounded-lg border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#e47a70]">{membershipError}</div> : null}
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
              <OperationsPanel eyebrow="Register" title="Membership records" description="Customer, package, lifecycle dates, and the persisted status for each loaded membership.">
                {isLoadingMemberships ? (
                  <div className="space-y-2" aria-live="polite"><div className="text-sm text-[#a39a86]">Loading memberships...</div>{[0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-lg bg-[#17150f]" />)}</div>
                ) : !membershipError && memberships.length === 0 ? (
                  <OperationsEmptyState title="No memberships yet." description="Create a customer membership using the form alongside the register." />
                ) : (
                  <div className="space-y-3">
                    {memberships.map((membership) => (
                      <article key={membership.id} className="rounded-lg border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-4">
                        {editingMembershipId === membership.id ? (
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <label className="flex-1 text-xs font-medium text-[#a39a86]">Membership status<input aria-label="Edit membership status" value={editingMembershipStatus} onChange={(event) => setEditingMembershipStatus(event.target.value)} placeholder="Status (optional)" className="premium-input mt-1 w-full" /></label>
                            <div className="flex gap-2">
                              <button onClick={() => updateMembership(membership.id)} className="premium-btn-primary min-h-11 px-3 text-sm">Save</button>
                              <button onClick={() => setEditingMembershipId(null)} className="premium-btn-secondary min-h-11 px-3 text-sm">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-medium text-[#f5f1e6]">{customerMap.get(membership.customerId) ?? `Customer ${membership.customerId}`}</h4>
                                <OperationsBadge tone={membership.status?.toLowerCase() === "active" ? "success" : membership.status?.toLowerCase() === "expired" ? "danger" : "neutral"}>{membership.status ?? "Status not set"}</OperationsBadge>
                              </div>
                              <div className="mt-1 text-sm text-[#a39a86]">{packageMap.get(membership.packageId) ?? `Package ${membership.packageId}`}</div>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                              <dl className="grid grid-cols-2 gap-x-5 text-sm">
                                <div><dt className="text-xs uppercase tracking-[0.1em] text-[#807866]">Started</dt><dd className="mt-1 tabular-nums text-[#d8d0bd]">{new Date(membership.startedAt).toLocaleDateString("en-IN")}</dd></div>
                                <div><dt className="text-xs uppercase tracking-[0.1em] text-[#807866]">Ends</dt><dd className="mt-1 tabular-nums text-[#d8d0bd]">{membership.endsAt ? new Date(membership.endsAt).toLocaleDateString("en-IN") : "Open"}</dd></div>
                              </dl>
                              <button onClick={() => { setEditingMembershipId(membership.id); setEditingMembershipStatus(membership.status ?? ""); }} className="premium-btn-secondary min-h-10 px-3 text-sm">Edit</button>
                            </div>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </OperationsPanel>
              <OperationsPanel eyebrow="Create" title="Add membership" description="Associate an existing customer and package. Optional end date and status remain unchanged API fields.">
                <div className="space-y-4">
                  <label className="block text-xs font-medium text-[#a39a86]">Customer<select aria-label="Membership customer" value={membershipCustomerId} onChange={(event) => setMembershipCustomerId(event.target.value)} className="premium-input mt-1 w-full"><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
                  <label className="block text-xs font-medium text-[#a39a86]">Package<select aria-label="Membership package" value={membershipPackageId} onChange={(event) => setMembershipPackageId(event.target.value)} className="premium-input mt-1 w-full"><option value="">Select package</option>{packages.map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.name}</option>)}</select></label>
                  <label className="block text-xs font-medium text-[#a39a86]">Start date<input aria-label="Membership start date" value={membershipStartedAt} onChange={(event) => setMembershipStartedAt(event.target.value)} placeholder="Start date (ISO)" className="premium-input mt-1 w-full" /></label>
                  <label className="block text-xs font-medium text-[#a39a86]">End date, optional<input aria-label="Membership end date" value={membershipEndsAt} onChange={(event) => setMembershipEndsAt(event.target.value)} placeholder="End date (optional, ISO)" className="premium-input mt-1 w-full" /></label>
                  <label className="block text-xs font-medium text-[#a39a86]">Status, optional<input aria-label="Membership status" value={membershipStatus} onChange={(event) => setMembershipStatus(event.target.value)} placeholder="Status (optional)" className="premium-input mt-1 w-full" /></label>
                  <button onClick={addMembership} className="premium-btn-primary min-h-11 w-full px-4 text-sm">Save membership</button>
                </div>
              </OperationsPanel>
            </div>
          </OperationsWorkspace>
        ) : null}
        {activeTab === "Staff" ? (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
              <h2 className="text-xl font-semibold">Staff roster</h2>
              <div className="mt-4 space-y-3">
                {isLoadingStaff ? <div className="text-sm text-[#a39a86]">Loading staff...</div> : null}
                {!isLoadingStaff && staffError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{staffError}</div> : null}
                {!isLoadingStaff && !staffError && staff.length === 0 ? <div className="text-sm text-[#a39a86]">No staff yet.</div> : null}
                {staff.map((member) => (
                  <div key={member.id} className="flex flex-col gap-2 rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                    {editingStaffId !== member.id ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{member.displayName}</div>
                          <div className="text-sm text-[#a39a86]">{member.branchId ?? "No branch"}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingStaffId(member.id);
                              setEditingStaffName(member.displayName);
                            }}
                            className="premium-btn-secondary px-3 py-1.5 text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteStaff(member.id)}
                            className="premium-btn-secondary px-3 py-1.5 text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          value={editingStaffName}
                          onChange={(event) => setEditingStaffName(event.target.value)}
                          placeholder="Staff name"
                          className="premium-input"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              if (!member.id) return;
                              await updateStaff(member.id, editingStaffName);
                              setEditingStaffId(null);
                            }}
                            className="premium-btn-primary px-3 py-1.5 text-xs"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingStaffId(null)}
                            className="premium-btn-secondary px-3 py-1.5 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
              <h2 className="text-xl font-semibold">Add staff</h2>
              <div className="mt-4 space-y-3">
                <input
                  value={staffName}
                  onChange={(event) => setStaffName(event.target.value)}
                  placeholder="Staff name"
                  className="premium-input"
                />
                <button
                  onClick={addStaff}
                  className="premium-btn-primary w-full py-2.5 text-sm"
                >
                  Save staff
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "Attendance" ? (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
              <h2 className="text-xl font-semibold">Attendance</h2>
              <div className="mt-4 space-y-3">
                {isLoadingAttendance ? <div className="text-sm text-[#a39a86]">Loading attendance...</div> : null}
                {!isLoadingAttendance && attendanceError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{attendanceError}</div> : null}
                {!isLoadingAttendance && !attendanceError && attendance.length === 0 ? <div className="text-sm text-[#a39a86]">No attendance records yet.</div> : null}
                {attendance.map((record) => (
                  <div key={record.id} className="flex flex-col gap-2 rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                    {editingAttendanceId !== record.id ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{staffMap.get(record.staffId) ?? `Staff ${record.staffId}`}</div>
                          <div className="text-sm text-[#a39a86]">{record.checkInAt}</div>
                        </div>
                        <div className="flex items-center gap-3 text-right text-sm text-[#a39a86]">
                          <div>
                            <div>{record.status ?? "—"}</div>
                            <div>{record.checkOutAt ?? "—"}</div>
                          </div>
                          {record.checkOutAt === null ? (
                            <button
                              onClick={() => checkOutAttendance(record.id)}
                              className="premium-btn-secondary px-3 py-1.5 text-xs"
                            >
                              Check out
                            </button>
                          ) : null}
                          <button
                            onClick={() => {
                              setEditingAttendanceId(record.id);
                              setEditingAttendanceStatus(record.status ?? "");
                              setEditingAttendanceNotes("");
                            }}
                            className="premium-btn-secondary px-3 py-1.5 text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteAttendance(record.id)}
                            className="premium-btn-secondary px-3 py-1.5 text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          value={editingAttendanceStatus}
                          onChange={(event) => setEditingAttendanceStatus(event.target.value)}
                          placeholder="Status"
                          className="premium-input"
                        />
                        <input
                          value={editingAttendanceNotes}
                          onChange={(event) => setEditingAttendanceNotes(event.target.value)}
                          placeholder="Notes"
                          className="premium-input"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              if (!record.id) return;
                              await updateAttendance(record.id, editingAttendanceStatus, editingAttendanceNotes);
                              setEditingAttendanceId(null);
                            }}
                            className="premium-btn-primary px-3 py-1.5 text-xs"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingAttendanceId(null)}
                            className="premium-btn-secondary px-3 py-1.5 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
              <h2 className="text-xl font-semibold">Record attendance</h2>
              <div className="mt-4 space-y-3">
                <select
                  value={attendanceStaffId}
                  onChange={(event) => setAttendanceStaffId(event.target.value)}
                  className="premium-input"
                >
                  <option value="">Select staff</option>
                  {staff.map((member, index) => (
                    <option key={`${member.displayName}-${index}`} value={`staff-${index + 1}`}>
                      {member.displayName}
                    </option>
                  ))}
                </select>
                <input
                  value={attendanceCheckIn}
                  onChange={(event) => setAttendanceCheckIn(event.target.value)}
                  placeholder="Check-in (ISO date)"
                  className="premium-input"
                />
                <input
                  value={attendanceCheckOut}
                  onChange={(event) => setAttendanceCheckOut(event.target.value)}
                  placeholder="Check-out (optional, ISO date)"
                  className="premium-input"
                />
                <input
                  value={attendanceStatus}
                  onChange={(event) => setAttendanceStatus(event.target.value)}
                  placeholder="Status (optional)"
                  className="premium-input"
                />
                <input
                  value={attendanceNotes}
                  onChange={(event) => setAttendanceNotes(event.target.value)}
                  placeholder="Notes (optional)"
                  className="premium-input"
                />
                <button
                  onClick={addAttendance}
                  className="premium-btn-primary w-full py-2.5 text-sm"
                >
                  Save attendance
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "Appointments" ? (
          <OperationsWorkspace
            eyebrow="Daily operations"
            title="Appointments"
            description="Review the loaded schedule, advance established appointment states, and create bookings through the current workflow."
            stats={[
              { label: "Loaded", value: appointments.length },
              { label: "Today", value: appointments.filter((appointment) => appointment.startsAt.startsWith(new Date().toISOString().split("T")[0])).length, tone: "success" },
              { label: "Completed", value: appointments.filter((appointment) => appointment.status === "Completed").length },
            ]}
          >
            {appointmentError ? <div role="alert" className="rounded-lg border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#e47a70]">{appointmentError}</div> : null}
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.5fr)]">
              <OperationsPanel eyebrow="Schedule" title="Appointment register" description="Loaded bookings are shown in start-time order supplied by the existing endpoint.">
                {isLoadingAppointments ? (
                  <div className="space-y-2" aria-live="polite"><div className="text-sm text-[#a39a86]">Loading appointments...</div>{[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-lg bg-[#17150f]" />)}</div>
                ) : !appointmentError && appointments.length === 0 ? (
                  <OperationsEmptyState title="No appointments yet." description="Book an appointment using the form alongside the schedule." />
                ) : (
                  <div className="space-y-3">
                    {appointments.map((appointment, index) => (
                      <article key={appointment.id || `${appointment.customerId}-${index}`} className="rounded-lg border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-4 transition-colors hover:border-[rgba(212,175,55,0.25)]">
                        {editingAppointmentIndex === index ? (
                          <div className="space-y-3">
                            <label className="block text-xs font-medium text-[#a39a86]">Start time (ISO)<input aria-label="Appointment start time" value={editingAppointmentStartsAt} onChange={(event) => setEditingAppointmentStartsAt(event.target.value)} placeholder="Start time (ISO)" className="premium-input mt-1 w-full" /></label>
                            <div className="flex gap-2">
                              <button onClick={async () => { if (editingAppointmentIndex === null) return; await updateAppointment(editingAppointmentIndex, editingAppointmentStartsAt); setEditingAppointmentIndex(null); }} className="premium-btn-primary min-h-11 px-3 text-sm">Save</button>
                              <button onClick={() => setEditingAppointmentIndex(null)} className="premium-btn-secondary min-h-11 px-3 text-sm">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-medium text-[#f5f1e6]">{customerMap.get(appointment.customerId) ?? `Customer ${appointment.customerId}`}</h4>
                                <OperationsBadge tone={appointment.status === "Completed" ? "success" : appointment.status === "In Service" ? "warning" : "neutral"}>Current: {appointment.status}</OperationsBadge>
                              </div>
                              <div className="mt-2 grid gap-1 text-sm text-[#a39a86] sm:grid-cols-2">
                                <span>{serviceMap.get(appointment.serviceId) ?? `Service ${appointment.serviceId}`}</span>
                                <span>{appointment.staffId ? staffMap.get(appointment.staffId) ?? `Staff ${appointment.staffId}` : "Staff not assigned"}</span>
                                <span className="tabular-nums"><span className="block text-[#d8d0bd]">{appointment.startsAt}</span><span className="block text-xs text-[#807866]">{new Date(appointment.startsAt).toLocaleString("en-IN")}</span></span>
                                <span className="tabular-nums">Ends {new Date(appointment.endsAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button onClick={() => advanceAppointment(index)} className="premium-btn-secondary min-h-10 px-3 text-xs" aria-label={`Advance ${customerMap.get(appointment.customerId) ?? "appointment"} status from ${appointment.status}`}>{appointment.status}</button>
                              <button onClick={() => { setEditingAppointmentIndex(index); setEditingAppointmentStartsAt(appointment.startsAt); }} className="premium-btn-secondary min-h-10 px-3 text-xs">Edit</button>
                              <button onClick={() => deleteAppointment(appointment.id)} className="min-h-10 rounded-lg border border-[rgba(209,85,74,0.3)] px-3 text-xs font-semibold text-[#e47a70] transition-colors hover:bg-[rgba(209,85,74,0.1)]">Delete</button>
                            </div>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </OperationsPanel>
              <OperationsPanel eyebrow="Create" title="Book appointment" description="Creates an immediate booking using the selected service duration and current timestamp, matching existing behavior.">
                <div className="space-y-4">
                  <label className="block text-xs font-medium text-[#a39a86]">Customer<select aria-label="Appointment customer" value={appointmentCustomer} onChange={(event) => setAppointmentCustomer(event.target.value)} className="premium-input mt-1 w-full">{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
                  <label className="block text-xs font-medium text-[#a39a86]">Service<select aria-label="Appointment service" value={appointmentService} onChange={(event) => setAppointmentService(event.target.value)} className="premium-input mt-1 w-full">{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
                  <label className="block text-xs font-medium text-[#a39a86]">Assigned staff<select aria-label="Appointment staff" value={appointmentStaff} onChange={(event) => setAppointmentStaff(event.target.value)} className="premium-input mt-1 w-full"><option value="">Select staff</option>{staff.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}</select></label>
                  <button onClick={addAppointment} className="premium-btn-primary min-h-11 w-full px-4 text-sm">Save appointment</button>
                </div>
              </OperationsPanel>
            </div>
          </OperationsWorkspace>
        ) : null}
        {activeTab === "Inventory" ? (
          <InventoryWorkspace
            productCount={products.length}
            stockUnitCount={stockItems.reduce((sum, item) => sum + item.quantity, 0)}
            lowStockCount={lowStockItems.length}
            purchaseCount={purchaseReceipts.length}
            isLoading={isLoadingProducts || isLoadingStockItems || isLoadingLowStockItems || isLoadingPurchaseReceipts}
            onProductsImported={setProducts}
          >          <section className="mt-6 space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <h2 className="text-xl font-semibold">Categories</h2>
                <div className="mt-4 space-y-3">
                  {isLoadingCategories ? <div className="text-sm text-[#a39a86]">Loading categories...</div> : null}
                  {!isLoadingCategories && categoryError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{categoryError}</div> : null}
                  {!isLoadingCategories && !categoryError && categories.length === 0 ? <div className="text-sm text-[#a39a86]">No categories yet.</div> : null}
                  {categories.map((category) => (
                    <div key={category.id} className="flex flex-col gap-2 rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                      {editingCategoryId !== category.id ? (
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{category.name}</div>
                            {category.description ? <div className="text-sm text-[#a39a86]">{category.description}</div> : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right text-sm text-[#a39a86]">
                              <div>{category.isActive ? "Active" : "Inactive"}</div>
                            </div>
                            <button
                              onClick={() => {
                                setEditingCategoryId(category.id);
                                setEditingCategoryName(category.name);
                                setEditingCategoryDescription(category.description ?? "");
                              }}
                              className="premium-btn-secondary px-3 py-1.5 text-xs"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            value={editingCategoryName}
                            onChange={(event) => setEditingCategoryName(event.target.value)}
                            placeholder="Category name"
                            className="premium-input"
                          />
                          <input
                            value={editingCategoryDescription}
                            onChange={(event) => setEditingCategoryDescription(event.target.value)}
                            placeholder="Description"
                            className="premium-input"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                if (!category.id) return;
                                await updateCategory(category.id, editingCategoryName, editingCategoryDescription);
                                setEditingCategoryId(null);
                              }}
                              className="premium-btn-primary px-3 py-1.5 text-xs"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingCategoryId(null)}
                              className="premium-btn-secondary px-3 py-1.5 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <h2 className="text-xl font-semibold">Add category</h2>
                <div className="mt-4 space-y-3">
                  <input
                    value={categoryName}
                    onChange={(event) => setCategoryName(event.target.value)}
                    placeholder="Category name"
                    className="premium-input"
                  />
                  <input
                    value={categoryDescription}
                    onChange={(event) => setCategoryDescription(event.target.value)}
                    placeholder="Description (optional)"
                    className="premium-input"
                  />
                  <button
                    onClick={addCategory}
                    className="premium-btn-primary w-full py-2.5 text-sm"
                  >
                    Save category
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <h2 className="text-xl font-semibold">Products</h2>
                <div className="mt-4 space-y-3">
                  {isLoadingProducts ? <div className="text-sm text-[#a39a86]">Loading products...</div> : null}
                  {!isLoadingProducts && productError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{productError}</div> : null}
                  {!isLoadingProducts && !productError && products.length === 0 ? <div className="text-sm text-[#a39a86]">No products yet.</div> : null}
                  {products.map((product) => (
                    <div key={product.id} className="flex flex-col gap-2 rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                      {editingProductId !== product.id ? (
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-[#a39a86]">SKU: {product.sku}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right text-sm text-[#a39a86]">
                              <div>₹{product.priceCents / 100}</div>
                              <div>{product.isActive ? "Active" : "Inactive"}</div>
                            </div>
                            <button
                              onClick={() => {
                                setEditingProductId(product.id);
                                setEditingProductName(product.name);
                                setEditingProductSku(product.sku);
                                setEditingProductPrice(String(product.priceCents));
                              }}
                              className="premium-btn-secondary px-3 py-1.5 text-xs"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            value={editingProductName}
                            onChange={(event) => setEditingProductName(event.target.value)}
                            placeholder="Product name"
                            className="premium-input"
                          />
                          <input
                            value={editingProductSku}
                            onChange={(event) => setEditingProductSku(event.target.value)}
                            placeholder="SKU"
                            className="premium-input"
                          />
                          <input
                            value={editingProductPrice}
                            onChange={(event) => setEditingProductPrice(event.target.value)}
                            placeholder="Price (cents)"
                            className="premium-input"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                if (!product.id) return;
                                await updateProduct(product.id, editingProductName, editingProductSku, Number(editingProductPrice));
                                setEditingProductId(null);
                              }}
                              className="premium-btn-primary px-3 py-1.5 text-xs"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingProductId(null)}
                              className="premium-btn-secondary px-3 py-1.5 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <h2 className="text-xl font-semibold">Add product</h2>
                <div className="mt-4 space-y-3">
                  <input
                    value={productCategoryId}
                    onChange={(event) => setProductCategoryId(event.target.value)}
                    placeholder="Category ID"
                    className="premium-input"
                  />
                  <input
                    value={productName}
                    onChange={(event) => setProductName(event.target.value)}
                    placeholder="Product name"
                    className="premium-input"
                  />
                  <input
                    value={productSku}
                    onChange={(event) => setProductSku(event.target.value)}
                    placeholder="SKU"
                    className="premium-input"
                  />
                  <input
                    value={productPrice}
                    onChange={(event) => setProductPrice(event.target.value)}
                    placeholder="Price (cents)"
                    className="premium-input"
                  />
                  <button
                    onClick={addProduct}
                    className="premium-btn-primary w-full py-2.5 text-sm"
                  >
                    Save product
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
              <h2 className="text-xl font-semibold">Current Stock</h2>
              <div className="mt-4 space-y-3">
                {isLoadingStockItems ? <div className="text-sm text-[#a39a86]">Loading stock items...</div> : null}
                {!isLoadingStockItems && stockItemError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{stockItemError}</div> : null}
                {!isLoadingStockItems && !stockItemError && stockItems.length === 0 ? <div className="text-sm text-[#a39a86]">No stock items yet.</div> : null}
                  {stockItems.map((item) => (
                    <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                      {editingStockItemId !== item.id ? (
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{productMap.get(item.productId) ?? `Product ${item.productId}`}</div>
                            <div className="text-sm text-[#a39a86]">{branchMap.get(item.branchId) ?? `Branch ${item.branchId}`}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right text-sm text-[#a39a86]">
                              <div>Qty: {item.quantity}</div>
                            </div>
                            <button
                              onClick={() => {
                                setEditingStockItemId(item.id);
                                setEditingStockItemQuantity(String(item.quantity));
                              }}
                              className="premium-btn-secondary px-3 py-1.5 text-xs"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            value={editingStockItemQuantity}
                            onChange={(event) => setEditingStockItemQuantity(event.target.value)}
                            placeholder="Quantity"
                            className="premium-input"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                if (!item.id) return;
                                await updateStockItem(item.id, Number(editingStockItemQuantity));
                                setEditingStockItemId(null);
                              }}
                              className="premium-btn-primary px-3 py-1.5 text-xs"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingStockItemId(null)}
                              className="premium-btn-secondary px-3 py-1.5 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
              <h2 className="text-xl font-semibold">Add stock item</h2>
              <div className="mt-4 space-y-3">
                <input
                  value={stockItemProductId}
                  onChange={(event) => setStockItemProductId(event.target.value)}
                  placeholder="Product ID"
                  className="premium-input"
                />
                <input
                  value={stockItemBranchId}
                  onChange={(event) => setStockItemBranchId(event.target.value)}
                  placeholder="Branch ID"
                  className="premium-input"
                />
                <input
                  value={stockItemQuantity}
                  onChange={(event) => setStockItemQuantity(event.target.value)}
                  placeholder="Quantity"
                  className="premium-input"
                />
                <button
                  onClick={addStockItem}
                  className="premium-btn-primary w-full py-2.5 text-sm"
                >
                  Save stock item
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
              <h2 className="text-xl font-semibold">Movement History</h2>
              <div className="mt-4 space-y-3">
                {isLoadingStockMovements ? <div className="text-sm text-[#a39a86]">Loading stock movements...</div> : null}
                {!isLoadingStockMovements && stockMovementError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{stockMovementError}</div> : null}
                {!isLoadingStockMovements && !stockMovementError && stockMovements.length === 0 ? <div className="text-sm text-[#a39a86]">No stock movements yet.</div> : null}
                {stockMovements.map((movement) => (
                  <div key={movement.id} className="flex items-center justify-between rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                    <div>
                      <div className="font-medium">{movement.movementType}</div>
                      <div className="text-sm text-[#a39a86]">{productMap.get(movement.productId) ?? `Product ${movement.productId}`}</div>
                      {movement.notes ? <div className="text-sm text-[#a39a86]">{movement.notes}</div> : null}
                    </div>
                    <div className="text-right text-sm text-[#a39a86]">
                      <div>{movement.quantity > 0 ? "+" : ""}{movement.quantity}</div>
                      <div>{new Date(movement.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
              <h2 className="text-xl font-semibold">Record movement</h2>
              <div className="mt-4 space-y-3">
                <input
                  value={stockMovementProductId}
                  onChange={(event) => setStockMovementProductId(event.target.value)}
                  placeholder="Product ID"
                  className="premium-input"
                />
                <input
                  value={stockMovementBranchId}
                  onChange={(event) => setStockMovementBranchId(event.target.value)}
                  placeholder="Branch ID"
                  className="premium-input"
                />
                <select
                  value={stockMovementType}
                  onChange={(event) => setStockMovementType(event.target.value)}
                  className="premium-input"
                >
                  <option value="PURCHASE">Purchase</option>
                  <option value="SALE">Sale</option>
                  <option value="TRANSFER" disabled>Transfer (coming soon)</option>
                  <option value="ADJUSTMENT">Adjustment</option>
                </select>
                {stockMovementType === "ADJUSTMENT" ? (
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="adjustmentDirection"
                        value="IN"
                        checked={adjustmentDirection === "IN"}
                        onChange={() => setAdjustmentDirection("IN")}
                        className="h-4 w-4 border-[rgba(212,175,55,0.15)] text-[#d4af37] focus:ring-[#5a1838]"
                      />
                      Stock In (+)
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="adjustmentDirection"
                        value="OUT"
                        checked={adjustmentDirection === "OUT"}
                        onChange={() => setAdjustmentDirection("OUT")}
                        className="h-4 w-4 border-[rgba(212,175,55,0.15)] text-[#d4af37] focus:ring-[#5a1838]"
                      />
                      Stock Out (-)
                    </label>
                  </div>
                ) : null}
                <input
                  value={stockMovementQuantity}
                  onChange={(event) => setStockMovementQuantity(event.target.value)}
                  placeholder="Quantity"
                  className="premium-input"
                />
                <input
                  value={stockMovementNotes}
                  onChange={(event) => setStockMovementNotes(event.target.value)}
                  placeholder="Notes (optional)"
                  className="premium-input"
                />
                <button
                  onClick={addStockMovement}
                  className="premium-btn-primary w-full py-2.5 text-sm"
                >
                  Record movement
                </button>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <h2 className="text-xl font-semibold">Warehouses</h2>
                <div className="mt-4 space-y-3">
                  {isLoadingWarehouses ? <div className="text-sm text-[#a39a86]">Loading warehouses...</div> : null}
                  {!isLoadingWarehouses && warehouseError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{warehouseError}</div> : null}
                  {!isLoadingWarehouses && !warehouseError && warehouses.length === 0 ? <div className="text-sm text-[#a39a86]">No warehouses yet.</div> : null}
                  {warehouses.map((warehouse) => (
                    <div key={warehouse.id} className="flex flex-col gap-2 rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                      {editingWarehouseId !== warehouse.id ? (
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{warehouse.name}</div>
                            <div className="text-sm text-[#a39a86]">{warehouse.location ?? "No location"}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right text-sm text-[#a39a86]">
                              <div>{warehouse.isActive ? "Active" : "Inactive"}</div>
                            </div>
                            <button
                              onClick={() => {
                                setEditingWarehouseId(warehouse.id);
                                setEditingWarehouseName(warehouse.name);
                                setEditingWarehouseLocation(warehouse.location ?? "");
                              }}
                              className="premium-btn-secondary px-3 py-1.5 text-xs"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            value={editingWarehouseName}
                            onChange={(event) => setEditingWarehouseName(event.target.value)}
                            placeholder="Warehouse name"
                            className="premium-input"
                          />
                          <input
                            value={editingWarehouseLocation}
                            onChange={(event) => setEditingWarehouseLocation(event.target.value)}
                            placeholder="Location"
                            className="premium-input"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                if (!warehouse.id) return;
                                await updateWarehouse(warehouse.id, editingWarehouseName, editingWarehouseLocation);
                                setEditingWarehouseId(null);
                              }}
                              className="premium-btn-primary px-3 py-1.5 text-xs"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingWarehouseId(null)}
                              className="premium-btn-secondary px-3 py-1.5 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <h2 className="text-xl font-semibold">Add warehouse</h2>
                <div className="mt-4 space-y-3">
                  <input
                    value={warehouseName}
                    onChange={(event) => setWarehouseName(event.target.value)}
                    placeholder="Warehouse name"
                    className="premium-input"
                  />
                  <input
                    value={warehouseLocation}
                    onChange={(event) => setWarehouseLocation(event.target.value)}
                    placeholder="Location (optional)"
                    className="premium-input"
                  />
                  <button
                    onClick={addWarehouse}
                    className="premium-btn-primary w-full py-2.5 text-sm"
                  >
                    Save warehouse
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <h2 className="text-xl font-semibold">Suppliers</h2>
                <div className="mt-4 space-y-3">
                  {isLoadingSuppliers ? <div className="text-sm text-[#a39a86]">Loading suppliers...</div> : null}
                  {!isLoadingSuppliers && supplierError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{supplierError}</div> : null}
                  {!isLoadingSuppliers && !supplierError && suppliers.length === 0 ? <div className="text-sm text-[#a39a86]">No suppliers yet.</div> : null}
                  {suppliers.map((supplier) => (
                    <div key={supplier.id} className="flex flex-col gap-2 rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                      {editingSupplierId !== supplier.id ? (
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{supplier.name}</div>
                            <div className="text-sm text-[#a39a86]">{supplier.contactName ?? "No contact"}</div>
                            <div className="text-sm text-[#a39a86]">{supplier.phone ?? supplier.email ?? "No contact info"}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right text-sm text-[#a39a86]">
                              <div>{supplier.isActive ? "Active" : "Inactive"}</div>
                            </div>
                            <button
                              onClick={() => {
                                setEditingSupplierId(supplier.id);
                                setEditingSupplierName(supplier.name);
                                setEditingSupplierContactName(supplier.contactName ?? "");
                                setEditingSupplierEmail(supplier.email ?? "");
                                setEditingSupplierPhone(supplier.phone ?? "");
                              }}
                              className="premium-btn-secondary px-3 py-1.5 text-xs"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            value={editingSupplierName}
                            onChange={(event) => setEditingSupplierName(event.target.value)}
                            placeholder="Supplier name"
                            className="premium-input"
                          />
                          <input
                            value={editingSupplierContactName}
                            onChange={(event) => setEditingSupplierContactName(event.target.value)}
                            placeholder="Contact name"
                            className="premium-input"
                          />
                          <input
                            value={editingSupplierEmail}
                            onChange={(event) => setEditingSupplierEmail(event.target.value)}
                            placeholder="Email"
                            className="premium-input"
                          />
                          <input
                            value={editingSupplierPhone}
                            onChange={(event) => setEditingSupplierPhone(event.target.value)}
                            placeholder="Phone"
                            className="premium-input"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                if (!supplier.id) return;
                                await updateSupplier(supplier.id, editingSupplierName, editingSupplierContactName, editingSupplierEmail, editingSupplierPhone);
                                setEditingSupplierId(null);
                              }}
                              className="premium-btn-primary px-3 py-1.5 text-xs"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingSupplierId(null)}
                              className="premium-btn-secondary px-3 py-1.5 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <h2 className="text-xl font-semibold">Add supplier</h2>
                <div className="mt-4 space-y-3">
                  <input
                    value={supplierName}
                    onChange={(event) => setSupplierName(event.target.value)}
                    placeholder="Supplier name"
                    className="premium-input"
                  />
                  <input
                    value={supplierContactName}
                    onChange={(event) => setSupplierContactName(event.target.value)}
                    placeholder="Contact name (optional)"
                    className="premium-input"
                  />
                  <input
                    value={supplierEmail}
                    onChange={(event) => setSupplierEmail(event.target.value)}
                    placeholder="Email (optional)"
                    className="premium-input"
                  />
                  <input
                    value={supplierPhone}
                    onChange={(event) => setSupplierPhone(event.target.value)}
                    placeholder="Phone (optional)"
                    className="premium-input"
                  />
                  <button
                    onClick={addSupplier}
                    className="premium-btn-primary w-full py-2.5 text-sm"
                  >
                    Save supplier
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <h2 className="text-xl font-semibold">Reorder Rules</h2>
                <div className="mt-4 space-y-3">
                  {isLoadingReorderRules ? <div className="text-sm text-[#a39a86]">Loading reorder rules...</div> : null}
                  {!isLoadingReorderRules && reorderRuleError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{reorderRuleError}</div> : null}
                  {!isLoadingReorderRules && !reorderRuleError && reorderRules.length === 0 ? <div className="text-sm text-[#a39a86]">No reorder rules yet.</div> : null}
                  {reorderRules.map((rule) => (
                    <div key={rule.id} className="flex flex-col gap-2 rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                      {editingReorderRuleId !== rule.id ? (
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{productMap.get(rule.productId) ?? `Product ${rule.productId}`}</div>
                            <div className="text-sm text-[#a39a86]">{branchMap.get(rule.branchId) ?? `Branch ${rule.branchId}`} / {warehouseMap.get(rule.warehouseId) ?? `Warehouse ${rule.warehouseId}`}</div>
                            <div className="text-sm text-[#a39a86]">Min: {rule.minQuantity} | Reorder: {rule.reorderQuantity}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right text-sm text-[#a39a86]">
                              <div>{rule.isActive ? "Active" : "Inactive"}</div>
                            </div>
                            <button
                              onClick={() => {
                                setEditingReorderRuleId(rule.id);
                                setEditingReorderRuleProductId(rule.productId);
                                setEditingReorderRuleBranchId(rule.branchId);
                                setEditingReorderRuleWarehouseId(rule.warehouseId);
                                setEditingReorderRuleMinQuantity(String(rule.minQuantity));
                                setEditingReorderRuleReorderQuantity(String(rule.reorderQuantity));
                              }}
                              className="premium-btn-secondary px-3 py-1.5 text-xs"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            value={editingReorderRuleProductId}
                            onChange={(event) => setEditingReorderRuleProductId(event.target.value)}
                            placeholder="Product ID"
                            className="premium-input"
                          />
                          <input
                            value={editingReorderRuleBranchId}
                            onChange={(event) => setEditingReorderRuleBranchId(event.target.value)}
                            placeholder="Branch ID"
                            className="premium-input"
                          />
                          <input
                            value={editingReorderRuleWarehouseId}
                            onChange={(event) => setEditingReorderRuleWarehouseId(event.target.value)}
                            placeholder="Warehouse ID"
                            className="premium-input"
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              value={editingReorderRuleMinQuantity}
                              onChange={(event) => setEditingReorderRuleMinQuantity(event.target.value)}
                              placeholder="Min qty"
                              className="premium-input"
                            />
                            <input
                              value={editingReorderRuleReorderQuantity}
                              onChange={(event) => setEditingReorderRuleReorderQuantity(event.target.value)}
                              placeholder="Reorder qty"
                              className="premium-input"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                if (!rule.id) return;
                                await updateReorderRule(rule.id, editingReorderRuleProductId, editingReorderRuleBranchId, editingReorderRuleWarehouseId, Number(editingReorderRuleMinQuantity), Number(editingReorderRuleReorderQuantity));
                                setEditingReorderRuleId(null);
                              }}
                              className="premium-btn-primary px-3 py-1.5 text-xs"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingReorderRuleId(null)}
                              className="premium-btn-secondary px-3 py-1.5 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <h2 className="text-xl font-semibold">Add reorder rule</h2>
                <div className="mt-4 space-y-3">
                  <input
                    value={reorderRuleProductId}
                    onChange={(event) => setReorderRuleProductId(event.target.value)}
                    placeholder="Product ID"
                    className="premium-input"
                  />
                  <input
                    value={reorderRuleBranchId}
                    onChange={(event) => setReorderRuleBranchId(event.target.value)}
                    placeholder="Branch ID"
                    className="premium-input"
                  />
                  <input
                    value={reorderRuleWarehouseId}
                    onChange={(event) => setReorderRuleWarehouseId(event.target.value)}
                    placeholder="Warehouse ID"
                    className="premium-input"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={reorderRuleMinQuantity}
                      onChange={(event) => setReorderRuleMinQuantity(event.target.value)}
                      placeholder="Min qty"
                      className="premium-input"
                    />
                    <input
                      value={reorderRuleReorderQuantity}
                      onChange={(event) => setReorderRuleReorderQuantity(event.target.value)}
                      placeholder="Reorder qty"
                      className="premium-input"
                    />
                  </div>
                  <button
                    onClick={addReorderRule}
                    className="premium-btn-primary w-full py-2.5 text-sm"
                  >
                    Save reorder rule
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
              <h2 className="text-xl font-semibold">Low Stock Alerts</h2>
              <div className="mt-4 space-y-3">
                {isLoadingLowStockItems ? <div className="text-sm text-[#a39a86]">Loading low stock items...</div> : null}
                {!isLoadingLowStockItems && lowStockItemError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{lowStockItemError}</div> : null}
                {!isLoadingLowStockItems && !lowStockItemError && lowStockItems.length === 0 ? <div className="text-sm text-[#a39a86]">No low stock items.</div> : null}
                {lowStockItems.map((item) => (
                  <div key={item.stockItemId} className="flex items-center justify-between rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                    <div>
                      <div className="font-medium">{productMap.get(item.productId) ?? `Product ${item.productId}`}</div>
                      <div className="text-sm text-[#a39a86]">{branchMap.get(item.branchId) ?? `Branch ${item.branchId}`}</div>
                    </div>
                    <div className="text-right text-sm text-[#a39a86]">
                      <div>Qty: {item.quantity} / Min: {item.minQuantity}</div>
                      <div>Reorder: {item.reorderQuantity}</div>
                    </div>
                  </div>
                ))}
               </div>
            </div>
          </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
            <h2 className="text-xl font-semibold">Purchase Receipts</h2>
            <div className="mt-4 space-y-3">
              {isLoadingPurchaseReceipts ? <div className="text-sm text-[#a39a86]">Loading purchase receipts...</div> : null}
              {!isLoadingPurchaseReceipts && purchaseReceiptError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{purchaseReceiptError}</div> : null}
              {!isLoadingPurchaseReceipts && !purchaseReceiptError && purchaseReceipts.length === 0 ? <div className="text-sm text-[#a39a86]">No purchase receipts yet.</div> : null}
              {purchaseReceipts.map((receipt) => (
                <div key={receipt.id} className="flex items-center justify-between rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                  <div>
                    <div className="font-medium">Receipt {receipt.id}</div>
                     <div className="text-sm text-[#a39a86]">{warehouseMap.get(receipt.warehouseId) ?? `Warehouse ${receipt.warehouseId}`} / {branchMap.get(receipt.branchId) ?? `Branch ${receipt.branchId}`}</div>
                     <div className="text-sm text-[#a39a86]">{new Date(receipt.receivedAt).toLocaleString()}</div>
                     {receipt.lineItems.length > 0 ? (
                       <div className="text-sm text-[#a39a86]">
                         {receipt.lineItems.map((item) => `${productMap.get(item.productId) ?? `Product ${item.productId}`}: ${item.quantity}`).join(", ")}
                       </div>
                    ) : null}
                  </div>
                  <div className="text-right text-sm text-[#a39a86]">
                    <div>{receipt.supplierId ? `Supplier ${receipt.supplierId}` : "No supplier"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
            <h2 className="text-xl font-semibold">Record purchase receipt</h2>
            <div className="mt-4 space-y-3">
              <input
                value={purchaseReceiptSupplierId}
                onChange={(event) => setPurchaseReceiptSupplierId(event.target.value)}
                placeholder="Supplier ID (optional)"
                className="premium-input"
              />
              <input
                value={purchaseReceiptWarehouseId}
                onChange={(event) => setPurchaseReceiptWarehouseId(event.target.value)}
                placeholder="Warehouse ID"
                className="premium-input"
              />
              <input
                value={purchaseReceiptBranchId}
                onChange={(event) => setPurchaseReceiptBranchId(event.target.value)}
                placeholder="Branch ID"
                className="premium-input"
              />
              <input
                value={purchaseReceiptReceivedBy}
                onChange={(event) => setPurchaseReceiptReceivedBy(event.target.value)}
                placeholder="Received by (optional)"
                className="premium-input"
              />
              <input
                value={purchaseReceiptProductId}
                onChange={(event) => setPurchaseReceiptProductId(event.target.value)}
                placeholder="Product ID"
                className="premium-input"
              />
              <input
                value={purchaseReceiptQuantity}
                onChange={(event) => setPurchaseReceiptQuantity(event.target.value)}
                placeholder="Quantity"
                className="premium-input"
              />
              <input
                value={purchaseReceiptNotes}
                onChange={(event) => setPurchaseReceiptNotes(event.target.value)}
                placeholder="Notes (optional)"
                className="premium-input"
              />
              <button
                onClick={addPurchaseReceipt}
                className="premium-btn-primary w-full py-2.5 text-sm"
              >
                Save purchase receipt
              </button>
            </div>
          </div>
          </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
            <h2 className="text-xl font-semibold">Stock Transfers</h2>
            <div className="mt-4 space-y-3">
              {isLoadingStockTransfers ? <div className="text-sm text-[#a39a86]">Loading stock transfers...</div> : null}
              {!isLoadingStockTransfers && stockTransferError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{stockTransferError}</div> : null}
              {!isLoadingStockTransfers && !stockTransferError && stockTransfers.length === 0 ? <div className="text-sm text-[#a39a86]">No stock transfers yet.</div> : null}
              {stockTransfers.map((transfer) => (
                <div key={transfer.id} className="flex items-center justify-between rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                  <div>
                    <div className="font-medium">Transfer {transfer.id}</div>
                     <div className="text-sm text-[#a39a86]">From: {warehouseMap.get(transfer.fromWarehouseId) ?? `Warehouse ${transfer.fromWarehouseId}`} / {branchMap.get(transfer.fromBranchId) ?? `Branch ${transfer.fromBranchId}`}</div>
                     <div className="text-sm text-[#a39a86]">To: {warehouseMap.get(transfer.toWarehouseId) ?? `Warehouse ${transfer.toWarehouseId}`} / {branchMap.get(transfer.toBranchId) ?? `Branch ${transfer.toBranchId}`}</div>
                     <div className="text-sm text-[#a39a86]">Status: {transfer.status}</div>
                     {transfer.lineItems.length > 0 ? (
                       <div className="text-sm text-[#a39a86]">
                         {transfer.lineItems.map((item) => `${productMap.get(item.productId) ?? `Product ${item.productId}`}: ${item.quantity}`).join(", ")}
                       </div>
                    ) : null}
                  </div>
                  <div className="text-right text-sm text-[#a39a86]">
                    <div>{transfer.notes ?? "—"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
            <h2 className="text-xl font-semibold">Create stock transfer</h2>
            <div className="mt-4 space-y-3">
              <input
                value={stockTransferFromWarehouseId}
                onChange={(event) => setStockTransferFromWarehouseId(event.target.value)}
                placeholder="From Warehouse ID"
                className="premium-input"
              />
              <input
                value={stockTransferToWarehouseId}
                onChange={(event) => setStockTransferToWarehouseId(event.target.value)}
                placeholder="To Warehouse ID"
                className="premium-input"
              />
              <input
                value={stockTransferFromBranchId}
                onChange={(event) => setStockTransferFromBranchId(event.target.value)}
                placeholder="From Branch ID"
                className="premium-input"
              />
              <input
                value={stockTransferToBranchId}
                onChange={(event) => setStockTransferToBranchId(event.target.value)}
                placeholder="To Branch ID"
                className="premium-input"
              />
              <input
                value={stockTransferProductId}
                onChange={(event) => setStockTransferProductId(event.target.value)}
                placeholder="Product ID"
                className="premium-input"
              />
              <input
                value={stockTransferQuantity}
                onChange={(event) => setStockTransferQuantity(event.target.value)}
                placeholder="Quantity"
                className="premium-input"
              />
              <button
                onClick={addStockTransfer}
                className="premium-btn-primary w-full py-2.5 text-sm"
              >
                Save stock transfer
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
            <h2 className="text-xl font-semibold">Stock Adjustments</h2>
            <div className="mt-4 space-y-3">
              {isLoadingStockAdjustments ? <div className="text-sm text-[#a39a86]">Loading stock adjustments...</div> : null}
              {!isLoadingStockAdjustments && stockAdjustmentError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{stockAdjustmentError}</div> : null}
              {!isLoadingStockAdjustments && !stockAdjustmentError && stockAdjustments.length === 0 ? <div className="text-sm text-[#a39a86]">No stock adjustments yet.</div> : null}
              {stockAdjustments.map((adjustment) => (
                <div key={adjustment.id} className="flex items-center justify-between rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                  <div>
                    <div className="font-medium">Adjustment {adjustment.id}</div>
                     <div className="text-sm text-[#a39a86]">{branchMap.get(adjustment.branchId) ?? `Branch ${adjustment.branchId}`}</div>
                     <div className="text-sm text-[#a39a86]">Direction: {adjustment.direction}</div>
                     {adjustment.lineItems.length > 0 ? (
                       <div className="text-sm text-[#a39a86]">
                         {adjustment.lineItems.map((item) => `${productMap.get(item.productId) ?? `Product ${item.productId}`}: ${item.quantity}`).join(", ")}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-right text-sm text-[#a39a86]">
                    <div>{adjustment.notes ?? "—"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
            <h2 className="text-xl font-semibold">Record stock adjustment</h2>
            <div className="mt-4 space-y-3">
              <input
                value={stockAdjustmentBranchId}
                onChange={(event) => setStockAdjustmentBranchId(event.target.value)}
                placeholder="Branch ID"
                className="premium-input"
              />
              <select
                value={stockAdjustmentDirection}
                onChange={(event) => setStockAdjustmentDirection(event.target.value)}
                className="premium-input"
              >
                <option value="IN">Stock In (+)</option>
                <option value="OUT">Stock Out (-)</option>
              </select>
              <input
                value={stockAdjustmentProductId}
                onChange={(event) => setStockAdjustmentProductId(event.target.value)}
                placeholder="Product ID"
                className="premium-input"
              />
              <input
                value={stockAdjustmentQuantity}
                onChange={(event) => setStockAdjustmentQuantity(event.target.value)}
                placeholder="Quantity"
                className="premium-input"
              />
              <button
                onClick={addStockAdjustment}
                className="premium-btn-primary w-full py-2.5 text-sm"
              >
                Save stock adjustment
              </button>
            </div>
          </div>
        </section>
        </InventoryWorkspace>
        ) : null}

        {activeTab === "Billing" ? (          <BillingWorkspace
            eyebrow="Point of sale"
            title="Billing / POS"
            description="Create invoices, review loaded financial records, and record payments through the existing tenant-scoped billing workflow."
            stats={[
              { label: "Loaded invoices", value: invoices.length },
              { label: "Loaded total", value: formatMoney(invoices.reduce((sum, invoice) => sum + invoice.totalCents, 0)) },
              { label: "Current cart", value: formatMoney(cartSubtotalCents), tone: cartItems.length > 0 ? "warning" : "neutral" },
            ]}
          >
            <BillingDownloadActions>
              <a href="/api/exports/billing/invoices/xlsx" download className="premium-btn-secondary inline-flex min-h-10 items-center px-3 text-sm">Invoice Excel</a>
              <a href="/api/exports/billing/invoices/pdf" download className="premium-btn-secondary inline-flex min-h-10 items-center px-3 text-sm">Invoice PDF</a>
              <a href="/api/exports/billing/payments/xlsx" download className="premium-btn-secondary inline-flex min-h-10 items-center px-3 text-sm">Payment Excel</a>
              <a href="/api/exports/billing/payments/pdf" download className="premium-btn-secondary inline-flex min-h-10 items-center px-3 text-sm">Payment PDF</a>
            </BillingDownloadActions>

            {invoiceError ? <div role="alert" className="rounded-lg border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#e47a70]">{invoiceError}</div> : null}

            <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
              <BillingPanel eyebrow="Register" title="Invoices" description="Financial records in the current authorized tenant scope. Payment totals shown here reflect data loaded into this session.">
                {isLoadingInvoices ? (
                  <div className="space-y-2" aria-live="polite">
                    <div className="text-sm text-[#a39a86]">Loading invoices...</div>
                    {[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-lg bg-[#17150f]" />)}
                  </div>
                ) : !invoiceError && invoices.length === 0 ? (
                  <BillingEmptyState title="No invoices yet." description="Use POS checkout to create the first invoice in this authorized scope." />
                ) : (
                  <div className="space-y-3">
                    {invoices.map((invoice) => {
                      const paidCents = invoice.paidCents;
                      const branch = invoice.branchId ? branches.find((item) => item.id === invoice.branchId) : undefined;
                      const outlet = invoice.branchId ? outlets.find((item) => item.branchId === invoice.branchId) : undefined;
                      return (
                        <article key={invoice.id} className="rounded-lg border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-4 transition-colors hover:border-[rgba(212,175,55,0.25)]">
                          {editingInvoiceId === invoice.id ? (
                            <div className="space-y-4">
                              <div className="grid gap-3 sm:grid-cols-2">
                                <label className="text-xs font-medium text-[#a39a86]">Discount in paise<input aria-label="Invoice discount in paise" inputMode="numeric" value={editingInvoiceDiscountCents} onChange={(event) => setEditingInvoiceDiscountCents(event.target.value)} placeholder="Discount (cents)" className="premium-input mt-1 w-full" /></label>
                                <label className="text-xs font-medium text-[#a39a86]">Notes<input aria-label="Invoice notes" value={editingInvoiceNotes} onChange={(event) => setEditingInvoiceNotes(event.target.value)} placeholder="Notes" className="premium-input mt-1 w-full" /></label>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={async () => { await updateInvoice(invoice.id, Number(editingInvoiceDiscountCents), editingInvoiceNotes); setEditingInvoiceId(null); }} className="premium-btn-primary min-h-11 px-4 text-sm">Save</button>
                                <button onClick={() => setEditingInvoiceId(null)} className="premium-btn-secondary min-h-11 px-4 text-sm">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(230px,0.55fr)_auto] lg:items-center">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-medium text-[#f5f1e6]">{customerMap.get(invoice.customerId) ?? `Customer ${invoice.customerId}`}</h4>
                                  <BillingStatusBadge paidCents={paidCents} totalCents={invoice.totalCents} />
                                </div>
                                <div className="mt-1 break-all text-xs text-[#807866]">Invoice {invoice.id}</div>
                                <div className="mt-2 text-sm tabular-nums text-[#a39a86]">{invoice.issuedAt}</div>
                                <div className="mt-1 text-xs text-[#a39a86]"><span className="text-[#d4af37]">Outlet:</span> {invoice.branchId ? `${branch?.name ?? "Unknown"} - ${outlet?.partnerName ?? "Company Owned"}` : "Not attributed"}</div>
                                {invoice.notes ? <p className="mt-2 text-sm leading-6 text-[#a39a86]">{invoice.notes}</p> : null}
                              </div>
                              <BillingTotals subtotalCents={invoice.subtotalCents} discountCents={invoice.discountCents} gstCents={invoice.gstCents} totalCents={invoice.totalCents} paidCents={paidCents} />
                              <div className="flex flex-wrap gap-2 lg:flex-col">
                                <button onClick={() => { setEditingInvoiceId(invoice.id); setEditingInvoiceDiscountCents(String(invoice.discountCents)); setEditingInvoiceNotes(invoice.notes ?? ""); }} className="premium-btn-secondary min-h-10 px-3 text-xs">Edit</button>
                                <button onClick={() => { setPayingInvoiceId(invoice.id); setPaymentAmount(""); setPaymentNotes(""); setPaymentError(null); }} className="min-h-10 rounded-lg border border-[rgba(63,174,106,0.3)] bg-[rgba(63,174,106,0.08)] px-3 text-xs font-medium text-[#70d391] transition-colors hover:bg-[rgba(63,174,106,0.15)]">Record payment</button>
                              </div>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </BillingPanel>

              <div className="space-y-5">
                <BillingPanel eyebrow="Checkout" title="POS checkout" description="Build an invoice from existing products, services, or packages. Server-side totals and stock effects remain authoritative.">
                  <div className="space-y-4">
                    <fieldset className="space-y-3">
                      <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-[#d4af37]">Customer and outlet</legend>
                      <label className="block text-xs font-medium text-[#a39a86]">Customer<select aria-label="Invoice customer" value={invoiceCustomerId} onChange={(event) => setInvoiceCustomerId(event.target.value)} className="premium-input mt-1 w-full"><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
                      <label className="block text-xs font-medium text-[#a39a86]">Billing outlet<select aria-label="Billing outlet" value={invoiceBranchId} onChange={(event) => setInvoiceBranchId(event.target.value)} className="premium-input mt-1 w-full"><option value="">Select billing outlet</option>{branches.filter((branch) => branch.isActive).map((branch) => { const outlet = outlets.find((item) => item.branchId === branch.id); return <option key={branch.id} value={branch.id}>{branch.name}{outlet?.partnerName ? ` - ${outlet.partnerName}` : " - Company Owned"}</option>; })}</select></label>
                      {invoiceBranchId ? (() => { const selectedOutlet = outlets.find((item) => item.branchId === invoiceBranchId); return <div className="rounded-lg border border-[rgba(212,175,55,0.1)] bg-[#0d0c0a] px-3 py-2 text-xs text-[#a39a86]"><span className="text-[#d4af37]">{selectedOutlet ? "Franchise partner:" : "Type:"}</span> {selectedOutlet ? `${selectedOutlet.partnerName} (${selectedOutlet.outletType ?? "FOCO"})` : "Company Owned"}</div>; })() : null}
                    </fieldset>

                    <fieldset className="space-y-3 border-t border-[rgba(212,175,55,0.1)] pt-4">
                      <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-[#d4af37]">Add item</legend>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-xs font-medium text-[#a39a86]">Item type<select aria-label="Cart item type" value={cartItemType} onChange={(event) => { setCartItemType(event.target.value as "product" | "service" | "package"); setCartItemId(""); }} className="premium-input mt-1 w-full"><option value="product">Product</option><option value="service">Service</option><option value="package">Package</option></select></label>
                        <label className="text-xs font-medium text-[#a39a86]">Item<select aria-label="Cart item" value={cartItemId} onChange={(event) => setCartItemId(event.target.value)} className="premium-input mt-1 w-full"><option value="">Select item</option>{cartItemType === "product" && products.filter((product) => product.isActive).map((product) => <option key={product.id} value={product.id}>{product.name} ({formatMoney(product.priceCents)})</option>)}{cartItemType === "service" && services.filter((service) => service.isActive).map((service) => <option key={service.id} value={service.id}>{service.name} ({formatMoney(service.priceCents)})</option>)}{cartItemType === "package" && packages.filter((pkg) => pkg.isActive).map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.name} ({formatMoney(pkg.priceCents ?? 0)})</option>)}</select></label>
                      </div>
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                        <label className="text-xs font-medium text-[#a39a86]">Quantity<input aria-label="Cart item quantity" value={cartItemQuantity} onChange={(event) => setCartItemQuantity(event.target.value)} placeholder="Qty" type="number" min="1" className="premium-input mt-1 w-full" /></label>
                        <button onClick={addToCart} className="premium-btn-secondary mt-5 min-h-11 px-4 text-sm">Add item</button>
                      </div>
                    </fieldset>

                    <div className="border-t border-[rgba(212,175,55,0.1)] pt-4">
                      <div className="mb-3 flex items-center justify-between"><h4 className="text-sm font-semibold text-[#f5f1e6]">Line items</h4><span className="text-xs tabular-nums text-[#807866]">{cartItems.length} item(s)</span></div>
                      {cartItems.length === 0 ? <BillingEmptyState title="Cart is empty." description="Select an item and quantity to begin checkout." /> : (
                        <div className="space-y-2">
                          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                            {cartItems.map((item) => <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-lg border border-[rgba(212,175,55,0.1)] bg-[#0d0c0a] p-3"><div className="min-w-0"><div className="truncate text-sm font-medium text-[#f5f1e6]">{item.description}</div><div className="mt-1 text-xs text-[#a39a86]">{formatMoney(item.unitPriceCents)} × {item.quantity}</div></div><div className="text-right"><div className="text-sm font-semibold tabular-nums text-[#f5f1e6]">{formatMoney(item.unitPriceCents * item.quantity)}</div><button onClick={() => removeFromCart(item.id)} className="mt-1 text-xs font-medium text-[#e47a70] hover:underline">Remove</button></div></div>)}
                          </div>
                          <div className="rounded-lg border border-[rgba(212,175,55,0.18)] bg-[#0d0c0a] p-3"><BillingTotals subtotalCents={cartSubtotalCents} totalCents={cartSubtotalCents} /></div>
                        </div>
                      )}
                    </div>

                    <label className="block text-xs font-medium text-[#a39a86]">Invoice notes<input aria-label="Checkout invoice notes" value={invoiceNotes} onChange={(event) => setInvoiceNotes(event.target.value)} placeholder="Notes (optional)" className="premium-input mt-1 w-full" /></label>
                    {checkoutError ? <div role="alert" className="rounded-lg border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#e47a70]">{checkoutError}</div> : null}
                    <button onClick={checkout} disabled={isCheckingOut || cartItems.length === 0 || !invoiceCustomerId} className="premium-btn-primary min-h-11 w-full px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50">{isCheckingOut ? "Processing..." : "Checkout"}</button>
                  </div>
                </BillingPanel>

                {payingInvoiceId ? (() => {
                  const invoice = invoices.find((item) => item.id === payingInvoiceId);
                  return (
                    <BillingPanel eyebrow="Payment" title="Record payment" description="Payments use the existing rupee input and server-side cents validation.">
                      {paymentError ? <div role="alert" className="mb-3 rounded-lg border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#e47a70]">{paymentError}</div> : null}
                      <div className="mb-4 rounded-lg border border-[rgba(63,174,106,0.18)] bg-[rgba(63,174,106,0.06)] p-3">
                        <div className="text-xs uppercase tracking-[0.12em] text-[#807866]">Invoice total</div>
                        <div className="mt-1 text-xl font-semibold tabular-nums text-[#f5f1e6]">{invoice ? formatMoney(invoice.totalCents) : payingInvoiceId}</div>
                      </div>
                      <div className="space-y-3">
                        <label className="block text-xs font-medium text-[#a39a86]">Amount in rupees<input aria-label="Payment amount in rupees" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} placeholder="Amount (e.g. 1500.00)" type="number" min="0.01" step="0.01" className="premium-input mt-1 w-full" /></label>
                        <label className="block text-xs font-medium text-[#a39a86]">Payment method<select aria-label="Payment method" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="premium-input mt-1 w-full"><option value="offline">Offline</option><option value="online">Online</option></select></label>
                        <label className="block text-xs font-medium text-[#a39a86]">Payment notes<input aria-label="Payment notes" value={paymentNotes} onChange={(event) => setPaymentNotes(event.target.value)} placeholder="Notes (optional)" className="premium-input mt-1 w-full" /></label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button onClick={recordPayment} disabled={isRecordingPayment} className="premium-btn-primary min-h-11 flex-1 px-4 text-sm disabled:opacity-50">{isRecordingPayment ? "Recording..." : "Record Payment"}</button>
                          <button onClick={() => { setPayingInvoiceId(null); setPaymentError(null); }} className="premium-btn-secondary min-h-11 px-4 text-sm">Cancel</button>
                        </div>
                      </div>
                    </BillingPanel>
                  );
                })() : null}
              </div>
            </div>
          </BillingWorkspace>
        ) : null}
        {activeTab === "Branches" ? (
          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
              <h2 className="text-xl font-semibold">Business units</h2>
              <div className="mt-4 space-y-3">
                {isLoadingBusinessUnits ? <div className="text-sm text-[#a39a86]">Loading business units...</div> : null}
                {!isLoadingBusinessUnits && businessUnitError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{businessUnitError}</div> : null}
                {!isLoadingBusinessUnits && !businessUnitError && businessUnits.length === 0 ? <div className="text-sm text-[#a39a86]">No business units yet.</div> : null}
                  {businessUnits.map((bu) => (
                    <div key={bu.id} className="flex flex-col gap-2 rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                      {editingBusinessUnitId !== bu.id ? (
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{bu.name}</div>
                            <div className="text-sm text-[#a39a86]">{bu.slug}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-xs ${bu.isActive ? "premium-badge-success" : "premium-badge-danger"}`}>{bu.isActive ? "Active" : "Inactive"}</span>
                            <button
                              onClick={() => {
                                setEditingBusinessUnitId(bu.id);
                                setEditingBusinessUnitName(bu.name);
                                setEditingBusinessUnitSlug(bu.slug);
                              }}
                              className="premium-btn-secondary px-3 py-1.5 text-xs"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            value={editingBusinessUnitName}
                            onChange={(event) => setEditingBusinessUnitName(event.target.value)}
                            placeholder="Business unit name"
                            className="premium-input"
                          />
                          <input
                            value={editingBusinessUnitSlug}
                            onChange={(event) => setEditingBusinessUnitSlug(event.target.value)}
                            placeholder="Slug"
                            className="premium-input"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                if (!bu.id) return;
                                await updateBusinessUnit(bu.id, editingBusinessUnitName, editingBusinessUnitSlug);
                                setEditingBusinessUnitId(null);
                              }}
                              className="premium-btn-primary px-3 py-1.5 text-xs"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingBusinessUnitId(null)}
                              className="premium-btn-secondary px-3 py-1.5 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
              <h2 className="text-xl font-semibold">Add business unit</h2>
              <div className="mt-4 space-y-3">
                <input
                  value={businessUnitName}
                  onChange={(event) => setBusinessUnitName(event.target.value)}
                  placeholder="Business unit name"
                  className="premium-input"
                />
                <input
                  value={businessUnitSlug}
                  onChange={(event) => setBusinessUnitSlug(event.target.value)}
                  placeholder="Slug"
                  className="premium-input"
                />
                <button
                  onClick={addBusinessUnit}
                  className="premium-btn-primary w-full py-2.5 text-sm"
                >
                  Save business unit
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
              <h2 className="text-xl font-semibold">Branches</h2>
              <div className="mt-4 space-y-3">
                {isLoadingBranches ? <div className="text-sm text-[#a39a86]">Loading branches...</div> : null}
                {!isLoadingBranches && branchError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{branchError}</div> : null}
                {!isLoadingBranches && !branchError && branches.length === 0 ? <div className="text-sm text-[#a39a86]">No branches yet.</div> : null}
                  {branches.map((branch) => (
                    <div key={branch.id} className="flex flex-col gap-2 rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                      {editingBranchId !== branch.id ? (
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{branch.name}</div>
                            <div className="text-sm text-[#a39a86]">{branch.slug} ?? BU {branch.businessUnitId}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-xs ${branch.isActive ? "premium-badge-success" : "premium-badge-danger"}`}>{branch.isActive ? "Active" : "Inactive"}</span>
                            <button
                              onClick={() => {
                                setEditingBranchId(branch.id);
                                setEditingBranchName(branch.name);
                                setEditingBranchSlug(branch.slug);
                              }}
                              className="premium-btn-secondary px-3 py-1.5 text-xs"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            value={editingBranchName}
                            onChange={(event) => setEditingBranchName(event.target.value)}
                            placeholder="Branch name"
                            className="premium-input"
                          />
                          <input
                            value={editingBranchSlug}
                            onChange={(event) => setEditingBranchSlug(event.target.value)}
                            placeholder="Slug"
                            className="premium-input"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                if (!branch.id) return;
                                await updateBranch(branch.id, editingBranchName, editingBranchSlug);
                                setEditingBranchId(null);
                              }}
                              className="premium-btn-primary px-3 py-1.5 text-xs"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingBranchId(null)}
                              className="premium-btn-secondary px-3 py-1.5 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
              <h2 className="text-xl font-semibold">Add branch</h2>
              <div className="mt-4 space-y-3">
                <input
                  value={branchName}
                  onChange={(event) => setBranchName(event.target.value)}
                  placeholder="Branch name"
                  className="premium-input"
                />
                <input
                  value={branchSlug}
                  onChange={(event) => setBranchSlug(event.target.value)}
                  placeholder="Slug"
                  className="premium-input"
                />
                <input
                  value={branchBusinessUnitId}
                  onChange={(event) => setBranchBusinessUnitId(event.target.value)}
                  placeholder="Business unit ID"
                  className="premium-input"
                />
                <button
                  onClick={addBranch}
                  className="premium-btn-primary w-full py-2.5 text-sm"
                >
                  Save branch
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "Franchise Overview" ? (
          <section className="mt-6 space-y-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-serif text-2xl font-bold bg-gradient-to-r from-[#9c7a1e] via-[#d4af37] to-[#f1d78c] bg-clip-text text-transparent">
                Franchise Overview
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(212,175,55,0.3)] bg-[#17150f] px-3 py-1 text-xs font-medium text-[#d4af37]">
                Multi-Outlet Network
              </span>
            </div>

            {isLoadingFranchiseOverview ? (
              <div className="text-sm text-[#a39a86]">Loading franchise overview...</div>
            ) : null}
            {!isLoadingFranchiseOverview && franchiseOverviewError ? (
              <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-4 text-sm text-[#d1554a]">
                {franchiseOverviewError}
              </div>
            ) : null}
            {!isLoadingFranchiseOverview && !franchiseOverviewError && franchiseOverview === null ? (
              <div className="text-sm text-[#a39a86]">No franchise overview data yet.</div>
            ) : null}
            {franchiseOverview !== null ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="relative overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[#121110] p-5 shadow-sm">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#d4af37] to-[#9c7a1e]" />
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#a39a86]">Outlets</div>
                    <div className="mt-2 text-3xl font-semibold text-[#f5f1e6]">{franchiseOverview.branches.length}</div>
                    <div className="mt-1 text-sm text-[#a39a86]">
                      {franchiseOverview.branches.filter((branch) => branch.isActive).length} active
                    </div>
                  </div>
                  <div className="relative overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[#121110] p-5 shadow-sm">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#d4af37] to-[#9c7a1e]" />
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#a39a86]">Total Revenue</div>
                    <div className="mt-2 text-3xl font-semibold text-[#d4af37]">₹{(franchiseOverview.sales.totalRevenueCents / 100).toLocaleString()}</div>
                    <div className="mt-1 text-sm text-[#a39a86]">
                      {franchiseOverview.sales.invoiceCount} invoice{franchiseOverview.sales.invoiceCount === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="relative overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[#121110] p-5 shadow-sm">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#d4af37] to-[#9c7a1e]" />
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#a39a86]">Appointments</div>
                    <div className="mt-2 text-3xl font-semibold text-[#f5f1e6]">{franchiseOverview.appointments.total}</div>
                    <div className="mt-2 space-y-1">
                      {franchiseOverview.appointments.statusBreakdown.map((item) => (
                        <div key={item.status} className="flex items-center justify-between text-xs text-[#a39a86]">
                          <span>{item.status}</span>
                          <span className="font-medium text-[#f5f1e6]">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="relative overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[#121110] p-5 shadow-sm">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#d4af37] to-[#9c7a1e]" />
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#a39a86]">Total Customers</div>
                    <div className="mt-2 text-3xl font-semibold text-[#f5f1e6]">{franchiseOverview.customers.total}</div>
                    <div className="mt-1 text-sm text-[#a39a86]">Registered across network</div>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-[rgba(212,175,55,0.16)] bg-[#121110] p-6 shadow-sm text-[#f5f1e6]">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-xl font-semibold text-[#f5f1e6]">Franchise Outlets</h3>
                    <span className="rounded-full border border-[rgba(212,175,55,0.3)] bg-[#17150f] px-2.5 py-0.5 text-xs text-[#d4af37]">
                      Network Locations
                    </span>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {franchiseOverview.branches.map((branch) => (
                      <div key={branch.branchId} className="rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-4 text-[#f5f1e6]">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-[#f5f1e6]">{branch.branchName}</div>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            branch.isActive
                              ? "border border-[rgba(63,174,106,0.3)] bg-[rgba(63,174,106,0.12)] text-[#3fae6a]"
                              : "border border-[rgba(163,154,134,0.3)] bg-[rgba(163,154,134,0.12)] text-[#a39a86]"
                          }`}>
                            {branch.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-[#a39a86]">
                          Established: {new Date(branch.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-[rgba(212,175,55,0.16)] bg-[#121110] p-6 shadow-sm text-[#f5f1e6]">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-xl font-semibold text-[#f5f1e6]">Branch Performance</h3>
                    <span className="rounded-full border border-[rgba(212,175,55,0.3)] bg-[#17150f] px-2.5 py-0.5 text-xs text-[#d4af37]">
                      Staffing & Attendance
                    </span>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {franchiseOverview.branchPerformance.map((branch) => (
                      <div key={branch.branchId} className="rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-4 text-[#f5f1e6]">
                        <div className="font-medium text-[#f5f1e6]">{branch.branchName}</div>
                        <div className="mt-2 flex items-center justify-between text-xs text-[#a39a86]">
                          <span>Active Staff</span>
                          <span className="font-medium text-[#f5f1e6]">{branch.staffCount}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-[#a39a86]">
                          <span>Attendance Records</span>
                          <span className="font-medium text-[#f5f1e6]">{branch.attendanceCount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {franchiseOverview.sales.dailyTrend.length > 0 ? (
                  <div className="mt-6 rounded-2xl border border-[rgba(212,175,55,0.16)] bg-[#121110] p-6 shadow-sm text-[#f5f1e6]">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif text-xl font-semibold text-[#f5f1e6]">Daily Sales Trend</h3>
                      <span className="rounded-full border border-[rgba(212,175,55,0.3)] bg-[#17150f] px-2.5 py-0.5 text-xs text-[#d4af37]">
                        Revenue Activity
                      </span>
                    </div>
                    <div className="mt-4 space-y-3">
                      {franchiseOverview.sales.dailyTrend.map((item) => (
                        <div key={item.date} className="flex items-center justify-between rounded-xl border border-[rgba(212,175,55,0.12)] bg-[#17150f] p-3 text-sm">
                          <div>
                            <div className="font-medium text-[#f5f1e6]">{item.date}</div>
                            <div className="text-xs text-[#a39a86]">
                              {item.invoiceCount} invoice{item.invoiceCount === 1 ? "" : "s"}
                            </div>
                          </div>
                          <div className="text-right font-medium text-[#d4af37]">
                            ₹{(item.totalRevenueCents / 100).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {franchiseOverview.inventory.lowStockItems.length > 0 ? (
                  <div className="mt-6 rounded-2xl border border-[rgba(209,85,74,0.3)] bg-[#121110] p-6 shadow-sm text-[#f5f1e6]">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif text-xl font-semibold text-[#d1554a]">Low Stock Alerts</h3>
                      <span className="rounded-full border border-[rgba(209,85,74,0.4)] bg-[rgba(209,85,74,0.12)] px-2.5 py-0.5 text-xs font-medium text-[#d1554a]">
                        Inventory Attention
                      </span>
                    </div>
                    <div className="mt-4 space-y-3">
                      {franchiseOverview.inventory.lowStockItems.map((item) => (
                        <div key={`${item.productId}-${item.branchId}`} className="flex items-center justify-between rounded-xl border border-[rgba(209,85,74,0.2)] bg-[#17150f] p-3 text-sm">
                          <div>
                            <div className="font-medium text-[#f5f1e6]">{item.productName}</div>
                            <div className="text-xs text-[#a39a86]">
                              {item.branchName}
                            </div>
                          </div>
                          <div className="text-right font-semibold text-[#d1554a]">
                            Qty: {item.quantity}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </section>
        ) : null}

        {activeTab === "Financials" ? (
          <section className="mt-6 space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-serif text-2xl font-bold bg-gradient-to-r from-[#9c7a1e] via-[#d4af37] to-[#f1d78c] bg-clip-text text-transparent">
                Franchise Financials & Payouts
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(224,168,59,0.3)] bg-[rgba(224,168,59,0.12)] px-3 py-1 text-xs font-medium text-[#e0a83b]">
                Pending Commercial Approval (ADR-014)
              </span>
            </div>

            {isLoadingFranchisePayout ? (
              <div className="text-sm text-[#a39a86]">Loading franchise financials...</div>
            ) : null}
            {!isLoadingFranchisePayout && franchisePayoutError ? (
              <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-4 text-sm text-[#d1554a]">{franchisePayoutError}</div>
            ) : null}
            {!isLoadingFranchisePayout && !franchisePayoutError && franchisePayout === null ? (
              <div className="text-sm text-[#a39a86]">No franchise financial data yet.</div>
            ) : null}
            {franchisePayout !== null ? (
              <>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {franchisePayout.payouts.map((payout) => (
                    <div key={payout.partnerId} className="rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[#121110] p-5 shadow-sm text-[#f5f1e6]">
                      <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#a39a86]">Partner Counterparty</div>
                      <div className="mt-1 font-serif text-xl font-semibold text-[#f5f1e6]">{payout.partnerName}</div>
                      
                      <div className="mt-4 space-y-2">
                        <div className="text-xs font-medium uppercase tracking-wider text-[#d4af37]">Outlet Agreement Revenue Share</div>
                        {payout.agreementPayouts.map((agreement) => (
                          <div key={agreement.agreementId} className="rounded-xl border border-[rgba(212,175,55,0.12)] bg-[#17150f] p-3 text-xs">
                            <div className="font-medium text-[#f5f1e6]">{agreement.branchName}</div>
                            <div className="mt-1.5 flex items-center justify-between text-[#a39a86]">
                              <span>Gross Revenue</span>
                              <span className="text-[#f5f1e6]">₹{(agreement.grossRevenueCents / 100).toLocaleString()}</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[#a39a86]">
                              <span>Revenue Share</span>
                              <span className="text-[#f5f1e6]">₹{(agreement.revenueShareCents / 100).toLocaleString()}</span>
                            </div>
                            <div className="mt-1.5 flex items-center justify-between border-t border-[rgba(212,175,55,0.1)] pt-1.5 font-medium text-[#d4af37]">
                              <span>Eligible Revenue Share</span>
                              <span>₹{(agreement.eligibleRevenueSharePayoutCents / 100).toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs font-medium text-[#f5f1e6] border-t border-[rgba(212,175,55,0.15)] pt-2">
                        <span>Revenue Share Total</span>
                        <span className="text-[#d4af37]">₹{(payout.totalRevenueSharePayoutCents / 100).toLocaleString()}</span>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="text-xs font-medium uppercase tracking-wider text-[#d4af37]">Territory Royalty Pool (2%)</div>
                        {payout.territoryRoyalties.map((royalty) => (
                          <div key={royalty.territoryId} className="rounded-xl border border-[rgba(212,175,55,0.12)] bg-[#17150f] p-3 text-xs">
                            <div className="font-medium text-[#f5f1e6]">{royalty.territoryName}</div>
                            <div className="mt-1.5 flex items-center justify-between text-[#a39a86]">
                              <span>Territory Sales Turnover</span>
                              <span className="text-[#f5f1e6]">₹{(royalty.territorySalesTurnoverCents / 100).toLocaleString()}</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[#a39a86]">
                              <span>Royalty Pool (2%)</span>
                              <span className="text-[#f5f1e6]">₹{(royalty.royaltyPoolCents / 100).toLocaleString()}</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[#a39a86]">
                              <span>Eligible Partners</span>
                              <span className="text-[#f5f1e6]">{royalty.eligiblePartnerCount}</span>
                            </div>
                            <div className="mt-1.5 flex items-center justify-between border-t border-[rgba(212,175,55,0.1)] pt-1.5 font-medium text-[#d4af37]">
                              <span>Individual Royalty Share</span>
                              <span>₹{(royalty.individualRoyaltyCents / 100).toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs font-medium text-[#f5f1e6] border-t border-[rgba(212,175,55,0.15)] pt-2">
                        <span>Royalty Total</span>
                        <span className="text-[#d4af37]">₹{(payout.totalTerritoryRoyaltyCents / 100).toLocaleString()}</span>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-[rgba(212,175,55,0.25)] pt-3 text-sm font-semibold text-[#f5f1e6]">
                        <span>Total Eligible Payout</span>
                        <span className="text-lg font-bold text-[#d4af37]">₹{(payout.totalEligiblePayoutCents / 100).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </section>
        ) : null}

        {activeTab === "Territories" ? (
          <section className="mt-6 space-y-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-serif text-2xl font-bold bg-gradient-to-r from-[#9c7a1e] via-[#d4af37] to-[#f1d78c] bg-clip-text text-transparent">Territories</h2>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(212,175,55,0.3)] bg-[#17150f] px-3 py-1 text-xs font-medium text-[#d4af37]">{territories.length} registered</span>
            </div>
            {isLoadingTerritories ? <div className="text-sm text-[#a39a86]">Loading territories...</div> : null}
            {!isLoadingTerritories && territoriesError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-4 text-sm text-[#d1554a]">{territoriesError}</div> : null}
            {!isLoadingTerritories && !territoriesError && territories.length === 0 ? <div className="text-sm text-[#a39a86]">No territories registered yet.</div> : null}
            {territories.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {territories.map((territory) => (
                  <div key={territory.id} className="rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[#121110] p-5 shadow-sm text-[#f5f1e6]">
                    <div className="flex items-center justify-between">
                      <div className="font-serif text-lg font-semibold text-[#f5f1e6]">{territory.name}</div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${territory.isActive ? "border border-[rgba(63,174,106,0.3)] bg-[rgba(63,174,106,0.12)] text-[#3fae6a]" : "border border-[rgba(163,154,134,0.3)] bg-[rgba(163,154,134,0.12)] text-[#a39a86]"}`}>{territory.isActive ? "Active" : "Inactive"}</span>
                    </div>
                    {territory.code ? <div className="mt-1 text-xs text-[#a39a86]">Code: {territory.code}</div> : null}
                    <div className="mt-3 flex items-center justify-between text-xs text-[#a39a86]">
                      <span>Outlets</span>
                      <span className="font-medium text-[#f5f1e6]">{territory.outletCount}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-[#a39a86]">
                      <span>Partners</span>
                      <span className="font-medium text-[#f5f1e6]">{territory.partnerCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {activeTab === "Partners" ? (
          <section className="mt-6 space-y-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold bg-gradient-to-r from-[#9c7a1e] via-[#d4af37] to-[#f1d78c] bg-clip-text text-transparent">Franchise Partners</h2>
                <p className="mt-1 text-sm text-[#a39a86]">Manage franchise partners, agreements, and outlet assignments.</p>
              </div>
              <div className="flex items-center gap-3">
                {permissionCodes.includes("franchise.write") ? (
                  <button onClick={() => { cancelPartnerForm(); setShowAddPartner(true); }} className="premium-btn-primary px-4 py-2 text-sm">+ Add Partner</button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <div className="text-xs text-[#a39a86]">Total Partners</div>
                <div className="mt-1 text-2xl font-bold text-[#d4af37]">{partners.length}</div>
              </div>
              <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <div className="text-xs text-[#a39a86]">Active Partners</div>
                <div className="mt-1 text-2xl font-bold text-[#3fae6a]">{partners.filter((p) => p.isActive).length}</div>
              </div>
              <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <div className="text-xs text-[#a39a86]">Active Agreements</div>
                <div className="mt-1 text-2xl font-bold text-[#d4af37]">{agreements.filter((a) => a.isActive).length}</div>
              </div>
              <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <div className="text-xs text-[#a39a86]">Active Outlets</div>
                <div className="mt-1 text-2xl font-bold text-[#d4af37]">{outlets.filter((o) => o.isActive).length}</div>
              </div>
            </div>

            {(showAddPartner || editingPartnerId) ? (
              <div className="rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[#121110] p-5">
                <h3 className="text-lg font-semibold text-[#f5f1e6]">{editingPartnerId ? "Edit Partner" : "Add New Partner"}</h3>
                <div className="mt-4 space-y-3">
                  {partnerFormError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{partnerFormError}</div> : null}
                  <input value={partnerFormName} onChange={(e) => setPartnerFormName(e.target.value)} placeholder="Partner name *" className="premium-input" />
                  <input value={partnerFormEmail} onChange={(e) => setPartnerFormEmail(e.target.value)} placeholder="Email" className="premium-input" />
                  <input value={partnerFormPhone} onChange={(e) => setPartnerFormPhone(e.target.value)} placeholder="Phone" className="premium-input" />
                  <input value={partnerFormAddress} onChange={(e) => setPartnerFormAddress(e.target.value)} placeholder="Address" className="premium-input" />
                  <div className="flex gap-2">
                    <button onClick={() => editingPartnerId ? updatePartner(editingPartnerId) : createPartner()} disabled={partnerFormLoading} className="premium-btn-primary px-4 py-2 text-sm disabled:opacity-60">{partnerFormLoading ? "Saving..." : editingPartnerId ? "Update Partner" : "Create Partner"}</button>
                    <button onClick={cancelPartnerForm} className="rounded-xl bg-[#f0dfe6] px-4 py-2 text-sm font-semibold text-[#d4af37]">Cancel</button>
                  </div>
                </div>
              </div>
            ) : null}

            {isLoadingPartners ? <div className="text-sm text-[#a39a86]">Loading partners...</div> : null}
            {!isLoadingPartners && partnersError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-4 text-sm text-[#d1554a]">{partnersError}</div> : null}
            {!isLoadingPartners && !partnersError && partners.length === 0 ? (
              <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-8 text-center">
                <div className="text-sm text-[#a39a86]">No franchise partners registered yet.</div>
                {permissionCodes.includes("franchise.write") ? (
                  <button onClick={() => { cancelPartnerForm(); setShowAddPartner(true); }} className="mt-4 premium-btn-primary px-4 py-2 text-sm">+ Add First Partner</button>
                ) : null}
              </div>
            ) : null}
            {partners.length > 0 ? (
              <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[rgba(212,175,55,0.1)] text-left text-[#a39a86]">
                        <th className="pb-3 pr-4 font-medium">Partner</th>
                        <th className="pb-3 pr-4 font-medium">Contact</th>
                        <th className="pb-3 pr-4 font-medium">Outlets</th>
                        <th className="pb-3 pr-4 font-medium">Agreements</th>
                        <th className="pb-3 pr-4 font-medium">Status</th>
                        <th className="pb-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partners.map((partner) => (
                        <tr key={partner.id} className="border-b border-[rgba(212,175,55,0.05)]">
                          <td className="py-3 pr-4">
                            <div className="font-medium text-[#f5f1e6]">{partner.name}</div>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="space-y-0.5">
                              {partner.email ? <div className="text-xs text-[#a39a86]">{partner.email}</div> : null}
                              {partner.phone ? <div className="text-xs text-[#a39a86]">{partner.phone}</div> : null}
                              {!partner.email && !partner.phone ? <div className="text-xs text-[#a39a86]">—</div> : null}
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-[#f5f1e6]">{partner.outletCount}</td>
                          <td className="py-3 pr-4 text-[#f5f1e6]">{partner.agreementCount}</td>
                          <td className="py-3 pr-4">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${partner.isActive ? "border border-[rgba(63,174,106,0.3)] bg-[rgba(63,174,106,0.12)] text-[#3fae6a]" : "border border-[rgba(163,154,134,0.3)] bg-[rgba(163,154,134,0.12)] text-[#a39a86]"}`}>{partner.isActive ? "Active" : "Inactive"}</span>
                          </td>
                          <td className="py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {partner.email ? <a href={`mailto:${partner.email}`} className="rounded-lg border border-[rgba(212,175,55,0.2)] bg-[#17150f] px-2 py-1 text-xs font-medium text-[#d4af37] hover:bg-[#1f1d15]">Email</a> : null}
                              {partner.phone ? <a href={`tel:${partner.phone}`} className="rounded-lg border border-[rgba(212,175,55,0.2)] bg-[#17150f] px-2 py-1 text-xs font-medium text-[#d4af37] hover:bg-[#1f1d15]">Call</a> : null}
                              {partner.phone ? <a href={`https://wa.me/${partner.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-[rgba(63,174,106,0.3)] bg-[rgba(63,174,106,0.08)] px-2 py-1 text-xs font-medium text-[#3fae6a] hover:bg-[rgba(63,174,106,0.15)]">WhatsApp</a> : null}
                              {permissionCodes.includes("franchise.write") ? (
                                <button onClick={() => startEditPartner(partner)} className="rounded-lg border border-[rgba(212,175,55,0.2)] bg-[#17150f] px-2 py-1 text-xs font-medium text-[#d4af37] hover:bg-[#1f1d15]">Edit</button>
                              ) : null}
                              <button onClick={() => window.open(`/xnail/franchise/partners/${partner.id}/dashboard`, "_blank")} className="premium-btn-primary px-2 py-1 text-xs">Dashboard</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {activeTab === "Agreements" ? (
          <section className="mt-6 space-y-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-serif text-2xl font-bold bg-gradient-to-r from-[#9c7a1e] via-[#d4af37] to-[#f1d78c] bg-clip-text text-transparent">Franchise Agreements</h2>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(212,175,55,0.3)] bg-[#17150f] px-3 py-1 text-xs font-medium text-[#d4af37]">{agreements.length} active</span>
            </div>
            {isLoadingAgreements ? <div className="text-sm text-[#a39a86]">Loading agreements...</div> : null}
            {!isLoadingAgreements && agreementsError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-4 text-sm text-[#d1554a]">{agreementsError}</div> : null}
            {!isLoadingAgreements && !agreementsError && agreements.length === 0 ? <div className="text-sm text-[#a39a86]">No franchise agreements registered yet.</div> : null}
            {agreements.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {agreements.map((agreement) => (
                  <div key={agreement.id} className="rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[#121110] p-5 shadow-sm text-[#f5f1e6]">
                    <div className="flex items-center justify-between">
                      <div className="font-serif text-lg font-semibold text-[#f5f1e6]">{agreement.partnerName}</div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${agreement.isActive ? "border border-[rgba(63,174,106,0.3)] bg-[rgba(63,174,106,0.12)] text-[#3fae6a]" : "border border-[rgba(163,154,134,0.3)] bg-[rgba(163,154,134,0.12)] text-[#a39a86]"}`}>{agreement.isActive ? "Active" : "Inactive"}</span>
                    </div>
                    <div className="mt-1 text-xs text-[#a39a86]">Territory: {agreement.territoryName}</div>
                    <div className="mt-1 text-xs text-[#a39a86]">Start: {new Date(agreement.startDate).toLocaleDateString()}</div>
                    {agreement.endDate ? <div className="mt-1 text-xs text-[#a39a86]">End: {new Date(agreement.endDate).toLocaleDateString()}</div> : null}
                    <div className="mt-3 flex items-center justify-between text-xs text-[#a39a86]">
                      <span>Outlets</span>
                      <span className="font-medium text-[#f5f1e6]">{agreement.outletCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {activeTab === "Outlets" ? (
          <section className="mt-6 space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold bg-gradient-to-r from-[#9c7a1e] via-[#d4af37] to-[#f1d78c] bg-clip-text text-transparent">Franchise Outlets</h2>
                <p className="mt-1 text-sm text-[#a39a86]">Register outlets from existing branches and assign franchise ownership.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(212,175,55,0.3)] bg-[#17150f] px-3 py-1 text-xs font-medium text-[#d4af37]">{outlets.length} registered</span>
                {permissionCodes.includes("franchise.write") ? (
                  <button onClick={() => { resetOutletForm(); setShowAddOutlet(true); }} className="premium-btn-primary px-4 py-2 text-sm">+ Add Outlet</button>
                ) : null}
              </div>
            </div>

            {showAddOutlet ? (
              <div className="rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[#121110] p-5">
                <h3 className="text-lg font-semibold text-[#f5f1e6]">Add Franchise Outlet</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {outletFormError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a] md:col-span-2">{outletFormError}</div> : null}
                  <div>
                    <label className="mb-1 block text-xs text-[#a39a86]">Branch *</label>
                    <select value={outletFormBranchId} onChange={(event) => setOutletFormBranchId(event.target.value)} className="premium-input w-full">
                      <option value="">Select branch</option>
                      {availableOutletBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                    </select>
                    {branches.length > 0 && availableOutletBranches.length === 0 ? <div className="mt-1 text-xs text-[#a39a86]">All active branches already have registered outlets.</div> : null}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#a39a86]">Ownership Mode *</label>
                    <select
                      value={outletFormOwnershipMode}
                      onChange={(event) => {
                        const mode = event.target.value as "UNDER_FRANCHISE_PARTNER" | "COMPANY_OWNED";
                        setOutletFormOwnershipMode(mode);
                        if (mode === "COMPANY_OWNED") {
                          setOutletFormPartnerId("");
                        }
                      }}
                      className="premium-input w-full"
                    >
                      <option value="UNDER_FRANCHISE_PARTNER">Under Franchise Partner</option>
                      <option value="COMPANY_OWNED">Company Owned</option>
                    </select>
                  </div>
                  {outletFormOwnershipMode === "UNDER_FRANCHISE_PARTNER" ? (
                    <div>
                      <label className="mb-1 block text-xs text-[#a39a86]">Franchise Partner *</label>
                      <select value={outletFormPartnerId} onChange={(event) => setOutletFormPartnerId(event.target.value)} className="premium-input w-full">
                        <option value="">Select partner</option>
                        {partners.filter((partner) => partner.isActive).map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
                      </select>
                    </div>
                  ) : null}
                  <div>
                    <label className="mb-1 block text-xs text-[#a39a86]">Territory</label>
                    <select value={outletFormTerritoryId} onChange={(event) => setOutletFormTerritoryId(event.target.value)} className="premium-input w-full">
                      <option value="">No territory</option>
                      {territories.filter((territory) => territory.isActive).map((territory) => <option key={territory.id} value={territory.id}>{territory.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#a39a86]">Outlet Type</label>
                    <input value={outletFormType} onChange={(event) => setOutletFormType(event.target.value)} placeholder="Default: STANDALONE" className="premium-input w-full" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#a39a86]">Investment Amount</label>
                    <input type="number" min="0" step="0.01" value={outletFormInvestment} onChange={(event) => setOutletFormInvestment(event.target.value)} placeholder="Optional" className="premium-input w-full" />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => void createOutlet()} disabled={outletFormLoading || !outletFormBranchId || (outletFormOwnershipMode === "UNDER_FRANCHISE_PARTNER" && !outletFormPartnerId)} className="premium-btn-primary px-4 py-2 text-sm disabled:opacity-60">{outletFormLoading ? "Saving..." : "Create Outlet"}</button>
                  <button onClick={cancelOutletForm} className="premium-btn-secondary px-4 py-2 text-sm">Cancel</button>
                </div>
              </div>
            ) : null}
            {isLoadingOutlets ? <div className="text-sm text-[#a39a86]">Loading outlets...</div> : null}
            {!isLoadingOutlets && outletsError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-4 text-sm text-[#d1554a]">{outletsError}</div> : null}
            {!isLoadingOutlets && !outletsError && outlets.length === 0 ? <div className="text-sm text-[#a39a86]">No franchise outlets registered yet.</div> : null}
            {outlets.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {outlets.map((outlet) => (
                  <div key={outlet.id} className="rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[#121110] p-5 shadow-sm text-[#f5f1e6]">
                    <div className="flex items-center justify-between">
                      <div className="font-serif text-lg font-semibold text-[#f5f1e6]">{outlet.branchName}</div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${outlet.isActive ? "border border-[rgba(63,174,106,0.3)] bg-[rgba(63,174,106,0.12)] text-[#3fae6a]" : "border border-[rgba(163,154,134,0.3)] bg-[rgba(163,154,134,0.12)] text-[#a39a86]"}`}>{outlet.isActive ? "Active" : "Inactive"}</span>
                    </div>
                    <div className="mt-1 text-xs text-[#a39a86]">Partner: {outlet.partnerId ? (outlet.partnerName ?? "Unknown") : "Company owned"}</div>
                    {outlet.territoryName ? <div className="mt-1 text-xs text-[#a39a86]">Territory: {outlet.territoryName}</div> : null}
                    {outlet.outletType ? <div className="mt-1 text-xs text-[#a39a86]">Type: {outlet.outletType}</div> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {activeTab === "Franchise Settlement" ? (
          <section className="mt-6 space-y-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-serif text-2xl font-bold bg-gradient-to-r from-[#9c7a1e] via-[#d4af37] to-[#f1d78c] bg-clip-text text-transparent">Franchise Settlement</h2>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(212,175,55,0.3)] bg-[#17150f] px-3 py-1 text-xs font-medium text-[#d4af37]">{settlements.length} settlement{settlements.length === 1 ? "" : "s"}</span>
                <button onClick={() => { setShowGenerateDialog(true); setGenerateError(null); }} className="rounded-lg border border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.08)] px-3 py-1.5 text-xs font-medium text-[#d4af37] transition-colors hover:bg-[rgba(212,175,55,0.15)]">Generate Settlement</button>
              </div>
            </div>

            {approveError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{approveError}</div> : null}

            {/* Generate Dialog */}
            {showGenerateDialog ? (
              <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <h3 className="text-lg font-semibold text-[#f5f1e6]">Generate Monthly Settlement</h3>
                <p className="mt-1 text-sm text-[#a39a86]">Select a franchise agreement and calendar month.</p>
                {generateError ? <div className="mt-3 rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{generateError}</div> : null}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-[#a39a86]">Franchise Agreement</label>
                    <select value={generateAgreementId} onChange={(e) => setGenerateAgreementId(e.target.value)} className="premium-input w-full">
                      <option value="">Select agreement</option>
                      {agreements.map((a) => <option key={a.id} value={a.id}>{a.partnerName} — {a.territoryName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#a39a86]">Settlement Month</label>
                    <input type="month" value={generateMonth} onChange={(e) => setGenerateMonth(e.target.value)} className="premium-input w-full" />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => void generateSettlement()} disabled={generateLoading} className="premium-btn-primary px-4 py-2 text-sm disabled:opacity-50">{generateLoading ? "Generating..." : "Generate"}</button>
                  <button onClick={() => { setShowGenerateDialog(false); setGenerateError(null); }} className="rounded-lg border border-[rgba(163,154,134,0.3)] bg-[rgba(163,154,134,0.08)] px-4 py-2 text-sm text-[#a39a86] transition-colors hover:bg-[rgba(163,154,134,0.15)]">Cancel</button>
                </div>
              </div>
            ) : null}

            {/* Settlement List */}
            {isLoadingSettlements ? <div className="text-sm text-[#a39a86]">Loading settlements...</div> : null}
            {!isLoadingSettlements && settlementsError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-4 text-sm text-[#d1554a]">{settlementsError}</div> : null}
            {!isLoadingSettlements && !settlementsError && settlements.length === 0 ? <div className="text-sm text-[#a39a86]">No settlements generated yet. Use &quot;Generate Settlement&quot; to create one.</div> : null}

            {/* Settlement Detail View */}
            {selectedSettlement ? (
              <div className="rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[#121110] p-6 text-[#f5f1e6]">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-serif text-xl font-bold text-[#f5f1e6]">Settlement Statement</h3>
                    <div className="mt-1 text-sm text-[#a39a86]">
                      Period: {new Date(selectedSettlement.periodStart).toLocaleDateString()} — {new Date(selectedSettlement.periodEnd).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-[#6b6455]">Generated: {new Date(selectedSettlement.generatedAt).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${selectedSettlement.status === "APPROVED" ? "border border-[rgba(63,174,106,0.3)] bg-[rgba(63,174,106,0.12)] text-[#3fae6a]" : "border border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.12)] text-[#d4af37]"}`}>
                      {selectedSettlement.status === "APPROVED" ? "Approved — Immutable" : selectedSettlement.status}
                    </span>
                    {selectedSettlement.status === "CALCULATED" ? (
                      <button onClick={() => setShowApproveConfirm(true)} className="rounded-lg border border-[rgba(63,174,106,0.3)] bg-[rgba(63,174,106,0.08)] px-3 py-1 text-xs font-medium text-[#3fae6a] transition-colors hover:bg-[rgba(63,174,106,0.15)]">Approve</button>
                    ) : null}
                    <button onClick={() => { setSelectedSettlement(null); setSelectedSettlementLines([]); }} className="rounded-lg border border-[rgba(163,154,134,0.3)] bg-[rgba(163,154,134,0.08)] px-3 py-1 text-xs text-[#a39a86] transition-colors hover:bg-[rgba(163,154,134,0.15)]">Close</button>
                  </div>
                </div>

                {selectedSettlement.approvedAt ? (
                  <div className="mt-2 text-xs text-[#3fae6a]">Approved: {new Date(selectedSettlement.approvedAt).toLocaleString()}</div>
                ) : null}

                {/* Approve Confirmation */}
                {showApproveConfirm ? (
                  <div className="mt-4 rounded-xl border border-[rgba(63,174,106,0.3)] bg-[rgba(63,174,106,0.06)] p-4">
                    <p className="text-sm text-[#f5f1e6]">Approve this settlement? Once approved, the settlement is treated as immutable.</p>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => void approveSettlement(selectedSettlement.id)} disabled={approveLoading} className="rounded-lg border border-[rgba(63,174,106,0.3)] bg-[rgba(63,174,106,0.15)] px-3 py-1.5 text-xs font-medium text-[#3fae6a] transition-colors hover:bg-[rgba(63,174,106,0.25)] disabled:opacity-50">{approveLoading ? "Approving..." : "Confirm Approval"}</button>
                      <button onClick={() => setShowApproveConfirm(false)} className="rounded-lg border border-[rgba(163,154,134,0.3)] bg-[rgba(163,154,134,0.08)] px-3 py-1.5 text-xs text-[#a39a86]">Cancel</button>
                    </div>
                  </div>
                ) : null}

                {/* Sales Summary */}
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#a39a86]">Gross Sales</div>
                    <div className="mt-1 text-lg font-semibold">₹{(selectedSettlement.grossSalesCents / 100).toLocaleString()}</div>
                  </div>
                  <div className="rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#a39a86]">GST</div>
                    <div className="mt-1 text-lg font-semibold">₹{(selectedSettlement.gstCents / 100).toLocaleString()}</div>
                  </div>
                  <div className="rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#a39a86]">Net Sales</div>
                    <div className="mt-1 text-lg font-semibold text-[#d4af37]">₹{(selectedSettlement.netSalesCents / 100).toLocaleString()}</div>
                  </div>
                </div>

                {/* Commercial Calculation */}
                <div className="mt-6">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a39a86]">Commercial Calculation</h4>
                  <div className="mt-3 space-y-2 rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#a39a86]">Minimum Guarantee</span>
                      <span>₹{(selectedSettlement.mgCents / 100).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#a39a86]">Variable Return</span>
                      <span>₹{(selectedSettlement.variableReturnCents / 100).toLocaleString()}</span>
                    </div>
                    <div className="border-t border-[rgba(212,175,55,0.1)] pt-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-[#d4af37]">Payout (Higher-of MG vs Variable)</span>
                        <span className="font-medium text-[#d4af37]">₹{(selectedSettlement.payoutCents / 100).toLocaleString()}</span>
                      </div>
                      <div className="mt-1 text-xs text-[#6b6455]">The payout is the higher of MG and Variable Return — not the sum of both.</div>
                    </div>
                    <div className="border-t border-[rgba(212,175,55,0.1)] pt-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#a39a86]">Territory Royalty</span>
                        <span>₹{(selectedSettlement.royaltyCents / 100).toLocaleString()}</span>
                      </div>
                    </div>
                    {selectedSettlement.adjustmentCents !== 0 ? (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#a39a86]">Adjustments</span>
                        <span>₹{(selectedSettlement.adjustmentCents / 100).toLocaleString()}</span>
                      </div>
                    ) : null}
                    <div className="border-t border-[rgba(212,175,55,0.3)] pt-2">
                      <div className="flex items-center justify-between text-lg font-bold">
                        <span className="text-[#d4af37]">Total Settlement</span>
                        <span className="text-[#d4af37]">₹{(selectedSettlement.totalCents / 100).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Calculation Lines */}
                {selectedSettlementLines.length > 0 ? (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a39a86]">Calculation Breakdown</h4>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[rgba(212,175,55,0.1)]">
                            <th className="py-2 text-left text-xs font-medium uppercase tracking-wider text-[#a39a86]">Type</th>
                            <th className="py-2 text-left text-xs font-medium uppercase tracking-wider text-[#a39a86]">Description</th>
                            <th className="py-2 text-right text-xs font-medium uppercase tracking-wider text-[#a39a86]">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedSettlementLines.map((line) => (
                            <tr key={line.id} className="border-b border-[rgba(212,175,55,0.05)]">
                              <td className="py-2">
                                <span className="rounded-full px-2 py-0.5 text-xs font-medium border border-[rgba(212,175,55,0.2)] bg-[rgba(212,175,55,0.06)] text-[#d4af37]">{line.lineType}</span>
                              </td>
                              <td className="py-2 text-[#a39a86]">{line.description}</td>
                              <td className="py-2 text-right font-medium">₹{(line.amountCents / 100).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}

                {/* Terms Snapshot */}
                {selectedSettlement.termsSnapshot ? (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a39a86]">Terms Snapshot</h4>
                    <div className="mt-3 rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-4 text-xs text-[#6b6455]">
                      Captured at generation time. The settlement preserves the commercial terms and sales basis used for this calculation.
                    </div>
                  </div>
                ) : null}

                {settlementDetailLoading ? <div className="mt-4 text-sm text-[#a39a86]">Loading detail...</div> : null}
              </div>
            ) : null}

            {/* Settlement List Table */}
            {!isLoadingSettlements && settlements.length > 0 && !selectedSettlement ? (
              <div className="rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[#121110] p-5">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[rgba(212,175,55,0.1)]">
                        <th className="py-2 text-left text-xs font-medium uppercase tracking-wider text-[#a39a86]">Period</th>
                        <th className="py-2 text-left text-xs font-medium uppercase tracking-wider text-[#a39a86]">Status</th>
                        <th className="py-2 text-right text-xs font-medium uppercase tracking-wider text-[#a39a86]">Net Sales</th>
                        <th className="py-2 text-right text-xs font-medium uppercase tracking-wider text-[#a39a86]">Payout</th>
                        <th className="py-2 text-right text-xs font-medium uppercase tracking-wider text-[#a39a86]">Royalty</th>
                        <th className="py-2 text-right text-xs font-medium uppercase tracking-wider text-[#a39a86]">Total</th>
                        <th className="py-2 text-center text-xs font-medium uppercase tracking-wider text-[#a39a86]">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settlements.map((s) => (
                        <tr key={s.id} className="border-b border-[rgba(212,175,55,0.05)] hover:bg-[rgba(212,175,55,0.03)]">
                          <td className="py-3 text-[#f5f1e6]">{new Date(s.periodStart).toLocaleDateString()} — {new Date(s.periodEnd).toLocaleDateString()}</td>
                          <td className="py-3">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.status === "APPROVED" ? "border border-[rgba(63,174,106,0.3)] bg-[rgba(63,174,106,0.12)] text-[#3fae6a]" : "border border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.12)] text-[#d4af37]"}`}>{s.status}</span>
                          </td>
                          <td className="py-3 text-right text-[#a39a86]">₹{(s.netSalesCents / 100).toLocaleString()}</td>
                          <td className="py-3 text-right text-[#a39a86]">₹{(s.payoutCents / 100).toLocaleString()}</td>
                          <td className="py-3 text-right text-[#a39a86]">₹{(s.royaltyCents / 100).toLocaleString()}</td>
                          <td className="py-3 text-right font-medium text-[#d4af37]">₹{(s.totalCents / 100).toLocaleString()}</td>
                          <td className="py-3 text-center">
                            <button onClick={() => void loadSettlementDetail(s.id)} className="rounded-lg border border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.08)] px-2 py-1 text-xs text-[#d4af37] transition-colors hover:bg-[rgba(212,175,55,0.15)]">View</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {activeTab === "Hierarchy" ? (
          <HierarchyDashboard authenticated={authenticated} />
        ) : null}

        {activeTab === "Overview" ? (
          <section className="mt-6 space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {[
                { label: "Revenue", value: report !== null ? `₹${report.sales.totalRevenueCents / 100}` : "—", sub: report !== null ? `${report.sales.invoiceCount} invoice${report.sales.invoiceCount === 1 ? "" : "s"}` : undefined, loading: isLoadingReport },
                { label: "Appointments", value: report !== null ? String(report.appointments.total) : "—", sub: report !== null ? report.appointments.statusBreakdown.map((s) => `${s.count} ${s.status.toLowerCase()}`).join(", ") : undefined, loading: isLoadingReport },
                { label: "Customers", value: report !== null ? String(report.customers.total) : "—", sub: `${customers.length} loaded`, loading: isLoadingReport },
                { label: "Staff", value: String(staff.length), sub: `${attendance.filter((a) => a.checkOutAt === null).length} checked in`, loading: isLoadingStaff },
                { label: "Follow-ups", value: String(crmPendingFollowups.length), sub: crmPendingFollowups.length > 0 ? `Next: ${new Date(crmPendingFollowups[0].dueAt).toLocaleDateString()}` : "None pending", loading: false },
                { label: "Stock Items", value: report !== null ? String(report.inventory.stockItemCount) : "—", sub: report !== null ? `Qty: ${report.inventory.totalQuantity}` : undefined, loading: isLoadingReport },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#a39a86]">{kpi.label}</div>
                  <div className="mt-2 text-2xl font-semibold text-[#f5f1e6]">{kpi.loading ? "…" : kpi.value}</div>
                  {kpi.sub !== undefined ? <div className="mt-1 text-xs text-[#a39a86]">{kpi.sub}</div> : null}
                </div>
              ))}
            </div>

            {/* Today's Operations */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Appointments */}
              <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <h3 className="font-serif text-lg font-semibold text-[#f5f1e6]">Appointments</h3>
                {appointments.length === 0 ? (
                  <div className="mt-3 text-sm text-[#a39a86]">No appointments yet.</div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {appointments.slice(0, 5).map((appt) => {
                      const customer = customers.find((c) => c.id === appt.customerId);
                      const service = services.find((s) => s.id === appt.serviceId);
                      return (
                        <div key={appt.id} className="flex items-center justify-between rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                          <div>
                            <div className="font-medium text-[#f5f1e6]">{customer?.name ?? "Unknown"}</div>
                            <div className="text-xs text-[#a39a86]">{service?.name ?? "Service"}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-[#a39a86]">{new Date(appt.startsAt).toLocaleDateString()}</div>
                            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${appt.status === "Completed" ? "border border-[rgba(63,174,106,0.3)] bg-[rgba(63,174,106,0.12)] text-[#3fae6a]" : "border border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.12)] text-[#d4af37]"}`}>{appt.status ?? "Pending"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent Sales / Invoices */}
              <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <h3 className="font-serif text-lg font-semibold text-[#f5f1e6]">Recent Sales</h3>
                {invoices.length === 0 ? (
                  <div className="mt-3 text-sm text-[#a39a86]">No invoices yet.</div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {invoices.slice(0, 5).map((inv) => {
                      const customer = customers.find((c) => c.id === inv.customerId);
                      return (
                        <div key={inv.id} className="flex items-center justify-between rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                          <div>
                            <div className="font-medium text-[#f5f1e6]">{customer?.name ?? "Walk-in"}</div>
                            <div className="text-xs text-[#a39a86]">{new Date(inv.issuedAt).toLocaleDateString()}</div>
                          </div>
                          <div className="text-sm font-medium text-[#d4af37]">₹{inv.totalCents / 100}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Business Health */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Inventory */}
              <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <h3 className="font-serif text-lg font-semibold text-[#f5f1e6]">Inventory</h3>
                {report !== null ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                      <span className="text-sm text-[#a39a86]">Stock Items</span>
                      <span className="font-medium text-[#f5f1e6]">{report.inventory.stockItemCount}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                      <span className="text-sm text-[#a39a86]">Total Quantity</span>
                      <span className="font-medium text-[#f5f1e6]">{report.inventory.totalQuantity}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                      <span className="text-sm text-[#a39a86]">Movements</span>
                      <span className="font-medium text-[#f5f1e6]">{report.inventory.movementCount}</span>
                    </div>
                  </div>
                ) : isLoadingReport ? (
                  <div className="mt-3 text-sm text-[#a39a86]">Loading…</div>
                ) : (
                  <div className="mt-3 text-sm text-[#a39a86]">No inventory data.</div>
                )}
              </div>

              {/* Staff & Attendance */}
              <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <h3 className="font-serif text-lg font-semibold text-[#f5f1e6]">Staff & Attendance</h3>
                {staff.length === 0 ? (
                  <div className="mt-3 text-sm text-[#a39a86]">No staff records.</div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {staff.slice(0, 5).map((s) => {
                      const todayAttendance = attendance.find((a) => a.staffId === s.id && a.checkOutAt === null);
                      return (
                        <div key={s.id} className="flex items-center justify-between rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                          <div className="font-medium text-[#f5f1e6]">{s.displayName}</div>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${todayAttendance ? "border border-[rgba(63,174,106,0.3)] bg-[rgba(63,174,106,0.12)] text-[#3fae6a]" : "border border-[rgba(163,154,134,0.3)] bg-[rgba(163,154,134,0.12)] text-[#a39a86]"}`}>{todayAttendance ? "In" : "Out"}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "Reports" ? (
          <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {isLoadingReport ? <div className="text-sm text-[#a39a86]">Loading reports...</div> : null}
            {!isLoadingReport && reportError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{reportError}</div> : null}
            {!isLoadingReport && !reportError && report === null ? <div className="text-sm text-[#a39a86]">No report data yet.</div> : null}
            {report !== null ? (
              <>
                <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#a39a86]">Invoices</div>
                  <div className="mt-2 text-3xl font-semibold">{report.sales.invoiceCount}</div>
                </div>
                <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#a39a86]">Revenue</div>
                  <div className="mt-2 text-3xl font-semibold">₹{report.sales.totalRevenueCents / 100}</div>
                </div>
                <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#a39a86]">Appointments</div>
                  <div className="mt-2 text-3xl font-semibold">{report.appointments.total}</div>
                  <div className="mt-2 space-y-1">
                    {report.appointments.statusBreakdown.map((item) => (
                      <div key={item.status} className="flex items-center justify-between text-xs text-[#a39a86]">
                        <span>{item.status}</span>
                        <span className="font-medium">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#a39a86]">Customers</div>
                  <div className="mt-2 text-3xl font-semibold">{report.customers.total}</div>
                </div>
                <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#a39a86]">Stock Items</div>
                  <div className="mt-2 text-3xl font-semibold">{report.inventory.stockItemCount}</div>
                  <div className="mt-1 text-sm text-[#a39a86]">Total qty: {report.inventory.totalQuantity}</div>
                </div>
                <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#a39a86]">Movements</div>
                  <div className="mt-2 text-3xl font-semibold">{report.inventory.movementCount}</div>
                </div>
              </>
            ) : null}
            {isLoadingDailySales ? <div className="text-sm text-[#a39a86]">Loading daily sales...</div> : null}
            {!isLoadingDailySales && dailySalesError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{dailySalesError}</div> : null}
            {!isLoadingDailySales && !dailySalesError && dailySales.length === 0 ? <div className="text-sm text-[#a39a86]">No daily sales yet.</div> : null}
            {dailySales.length > 0 ? (
              <div className="mt-6 rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <h2 className="text-xl font-semibold">Daily Sales</h2>
                <div className="mt-4 space-y-3">
                  {dailySales.map((item) => (
                    <div key={item.date} className="flex items-center justify-between rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                      <div>
                        <div className="font-medium">{item.date}</div>
                        <div className="text-sm text-[#a39a86]">{item.invoiceCount} invoice{item.invoiceCount === 1 ? "" : "s"}</div>
                      </div>
                      <div className="text-right text-sm text-[#a39a86]">
                        <div>₹{item.totalRevenueCents / 100}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {isLoadingAppointmentReport ? <div className="text-sm text-[#a39a86]">Loading appointment report...</div> : null}
            {!isLoadingAppointmentReport && appointmentReportError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{appointmentReportError}</div> : null}
            {!isLoadingAppointmentReport && !appointmentReportError && appointmentReport.length === 0 ? <div className="text-sm text-[#a39a86]">No appointment data yet.</div> : null}
            {appointmentReport.length > 0 ? (
              <div className="mt-6 rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <h2 className="text-xl font-semibold">Appointment Report</h2>
                <div className="mt-4 space-y-3">
                  {appointmentReport.map((item) => (
                    <div key={item.date} className="flex items-center justify-between rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                      <div>
                        <div className="font-medium">{item.date}</div>
                        <div className="text-sm text-[#a39a86]">{item.appointmentCount} appointment{item.appointmentCount === 1 ? "" : "s"}</div>
                        <div className="mt-1 space-y-1">
                          {item.statusBreakdown.map((status) => (
                            <div key={status.status} className="flex items-center justify-between text-xs text-[#a39a86]">
                              <span>{status.status}</span>
                              <span className="font-medium">{status.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {isLoadingMembershipReport ? <div className="text-sm text-[#a39a86]">Loading membership report...</div> : null}
            {!isLoadingMembershipReport && membershipReportError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{membershipReportError}</div> : null}
            {!isLoadingMembershipReport && !membershipReportError && membershipReport.length === 0 ? <div className="text-sm text-[#a39a86]">No membership data yet.</div> : null}
            {membershipReport.length > 0 ? (
              <div className="mt-6 rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <h2 className="text-xl font-semibold">Membership Report</h2>
                <div className="mt-4 space-y-3">
                  {membershipReport.map((item) => (
                    <div key={item.status} className="flex items-center justify-between rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                      <div>
                        <div className="font-medium">{item.status}</div>
                        <div className="text-sm text-[#a39a86]">{item.count} membership{item.count === 1 ? "" : "s"}</div>
                        <div className="mt-1 space-y-1">
                          {item.packageBreakdown.map((pkg) => (
                            <div key={pkg.packageId} className="flex items-center justify-between text-xs text-[#a39a86]">
                              <span>{pkg.packageName}</span>
                              <span className="font-medium">{pkg.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {isLoadingPackageUtilizationReport ? <div className="text-sm text-[#a39a86]">Loading package utilization...</div> : null}
            {!isLoadingPackageUtilizationReport && packageUtilizationReportError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{packageUtilizationReportError}</div> : null}
            {!isLoadingPackageUtilizationReport && !packageUtilizationReportError && packageUtilizationReport.length === 0 ? <div className="text-sm text-[#a39a86]">No package utilization data yet.</div> : null}
            {packageUtilizationReport.length > 0 ? (
              <div className="mt-6 rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <h2 className="text-xl font-semibold">Package Utilization</h2>
                <div className="mt-4 space-y-3">
                  {packageUtilizationReport.map((item) => (
                    <div key={item.packageId} className="flex items-center justify-between rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                      <div>
                        <div className="font-medium">{item.packageName}</div>
                        <div className="text-sm text-[#a39a86]">{item.totalMemberships} total / {item.activeMemberships} active</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {isLoadingGstSummary ? <div className="text-sm text-[#a39a86]">Loading GST summary...</div> : null}
            {!isLoadingGstSummary && gstSummaryError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{gstSummaryError}</div> : null}
            {!isLoadingGstSummary && !gstSummaryError && gstSummary === null ? <div className="text-sm text-[#a39a86]">No GST data yet.</div> : null}
            {gstSummary !== null ? (
              <div className="mt-6 rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <h2 className="text-xl font-semibold">GST Summary</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#a39a86]">Total GST</div>
                    <div className="mt-2 text-2xl font-semibold">₹{gstSummary.totalGstCents / 100}</div>
                  </div>
                  <div className="rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#a39a86]">Taxable Amount</div>
                    <div className="mt-2 text-2xl font-semibold">₹{gstSummary.totalTaxableCents / 100}</div>
                  </div>
                  <div className="rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#a39a86]">Invoices</div>
                    <div className="mt-2 text-2xl font-semibold">{gstSummary.invoiceCount}</div>
                  </div>
                </div>
              </div>
            ) : null}
            {isLoadingBranchPerformance ? <div className="text-sm text-[#a39a86]">Loading branch performance...</div> : null}
            {!isLoadingBranchPerformance && branchPerformanceError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{branchPerformanceError}</div> : null}
            {!isLoadingBranchPerformance && !branchPerformanceError && branchPerformance.length === 0 ? <div className="text-sm text-[#a39a86]">No branch performance data yet.</div> : null}
            {branchPerformance.length > 0 ? (
              <div className="mt-6 rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <h2 className="text-xl font-semibold">Branch Performance</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {branchPerformance.map((branch) => (
                    <div key={branch.branchId} className="rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                      <div className="font-medium">{branch.branchName}</div>
                      <div className="mt-2 text-sm text-[#a39a86]">
                        Staff: {branch.staffCount}
                      </div>
                      <div className="text-sm text-[#a39a86]">
                        Attendance records: {branch.attendanceCount}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {crmReportsLoading ? <div className="text-sm text-[#a39a86]">Loading CRM reports...</div> : null}
            {!crmReportsLoading && crmReportsError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{crmReportsError}</div> : null}
            {!crmReportsLoading && !crmReportsError ? (
              <>
                {crmConversion !== null ? (
                  <div className="mt-6 rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5 md:col-span-2 lg:col-span-4">
                    <h2 className="text-xl font-semibold">CRM Overview</h2>
                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <div className="rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-[#a39a86]">Total Leads</div>
                        <div className="mt-2 text-2xl font-semibold">{crmConversion.totalLeads}</div>
                      </div>
                      <div className="rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-[#a39a86]">Converted</div>
                        <div className="mt-2 text-2xl font-semibold">{crmConversion.convertedLeads}</div>
                      </div>
                      <div className="rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-[#a39a86]">Conversion Rate</div>
                        <div className="mt-2 text-2xl font-semibold">{crmConversion.conversionRate}%</div>
                      </div>
                    </div>
                  </div>
                ) : null}
                {crmLeadSource.length > 0 ? (
                  <div className="mt-6 rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                    <h2 className="text-xl font-semibold">Lead Source</h2>
                    <div className="mt-4 space-y-3">
                      {crmLeadSource.map((row) => (
                        <div key={row.source} className="flex items-center justify-between rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                          <div className="font-medium">{row.source}</div>
                          <div className="text-sm text-[#a39a86]">{row.count} lead{row.count === 1 ? "" : "s"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {crmSalesFunnel.length > 0 ? (
                  <div className="mt-6 rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                    <h2 className="text-xl font-semibold">Sales Funnel</h2>
                    <div className="mt-4 space-y-3">
                      {crmSalesFunnel.map((row) => (
                        <div key={row.stageName} className="flex items-center justify-between rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                          <div>
                            <div className="font-medium">{row.stageName}</div>
                            <div className="text-sm text-[#a39a86]">{row.count} opportunit{row.count === 1 ? "y" : "ies"}</div>
                          </div>
                          <div className="text-right text-sm text-[#a39a86]">₹{row.valueCents / 100}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {crmPendingFollowups.length > 0 ? (
                  <div className="mt-6 rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                    <h2 className="text-xl font-semibold">Pending Follow-ups</h2>
                    <div className="mt-4 space-y-3">
                      {crmPendingFollowups.slice(0, 10).map((f) => (
                        <div key={f.id} className="flex items-center justify-between rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                          <div>
                            <div className="font-medium">{f.title}</div>
                            {f.entityType ? <div className="text-xs text-[#a39a86]">{f.entityType}</div> : null}
                          </div>
                          <div className="text-xs text-[#a39a86]">Due: {new Date(f.dueAt).toLocaleDateString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {crmCustomerGrowth.length > 0 ? (
                  <div className="mt-6 rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                    <h2 className="text-xl font-semibold">Customer Growth</h2>
                    <div className="mt-4 space-y-3">
                      {crmCustomerGrowth.map((row) => (
                        <div key={row.month} className="flex items-center justify-between rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                          <div className="font-medium">{row.month}</div>
                          <div className="text-sm text-[#a39a86]">{row.count} customer{row.count === 1 ? "" : "s"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </section>
        ) : null}

        {activeTab === "Settings" ? (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
              <h2 className="text-xl font-semibold">Settings</h2>
              <div className="mt-4 space-y-3">
                {isLoadingSettings ? <div className="text-sm text-[#a39a86]">Loading settings...</div> : null}
                {!isLoadingSettings && settingError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{settingError}</div> : null}
                {!isLoadingSettings && !settingError && settings.length === 0 ? <div className="text-sm text-[#a39a86]">No settings yet.</div> : null}
                {settings.map((setting) => (
                  <div key={setting.id} className="rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                    {editingSettingId === setting.id ? (
                      <div className="space-y-2">
                        <input
                          value={editingSettingKey}
                          onChange={(event) => setEditingSettingKey(event.target.value)}
                          placeholder="Setting key"
                          className="premium-input"
                        />
                        <input
                          value={editingSettingValue}
                          onChange={(event) => setEditingSettingValue(event.target.value)}
                          placeholder="Setting value"
                          className="premium-input"
                        />
                        <label className="flex items-center gap-2 text-sm text-[#a39a86]">
                          <input
                            type="checkbox"
                            checked={editingSettingIsActive}
                            onChange={(event) => setEditingSettingIsActive(event.target.checked)}
                          />
                          Active
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateSetting(setting.id)}
                            className="premium-btn-primary px-3 py-2 text-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingSettingId(null)}
                            className="rounded-xl bg-[#f0dfe6] px-3 py-2 text-sm font-semibold text-[#d4af37]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{setting.key}</div>
                            <div className="text-sm text-[#a39a86]">{setting.value}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right text-sm text-[#a39a86]">
                              <div>{setting.isActive ? "Active" : "Inactive"}</div>
                            </div>
                            <button
                              onClick={() => {
                                setEditingSettingId(setting.id);
                                setEditingSettingKey(setting.key);
                                setEditingSettingValue(setting.value);
                                setEditingSettingIsActive(setting.isActive);
                              }}
                              className="rounded-xl bg-[#f0dfe6] px-3 py-1.5 text-sm font-semibold text-[#d4af37]"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {permissionCodes.includes("setting.write") ? (
            <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
              <h2 className="text-xl font-semibold">Add setting</h2>
              <div className="mt-4 space-y-3">
                <input
                  value={settingKey}
                  onChange={(event) => setSettingKey(event.target.value)}
                  placeholder="Setting key"
                  className="premium-input"
                />
                <input
                  value={settingValue}
                  onChange={(event) => setSettingValue(event.target.value)}
                  placeholder="Setting value"
                  className="premium-input"
                />
                <button
                  onClick={addSetting}
                  className="premium-btn-primary w-full py-2.5 text-sm"
                >
                  Save setting
                </button>
              </div>
            </div>
            ) : null}
          </section>
        ) : null}

        {activeTab === "Gateway Accounts" ? (
          <section className="mt-6 space-y-6">
            <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
              <h2 className="text-xl font-semibold">Gateway Accounts</h2>
              <p className="mt-1 text-sm text-[#a39a86]">Manage payment gateway configurations. Sensitive config fields are never exposed.</p>
              {gatewayAccountError ? <p className="mt-2 text-sm text-red-400">{gatewayAccountError}</p> : null}
              <div className="mt-4 space-y-3">
                {isLoadingGatewayAccounts ? <div className="text-sm text-[#a39a86]">Loading gateway accounts...</div> : null}
                {!isLoadingGatewayAccounts && gatewayAccounts.length === 0 ? <div className="text-sm text-[#a39a86]">No gateway accounts configured.</div> : null}
                {gatewayAccounts.map((gw) => (
                  <div key={gw.id} className="rounded-lg border border-[rgba(212,175,55,0.1)] bg-[#1a1816] p-4">
                    {editingGatewayId === gw.id ? (
                      <div className="space-y-2">
                        <input
                          className="w-full rounded-lg border border-[rgba(212,175,55,0.2)] bg-[#12110f] px-3 py-2 text-sm"
                          value={editingGatewayLabel}
                          onChange={(e) => setEditingGatewayLabel(e.target.value)}
                          placeholder="Label"
                        />
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={editingGatewayIsActive}
                            onChange={(e) => setEditingGatewayIsActive(e.target.checked)}
                          />
                          Active
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="rounded-lg bg-[rgba(212,175,55,0.15)] px-3 py-1 text-sm font-medium hover:bg-[rgba(212,175,55,0.25)]"
                            onClick={() => void updateGatewayAccount(gw.id)}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="rounded-lg bg-[rgba(255,255,255,0.05)] px-3 py-1 text-sm hover:bg-[rgba(255,255,255,0.1)]"
                            onClick={() => setEditingGatewayId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{gw.provider}{gw.label ? ` — ${gw.label}` : ""}</div>
                          <div className="text-xs text-[#a39a86]">{gw.isActive ? "Active" : "Inactive"} ?? Created {new Date(gw.createdAt).toLocaleDateString()}</div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="rounded-lg bg-[rgba(255,255,255,0.05)] px-2 py-1 text-xs hover:bg-[rgba(255,255,255,0.1)]"
                            onClick={() => {
                              setEditingGatewayId(gw.id);
                              setEditingGatewayLabel(gw.label ?? "");
                              setEditingGatewayIsActive(gw.isActive);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rounded-lg bg-red-900/30 px-2 py-1 text-xs text-red-300 hover:bg-red-900/50"
                            onClick={() => void deleteGatewayAccount(gw.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
              <h2 className="text-lg font-semibold">Add Gateway Account</h2>
              <div className="mt-3 space-y-3">
                <input
                  className="w-full rounded-lg border border-[rgba(212,175,55,0.2)] bg-[#1a1816] px-3 py-2 text-sm"
                  value={newGatewayProvider}
                  onChange={(e) => setNewGatewayProvider(e.target.value)}
                  placeholder="Provider (e.g. razorpay, stripe, manual)"
                />
                <input
                  className="w-full rounded-lg border border-[rgba(212,175,55,0.2)] bg-[#1a1816] px-3 py-2 text-sm"
                  value={newGatewayLabel}
                  onChange={(e) => setNewGatewayLabel(e.target.value)}
                  placeholder="Label (optional)"
                />
                <textarea
                  className="w-full rounded-lg border border-[rgba(212,175,55,0.2)] bg-[#1a1816] px-3 py-2 text-sm font-mono"
                  value={newGatewayConfig}
                  onChange={(e) => setNewGatewayConfig(e.target.value)}
                  placeholder='{"key": "value"}'
                  rows={3}
                />
                <button
                  type="button"
                  className="rounded-lg bg-[rgba(212,175,55,0.15)] px-4 py-2 text-sm font-medium hover:bg-[rgba(212,175,55,0.25)]"
                  onClick={() => void createGatewayAccount()}
                >
                  Add Gateway Account
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "Marketplace" ? (
          <section className="mt-6 space-y-6">
            <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
              <h2 className="text-xl font-semibold">Marketplace</h2>
              <p className="mt-1 text-sm text-[#a39a86]">Browse and install modules, themes, and integrations.</p>
              {marketplaceError ? <p className="mt-2 text-sm text-red-400">{marketplaceError}</p> : null}
              <div className="mt-4 space-y-3">
                {isLoadingMarketplace ? <div className="text-sm text-[#a39a86]">Loading marketplace...</div> : null}
                {!isLoadingMarketplace && marketplaceAssets.length === 0 ? <div className="text-sm text-[#a39a86]">No marketplace assets available.</div> : null}
                {marketplaceAssets.map((asset) => {
                  const isInstalled = installations.some((inst) => inst.assetId === asset.id);
                  const update = availableUpdates.find((upd) => upd.assetId === asset.id);
                  return (
                    <div key={asset.id} className="rounded-lg border border-[rgba(212,175,55,0.1)] bg-[#1a1816] p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">
                            {asset.name}
                            {update ? <span className="ml-2 rounded-full bg-[rgba(212,175,55,0.2)] px-2 py-0.5 text-xs text-[#d4af37]">Update: v{update.latestVersion}</span> : null}
                          </div>
                          <div className="text-xs text-[#a39a86]">{asset.type}{asset.category ? ` ?? ${asset.category}` : ""}{asset.authorName ? ` ?? by ${asset.authorName}` : ""}</div>
                          {asset.description ? <div className="mt-1 text-xs text-[#a39a86]">{asset.description}</div> : null}
                          {update ? <div className="mt-1 text-xs text-[#d4af37]">Installed: v{update.installedVersion} → Latest: v{update.latestVersion}</div> : null}
                        </div>
                        <div className="flex gap-2">
                          {isInstalled ? (
                            <>
                              {update ? (
                                <button
                                  type="button"
                                  className="rounded-lg bg-[rgba(212,175,55,0.15)] px-3 py-1 text-xs font-medium hover:bg-[rgba(212,175,55,0.25)]"
                                  onClick={() => void rollbackMarketplaceAsset(asset.id, update.latestVersionId)}
                                >
                                  Update
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="rounded-lg bg-red-900/30 px-3 py-1 text-xs text-red-300 hover:bg-red-900/50"
                                onClick={() => void uninstallMarketplaceAsset(asset.id)}
                              >
                                Uninstall
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="rounded-lg bg-[rgba(212,175,55,0.15)] px-3 py-1 text-xs font-medium hover:bg-[rgba(212,175,55,0.25)]"
                              onClick={() => void installMarketplaceAsset(asset.id)}
                            >
                              Install
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
              <h2 className="text-lg font-semibold">Publish Asset</h2>
              <p className="mt-1 text-xs text-[#a39a86]">Register a new marketplace asset. Versions can be added after creation.</p>
              <div className="mt-3 space-y-3">
                <input
                  className="w-full rounded-lg border border-[rgba(212,175,55,0.2)] bg-[#1a1816] px-3 py-2 text-sm"
                  value={newAssetName}
                  onChange={(e) => setNewAssetName(e.target.value)}
                  placeholder="Asset name"
                />
                <input
                  className="w-full rounded-lg border border-[rgba(212,175,55,0.2)] bg-[#1a1816] px-3 py-2 text-sm"
                  value={newAssetSlug}
                  onChange={(e) => setNewAssetSlug(e.target.value)}
                  placeholder="Slug (unique identifier)"
                />
                <select
                  className="w-full rounded-lg border border-[rgba(212,175,55,0.2)] bg-[#1a1816] px-3 py-2 text-sm"
                  value={newAssetType}
                  onChange={(e) => setNewAssetType(e.target.value)}
                >
                  <option value="module">Module</option>
                  <option value="theme">Theme</option>
                  <option value="plugin">Plugin</option>
                  <option value="integration">Integration</option>
                  <option value="workflow_template">Workflow Template</option>
                  <option value="dashboard">Dashboard</option>
                  <option value="report">Report</option>
                  <option value="api_connector">API Connector</option>
                </select>
                <textarea
                  className="w-full rounded-lg border border-[rgba(212,175,55,0.2)] bg-[#1a1816] px-3 py-2 text-sm"
                  value={newAssetDescription}
                  onChange={(e) => setNewAssetDescription(e.target.value)}
                  placeholder="Description (optional)"
                  rows={2}
                />
                <button
                  type="button"
                  className="rounded-lg bg-[rgba(212,175,55,0.15)] px-4 py-2 text-sm font-medium hover:bg-[rgba(212,175,55,0.25)]"
                  onClick={() => void createMarketplaceAsset()}
                >
                  Publish Asset
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "Users & Access" ? (
          <section className="mt-6 space-y-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold bg-gradient-to-r from-[#9c7a1e] via-[#d4af37] to-[#f1d78c] bg-clip-text text-transparent">
                  Users & Access
                </h2>
                <p className="mt-1 text-sm text-[#a39a86]">Manage tenant users, roles, and access permissions.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <div className="text-xs text-[#a39a86]">Total Users</div>
                <div className="mt-1 text-2xl font-bold text-[#d4af37]">{roleAssignmentUsers.length}</div>
              </div>
              <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <div className="text-xs text-[#a39a86]">Active Users</div>
                <div className="mt-1 text-2xl font-bold text-[#3fae6a]">{roleAssignmentUsers.filter((u) => u.isActive).length}</div>
              </div>
              <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <div className="text-xs text-[#a39a86]">Inactive Users</div>
                <div className="mt-1 text-2xl font-bold text-[#a39a86]">{roleAssignmentUsers.filter((u) => !u.isActive).length}</div>
              </div>
              <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <div className="text-xs text-[#a39a86]">Roles</div>
                <div className="mt-1 text-2xl font-bold text-[#d4af37]">{roleAssignmentRoles.length}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
              <h3 className="text-lg font-semibold text-[#f5f1e6]">Add User</h3>
              <p className="mt-1 text-sm text-[#a39a86]">Create a new user account for this tenant.</p>
              {addUserError ? <div className="mt-3 rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{addUserError}</div> : null}
              {addUserSuccess ? <div className="mt-3 rounded-xl border border-[rgba(63,174,106,0.3)] bg-[rgba(63,174,106,0.12)] p-3 text-sm text-[#3fae6a]">{addUserSuccess}</div> : null}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input placeholder="Email address" type="email" value={addUserEmail} onChange={(e) => setAddUserEmail(e.target.value)} className="premium-input" />
                <input placeholder="Display name" value={addUserDisplayName} onChange={(e) => setAddUserDisplayName(e.target.value)} className="premium-input" />
                <input placeholder="Password (min 8 characters)" type="password" value={addUserPassword} onChange={(e) => setAddUserPassword(e.target.value)} className="premium-input" />
                <select value={addUserRoleId} onChange={(e) => setAddUserRoleId(e.target.value)} className="premium-input">
                  <option value="">No role (assign later)</option>
                  {roleAssignmentRoles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>
              <button onClick={() => void addUser()} className="mt-3 premium-btn-primary px-4 py-2 text-sm">Create User</button>
            </div>

            <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
              <h3 className="text-lg font-semibold text-[#f5f1e6]">Users</h3>
              <div className="mt-4">
                {isLoadingRoleAssignmentUsers ? <div className="text-sm text-[#a39a86]">Loading users...</div> : null}
                {!isLoadingRoleAssignmentUsers && roleAssignmentUsers.length === 0 ? <div className="text-sm text-[#a39a86]">No users found.</div> : null}
                {!isLoadingRoleAssignmentUsers && roleAssignmentUsers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[rgba(212,175,55,0.1)] text-left text-[#a39a86]">
                          <th className="pb-3 pr-4 font-medium">User</th>
                          <th className="pb-3 pr-4 font-medium">Email</th>
                          <th className="pb-3 pr-4 font-medium">Status</th>
                          <th className="pb-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roleAssignmentUsers.map((user) => (
                          <tr key={user.id} className="border-b border-[rgba(212,175,55,0.05)]">
                            <td className="py-3 pr-4 font-medium text-[#f5f1e6]">{user.displayName ?? "—"}</td>
                            <td className="py-3 pr-4 text-[#a39a86]">{user.email ?? "—"}</td>
                            <td className="py-3 pr-4">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${user.isActive ? "border border-[rgba(63,174,106,0.3)] bg-[rgba(63,174,106,0.12)] text-[#3fae6a]" : "border border-[rgba(163,154,134,0.3)] bg-[rgba(163,154,134,0.12)] text-[#a39a86]"}`}>{user.isActive ? "Active" : "Inactive"}</span>
                            </td>
                            <td className="py-3">
                              <button
                                onClick={() => { setRoleAssignmentUserId(user.id); setRoleAssignmentError(null); setRoleAssignmentSuccess(null); }}
                                className="rounded-lg border border-[rgba(212,175,55,0.2)] bg-[#17150f] px-3 py-1 text-xs font-medium text-[#d4af37] hover:bg-[#1f1d15]"
                              >
                                Manage Access
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <h3 className="text-lg font-semibold text-[#f5f1e6]">Roles</h3>
                <div className="mt-4 space-y-2">
                  {isLoadingRoleAssignmentRoles ? <div className="text-sm text-[#a39a86]">Loading roles...</div> : null}
                  {!isLoadingRoleAssignmentRoles && roleAssignmentRoles.length === 0 ? <div className="text-sm text-[#a39a86]">No roles found.</div> : null}
                  {roleAssignmentRoles.map((role) => (
                    <div key={role.id} className="flex items-center justify-between rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] px-4 py-3">
                      <div>
                        <div className="font-medium text-[#f5f1e6]">{role.name}</div>
                        <div className="text-xs text-[#a39a86]">{role.code}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <h3 className="text-lg font-semibold text-[#f5f1e6]">Assign role</h3>
                <div className="mt-4 space-y-3">
                  {roleAssignmentError ? (
                    <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{roleAssignmentError}</div>
                  ) : null}
                  {roleAssignmentSuccess ? (
                    <div className="rounded-xl border border-[rgba(63,174,106,0.3)] bg-[rgba(63,174,106,0.12)] p-3 text-sm text-[#3fae6a]">{roleAssignmentSuccess}</div>
                  ) : null}
                  <label className="block text-sm font-medium text-[#5a3b48]" htmlFor="role-user">User</label>
                  <select
                    id="role-user"
                    value={roleAssignmentUserId}
                    onChange={(event) => setRoleAssignmentUserId(event.target.value)}
                    className="w-full rounded-xl border border-[rgba(212,175,55,0.15)] bg-[#17150f] px-3 py-2.5 text-sm"
                  >
                    <option value="">Select user</option>
                    {roleAssignmentUsers.map((user) => (
                      <option key={user.membershipId} value={user.id}>
                        {user.displayName ?? user.email ?? `User ${user.id}`} {!user.isActive ? "(inactive)" : ""}
                      </option>
                    ))}
                  </select>
                  <label className="block text-sm font-medium text-[#5a3b48]" htmlFor="role-role">Role</label>
                  <select
                    id="role-role"
                    value={roleAssignmentRoleId}
                    onChange={(event) => setRoleAssignmentRoleId(event.target.value)}
                    className="w-full rounded-xl border border-[rgba(212,175,55,0.15)] bg-[#17150f] px-3 py-2.5 text-sm"
                  >
                    <option value="">Select role</option>
                    {roleAssignmentRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name} ({role.code})
                      </option>
                    ))}
                  </select>
                  {(() => {
                    const selectedRole = roleAssignmentRoles.find((r) => r.id === roleAssignmentRoleId);
                    const scopeType = selectedRole?.scopeType ?? "TENANT";
                    const requiresScope = selectedRole?.requiresScope ?? false;

                    if (!requiresScope) return null;

                    if (scopeType === "TERRITORY") {
                      return (
                        <>
                          <label className="block text-sm font-medium text-[#5a3b48]" htmlFor="role-territory">Territory</label>
                          <select
                            id="role-territory"
                            value={roleAssignmentTerritoryId}
                            onChange={(event) => setRoleAssignmentTerritoryId(event.target.value)}
                            className="w-full rounded-xl border border-[rgba(212,175,55,0.15)] bg-[#17150f] px-3 py-2.5 text-sm"
                          >
                            <option value="">Select territory</option>
                            {territories.filter((t) => t.isActive).map((territory) => (
                              <option key={territory.id} value={territory.id}>{territory.name}</option>
                            ))}
                          </select>
                        </>
                      );
                    }

                    if (scopeType === "BUSINESS_UNIT") {
                      return (
                        <>
                          <label className="block text-sm font-medium text-[#5a3b48]" htmlFor="role-bu">Business Unit / City</label>
                          <select
                            id="role-bu"
                            value={roleAssignmentBusinessUnitId}
                            onChange={(event) => setRoleAssignmentBusinessUnitId(event.target.value)}
                            className="w-full rounded-xl border border-[rgba(212,175,55,0.15)] bg-[#17150f] px-3 py-2.5 text-sm"
                          >
                            <option value="">Select business unit</option>
                            {businessUnits.map((bu) => (
                              <option key={bu.id} value={bu.id}>{bu.name}</option>
                            ))}
                          </select>
                        </>
                      );
                    }

                    if (scopeType === "BRANCH") {
                      return (
                        <>
                          <label className="block text-sm font-medium text-[#5a3b48]" htmlFor="role-bu-branch">Business Unit</label>
                          <select
                            id="role-bu-branch"
                            value={roleAssignmentBusinessUnitId}
                            onChange={(event) => setRoleAssignmentBusinessUnitId(event.target.value)}
                            className="w-full rounded-xl border border-[rgba(212,175,55,0.15)] bg-[#17150f] px-3 py-2.5 text-sm"
                          >
                            <option value="">Select business unit</option>
                            {businessUnits.map((bu) => (
                              <option key={bu.id} value={bu.id}>{bu.name}</option>
                            ))}
                          </select>
                          <label className="block text-sm font-medium text-[#5a3b48]" htmlFor="role-branch">Branch</label>
                          <select
                            id="role-branch"
                            value={roleAssignmentBranchId}
                            onChange={(event) => setRoleAssignmentBranchId(event.target.value)}
                            className="w-full rounded-xl border border-[rgba(212,175,55,0.15)] bg-[#17150f] px-3 py-2.5 text-sm"
                          >
                            <option value="">Select branch</option>
                            {branches
                              .filter((branch) => roleAssignmentBusinessUnitId ? branch.businessUnitId === roleAssignmentBusinessUnitId : true)
                              .map((branch) => (
                                <option key={branch.id} value={branch.id}>{branch.name}</option>
                              ))}
                          </select>
                        </>
                      );
                    }

                    return null;
                  })()}
                  <button
                    onClick={assignRole}
                    disabled={isAssigningRole}
                    className="premium-btn-primary w-full py-2.5 text-sm disabled:opacity-60"
                  >
                    {isAssigningRole ? "Assigning..." : "Assign role"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "Notifications" ? (
          <>
            <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
                <h2 className="text-xl font-semibold">Notification Templates</h2>
                <div className="mt-4 space-y-3">
                {isLoadingNotificationTemplates ? <div className="text-sm text-[#a39a86]">Loading notification templates...</div> : null}
                {!isLoadingNotificationTemplates && notificationTemplateError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{notificationTemplateError}</div> : null}
                {!isLoadingNotificationTemplates && !notificationTemplateError && notificationTemplates.length === 0 ? <div className="text-sm text-[#a39a86]">No notification templates yet.</div> : null}
                  {notificationTemplates.map((template) => (
                    <div key={template.id} className="flex flex-col gap-2 rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                      {editingTemplateId !== template.id ? (
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{template.name}</div>
                            <div className="text-sm text-[#a39a86]">Channel: {template.channel}</div>
                            <div className="text-sm text-[#a39a86]">{template.subject ?? "No subject"}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right text-sm text-[#a39a86]">
                              <div>{template.isActive ? "Active" : "Inactive"}</div>
                            </div>
                            <button
                              onClick={() => {
                                setEditingTemplateId(template.id);
                                setEditingTemplateName(template.name);
                                setEditingTemplateChannel(template.channel);
                                setEditingTemplateSubject(template.subject ?? "");
                                setEditingTemplateBody(template.body);
                              }}
                              className="premium-btn-secondary px-3 py-1.5 text-xs"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            value={editingTemplateName}
                            onChange={(event) => setEditingTemplateName(event.target.value)}
                            placeholder="Template name"
                            className="premium-input"
                          />
                          <input
                            value={editingTemplateChannel}
                            onChange={(event) => setEditingTemplateChannel(event.target.value)}
                            placeholder="Channel"
                            className="premium-input"
                          />
                          <input
                            value={editingTemplateSubject}
                            onChange={(event) => setEditingTemplateSubject(event.target.value)}
                            placeholder="Subject"
                            className="premium-input"
                          />
                          <textarea
                            value={editingTemplateBody}
                            onChange={(event) => setEditingTemplateBody(event.target.value)}
                            placeholder="Body"
                            className="premium-input"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                if (!template.id) return;
                                await updateNotificationTemplate(template.id, editingTemplateName, editingTemplateChannel, editingTemplateSubject, editingTemplateBody);
                                setEditingTemplateId(null);
                              }}
                              className="premium-btn-primary px-3 py-1.5 text-xs"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingTemplateId(null)}
                              className="premium-btn-secondary px-3 py-1.5 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
              <h2 className="text-xl font-semibold">Add notification template</h2>
              <div className="mt-4 space-y-3">
                <input
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  placeholder="Template name"
                  className="premium-input"
                />
                <input
                  value={templateChannel}
                  onChange={(event) => setTemplateChannel(event.target.value)}
                  placeholder="Channel (e.g. email, sms)"
                  className="premium-input"
                />
                <input
                  value={templateSubject}
                  onChange={(event) => setTemplateSubject(event.target.value)}
                  placeholder="Subject (optional)"
                  className="premium-input"
                />
                <textarea
                  value={templateBody}
                  onChange={(event) => setTemplateBody(event.target.value)}
                  placeholder="Body"
                  className="premium-input"
                />
                <button
                  onClick={addNotificationTemplate}
                  className="premium-btn-primary w-full py-2.5 text-sm"
                >
                  Save template
                </button>
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
            <h2 className="text-xl font-semibold">Notification Logs</h2>
            <div className="mt-4 space-y-3">
              {isLoadingNotificationLogs ? <div className="text-sm text-[#a39a86]">Loading notification logs...</div> : null}
              {!isLoadingNotificationLogs && notificationLogError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{notificationLogError}</div> : null}
              {!isLoadingNotificationLogs && !notificationLogError && notificationLogs.length === 0 ? <div className="text-sm text-[#a39a86]">No notification logs yet.</div> : null}
              {notificationLogs.map((log) => (
                <div key={log.id} className={`flex items-center justify-between rounded-xl border p-3 ${log.readAt === null ? "border-[rgba(212,175,55,0.25)] bg-[#1a170f]" : "border-[rgba(212,175,55,0.1)] bg-[#17150f]"}`}>
                  <div className="flex items-start gap-2">
                    {log.readAt === null ? <span className="mt-1 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-[#d1af3c]" title="Unread" /> : null}
                    <div>
                      <div className="font-medium">{log.channel}</div>
                      <div className="text-sm text-[#a39a86]">{log.subject ?? "No subject"}</div>
                      <div className="text-sm text-[#a39a86]">{log.body}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-right text-sm text-[#a39a86]">
                    <div>{log.status}</div>
                    <div>{log.sentAt ? new Date(log.sentAt).toLocaleString() : "Not sent"}</div>
                    {log.readAt === null ? (
                      <button
                        onClick={() => void markNotificationAsRead(log.id)}
                        className="rounded-lg border border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.08)] px-2 py-1 text-xs text-[#d1af3c] hover:bg-[rgba(212,175,55,0.15)]"
                      >
                        Mark as read
                      </button>
                    ) : (
                      <span className="text-xs text-[#6b6455]">Read</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
              <h2 className="text-xl font-semibold">Event subscriptions</h2>
              <div className="mt-4 space-y-3">
                {isLoadingEventSubscriptions ? <div className="text-sm text-[#a39a86]">Loading event subscriptions...</div> : null}
                {!isLoadingEventSubscriptions && eventSubscriptionError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{eventSubscriptionError}</div> : null}
                {!isLoadingEventSubscriptions && !eventSubscriptionError && eventSubscriptions.length === 0 ? <div className="text-sm text-[#a39a86]">No event subscriptions yet.</div> : null}
                {eventSubscriptions.map((subscription) => {
                  const template = notificationTemplates.find((item) => item.id === subscription.notificationTemplateId);
                  return (
                    <div key={subscription.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                      <div>
                        <div className="font-medium">{subscription.eventType}</div>
                        <div className="text-sm text-[#a39a86]">Template: {template?.name ?? subscription.notificationTemplateId ?? "None"}</div>
                      </div>
                      <button
                        onClick={() => void updateEventSubscription(subscription)}
                        className={subscription.isEnabled ? "premium-btn-primary px-3 py-1.5 text-xs" : "premium-btn-secondary px-3 py-1.5 text-xs"}
                      >
                        {subscription.isEnabled ? "Enabled" : "Disabled"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
              <h2 className="text-xl font-semibold">Add event subscription</h2>
              <div className="mt-4 space-y-3">
                <input
                  value={eventSubscriptionType}
                  onChange={(event) => setEventSubscriptionType(event.target.value)}
                  placeholder="Event type (e.g. appointment.created)"
                  className="premium-input"
                />
                <select
                  value={eventSubscriptionTemplateId}
                  onChange={(event) => setEventSubscriptionTemplateId(event.target.value)}
                  className="premium-input"
                >
                  <option value="">Select a notification template</option>
                  {notificationTemplates.filter((template) => template.isActive).map((template) => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => void addEventSubscription()}
                  disabled={!eventSubscriptionType.trim() || !eventSubscriptionTemplateId}
                  className="premium-btn-primary w-full py-2.5 text-sm disabled:opacity-60"
                >
                  Save subscription
                </button>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
              <h2 className="text-xl font-semibold">Notification preferences</h2>
              <div className="mt-4 space-y-3">
                {isLoadingNotificationPreferences ? <div className="text-sm text-[#a39a86]">Loading notification preferences...</div> : null}
                {!isLoadingNotificationPreferences && notificationPreferenceError ? <div className="rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{notificationPreferenceError}</div> : null}
                {!isLoadingNotificationPreferences && !notificationPreferenceError && notificationPreferences.length === 0 ? <div className="text-sm text-[#a39a86]">No notification preferences configured yet.</div> : null}
                {notificationPreferences.map((preference) => (
                  <div key={preference.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3">
                    <div>
                      <div className="font-medium capitalize">{preference.channel}</div>
                      <div className="text-sm text-[#a39a86]">{preference.isEnabled ? "Notifications enabled" : "Notifications disabled"}</div>
                    </div>
                    <button
                      onClick={() => {
                        setNotificationPreferenceChannel(preference.channel);
                        setNotificationPreferenceEnabled(!preference.isEnabled);
                        void saveNotificationPreference(preference.channel, !preference.isEnabled);
                      }}
                      className={preference.isEnabled ? "premium-btn-primary px-3 py-1.5 text-xs" : "premium-btn-secondary px-3 py-1.5 text-xs"}
                    >
                      {preference.isEnabled ? "Enabled" : "Disabled"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#12110f] p-5">
              <h2 className="text-xl font-semibold">Add preference</h2>
              <div className="mt-4 space-y-3">
                <select
                  value={notificationPreferenceChannel}
                  onChange={(event) => setNotificationPreferenceChannel(event.target.value)}
                  className="premium-input"
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="push">Push</option>
                  <option value="in-app">In-App</option>
                </select>
                <label className="flex items-center gap-2 text-sm text-[#a39a86]">
                  <input
                    type="checkbox"
                    checked={notificationPreferenceEnabled}
                    onChange={(event) => setNotificationPreferenceEnabled(event.target.checked)}
                  />
                  Enabled
                </label>
                <button onClick={() => void saveNotificationPreference()} className="premium-btn-primary w-full py-2.5 text-sm">
                  Save preference
                </button>
              </div>
            </div>
          </section>
          </>
        ) : null}
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
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

type CustomerRecord = {
  id: string;
  tenantId: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes?: string | null;
  isActive: boolean;
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
  tenantId: string;
  customerId: string;
  serviceId: string;
  startsAt: string;
  endsAt: string;
  status: string;
}): AppointmentRecord {
  return {
    tenantId: apiRecord.tenantId,
    customerId: apiRecord.customerId,
    serviceId: apiRecord.serviceId,
    staffId: "",
    startsAt: apiRecord.startsAt,
    endsAt: apiRecord.endsAt,
    status: apiRecord.status as AppointmentStatus,
  };
}

const tabs = ["Overview", "Customers", "Services", "Packages", "Memberships", "Inventory", "Staff", "Attendance", "Appointments", "Billing", "Branches", "Reports"] as const;

export default function Home() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Overview");
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const authenticationRequestId = useRef(0);
  const isLoginInProgress = useRef(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  const [packageError, setPackageError] = useState<string | null>(null);
  const [packageName, setPackageName] = useState("");
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
  const [invoices, setInvoices] = useState<Array<{
    id: string;
    customerId: string;
    issuedAt: string;
    subtotalCents: number;
    discountCents: number;
    gstCents: number;
    totalCents: number;
    notes: string | null;
  }>>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [invoiceCustomerId, setInvoiceCustomerId] = useState("");
  const [invoiceIssuedAt, setInvoiceIssuedAt] = useState(
    new Date().toISOString(),
  );
  const [invoiceDescription, setInvoiceDescription] = useState("");
  const [invoiceQuantity, setInvoiceQuantity] = useState("1");
  const [invoiceUnitPrice, setInvoiceUnitPrice] = useState("1500");
  const [invoiceDiscount, setInvoiceDiscount] = useState("0");
  const [invoiceGst, setInvoiceGst] = useState("0");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [products, setProducts] = useState<Array<{ id: string; name: string; sku: string; priceCents: number; isActive: boolean }>>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [productSku, setProductSku] = useState("");
  const [productPrice, setProductPrice] = useState("1500");
  const [productCategoryId, setProductCategoryId] = useState("");
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string; description: string | null; isActive: boolean }>
  >([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [stockItems, setStockItems] = useState<
    Array<{ id: string; productId: string; branchId: string; quantity: number }>
  >([]);
  const [isLoadingStockItems, setIsLoadingStockItems] = useState(false);
  const [stockItemError, setStockItemError] = useState<string | null>(null);
  const [stockItemProductId, setStockItemProductId] = useState("");
  const [stockItemBranchId, setStockItemBranchId] = useState("");
  const [stockItemQuantity, setStockItemQuantity] = useState("0");
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
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffName, setStaffName] = useState("");
  const [attendance, setAttendance] = useState<Array<{ id: string; staffId: string; checkInAt: string; checkOutAt: string | null; status: string | null }>>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [attendanceStaffId, setAttendanceStaffId] = useState("");
  const [attendanceCheckIn, setAttendanceCheckIn] = useState(new Date().toISOString());
  const [attendanceCheckOut, setAttendanceCheckOut] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState("");
  const [attendanceNotes, setAttendanceNotes] = useState("");
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("1500");
  const [appointmentCustomer, setAppointmentCustomer] = useState("");
  const [appointmentService, setAppointmentService] = useState("");
  const [appointmentStaff, setAppointmentStaff] = useState("");
  const [appointmentError, setAppointmentError] = useState<string | null>(null);
  const [businessUnits, setBusinessUnits] = useState<Array<{ id: string; name: string; slug: string; isActive: boolean }>>([]);
  const [isLoadingBusinessUnits, setIsLoadingBusinessUnits] = useState(false);
  const [businessUnitError, setBusinessUnitError] = useState<string | null>(null);
  const [businessUnitName, setBusinessUnitName] = useState("");
  const [businessUnitSlug, setBusinessUnitSlug] = useState("");
  const [branches, setBranches] = useState<Array<{ id: string; businessUnitId: string; name: string; slug: string; isActive: boolean }>>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [branchName, setBranchName] = useState("");
  const [branchSlug, setBranchSlug] = useState("");
  const [branchBusinessUnitId, setBranchBusinessUnitId] = useState("");

  const customerMap = new Map(customers.map((customer) => [customer.id, customer.name]));
  const productMap = new Map(products.map((product) => [product.id, product.name]));
  const branchMap = new Map(branches.map((branch) => [branch.id, branch.name]));

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
    if (authenticated !== true || activeTab !== "Services") {
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
  }, [authenticated, activeTab]);

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
            name: string;
            sku: string;
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
    if (authenticated !== true || activeTab !== "Branches") {
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

  const addInvoice = async () => {
    if (!invoiceCustomerId.trim() || !invoiceDescription.trim()) return;
    setInvoiceError(null);
    const quantity = Number(invoiceQuantity) || 1;
    const unitPriceCents = Number(invoiceUnitPrice) || 0;
    const discountCents = Number(invoiceDiscount) || 0;
    const gstCents = Number(invoiceGst) || 0;
    const result = await fetch("/api/invoices", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customerId: invoiceCustomerId,
        issuedAt: invoiceIssuedAt,
        items: [
          {
            description: invoiceDescription,
            quantity,
            unitPriceCents,
          },
        ],
        discountCents,
        gstCents,
        notes: invoiceNotes || null,
      }),
    });
    if (result.status === 401) {
      setInvoices([]);
      setAuthenticated(false);
      return;
    }
    if (result.status === 403) {
      setInvoices([]);
      setInvoiceError("You are not authorized to create invoices.");
      return;
    }
    if (!result.ok) {
      setInvoiceError("Invoice could not be saved.");
      return;
    }
    const body = await result.json() as { invoice: { id: string; customerId: string; issuedAt: string; subtotalCents: number; discountCents: number; gstCents: number; totalCents: number; notes: string | null } };
    setInvoices((current) => [body.invoice, ...current]);
    setInvoiceCustomerId("");
    setInvoiceDescription("");
    setInvoiceQuantity("1");
    setInvoiceUnitPrice("1500");
    setInvoiceDiscount("0");
    setInvoiceGst("0");
    setInvoiceNotes("");
    setInvoiceIssuedAt(new Date().toISOString());
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
    const body = await result.json() as { product: { id: string; name: string; sku: string; priceCents: number; isActive: boolean } };
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
    setStockMovementProductId("");
    setStockMovementBranchId("");
    setStockMovementQuantity("1");
    setStockMovementNotes("");
    setAdjustmentDirection("IN");
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

  if (authenticated === null) {
    return null;
  }

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fdf8f6] px-4 py-12 text-[#26171d]">
        <div className="w-full max-w-md rounded-[28px] border border-[#f0dfe6] bg-white p-8 shadow-[0_30px_80px_rgba(59,24,38,0.08)]">
          <div className="mb-6">
            <p className="text-xs font-semibold tracking-[0.22em] text-[#7c4f62]">X NAIL</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Operations login</h1>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#5a3b48]">Email</span>
              <input
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full rounded-xl border border-[#e8d8df] bg-[#fffafc] px-3 py-2.5 text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#5a3b48]">Password</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full rounded-xl border border-[#e8d8df] bg-[#fffafc] px-3 py-2.5 text-sm"
              />
            </label>

            {loginError ? (
              <div className="rounded-xl border border-[#f0c5c5] bg-[#fff6f6] px-3 py-2 text-sm text-[#8f3f3f]">
                {loginError}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full rounded-xl bg-[#5a1838] px-4 py-3 text-sm font-semibold text-white"
            >
              {isAuthenticating ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf4f2] text-[#2d1a22]">
      <header className="border-b border-[#f0dfe5] bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xl font-semibold tracking-tight">X Nail</div>
            <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#8a606d]">
              Operations dashboard
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="rounded-full bg-[#fceff4] px-3 py-1 text-[#6a2f4a]">X Nail</span>
            <button
              className="rounded-full border border-[#ead0d9] px-3 py-1.5"
              onClick={handleLogout}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeTab === tab
                  ? "bg-[#5a1838] text-white"
                  : "bg-white text-[#5a3b48] ring-1 ring-[#eed8df]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f2e2e8]">
            <div className="text-xs uppercase tracking-[0.18em] text-[#8a606d]">Today</div>
            <div className="mt-2 text-3xl font-semibold">—</div>
            <div className="mt-1 text-sm text-[#715a62]">Appointments</div>
          </div>
          <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f2e2e8]">
            <div className="text-xs uppercase tracking-[0.18em] text-[#8a606d]">Revenue</div>
            <div className="mt-2 text-3xl font-semibold">—</div>
            <div className="mt-1 text-sm text-[#715a62]">Gross sales</div>
          </div>
          <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f2e2e8]">
            <div className="text-xs uppercase tracking-[0.18em] text-[#8a606d]">Members</div>
            <div className="mt-2 text-3xl font-semibold">—</div>
            <div className="mt-1 text-sm text-[#715a62]">Loyalty</div>
          </div>
          <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f2e2e8]">
            <div className="text-xs uppercase tracking-[0.18em] text-[#8a606d]">Staff</div>
            <div className="mt-2 text-3xl font-semibold">—</div>
            <div className="mt-1 text-sm text-[#715a62]">On duty</div>
          </div>
        </section>

        {activeTab === "Customers" ? (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
              <h2 className="text-xl font-semibold">Customer list</h2>
              <div className="mt-4 space-y-3">
                {isLoadingCustomers ? <div className="text-sm text-[#736067]">Loading customers...</div> : null}
                {!isLoadingCustomers && customerError ? <div className="rounded-xl bg-[#fff6f6] p-3 text-sm text-[#8f3f3f]">{customerError}</div> : null}
                {!isLoadingCustomers && !customerError && customers.length === 0 ? <div className="text-sm text-[#736067]">No customers yet.</div> : null}
                {customers.map((customer) => (
                  <div key={customer.id} className="flex items-center justify-between rounded-xl bg-[#fffafc] p-3 ring-1 ring-[#f3e6eb]">
                    <div>
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-[#736067]">{customer.phone}</div>
                    </div>
                    <span className="rounded-full bg-[#f5edf1] px-2.5 py-1 text-xs">Active</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
              <h2 className="text-xl font-semibold">Add customer</h2>
              <div className="mt-4 space-y-3">
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Customer name"
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <input
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  placeholder="Phone"
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <button
                  onClick={addCustomer}
                  className="w-full rounded-xl bg-[#5a1838] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Save customer
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "Services" ? (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
              <h2 className="text-xl font-semibold">Service menu</h2>
              <div className="mt-4 space-y-3">
                {isLoadingServices ? <div className="text-sm text-[#736067]">Loading services...</div> : null}
                {!isLoadingServices && serviceError ? <div className="rounded-xl bg-[#fff6f6] p-3 text-sm text-[#8f3f3f]">{serviceError}</div> : null}
                {!isLoadingServices && !serviceError && services.length === 0 ? <div className="text-sm text-[#736067]">No services yet.</div> : null}
                {services.map((service) => (
                  <div key={service.id} className="flex items-center justify-between rounded-xl bg-[#fffafc] p-3 ring-1 ring-[#f3e6eb]">
                    <div>
                      <div className="font-medium">{service.name}</div>
                      <div className="text-sm text-[#736067]">{service.durationMinutes} min</div>
                    </div>
                    <div className="font-semibold text-[#6a2f4a]">₹{service.priceCents / 100}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
              <h2 className="text-xl font-semibold">Add service</h2>
              <div className="mt-4 space-y-3">
                <input
                  value={serviceName}
                  onChange={(event) => setServiceName(event.target.value)}
                  placeholder="Service name"
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <input
                  value={servicePrice}
                  onChange={(event) => setServicePrice(event.target.value)}
                  placeholder="Price"
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <button
                  onClick={addService}
                  className="w-full rounded-xl bg-[#5a1838] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Save service
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "Packages" ? (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
              <h2 className="text-xl font-semibold">Packages</h2>
              <div className="mt-4 space-y-3">
                {isLoadingPackages ? <div className="text-sm text-[#736067]">Loading packages...</div> : null}
                {!isLoadingPackages && packageError ? <div className="rounded-xl bg-[#fff6f6] p-3 text-sm text-[#8f3f3f]">{packageError}</div> : null}
                {!isLoadingPackages && !packageError && packages.length === 0 ? <div className="text-sm text-[#736067]">No packages yet.</div> : null}
                {packages.map((pkg) => (
                  <div key={pkg.id} className="flex items-center justify-between rounded-xl bg-[#fffafc] p-3 ring-1 ring-[#f3e6eb]">
                    <div>
                      <div className="font-medium">{pkg.name}</div>
                      <div className="text-sm text-[#736067]">{pkg.serviceIds.length} service(s)</div>
                    </div>
                    <div className="font-semibold text-[#6a2f4a]">{pkg.priceCents === null ? "—" : `₹${pkg.priceCents / 100}`}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
              <h2 className="text-xl font-semibold">Add package</h2>
              <div className="mt-4 space-y-3">
                <input
                  value={packageName}
                  onChange={(event) => setPackageName(event.target.value)}
                  placeholder="Package name"
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <button
                  onClick={addPackage}
                  className="w-full rounded-xl bg-[#5a1838] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Save package
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "Memberships" ? (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
              <h2 className="text-xl font-semibold">Memberships</h2>
              <div className="mt-4 space-y-3">
                {isLoadingMemberships ? <div className="text-sm text-[#736067]">Loading memberships...</div> : null}
                {!isLoadingMemberships && membershipError ? <div className="rounded-xl bg-[#fff6f6] p-3 text-sm text-[#8f3f3f]">{membershipError}</div> : null}
                {!isLoadingMemberships && !membershipError && memberships.length === 0 ? <div className="text-sm text-[#736067]">No memberships yet.</div> : null}
                {memberships.map((membership) => (
                  <div key={membership.id} className="flex items-center justify-between rounded-xl bg-[#fffafc] p-3 ring-1 ring-[#f3e6eb]">
                    <div>
                      <div className="font-medium">Customer {membership.customerId}</div>
                      <div className="text-sm text-[#736067]">Package {membership.packageId}</div>
                    </div>
                    <div className="text-right text-sm text-[#736067]">
                      <div>{membership.startedAt}</div>
                      <div>{membership.endsAt ?? "—"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
              <h2 className="text-xl font-semibold">Add membership</h2>
              <div className="mt-4 space-y-3">
                <input
                  value={membershipCustomerId}
                  onChange={(event) => setMembershipCustomerId(event.target.value)}
                  placeholder="Customer ID"
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <input
                  value={membershipPackageId}
                  onChange={(event) => setMembershipPackageId(event.target.value)}
                  placeholder="Package ID"
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <input
                  value={membershipStartedAt}
                  onChange={(event) => setMembershipStartedAt(event.target.value)}
                  placeholder="Started at (ISO date)"
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <input
                  value={membershipEndsAt}
                  onChange={(event) => setMembershipEndsAt(event.target.value)}
                  placeholder="Ends at (optional)"
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <input
                  value={membershipStatus}
                  onChange={(event) => setMembershipStatus(event.target.value)}
                  placeholder="Status (optional)"
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <button
                  onClick={addMembership}
                  className="w-full rounded-xl bg-[#5a1838] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Save membership
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "Staff" ? (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
              <h2 className="text-xl font-semibold">Staff roster</h2>
              <div className="mt-4 space-y-3">
                {isLoadingStaff ? <div className="text-sm text-[#736067]">Loading staff...</div> : null}
                {!isLoadingStaff && staffError ? <div className="rounded-xl bg-[#fff6f6] p-3 text-sm text-[#8f3f3f]">{staffError}</div> : null}
                {!isLoadingStaff && !staffError && staff.length === 0 ? <div className="text-sm text-[#736067]">No staff yet.</div> : null}
                {staff.map((member) => (
                  <div key={member.id} className="flex items-center justify-between rounded-xl bg-[#fffafc] p-3 ring-1 ring-[#f3e6eb]">
                    <div>
                      <div className="font-medium">{member.displayName}</div>
                      <div className="text-sm text-[#736067]">{member.branchId ?? "No branch"}</div>
                    </div>
                    <span className="rounded-full bg-[#edf8f3] px-2.5 py-1 text-xs text-[#2f6d47]">On duty</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
              <h2 className="text-xl font-semibold">Add staff</h2>
              <div className="mt-4 space-y-3">
                <input
                  value={staffName}
                  onChange={(event) => setStaffName(event.target.value)}
                  placeholder="Staff name"
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <button
                  onClick={addStaff}
                  className="w-full rounded-xl bg-[#5a1838] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Save staff
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "Attendance" ? (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
              <h2 className="text-xl font-semibold">Attendance</h2>
              <div className="mt-4 space-y-3">
                {isLoadingAttendance ? <div className="text-sm text-[#736067]">Loading attendance...</div> : null}
                {!isLoadingAttendance && attendanceError ? <div className="rounded-xl bg-[#fff6f6] p-3 text-sm text-[#8f3f3f]">{attendanceError}</div> : null}
                {!isLoadingAttendance && !attendanceError && attendance.length === 0 ? <div className="text-sm text-[#736067]">No attendance records yet.</div> : null}
                {attendance.map((record) => (
                  <div key={record.id} className="flex items-center justify-between rounded-xl bg-[#fffafc] p-3 ring-1 ring-[#f3e6eb]">
                    <div>
                      <div className="font-medium">Staff {record.staffId}</div>
                      <div className="text-sm text-[#736067]">{record.checkInAt}</div>
                    </div>
                    <div className="flex items-center gap-3 text-right text-sm text-[#736067]">
                      <div>
                        <div>{record.status ?? "—"}</div>
                        <div>{record.checkOutAt ?? "—"}</div>
                      </div>
                      {record.checkOutAt === null ? (
                        <button
                          onClick={() => checkOutAttendance(record.id)}
                          className="rounded-full border border-[#ead0d9] px-3 py-1.5 text-xs font-medium"
                        >
                          Check out
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
              <h2 className="text-xl font-semibold">Record attendance</h2>
              <div className="mt-4 space-y-3">
                <select
                  value={attendanceStaffId}
                  onChange={(event) => setAttendanceStaffId(event.target.value)}
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
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
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <input
                  value={attendanceCheckOut}
                  onChange={(event) => setAttendanceCheckOut(event.target.value)}
                  placeholder="Check-out (optional, ISO date)"
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <input
                  value={attendanceStatus}
                  onChange={(event) => setAttendanceStatus(event.target.value)}
                  placeholder="Status (optional)"
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <input
                  value={attendanceNotes}
                  onChange={(event) => setAttendanceNotes(event.target.value)}
                  placeholder="Notes (optional)"
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <button
                  onClick={addAttendance}
                  className="w-full rounded-xl bg-[#5a1838] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Save attendance
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "Appointments" ? (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
              <h2 className="text-xl font-semibold">Appointments</h2>
              {!appointmentError ? null : (
                <div className="mt-2 rounded-xl bg-[#fff6f6] p-3 text-sm text-[#8f3f3f]">
                  {appointmentError}
                </div>
              )}
              {isLoadingAppointments ? <div className="text-sm text-[#736067]">Loading appointments...</div> : null}
              {!isLoadingAppointments && !appointmentError && appointments.length === 0 ? (
                <div className="text-sm text-[#736067]">No appointments yet.</div>
              ) : null}
              <div className="mt-4 space-y-3">
                {appointments.map((appointment, index) => (
                  <div key={`${appointment.customerId}-${index}`} className="rounded-xl bg-[#fffafc] p-3 ring-1 ring-[#f3e6eb]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">Customer {appointment.customerId}</div>
                        <div className="text-sm text-[#736067]">{appointment.startsAt}</div>
                      </div>
                      <button
                        onClick={() => advanceAppointment(index)}
                        className="rounded-full border border-[#ead0d9] px-3 py-1.5 text-xs font-medium"
                      >
                        {appointment.status}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
              <h2 className="text-xl font-semibold">Book appointment</h2>
              <div className="mt-4 space-y-3">
                <select
                  value={appointmentCustomer}
                  onChange={(event) => setAppointmentCustomer(event.target.value)}
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                >
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
                <select
                  value={appointmentService}
                  onChange={(event) => setAppointmentService(event.target.value)}
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                >
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
                <select
                  value={appointmentStaff}
                  onChange={(event) => setAppointmentStaff(event.target.value)}
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                >
                  <option value="">Select staff</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName}
                    </option>
                  ))}
                </select>
                <button
                  onClick={addAppointment}
                  className="w-full rounded-xl bg-[#5a1838] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Save appointment
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "Inventory" ? (
          <section className="mt-6 space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
                <h2 className="text-xl font-semibold">Categories</h2>
                <div className="mt-4 space-y-3">
                  {isLoadingCategories ? <div className="text-sm text-[#736067]">Loading categories...</div> : null}
                  {!isLoadingCategories && categoryError ? <div className="rounded-xl bg-[#fff6f6] p-3 text-sm text-[#8f3f3f]">{categoryError}</div> : null}
                  {!isLoadingCategories && !categoryError && categories.length === 0 ? <div className="text-sm text-[#736067]">No categories yet.</div> : null}
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between rounded-xl bg-[#fffafc] p-3 ring-1 ring-[#f3e6eb]">
                      <div>
                        <div className="font-medium">{category.name}</div>
                        {category.description ? <div className="text-sm text-[#736067]">{category.description}</div> : null}
                      </div>
                      <div className="text-right text-sm text-[#736067]">
                        <div>{category.isActive ? "Active" : "Inactive"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
                <h2 className="text-xl font-semibold">Add category</h2>
                <div className="mt-4 space-y-3">
                  <input
                    value={categoryName}
                    onChange={(event) => setCategoryName(event.target.value)}
                    placeholder="Category name"
                    className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                  />
                  <input
                    value={categoryDescription}
                    onChange={(event) => setCategoryDescription(event.target.value)}
                    placeholder="Description (optional)"
                    className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                  />
                  <button
                    onClick={addCategory}
                    className="w-full rounded-xl bg-[#5a1838] px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    Save category
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
                <h2 className="text-xl font-semibold">Products</h2>
                <div className="mt-4 space-y-3">
                  {isLoadingProducts ? <div className="text-sm text-[#736067]">Loading products...</div> : null}
                  {!isLoadingProducts && productError ? <div className="rounded-xl bg-[#fff6f6] p-3 text-sm text-[#8f3f3f]">{productError}</div> : null}
                  {!isLoadingProducts && !productError && products.length === 0 ? <div className="text-sm text-[#736067]">No products yet.</div> : null}
                  {products.map((product) => (
                    <div key={product.id} className="flex items-center justify-between rounded-xl bg-[#fffafc] p-3 ring-1 ring-[#f3e6eb]">
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-[#736067]">SKU: {product.sku}</div>
                      </div>
                      <div className="text-right text-sm text-[#736067]">
                        <div>₹{product.priceCents / 100}</div>
                        <div>{product.isActive ? "Active" : "Inactive"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
                <h2 className="text-xl font-semibold">Add product</h2>
                <div className="mt-4 space-y-3">
                  <input
                    value={productCategoryId}
                    onChange={(event) => setProductCategoryId(event.target.value)}
                    placeholder="Category ID"
                    className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                  />
                  <input
                    value={productName}
                    onChange={(event) => setProductName(event.target.value)}
                    placeholder="Product name"
                    className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                  />
                  <input
                    value={productSku}
                    onChange={(event) => setProductSku(event.target.value)}
                    placeholder="SKU"
                    className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                  />
                  <input
                    value={productPrice}
                    onChange={(event) => setProductPrice(event.target.value)}
                    placeholder="Price (cents)"
                    className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                  />
                  <button
                    onClick={addProduct}
                    className="w-full rounded-xl bg-[#5a1838] px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    Save product
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
              <h2 className="text-xl font-semibold">Current Stock</h2>
              <div className="mt-4 space-y-3">
                {isLoadingStockItems ? <div className="text-sm text-[#736067]">Loading stock items...</div> : null}
                {!isLoadingStockItems && stockItemError ? <div className="rounded-xl bg-[#fff6f6] p-3 text-sm text-[#8f3f3f]">{stockItemError}</div> : null}
                {!isLoadingStockItems && !stockItemError && stockItems.length === 0 ? <div className="text-sm text-[#736067]">No stock items yet.</div> : null}
                {stockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl bg-[#fffafc] p-3 ring-1 ring-[#f3e6eb]">
                    <div>
                      <div className="font-medium">{productMap.get(item.productId) ?? `Product ${item.productId}`}</div>
                      <div className="text-sm text-[#736067]">{branchMap.get(item.branchId) ?? `Branch ${item.branchId}`}</div>
                    </div>
                    <div className="text-right text-sm text-[#736067]">
                      <div>Qty: {item.quantity}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
              <h2 className="text-xl font-semibold">Add stock item</h2>
              <div className="mt-4 space-y-3">
                <input
                  value={stockItemProductId}
                  onChange={(event) => setStockItemProductId(event.target.value)}
                  placeholder="Product ID"
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <input
                  value={stockItemBranchId}
                  onChange={(event) => setStockItemBranchId(event.target.value)}
                  placeholder="Branch ID"
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <input
                  value={stockItemQuantity}
                  onChange={(event) => setStockItemQuantity(event.target.value)}
                  placeholder="Quantity"
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <button
                  onClick={addStockItem}
                  className="w-full rounded-xl bg-[#5a1838] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Save stock item
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
              <h2 className="text-xl font-semibold">Movement History</h2>
              <div className="mt-4 space-y-3">
                {isLoadingStockMovements ? <div className="text-sm text-[#736067]">Loading stock movements...</div> : null}
                {!isLoadingStockMovements && stockMovementError ? <div className="rounded-xl bg-[#fff6f6] p-3 text-sm text-[#8f3f3f]">{stockMovementError}</div> : null}
                {!isLoadingStockMovements && !stockMovementError && stockMovements.length === 0 ? <div className="text-sm text-[#736067]">No stock movements yet.</div> : null}
                {stockMovements.map((movement) => (
                  <div key={movement.id} className="flex items-center justify-between rounded-xl bg-[#fffafc] p-3 ring-1 ring-[#f3e6eb]">
                    <div>
                      <div className="font-medium">{movement.movementType}</div>
                      <div className="text-sm text-[#736067]">{productMap.get(movement.productId) ?? `Product ${movement.productId}`}</div>
                      {movement.notes ? <div className="text-sm text-[#736067]">{movement.notes}</div> : null}
                    </div>
                    <div className="text-right text-sm text-[#736067]">
                      <div>{movement.quantity > 0 ? "+" : ""}{movement.quantity}</div>
                      <div>{new Date(movement.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
              <h2 className="text-xl font-semibold">Record movement</h2>
              <div className="mt-4 space-y-3">
                <input
                  value={stockMovementProductId}
                  onChange={(event) => setStockMovementProductId(event.target.value)}
                  placeholder="Product ID"
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <input
                  value={stockMovementBranchId}
                  onChange={(event) => setStockMovementBranchId(event.target.value)}
                  placeholder="Branch ID"
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <select
                  value={stockMovementType}
                  onChange={(event) => setStockMovementType(event.target.value)}
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
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
                        className="h-4 w-4 border-[#ead7df] text-[#5a1838] focus:ring-[#5a1838]"
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
                        className="h-4 w-4 border-[#ead7df] text-[#5a1838] focus:ring-[#5a1838]"
                      />
                      Stock Out (-)
                    </label>
                  </div>
                ) : null}
                <input
                  value={stockMovementQuantity}
                  onChange={(event) => setStockMovementQuantity(event.target.value)}
                  placeholder="Quantity"
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <input
                  value={stockMovementNotes}
                  onChange={(event) => setStockMovementNotes(event.target.value)}
                  placeholder="Notes (optional)"
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <button
                  onClick={addStockMovement}
                  className="w-full rounded-xl bg-[#5a1838] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Record movement
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "Billing" ? (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
              <h2 className="text-xl font-semibold">Invoices</h2>
              <div className="mt-4 space-y-3">
                {isLoadingInvoices ? <div className="text-sm text-[#736067]">Loading invoices...</div> : null}
                {!isLoadingInvoices && invoiceError ? <div className="rounded-xl bg-[#fff6f6] p-3 text-sm text-[#8f3f3f]">{invoiceError}</div> : null}
                {!isLoadingInvoices && !invoiceError && invoices.length === 0 ? <div className="text-sm text-[#736067]">No invoices yet.</div> : null}
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between rounded-xl bg-[#fffafc] p-3 ring-1 ring-[#f3e6eb]">
                    <div>
                      <div className="font-medium">{customerMap.get(invoice.customerId) ?? `Customer ${invoice.customerId}`}</div>
                      <div className="text-sm text-[#736067]">{invoice.issuedAt}</div>
                    </div>
                    <div className="text-right text-sm text-[#736067]">
                      <div>Total ₹{invoice.totalCents / 100}</div>
                      <div>{invoice.notes ?? "—"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
              <h2 className="text-xl font-semibold">Create invoice</h2>
              <div className="mt-4 space-y-3">
                <input
                  value={invoiceCustomerId}
                  onChange={(event) => setInvoiceCustomerId(event.target.value)}
                  placeholder="Customer ID"
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <input
                  value={invoiceIssuedAt}
                  onChange={(event) => setInvoiceIssuedAt(event.target.value)}
                  placeholder="Issued at (ISO date)"
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <input
                  value={invoiceDescription}
                  onChange={(event) => setInvoiceDescription(event.target.value)}
                  placeholder="Item description"
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={invoiceQuantity}
                    onChange={(event) => setInvoiceQuantity(event.target.value)}
                    placeholder="Qty"
                    className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                  />
                  <input
                    value={invoiceUnitPrice}
                    onChange={(event) => setInvoiceUnitPrice(event.target.value)}
                    placeholder="Unit price (cents)"
                    className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={invoiceDiscount}
                    onChange={(event) => setInvoiceDiscount(event.target.value)}
                    placeholder="Discount (cents)"
                    className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                  />
                  <input
                    value={invoiceGst}
                    onChange={(event) => setInvoiceGst(event.target.value)}
                    placeholder="GST (cents)"
                    className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                  />
                </div>
                <input
                  value={invoiceNotes}
                  onChange={(event) => setInvoiceNotes(event.target.value)}
                  placeholder="Notes (optional)"
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <button
                  onClick={addInvoice}
                  className="w-full rounded-xl bg-[#5a1838] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Save invoice
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "Branches" ? (
          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
              <h2 className="text-xl font-semibold">Business units</h2>
              <div className="mt-4 space-y-3">
                {isLoadingBusinessUnits ? <div className="text-sm text-[#736067]">Loading business units...</div> : null}
                {!isLoadingBusinessUnits && businessUnitError ? <div className="rounded-xl bg-[#fff6f6] p-3 text-sm text-[#8f3f3f]">{businessUnitError}</div> : null}
                {!isLoadingBusinessUnits && !businessUnitError && businessUnits.length === 0 ? <div className="text-sm text-[#736067]">No business units yet.</div> : null}
                {businessUnits.map((bu) => (
                  <div key={bu.id} className="flex items-center justify-between rounded-xl bg-[#fffafc] p-3 ring-1 ring-[#f3e6eb]">
                    <div>
                      <div className="font-medium">{bu.name}</div>
                      <div className="text-sm text-[#736067]">{bu.slug}</div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs ${bu.isActive ? "bg-[#e6f4ea] text-[#1e7e34]" : "bg-[#fceff4] text-[#6a2f4a]"}`}>{bu.isActive ? "Active" : "Inactive"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
              <h2 className="text-xl font-semibold">Add business unit</h2>
              <div className="mt-4 space-y-3">
                <input
                  value={businessUnitName}
                  onChange={(event) => setBusinessUnitName(event.target.value)}
                  placeholder="Business unit name"
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <input
                  value={businessUnitSlug}
                  onChange={(event) => setBusinessUnitSlug(event.target.value)}
                  placeholder="Slug"
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <button
                  onClick={addBusinessUnit}
                  className="w-full rounded-xl bg-[#5a1838] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Save business unit
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
              <h2 className="text-xl font-semibold">Branches</h2>
              <div className="mt-4 space-y-3">
                {isLoadingBranches ? <div className="text-sm text-[#736067]">Loading branches...</div> : null}
                {!isLoadingBranches && branchError ? <div className="rounded-xl bg-[#fff6f6] p-3 text-sm text-[#8f3f3f]">{branchError}</div> : null}
                {!isLoadingBranches && !branchError && branches.length === 0 ? <div className="text-sm text-[#736067]">No branches yet.</div> : null}
                {branches.map((branch) => (
                  <div key={branch.id} className="flex items-center justify-between rounded-xl bg-[#fffafc] p-3 ring-1 ring-[#f3e6eb]">
                    <div>
                      <div className="font-medium">{branch.name}</div>
                      <div className="text-sm text-[#736067]">{branch.slug} · BU {branch.businessUnitId}</div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs ${branch.isActive ? "bg-[#e6f4ea] text-[#1e7e34]" : "bg-[#fceff4] text-[#6a2f4a]"}`}>{branch.isActive ? "Active" : "Inactive"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
              <h2 className="text-xl font-semibold">Add branch</h2>
              <div className="mt-4 space-y-3">
                <input
                  value={branchName}
                  onChange={(event) => setBranchName(event.target.value)}
                  placeholder="Branch name"
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <input
                  value={branchSlug}
                  onChange={(event) => setBranchSlug(event.target.value)}
                  placeholder="Slug"
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <input
                  value={branchBusinessUnitId}
                  onChange={(event) => setBranchBusinessUnitId(event.target.value)}
                  placeholder="Business unit ID"
                  className="w-full rounded-xl border border-[#ead7df] px-3 py-2.5 text-sm"
                />
                <button
                  onClick={addBranch}
                  className="w-full rounded-xl bg-[#5a1838] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Save branch
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "Overview" ? (
          <section className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
            <h2 className="text-xl font-semibold">Launch workflow</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                "Login",
                "Tenant context",
                "Customer + Service",
                "Appointment + completion",
                "Invoice / POS",
              ].map((step, index) => (
                <div key={step} className="rounded-xl bg-[#fffafc] p-4 ring-1 ring-[#f3e6eb]">
                  <div className="text-xs uppercase tracking-[0.2em] text-[#8a606d]">0{index + 1}</div>
                  <div className="mt-2 font-medium">{step}</div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === "Reports" ? (
          <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f2e2e8]">
              <div className="text-xs uppercase tracking-[0.18em] text-[#8a606d]">Customers</div>
              <div className="mt-2 text-3xl font-semibold">{customers.length}</div>
            </div>
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f2e2e8]">
              <div className="text-xs uppercase tracking-[0.18em] text-[#8a606d]">Services</div>
              <div className="mt-2 text-3xl font-semibold">{services.length}</div>
            </div>
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f2e2e8]">
              <div className="text-xs uppercase tracking-[0.18em] text-[#8a606d]">Appointments</div>
              <div className="mt-2 text-3xl font-semibold">{appointments.length}</div>
            </div>
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f2e2e8]">
              <div className="text-xs uppercase tracking-[0.18em] text-[#8a606d]">Invoices</div>
              <div className="mt-2 text-3xl font-semibold">{invoices.length}</div>
            </div>
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f2e2e8]">
              <div className="text-xs uppercase tracking-[0.18em] text-[#8a606d]">Revenue</div>
              <div className="mt-2 text-3xl font-semibold">₹{invoices.reduce((sum, invoice) => sum + invoice.totalCents, 0) / 100}</div>
            </div>
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f2e2e8]">
              <div className="text-xs uppercase tracking-[0.18em] text-[#8a606d]">Products</div>
              <div className="mt-2 text-3xl font-semibold">{products.length}</div>
            </div>
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f2e2e8]">
              <div className="text-xs uppercase tracking-[0.18em] text-[#8a606d]">Staff</div>
              <div className="mt-2 text-3xl font-semibold">{staff.length}</div>
            </div>
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f2e2e8]">
              <div className="text-xs uppercase tracking-[0.18em] text-[#8a606d]">Packages</div>
              <div className="mt-2 text-3xl font-semibold">{packages.length}</div>
            </div>
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f2e2e8]">
              <div className="text-xs uppercase tracking-[0.18em] text-[#8a606d]">Memberships</div>
              <div className="mt-2 text-3xl font-semibold">{memberships.length}</div>
            </div>
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f2e2e8]">
              <div className="text-xs uppercase tracking-[0.18em] text-[#8a606d]">Stock Items</div>
              <div className="mt-2 text-3xl font-semibold">{stockItems.length}</div>
            </div>
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f2e2e8]">
              <div className="text-xs uppercase tracking-[0.18em] text-[#8a606d]">Movements</div>
              <div className="mt-2 text-3xl font-semibold">{stockMovements.length}</div>
            </div>
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f2e2e8]">
              <div className="text-xs uppercase tracking-[0.18em] text-[#8a606d]">Business Units</div>
              <div className="mt-2 text-3xl font-semibold">{businessUnits.length}</div>
            </div>
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f2e2e8]">
              <div className="text-xs uppercase tracking-[0.18em] text-[#8a606d]">Branches</div>
              <div className="mt-2 text-3xl font-semibold">{branches.length}</div>
            </div>
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f2e2e8]">
              <div className="text-xs uppercase tracking-[0.18em] text-[#8a606d]">Categories</div>
              <div className="mt-2 text-3xl font-semibold">{categories.length}</div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

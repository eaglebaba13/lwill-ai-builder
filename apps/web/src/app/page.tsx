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

const tabs = ["Overview", "Customers", "Services", "Packages", "Memberships", "Inventory", "Staff", "Appointments", "Billing"] as const;

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
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffName, setStaffName] = useState("");
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("1500");
  const [appointmentCustomer, setAppointmentCustomer] = useState("");
  const [appointmentService, setAppointmentService] = useState("");
  const [appointmentStaff, setAppointmentStaff] = useState("staff-1");
  const [appointmentError, setAppointmentError] = useState<string | null>(null);

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

  const addAppointment = async () => {
    if (!appointmentCustomer || !appointmentService) return;
    setAppointmentError(null);
    const result = await fetch("/api/appointments", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customerId: appointmentCustomer,
        serviceId: appointmentService,
        startsAt: "2026-08-12T10:30:00.000Z",
        endsAt: "2026-08-12T11:15:00.000Z",
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
            <div className="mt-2 text-3xl font-semibold">18</div>
            <div className="mt-1 text-sm text-[#715a62]">Appointments</div>
          </div>
          <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f2e2e8]">
            <div className="text-xs uppercase tracking-[0.18em] text-[#8a606d]">Revenue</div>
            <div className="mt-2 text-3xl font-semibold">₹42.5k</div>
            <div className="mt-1 text-sm text-[#715a62]">Gross sales</div>
          </div>
          <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f2e2e8]">
            <div className="text-xs uppercase tracking-[0.18em] text-[#8a606d]">Members</div>
            <div className="mt-2 text-3xl font-semibold">128</div>
            <div className="mt-1 text-sm text-[#715a62]">Loyalty</div>
          </div>
          <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f2e2e8]">
            <div className="text-xs uppercase tracking-[0.18em] text-[#8a606d]">Staff</div>
            <div className="mt-2 text-3xl font-semibold">6</div>
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
                  {staff.map((member, index) => (
                    <option key={`${member.displayName}-${index}`} value={`staff-${index + 1}`}>
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
          <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
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
                      <div className="font-medium">Customer {invoice.customerId}</div>
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
      </div>
    </main>
  );
}

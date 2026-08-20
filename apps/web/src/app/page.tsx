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
  createAppointmentRecord,
  createInvoiceRecord,
  createStaffRecord,
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

const initialStaff = [
  { tenantId: "tenant-xnail", displayName: "Mina Patel", branchId: "branch-main" },
  { tenantId: "tenant-xnail", displayName: "Aisha Khan", branchId: "branch-main" },
];

const tabs = ["Overview", "Customers", "Services", "Staff", "Appointments", "Billing"] as const;

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
  const [staff, setStaff] = useState(initialStaff);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("1500");
  const [staffName, setStaffName] = useState("");
  const [appointmentCustomer, setAppointmentCustomer] = useState("");
  const [appointmentService, setAppointmentService] = useState("");
  const [appointmentStaff, setAppointmentStaff] = useState("staff-1");
  const [selectedInvoice, setSelectedInvoice] = useState({
    tenantId: "tenant-xnail",
    customerId: "",
    items: [
      { description: "Classic Manicure", quantity: 1, unitPriceCents: 1500 },
      { description: "Gel Polish", quantity: 1, unitPriceCents: 2200 },
    ],
    discountCents: 200,
    gstCents: 180,
  });

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
    const loadingTimer = window.setTimeout(() => {
      if (mounted) {
        setIsLoadingCustomers(true);
        setCustomerError(null);
      }
    }, 0);
    void fetch("/api/customers", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
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
          setSelectedInvoice((current) => ({ ...current, customerId: current.customerId || loadedCustomers[0].id }));
        }
      })
      .catch(() => {
        if (mounted) {
          setCustomers([]);
          setCustomerError("Customers could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) setIsLoadingCustomers(false);
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
    const loadingTimer = window.setTimeout(() => {
      if (mounted) {
        setIsLoadingServices(true);
        setServiceError(null);
      }
    }, 0);
    void fetch("/api/services", { credentials: "same-origin" })
      .then(async (result) => {
        if (!mounted) return;
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
        if (mounted) {
          setServices([]);
          setServiceError("Services could not be loaded.");
        }
      })
      .finally(() => {
        if (mounted) setIsLoadingServices(false);
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

  const addStaff = () => {
    if (!staffName.trim()) return;

    const record = createStaffRecord({
      tenantId: "tenant-xnail",
      displayName: staffName,
      branchId: "branch-main",
      isActive: true,
    });

    setStaff((current) => [{ ...record }, ...current]);
    setStaffName("");
  };

  const addAppointment = () => {
    const record = createAppointmentRecord({
      tenantId: "tenant-xnail",
      customerId: appointmentCustomer,
      serviceId: appointmentService,
      staffId: appointmentStaff,
      startsAt: "2026-08-12T10:30:00.000Z",
      endsAt: "2026-08-12T11:15:00.000Z",
      status: "Booked",
    });

    setAppointments((current) => [record, ...current]);
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

  const invoicePreview = selectedInvoice.customerId
    ? createInvoiceRecord(selectedInvoice)
    : { subtotalCents: 0, discountCents: 0, gstCents: 0, totalCents: 0 };

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

        {activeTab === "Staff" ? (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
              <h2 className="text-xl font-semibold">Staff roster</h2>
              <div className="mt-4 space-y-3">
                {staff.map((member, index) => (
                  <div key={`${member.displayName}-${index}`} className="flex items-center justify-between rounded-xl bg-[#fffafc] p-3 ring-1 ring-[#f3e6eb]">
                    <div>
                      <div className="font-medium">{member.displayName}</div>
                      <div className="text-sm text-[#736067]">{member.branchId}</div>
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

        {activeTab === "Billing" ? (
          <section className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-[#f0dfe6]">
            <h2 className="text-xl font-semibold">Invoice / POS</h2>
            <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl bg-[#fffafc] p-4 ring-1 ring-[#f3e6eb]">
                <div className="space-y-3">
                  {selectedInvoice.items.map((item, index) => (
                    <div key={`${item.description}-${index}`} className="flex items-center justify-between text-sm">
                      <span>{item.description}</span>
                      <span>₹{(item.quantity * item.unitPriceCents) / 100}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-t border-[#f0dfe6] pt-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span>₹{invoicePreview.subtotalCents / 100}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Discount</span>
                    <span>-₹{invoicePreview.discountCents / 100}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>GST</span>
                    <span>₹{invoicePreview.gstCents / 100}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>₹{invoicePreview.totalCents / 100}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-[#fffafc] p-4 ring-1 ring-[#f3e6eb]">
                <div className="text-sm font-medium text-[#5a3b48]">Quick POS</div>
                <div className="mt-4 space-y-3">
                  <button
                    onClick={() =>
                      setSelectedInvoice({
                        tenantId: "tenant-xnail",
                        customerId: "cust-1",
                        items: [
                          { description: "Classic Manicure", quantity: 1, unitPriceCents: 1500 },
                          { description: "Nail Art Add-on", quantity: 2, unitPriceCents: 800 },
                        ],
                        discountCents: 200,
                        gstCents: 180,
                      })
                    }
                    className="w-full rounded-xl bg-[#5a1838] px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    Generate invoice
                  </button>
                  <button
                    onClick={() =>
                      setSelectedInvoice({
                        tenantId: "tenant-xnail",
                        customerId: "cust-2",
                        items: [{ description: "Gel Polish", quantity: 1, unitPriceCents: 2200 }],
                        discountCents: 0,
                        gstCents: 120,
                      })
                    }
                    className="w-full rounded-xl border border-[#ead0d9] px-4 py-2.5 text-sm font-semibold"
                  >
                    Quick checkout
                  </button>
                </div>
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

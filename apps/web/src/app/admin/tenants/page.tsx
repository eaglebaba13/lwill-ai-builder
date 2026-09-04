"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";

interface TenantRecord {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface TenantDetailRecord extends TenantRecord {
  readonly domains: ReadonlyArray<{
    readonly id: string;
    readonly domain: string;
    readonly isPrimary: boolean;
    readonly verificationStatus: string;
    readonly isActive: boolean;
  }>;
  readonly _count: {
    readonly businessUnits: number;
    readonly branches: number;
    readonly users: number;
  };
}

export default function TenantsPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<TenantDetailRecord | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const loadTenants = useCallback(() => {
    setIsLoading(true);
    setError(null);
    void fetch("/api/platform/tenants", { credentials: "same-origin" })
      .then(async (result) => {
        if (result.status === 401 || result.status === 403) {
          setAuthenticated(false);
          return;
        }
        if (!result.ok) {
          throw new Error("Failed to load tenants");
        }
        const body = await result.json() as { tenants?: TenantRecord[] };
        setAuthenticated(true);
        setTenants(body.tenants ?? []);
      })
      .catch(() => {
        setError("Tenants could not be loaded.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTenants();
  }, [loadTenants]);

  const loadTenantDetail = async (tenantId: string) => {
    try {
      const result = await fetch(`/api/platform/tenants/${tenantId}`, { credentials: "same-origin" });
      if (!result.ok) {
        throw new Error("Failed to load tenant");
      }
      const body = await result.json() as { tenant?: TenantDetailRecord };
      setSelectedTenant(body.tenant ?? null);
    } catch {
      setError("Tenant detail could not be loaded.");
    }
  };

  const handleCreate = async () => {
    setCreateError(null);
    setIsCreating(true);
    try {
      const result = await fetch("/api/platform/tenants", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: createName, slug: createSlug }),
      });
      if (result.status === 409) {
        setCreateError("A tenant with this slug already exists.");
        return;
      }
      if (!result.ok) {
        const body = await result.json() as { error?: string };
        setCreateError(body.error ?? "Failed to create tenant.");
        return;
      }
      setShowCreateForm(false);
      setCreateName("");
      setCreateSlug("");
      loadTenants();
    } catch {
      setCreateError("Failed to create tenant.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (tenant: TenantRecord) => {
    try {
      const result = await fetch(`/api/platform/tenants/${tenant.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive: !tenant.isActive }),
      });
      if (!result.ok) {
        throw new Error("Failed to update tenant");
      }
      loadTenants();
      if (selectedTenant?.id === tenant.id) {
        loadTenantDetail(tenant.id);
      }
    } catch {
      setError("Failed to update tenant.");
    }
  };

  const sidebarItems = [
    { label: "Dashboard", onClick: () => { router.push("/admin"); } },
    { label: "Tenants", active: true, onClick: () => {} },
    { label: "Users", onClick: () => {} },
    { label: "Settings", onClick: () => {} },
    { label: "Audit", onClick: () => {} },
  ];

  const bottomItems = [
    { label: "Back to X Nail", onClick: () => { router.push("/xnail"); } },
  ];

  if (authenticated === null && isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080807]">
        <div className="text-sm text-[#a39a86]">Loading...</div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080807] px-4 py-12 text-[#f5f1e6]">
        <div className="w-full max-w-md rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[#0d0c0a] p-8 text-center">
          <h1 className="font-serif text-2xl font-semibold text-[#f5f1e6]">Platform Admin</h1>
          <p className="mt-3 text-sm text-[#a39a86]">You need platform administrator access.</p>
          <a href="/admin" className="mt-6 inline-block rounded-lg border border-[rgba(212,175,55,0.3)] bg-[#17150f] px-4 py-2 text-sm font-medium text-[#d4af37]">Go to Admin</a>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#080807] text-[#f5f1e6]">
      <AppSidebar brandName="LWILL" brandSubtitle="Platform Admin" items={sidebarItems} bottomItems={bottomItems} />

      <div className="flex flex-1 flex-col">
        <AppHeader
          title="Tenant Management"
          subtitle={`${tenants.length} tenant${tenants.length === 1 ? "" : "s"}`}
          rightContent={
            <button
              onClick={() => setShowCreateForm(true)}
              className="premium-btn-primary px-4 py-2 text-sm"
            >
              Create Tenant
            </button>
          }
        />

        <main className="flex-1 px-6 py-8">
          {error ? (
            <div className="mb-6 rounded-xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-4 text-sm text-[#d1554a]">{error}</div>
          ) : null}

          {showCreateForm ? (
            <div className="mb-6 premium-card p-6">
              <h3 className="font-serif text-lg font-semibold text-[#f5f1e6]">Create New Tenant</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#a39a86]">Name</label>
                  <input
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g. HDK Beauty"
                    className="premium-input"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#a39a86]">Slug</label>
                  <input
                    value={createSlug}
                    onChange={(e) => setCreateSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                    placeholder="e.g. hdk-beauty"
                    className="premium-input"
                  />
                </div>
              </div>
              {createError ? (
                <div className="mt-3 rounded-lg border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-3 text-sm text-[#d1554a]">{createError}</div>
              ) : null}
              <div className="mt-4 flex gap-3">
                <button onClick={handleCreate} disabled={isCreating || !createName.trim() || !createSlug.trim()} className="premium-btn-primary px-4 py-2 text-sm disabled:opacity-50">
                  {isCreating ? "Creating..." : "Create"}
                </button>
                <button onClick={() => { setShowCreateForm(false); setCreateError(null); }} className="premium-btn-secondary px-4 py-2 text-sm">
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          {selectedTenant ? (
            <div className="mb-6 premium-card p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-semibold text-[#f5f1e6]">{selectedTenant.name}</h3>
                <button onClick={() => setSelectedTenant(null)} className="premium-btn-secondary px-3 py-1.5 text-xs">Close</button>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <div className="text-xs text-[#a39a86]">Slug</div>
                  <div className="mt-1 text-sm text-[#f5f1e6]">{selectedTenant.slug}</div>
                </div>
                <div>
                  <div className="text-xs text-[#a39a86]">Status</div>
                  <div className="mt-1">
                    <span className={selectedTenant.isActive ? "premium-badge-success" : "premium-badge-danger"}>
                      {selectedTenant.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#a39a86]">Created</div>
                  <div className="mt-1 text-sm text-[#f5f1e6]">{new Date(selectedTenant.createdAt).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-xs text-[#a39a86]">Users</div>
                  <div className="mt-1 text-sm text-[#f5f1e6]">{selectedTenant._count.users}</div>
                </div>
              </div>
              {selectedTenant.domains.length > 0 ? (
                <div className="mt-4">
                  <div className="text-xs font-medium uppercase tracking-wider text-[#d4af37]">Domains</div>
                  <div className="mt-2 space-y-2">
                    {selectedTenant.domains.map((d) => (
                      <div key={d.id} className="flex items-center justify-between rounded-lg border border-[rgba(212,175,55,0.1)] bg-[#17150f] px-3 py-2 text-sm">
                        <span className="text-[#f5f1e6]">{d.domain}</span>
                        <div className="flex gap-2">
                          {d.isPrimary ? <span className="premium-badge">Primary</span> : null}
                          <span className={`text-xs ${d.isActive ? "text-[#3fae6a]" : "text-[#a39a86]"}`}>{d.isActive ? "Active" : "Inactive"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3 text-center">
                  <div className="text-xs text-[#a39a86]">Business Units</div>
                  <div className="mt-1 text-lg font-semibold text-[#f5f1e6]">{selectedTenant._count.businessUnits}</div>
                </div>
                <div className="rounded-lg border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3 text-center">
                  <div className="text-xs text-[#a39a86]">Branches</div>
                  <div className="mt-1 text-lg font-semibold text-[#f5f1e6]">{selectedTenant._count.branches}</div>
                </div>
                <div className="rounded-lg border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-3 text-center">
                  <div className="text-xs text-[#a39a86]">Users</div>
                  <div className="mt-1 text-lg font-semibold text-[#f5f1e6]">{selectedTenant._count.users}</div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="premium-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={5} className="text-center text-[#a39a86]">Loading...</td></tr>
                  ) : tenants.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-[#a39a86]">No tenants found.</td></tr>
                  ) : (
                    tenants.map((tenant) => (
                      <tr key={tenant.id}>
                        <td className="font-medium text-[#f5f1e6]">{tenant.name}</td>
                        <td className="text-[#a39a86]">{tenant.slug}</td>
                        <td>
                          <span className={tenant.isActive ? "premium-badge-success" : "premium-badge-danger"}>
                            {tenant.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="text-[#a39a86]">{new Date(tenant.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="flex gap-2">
                            <button onClick={() => loadTenantDetail(tenant.id)} className="premium-btn-secondary px-3 py-1 text-xs">View</button>
                            <button onClick={() => handleToggleActive(tenant)} className={`px-3 py-1 text-xs rounded-md border ${tenant.isActive ? "border-[rgba(209,85,74,0.3)] text-[#d1554a] hover:bg-[rgba(209,85,74,0.12)]" : "border-[rgba(63,174,106,0.3)] text-[#3fae6a] hover:bg-[rgba(63,174,106,0.12)]"}`}>
                              {tenant.isActive ? "Deactivate" : "Activate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

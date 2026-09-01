"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [platformStatus, setPlatformStatus] = useState<string | null>(null);
  const [platformError, setPlatformError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void fetch("/api/platform/health", { credentials: "same-origin", cache: "no-store" })
      .then(async (result) => {
        if (!mounted) return;
        if (result.status === 401) {
          setAuthenticated(false);
          return;
        }
        if (result.status === 403) {
          setAuthenticated(false);
          setPlatformError("You do not have platform administrator access.");
          return;
        }
        if (!result.ok) {
          throw new Error("Platform health check failed");
        }
        const body = await result.json() as { status?: string };
        setAuthenticated(true);
        setPlatformStatus(body.status ?? "unknown");
      })
      .catch(() => {
        if (mounted) {
          setAuthenticated(false);
          setPlatformError("Platform health check failed.");
        }
      });
    return () => { mounted = false; };
  }, []);

  const sidebarItems = [
    { label: "Dashboard", active: activeSection === "dashboard", onClick: () => setActiveSection("dashboard") },
    { label: "Tenants", active: activeSection === "tenants", onClick: () => setActiveSection("tenants") },
    { label: "Users", active: activeSection === "users", onClick: () => setActiveSection("users") },
    { label: "Settings", active: activeSection === "settings", onClick: () => setActiveSection("settings") },
    { label: "Audit", active: activeSection === "audit", onClick: () => setActiveSection("audit") },
  ];

  const bottomItems = [
    { label: "Back to X Nail", onClick: () => { window.location.href = "/xnail"; } },
  ];

  // Loading state
  if (authenticated === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080807]">
        <div className="text-sm text-[#a39a86]">Checking platform access...</div>
      </main>
    );
  }

  // Unauthorized state
  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080807] px-4 py-12 text-[#f5f1e6]">
        <div className="w-full max-w-md rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[#0d0c0a] p-8 text-center">
          <div className="mb-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#9c7a1e] to-[#d4af37] text-lg font-bold text-[#080807]">L</div>
          </div>
          <h1 className="font-serif text-2xl font-semibold text-[#f5f1e6]">Platform Admin</h1>
          <p className="mt-3 text-sm text-[#a39a86]">
            {platformError ?? "You need platform administrator access to view this page."}
          </p>
          <a
            href="/xnail"
            className="mt-6 inline-block rounded-lg border border-[rgba(212,175,55,0.3)] bg-[#17150f] px-4 py-2 text-sm font-medium text-[#d4af37] hover:bg-[#1b1812]"
          >
            Go to X Nail
          </a>
        </div>
      </main>
    );
  }

  // Authorized state
  return (
    <div className="flex min-h-screen bg-[#080807] text-[#f5f1e6]">
      <AppSidebar
        brandName="LWILL"
        brandSubtitle="Platform Admin"
        items={sidebarItems}
        bottomItems={bottomItems}
      />

      <div className="flex flex-1 flex-col">
        <AppHeader
          title="Super Admin Control Center"
          subtitle={`Platform status: ${platformStatus}`}
        />

        <main className="flex-1 px-6 py-8">
          {activeSection === "dashboard" ? (
            <section className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl font-bold bg-gradient-to-r from-[#9c7a1e] via-[#d4af37] to-[#f1d78c] bg-clip-text text-transparent">
                  Platform Dashboard
                </h2>
                <p className="mt-1 text-sm text-[#a39a86]">Global platform overview and management</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="premium-card premium-kpi-accent p-5">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#a39a86]">Platform Status</div>
                  <div className="mt-2 text-lg font-semibold text-[#3fae6a]">{platformStatus}</div>
                </div>
                <div className="premium-card premium-kpi-accent p-5">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#a39a86]">Tenants</div>
                  <div className="mt-2 text-lg font-semibold text-[#a39a86]">Coming soon</div>
                </div>
                <div className="premium-card premium-kpi-accent p-5">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#a39a86]">Active Users</div>
                  <div className="mt-2 text-lg font-semibold text-[#a39a86]">Coming soon</div>
                </div>
                <div className="premium-card premium-kpi-accent p-5">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#a39a86]">System Health</div>
                  <div className="mt-2 text-lg font-semibold text-[#3fae6a]">Healthy</div>
                </div>
              </div>

              <div className="premium-card p-6">
                <h3 className="font-serif text-lg font-semibold text-[#f5f1e6]">Quick Actions</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {["Manage Tenants", "View Audit Log", "Platform Settings", "Feature Flags"].map((action) => (
                    <div
                      key={action}
                      className="rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-4 text-sm font-medium text-[#a39a86]"
                    >
                      {action}
                      <div className="mt-1 text-xs text-[#7a7266]">Coming soon</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : (
            <section className="space-y-6">
              <h2 className="font-serif text-2xl font-bold bg-gradient-to-r from-[#9c7a1e] via-[#d4af37] to-[#f1d78c] bg-clip-text text-transparent">
                {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
              </h2>
              <div className="premium-card p-6">
                <p className="text-sm text-[#a39a86]">
                  This section is not yet implemented. It will be available in a future release.
                </p>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

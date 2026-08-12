import { describe, expect, it } from "vitest";
import {
  ensureHostnameMatchesSessionTenant,
  normalizeHostname,
  resolveTenantByHostname,
} from "./tenant-domain";

describe("normalizeHostname", () => {
  it("strips protocol, ports, and trailing dots before comparison", () => {
    expect(normalizeHostname("https://www.acme.example.com:443/")).toBe(
      "acme.example.com",
    );
    expect(normalizeHostname("acme.example.com.")).toBe("acme.example.com");
  });

  it("returns null for empty or local development hosts", () => {
    expect(normalizeHostname("   ")).toBeNull();
    expect(normalizeHostname("localhost")).toBeNull();
    expect(normalizeHostname("127.0.0.1")).toBeNull();
  });
});

describe("resolveTenantByHostname", () => {
  const domainRecords = [
    {
      id: "domain-1",
      tenantId: "tenant-1",
      domain: "acme.example.com",
      isPrimary: true,
      verificationStatus: "verified",
      isActive: true,
      tenant: { id: "tenant-1", isActive: true },
    },
    {
      id: "domain-2",
      tenantId: "tenant-2",
      domain: "beta.example.com",
      isPrimary: false,
      verificationStatus: "verified",
      isActive: true,
      tenant: { id: "tenant-2", isActive: true },
    },
    {
      id: "domain-3",
      tenantId: "tenant-3",
      domain: "pending.example.com",
      isPrimary: false,
      verificationStatus: "pending",
      isActive: true,
      tenant: { id: "tenant-3", isActive: true },
    },
    {
      id: "domain-4",
      tenantId: "tenant-4",
      domain: "inactive.example.com",
      isPrimary: false,
      verificationStatus: "verified",
      isActive: false,
      tenant: { id: "tenant-4", isActive: true },
    },
  ] as const;

  it("resolves an active verified domain to the tenant and prefers primary record", () => {
    const resolved = resolveTenantByHostname("https://acme.example.com", domainRecords);

    expect(resolved).toEqual({
      id: "domain-1",
      tenantId: "tenant-1",
      domain: "acme.example.com",
      isPrimary: true,
      verificationStatus: "verified",
      isActive: true,
      tenant: { id: "tenant-1", isActive: true },
    });
  });

  it("rejects unknown, pending, or inactive domains", () => {
    expect(resolveTenantByHostname("unknown.example.com", domainRecords)).toBeNull();
    expect(resolveTenantByHostname("pending.example.com", domainRecords)).toBeNull();
    expect(resolveTenantByHostname("inactive.example.com", domainRecords)).toBeNull();
  });

  it("accepts the www variant and still resolves to the canonical tenant domain", () => {
    expect(resolveTenantByHostname("www.acme.example.com", domainRecords)?.tenantId).toBe(
      "tenant-1",
    );
  });
});

describe("ensureHostnameMatchesSessionTenant", () => {
  it("allows a hostname that matches the current session tenant and rejects cross-tenant mismatches", () => {
    expect(ensureHostnameMatchesSessionTenant("tenant-1", "tenant-1")).toBe(true);
    expect(ensureHostnameMatchesSessionTenant("tenant-1", "tenant-2")).toBe(false);
    expect(ensureHostnameMatchesSessionTenant(null, "tenant-2")).toBe(true);
  });
});

export interface TenantDomainRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly domain: string;
  readonly isPrimary: boolean;
  readonly verificationStatus: string;
  readonly isActive: boolean;
  readonly tenant?: {
    readonly id: string;
    readonly isActive: boolean;
  } | null;
}

export function normalizeHostname(input: string | null | undefined): string | null {
  if (typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim().toLowerCase();
  if (trimmed === "" || trimmed === "localhost") {
    return null;
  }

  try {
    const url = new URL(trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`);
    const host = url.hostname.replace(/\.$/, "").replace(/^www\./, "");

    if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") {
      return null;
    }

    return host;
  } catch {
    const host = trimmed
      .replace(/^https?:\/\//i, "")
      .replace(/:\d+.*$/, "")
      .replace(/\.$/, "")
      .replace(/^www\./, "");

    if (host === "" || host === "localhost" || host === "127.0.0.1" || host === "[::1]") {
      return null;
    }

    return host;
  }
}

export function resolveTenantByHostname(
  hostnameOrUrl: string | null | undefined,
  domainRecords: readonly TenantDomainRecord[],
): TenantDomainRecord | null {
  const normalized = normalizeHostname(hostnameOrUrl);
  if (normalized === null) {
    return null;
  }

  const canonicalHost = normalized.replace(/^www\./, "");
  const exactMatches = domainRecords.filter((record) => {
    if (!record.isActive || record.verificationStatus !== "verified") {
      return false;
    }

    if (record.tenant === undefined || record.tenant === null) {
      return false;
    }

    if (!record.tenant.isActive) {
      return false;
    }

    const normalizedRecordDomain = record.domain.toLowerCase().replace(/^www\./, "");
    return normalizedRecordDomain === canonicalHost;
  });

  if (exactMatches.length === 0) {
    return null;
  }

  return exactMatches.find((record) => record.isPrimary) ?? exactMatches[0] ?? null;
}

export function ensureHostnameMatchesSessionTenant(
  sessionTenantId: string | null,
  resolvedTenantId: string | null,
): boolean {
  if (sessionTenantId === null || resolvedTenantId === null) {
    return true;
  }

  return sessionTenantId === resolvedTenantId;
}

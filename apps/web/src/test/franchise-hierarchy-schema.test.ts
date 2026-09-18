import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(process.cwd(), "../..");
const schema = readFileSync(
  `${repositoryRoot}/packages/database/prisma/schema.prisma`,
  "utf8",
);
const migration = readFileSync(
  `${repositoryRoot}/packages/database/prisma/migrations/20260917160000_add_franchise_hierarchy_foundation/migration.sql`,
  "utf8",
);

function model(name: string) {
  const match = schema.match(new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`));
  expect(match, `Expected Prisma model ${name}`).not.toBeNull();
  return match?.[0] ?? "";
}

describe("FH-4A franchise hierarchy schema foundation", () => {
  it("defines canonical geography and approved hierarchy models", () => {
    for (const name of [
      "GeoCountry",
      "GeoState",
      "GeoCity",
      "GeoPincode",
      "StateFranchise",
      "StateFranchisePincode",
      "CityFranchise",
      "CityFranchiseArea",
      "CityFranchisePincode",
      "FranchiseOutletAssignment",
    ]) {
      expect(model(name)).toContain(`model ${name}`);
    }
  });

  it("keeps tenant-owned hierarchy relationships tenant scoped", () => {
    expect(model("StateFranchise")).toContain(
      "@relation(fields: [tenantId, partnerId], references: [tenantId, id]",
    );
    expect(model("CityFranchise")).toContain(
      "@relation(fields: [tenantId, stateFranchiseId], references: [tenantId, id]",
    );
    expect(model("FranchiseOutletAssignment")).toContain(
      "@relation(fields: [tenantId, outletProfileId], references: [tenantId, id]",
    );
    expect(model("FranchiseOutletAssignment")).toContain(
      "@relation(fields: [tenantId, cityFranchiseId], references: [tenantId, id]",
    );
  });

  it("adds a nullable compatibility pointer without changing agreement targets", () => {
    expect(model("FranchiseOutletProfile")).toContain(
      "currentCityFranchiseId String?",
    );
    const agreement = model("FranchiseAgreement");
    expect(agreement).not.toContain("agreementLevel");
    expect(agreement).not.toContain("stateFranchiseId");
    expect(agreement).not.toContain("cityFranchiseId");
    expect(agreement).not.toContain("outletProfileId");
  });

  it("uses an additive migration with immediate row-local constraints", () => {
    expect(migration).toContain(
      'FOREIGN KEY ("tenantId", "cityFranchiseId") REFERENCES "CityFranchise"("tenantId", "id")',
    );
    expect(migration).toContain('"GeoPincode_value_format_check"');
    expect(migration).toContain('"StateFranchise_effective_period_check"');
    expect(migration).toContain(
      '"FranchiseOutletAssignment_effective_period_check"',
    );
    expect(migration).not.toMatch(/\bDROP\s+(TABLE|COLUMN|TYPE)\b/i);
    expect(migration).not.toMatch(/CREATE\s+EXTENSION/i);
    expect(migration).not.toContain("btree_gist");
    expect(migration).not.toContain('ALTER TABLE "FranchiseAgreement"');
    expect(migration).not.toContain('ALTER TABLE "FranchiseSettlement"');
  });
});

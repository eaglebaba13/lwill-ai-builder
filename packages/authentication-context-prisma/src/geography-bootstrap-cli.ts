import { prisma } from "@lwill/database/client";
import {
  bootstrapGeography,
  formatGeographyBootstrapError,
  formatGeographyBootstrapResult,
  type CountryInput,
  type StateInput,
  type CityInput,
  type PincodeInput,
} from "./geography-bootstrap";

async function loadIndiaData(): Promise<{
  countries: readonly CountryInput[];
  states: readonly StateInput[];
  cities: readonly CityInput[];
  pincodes: readonly PincodeInput[];
}> {
  const fs = await import("fs");
  const path = await import("path");

  const basePath = path.resolve(process.cwd(), "../../data/geography/india");

  const countryFile = path.join(basePath, "COUNTRY.json");
  const stateFile = path.join(basePath, "STATES.json");
  const cityFile = path.join(basePath, "CITIES.json");
  const pincodeFile = path.join(basePath, "PINCODES.json");

  const countryData = JSON.parse(fs.readFileSync(countryFile, "utf8").replace(/^\uFEFF/, ""));
  const stateData = JSON.parse(fs.readFileSync(stateFile, "utf8").replace(/^\uFEFF/, ""));
  const cityData = JSON.parse(fs.readFileSync(cityFile, "utf8").replace(/^\uFEFF/, ""));
  const pincodeData = JSON.parse(fs.readFileSync(pincodeFile, "utf8").replace(/^\uFEFF/, ""));

  return {
    countries: countryData.records.map((r: any) => ({ code: r.code, name: r.name })),
    states: stateData.records.map((r: any) => ({
      countryCode: "IN",
      code: r.code,
      name: r.name,
    })),
    cities: cityData.records.map((r: any) => ({
      stateCode: r.stateCode,
      code: r.code,
      name: r.name,
    })),
    pincodes: pincodeData.records.map((r: any) => ({
      stateCode: r.stateCode,
      cityCode: r.cityCode,
      value: r.value,
    })),
  };
}

async function main(): Promise<void> {
  if (process.argv.length > 2) {
    throw new Error("Unsupported bootstrap argument");
  }

  const { countries, states, cities, pincodes } = await loadIndiaData();

  const result = await bootstrapGeography(
    prisma,
    countries,
    states,
    cities,
    pincodes
  );
  console.log(formatGeographyBootstrapResult(result));
}

main()
  .catch((error: unknown) => {
    // Print full error for diagnostics (sanitized - no DATABASE_URL)
    const sanitizedError = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { message: String(error) };
    console.error(JSON.stringify(sanitizedError, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
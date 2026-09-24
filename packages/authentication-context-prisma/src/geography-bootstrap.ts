import { PrismaClient } from "@lwill/database/client";

export class GeographyBootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeographyBootstrapError";
  }
}

export interface GeographyBootstrapResult {
  countriesCreated: number;
  statesCreated: number;
  citiesCreated: number;
  pincodesCreated: number;
  countriesSkipped: number;
  statesSkipped: number;
  citiesSkipped: number;
  pincodesSkipped: number;
}

export interface CountryInput {
  readonly code: string;
  readonly name: string;
}

export interface StateInput {
  readonly countryCode: string;
  readonly code: string;
  readonly name: string;
}

export interface CityInput {
  readonly stateCode: string;
  readonly code: string;
  readonly name: string;
}

export interface PincodeInput {
  readonly stateCode: string;
  readonly cityCode: string;
  readonly value: string;
}

function validatePincode(value: string): boolean {
  return /^[0-9]{6}$/.test(value);
}

function validateCountryCode(code: string): boolean {
  return /^[A-Z]{2}$/.test(code);
}

function validateStateCode(code: string): boolean {
  return /^[A-Z]{2}$/.test(code);
}

export async function bootstrapGeography(
  prisma: PrismaClient,
  countries: readonly CountryInput[],
  states: readonly StateInput[],
  cities: readonly CityInput[],
  pincodes: readonly PincodeInput[]
): Promise<GeographyBootstrapResult> {
  const result: GeographyBootstrapResult = {
    countriesCreated: 0,
    statesCreated: 0,
    citiesCreated: 0,
    pincodesCreated: 0,
    countriesSkipped: 0,
    statesSkipped: 0,
    citiesSkipped: 0,
    pincodesSkipped: 0,
  };

  await prisma.$transaction(async (tx: PrismaClient) => {
    const existingCountries = new Set<string>();
    const existingStates = new Map<string, string>(); // composite key -> id
    const existingCities = new Map<string, string>(); // composite key -> id

    // 1. Countries
    for (const country of countries) {
      if (!validateCountryCode(country.code)) {
        throw new GeographyBootstrapError(`Invalid country code: ${country.code}`);
      }
      if (!country.name || country.name.trim() === "") {
        throw new GeographyBootstrapError(`Country name required for code: ${country.code}`);
      }

      const existing = await tx.geoCountry.findUnique({
        where: { code: country.code },
        select: { code: true },
      });

      if (existing) {
        existingCountries.add(country.code);
        result.countriesSkipped++;
        continue;
      }

      await tx.geoCountry.create({
        data: {
          code: country.code,
          name: country.name,
        },
      });
      existingCountries.add(country.code);
      result.countriesCreated++;
    }

    // 2. States
    for (const state of states) {
      if (!validateCountryCode(state.countryCode)) {
        throw new GeographyBootstrapError(`Invalid country code for state: ${state.countryCode}`);
      }
      if (!validateStateCode(state.code)) {
        throw new GeographyBootstrapError(`Invalid state code: ${state.code}`);
      }
      if (!state.name || state.name.trim() === "") {
        throw new GeographyBootstrapError(`State name required for code: ${state.code}`);
      }
      if (!existingCountries.has(state.countryCode)) {
        throw new GeographyBootstrapError(`Country not found for state: ${state.countryCode}`);
      }

      const compositeKey = `${state.countryCode}:${state.code}`;
      const existing = await tx.geoState.findUnique({
        where: { countryCode_code: { countryCode: state.countryCode, code: state.code } },
        select: { id: true },
      });

      if (existing) {
        existingStates.set(compositeKey, existing.id);
        result.statesSkipped++;
        continue;
      }

      const created = await tx.geoState.create({
        data: {
          countryCode: state.countryCode,
          code: state.code,
          name: state.name,
        },
      });
      existingStates.set(compositeKey, created.id);
      result.statesCreated++;
    }

    // 3. Cities
    for (const city of cities) {
      const stateKey = `IN:${city.stateCode}`;
      const stateId = existingStates.get(stateKey);
      if (!stateId) {
        throw new GeographyBootstrapError(`State not found for city: ${city.stateCode}`);
      }
      if (!city.code || city.code.trim() === "") {
        throw new GeographyBootstrapError(`City code required for: ${city.name}`);
      }
      if (!city.name || city.name.trim() === "") {
        throw new GeographyBootstrapError(`City name required for code: ${city.code}`);
      }

      const compositeKey = `${stateId}:${city.code}`;
      const existing = await tx.geoCity.findUnique({
        where: { stateId_code: { stateId, code: city.code } },
        select: { id: true },
      });

      if (existing) {
        existingCities.set(compositeKey, existing.id);
        result.citiesSkipped++;
        continue;
      }

      const created = await tx.geoCity.create({
        data: {
          stateId,
          code: city.code,
          name: city.name,
        },
      });
      existingCities.set(compositeKey, created.id);
      result.citiesCreated++;
    }

    // 4. Pincodes
    for (const pincode of pincodes) {
      if (!validatePincode(pincode.value)) {
        throw new GeographyBootstrapError(`Invalid pincode format: ${pincode.value} (must be 6 digits)`);
      }

      const stateKey = `IN:${pincode.stateCode}`;
      const stateId = existingStates.get(stateKey);
      if (!stateId) {
        throw new GeographyBootstrapError(`State not found for pincode: ${pincode.stateCode}`);
      }

      const cityKey = `${stateId}:${pincode.cityCode}`;
      const cityId = existingCities.get(cityKey);
      if (!cityId) {
        throw new GeographyBootstrapError(`City not found for pincode: ${pincode.stateCode}:${pincode.cityCode}`);
      }

      const existing = await tx.geoPincode.findUnique({
        where: { value: pincode.value },
        select: { id: true },
      });

      if (existing) {
        result.pincodesSkipped++;
        continue;
      }

      await tx.geoPincode.create({
        data: {
          stateId,
          cityId,
          value: pincode.value,
        },
      });
      result.pincodesCreated++;
    }
  });

  return result;
}

export function formatGeographyBootstrapResult(result: GeographyBootstrapResult): string {
  return JSON.stringify({
    status: "completed",
    summary: {
      created: {
        countries: result.countriesCreated,
        states: result.statesCreated,
        cities: result.citiesCreated,
        pincodes: result.pincodesCreated,
      },
      skipped: {
        countries: result.countriesSkipped,
        states: result.statesSkipped,
        cities: result.citiesSkipped,
        pincodes: result.pincodesSkipped,
      },
    },
  });
}

export function formatGeographyBootstrapError(error: unknown): string {
  return error instanceof GeographyBootstrapError
    ? error.message
    : "Geography bootstrap failed";
}
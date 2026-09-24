import { describe, expect, it, vi } from "vitest";
import {
  bootstrapGeography,
  type CountryInput,
  type StateInput,
  type CityInput,
  type PincodeInput,
} from "./geography-bootstrap";

function createMockPrisma() {
  const countries = new Map<string, { code: string; name: string }>();
  const states = new Map<string, { id: string; countryCode: string; code: string; name: string }>();
  const cities = new Map<string, { id: string; stateId: string; code: string; name: string }>();
  const pincodes = new Map<string, { id: string; stateId: string; cityId: string; value: string }>();

  let stateIdCounter = 0;
  let cityIdCounter = 0;
  let pincodeIdCounter = 0;

  return {
    geoCountry: {
      findUnique: vi.fn(async ({ where }: { where: { code: string } }) => {
        return countries.get(where.code) ?? null;
      }),
      create: vi.fn(async ({ data }: { data: CountryInput }) => {
        countries.set(data.code, data);
        return data;
      }),
    },
    geoState: {
      findUnique: vi.fn(async ({ where }: { where: { countryCode_code: { countryCode: string; code: string } } }) => {
        const key = `${where.countryCode_code.countryCode}:${where.countryCode_code.code}`;
        return states.get(key) ?? null;
      }),
      create: vi.fn(async ({ data }: { data: { countryCode: string; code: string; name: string } }) => {
        const id = `state-${++stateIdCounter}`;
        const record = { id, ...data };
        const key = `${data.countryCode}:${data.code}`;
        states.set(key, record);
        return record;
      }),
    },
    geoCity: {
      findUnique: vi.fn(async ({ where }: { where: { stateId_code: { stateId: string; code: string } } }) => {
        const key = `${where.stateId_code.stateId}:${where.stateId_code.code}`;
        return cities.get(key) ?? null;
      }),
      create: vi.fn(async ({ data }: { data: { stateId: string; code: string; name: string } }) => {
        const id = `city-${++cityIdCounter}`;
        const record = { id, ...data };
        const key = `${data.stateId}:${data.code}`;
        cities.set(key, record);
        return record;
      }),
    },
    geoPincode: {
      findUnique: vi.fn(async ({ where }: { where: { value: string } }) => {
        return pincodes.get(where.value) ?? null;
      }),
      create: vi.fn(async ({ data }: { data: { stateId: string; cityId: string; value: string } }) => {
        const id = `pincode-${++pincodeIdCounter}`;
        const record = { id, ...data };
        pincodes.set(data.value, record);
        return record;
      }),
    },
    $transaction: vi.fn(async (callback: any) => {
      return callback({
        geoCountry: {
          findUnique: vi.fn(async ({ where }: { where: { code: string } }) => {
            return countries.get(where.code) ?? null;
          }),
          create: vi.fn(async ({ data }: { data: CountryInput }) => {
            countries.set(data.code, data);
            return data;
          }),
        },
        geoState: {
          findUnique: vi.fn(async ({ where }: { where: { countryCode_code: { countryCode: string; code: string } } }) => {
            const key = `${where.countryCode_code.countryCode}:${where.countryCode_code.code}`;
            return states.get(key) ?? null;
          }),
          create: vi.fn(async ({ data }: { data: { countryCode: string; code: string; name: string } }) => {
            const id = `state-${++stateIdCounter}`;
            const record = { id, ...data };
            const key = `${data.countryCode}:${data.code}`;
            states.set(key, record);
            return record;
          }),
        },
        geoCity: {
          findUnique: vi.fn(async ({ where }: { where: { stateId_code: { stateId: string; code: string } } }) => {
            const key = `${where.stateId_code.stateId}:${where.stateId_code.code}`;
            return cities.get(key) ?? null;
          }),
          create: vi.fn(async ({ data }: { data: { stateId: string; code: string; name: string } }) => {
            const id = `city-${++cityIdCounter}`;
            const record = { id, ...data };
            const key = `${data.stateId}:${data.code}`;
            cities.set(key, record);
            return record;
          }),
        },
        geoPincode: {
          findUnique: vi.fn(async ({ where }: { where: { value: string } }) => {
            return pincodes.get(where.value) ?? null;
          }),
          create: vi.fn(async ({ data }: { data: { stateId: string; cityId: string; value: string } }) => {
            const id = `pincode-${++pincodeIdCounter}`;
            const record = { id, ...data };
            pincodes.set(data.value, record);
            return record;
          }),
        },
      });
    }),
    countries,
    states,
    cities,
    pincodes,
  };
}

const sampleCountries: readonly CountryInput[] = [
  { code: "IN", name: "India" },
];

const sampleStates: readonly StateInput[] = [
  { countryCode: "IN", code: "RJ", name: "Rajasthan" },
  { countryCode: "IN", code: "MH", name: "Maharashtra" },
];

const sampleCities: readonly CityInput[] = [
  { stateCode: "RJ", code: "JAI", name: "Jaipur" },
  { stateCode: "RJ", code: "JOD", name: "Jodhpur" },
  { stateCode: "MH", code: "MUM", name: "Mumbai" },
];

const samplePincodes: readonly PincodeInput[] = [
  { stateCode: "RJ", cityCode: "JAI", value: "302001" },
  { stateCode: "RJ", cityCode: "JOD", value: "342001" },
  { stateCode: "MH", cityCode: "MUM", value: "400001" },
];

describe("geography bootstrap", () => {
  it("creates India geography with states, cities, and pincodes", async () => {
    const mock = createMockPrisma();

    const result = await bootstrapGeography(
      mock as any,
      sampleCountries,
      sampleStates,
      sampleCities,
      samplePincodes
    );

    expect(result.countriesCreated).toBe(1);
    expect(result.statesCreated).toBe(2);
    expect(result.citiesCreated).toBe(3);
    expect(result.pincodesCreated).toBe(3);
    expect(result.countriesSkipped).toBe(0);
    expect(result.statesSkipped).toBe(0);
    expect(result.citiesSkipped).toBe(0);
    expect(result.pincodesSkipped).toBe(0);
  });

  it("is idempotent - rerunning skips existing records", async () => {
    const mock = createMockPrisma();

    await bootstrapGeography(mock as any, sampleCountries, sampleStates, sampleCities, samplePincodes);
    const result = await bootstrapGeography(mock as any, sampleCountries, sampleStates, sampleCities, samplePincodes);

    expect(result.countriesCreated).toBe(0);
    expect(result.statesCreated).toBe(0);
    expect(result.citiesCreated).toBe(0);
    expect(result.pincodesCreated).toBe(0);
    expect(result.countriesSkipped).toBe(1);
    expect(result.statesSkipped).toBe(2);
    expect(result.citiesSkipped).toBe(3);
    expect(result.pincodesSkipped).toBe(3);
  });

  it("rejects invalid pincode format", async () => {
    const mock = createMockPrisma();

    const badPincodes: readonly PincodeInput[] = [
      { stateCode: "RJ", cityCode: "JAI", value: "30200" }, // too short
      { stateCode: "RJ", cityCode: "JAI", value: "3020011" }, // too long
      { stateCode: "RJ", cityCode: "JAI", value: "30200A" }, // non-numeric
    ];

    await expect(
      bootstrapGeography(mock as any, sampleCountries, sampleStates, sampleCities, badPincodes)
    ).rejects.toThrow("Invalid pincode format");
  });

  it("rejects orphan city (state not found)", async () => {
    const mock = createMockPrisma();

    const orphanCities: readonly CityInput[] = [
      { stateCode: "XX", code: "JAI", name: "Jaipur" }, // state XX doesn't exist
    ];

    await expect(
      bootstrapGeography(mock as any, sampleCountries, sampleStates, orphanCities, samplePincodes)
    ).rejects.toThrow("State not found for city");
  });

  it("rejects orphan pincode (city not found)", async () => {
    const mock = createMockPrisma();

    const orphanPincodes: readonly PincodeInput[] = [
      { stateCode: "RJ", cityCode: "XXX", value: "302001" }, // city XXX doesn't exist
    ];

    await expect(
      bootstrapGeography(mock as any, sampleCountries, sampleStates, sampleCities, orphanPincodes)
    ).rejects.toThrow("City not found for pincode");
  });

  it("rejects invalid country code", async () => {
    const mock = createMockPrisma();

    const badCountries: readonly CountryInput[] = [
      { code: "IND", name: "India" }, // should be 2 chars
    ];

    await expect(
      bootstrapGeography(mock as any, badCountries, sampleStates, sampleCities, samplePincodes)
    ).rejects.toThrow("Invalid country code");
  });

  it("rejects invalid state code", async () => {
    const mock = createMockPrisma();

    const badStates: readonly StateInput[] = [
      { countryCode: "IN", code: "RAJ", name: "Rajasthan" }, // should be 2 chars
    ];

    await expect(
      bootstrapGeography(mock as any, sampleCountries, badStates, sampleCities, samplePincodes)
    ).rejects.toThrow("Invalid state code");
  });

  it("rejects missing country for state", async () => {
    const mock = createMockPrisma();

    const badStates: readonly StateInput[] = [
      { countryCode: "XX", code: "RJ", name: "Rajasthan" }, // country XX doesn't exist
    ];

    await expect(
      bootstrapGeography(mock as any, sampleCountries, badStates, sampleCities, samplePincodes)
    ).rejects.toThrow("Country not found for state");
  });

  it("skips duplicate pincode values (pincode value is globally unique)", async () => {
    const mock = createMockPrisma();

    const dupPincodes: readonly PincodeInput[] = [
      { stateCode: "RJ", cityCode: "JAI", value: "302001" },
      { stateCode: "MH", cityCode: "MUM", value: "302001" }, // same pincode value
    ];

    const result = await bootstrapGeography(mock as any, sampleCountries, sampleStates, sampleCities, dupPincodes);

    // First pincode created, second skipped due to unique constraint on value
    expect(result.pincodesCreated).toBe(1);
    expect(result.pincodesSkipped).toBe(1);
  });

  it("validates source code stability - same source codes produce same results", async () => {
    const mock = createMockPrisma();

    await bootstrapGeography(mock as any, sampleCountries, sampleStates, sampleCities, samplePincodes);

    // Verify that state codes map to stable IDs
    const stateKey = "IN:RJ";
    const stateId = mock.states.get(stateKey)?.id;
    expect(stateId).toBeDefined();

    const cityKey = `${stateId}:JAI`;
    const cityId = mock.cities.get(cityKey)?.id;
    expect(cityId).toBeDefined();

    const pincode = mock.pincodes.get("302001");
    expect(pincode?.cityId).toBe(cityId);
  });

  it("handles empty input arrays", async () => {
    const mock = createMockPrisma();

    const result = await bootstrapGeography(mock as any, [], [], [], []);

    expect(result.countriesCreated).toBe(0);
    expect(result.statesCreated).toBe(0);
    expect(result.citiesCreated).toBe(0);
    expect(result.pincodesCreated).toBe(0);
  });
});
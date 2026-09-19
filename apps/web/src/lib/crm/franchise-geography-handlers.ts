import { getAuthenticationContext } from "../auth/server-context";
import { prisma } from "../../../../../packages/database/src/client";

export type GeoStateResponse = { id: string; countryCode: string; code: string; name: string };
export type GeoCityResponse = { id: string; stateId: string; code: string; name: string };
export type GeoPincodeResponse = { id: string; stateId: string; cityId: string; value: string };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export function handleListGeography(_request: Request) {
  return (async () => {
    const auth = await getAuthenticationContext();
    if (!auth.authenticated) return json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);

    const search = "";
    const limit = 500;

    const stateWhere = search ? { OR: [{ name: { contains: search } }, { code: { contains: search } }] } : {};
    const cityWhere = search ? { OR: [{ name: { contains: search } }, { code: { contains: search } }] } : {};
    const pincodeWhere = search ? { value: { contains: search } } : {};

    const [states, cities, pincodes] = await Promise.all([
      prisma.geoState.findMany({ where: stateWhere, orderBy: { code: "asc" }, take: limit }),
      prisma.geoCity.findMany({ where: cityWhere, orderBy: { code: "asc" }, take: limit }),
      prisma.geoPincode.findMany({ where: pincodeWhere, orderBy: { value: "asc" }, take: limit }),
    ]);

    return json({ states, cities, pincodes });
  })();
}

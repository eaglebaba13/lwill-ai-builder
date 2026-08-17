export interface NativeLoginCredentials {
  readonly email: string;
  readonly password: string;
}

export async function loginWithNativeAuthentication(
  credentials: NativeLoginCredentials,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  const response = await fetcher("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    cache: "no-store",
    body: JSON.stringify(credentials),
  });
  return response.ok;
}

export async function restoreNativeAuthentication(
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  const response = await fetcher("/api/auth/refresh", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
  });
  return response.ok;
}

export async function logoutFromNativeAuthentication(
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  const response = await fetcher("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
  });
  return response.ok;
}

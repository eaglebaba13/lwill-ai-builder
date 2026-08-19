import { describe, expect, it, vi, afterEach } from "vitest";
import {
  restoreNativeAuthentication,
  invalidatePendingRefresh,
  loginWithNativeAuthentication,
  logoutFromNativeAuthentication,
} from "../lib/auth/native-auth-client";

afterEach(() => {
  invalidatePendingRefresh();
  vi.unstubAllGlobals();
});

describe("restoreNativeAuthentication single-flight deduplication", () => {
  it("sends only one POST /api/auth/refresh for concurrent callers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const [result1, result2] = await Promise.all([
      restoreNativeAuthentication(fetchMock),
      restoreNativeAuthentication(fetchMock),
    ]);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/refresh",
      expect.objectContaining({ method: "POST", credentials: "same-origin", cache: "no-store" }),
    );
    expect(result1).toBe(true);
    expect(result2).toBe(true);
  });

  it("returns the same promise to all concurrent callers", async () => {
    let resolveRefresh: ((response: Response) => void) | undefined;
    const slowRefresh = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });
    const fetchMock = vi.fn().mockReturnValue(slowRefresh);
    vi.stubGlobal("fetch", fetchMock);

    const promise1 = restoreNativeAuthentication(fetchMock);
    const promise2 = restoreNativeAuthentication(fetchMock);

    expect(promise1).toBe(promise2);
    expect(fetchMock).toHaveBeenCalledOnce();

    resolveRefresh?.(new Response(null, { status: 204 }));

    expect(await promise1).toBe(true);
    expect(await promise2).toBe(true);
  });

  it("sends a new request after the previous one completes", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    const result1 = await restoreNativeAuthentication(fetchMock);
    expect(result1).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();

    const result2 = await restoreNativeAuthentication(fetchMock);
    expect(result2).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("handles fetch rejection and allows subsequent requests", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(restoreNativeAuthentication(fetchMock)).rejects.toThrow("network error");

    const result = await restoreNativeAuthentication(fetchMock);
    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("deduplicates three concurrent callers into one request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const [r1, r2, r3] = await Promise.all([
      restoreNativeAuthentication(fetchMock),
      restoreNativeAuthentication(fetchMock),
      restoreNativeAuthentication(fetchMock),
    ]);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(r1).toBe(true);
    expect(r2).toBe(true);
    expect(r3).toBe(true);
  });
});

describe("invalidatePendingRefresh", () => {
  it("causes the next call to start a new request even if one was in flight", async () => {
    let resolveRefresh: ((response: Response) => void) | undefined;
    const slowRefresh = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });
    const fetchMock = vi.fn().mockReturnValue(slowRefresh);
    vi.stubGlobal("fetch", fetchMock);

    const promise1 = restoreNativeAuthentication(fetchMock);
    expect(fetchMock).toHaveBeenCalledOnce();

    invalidatePendingRefresh();

    const promise2 = restoreNativeAuthentication(fetchMock);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(promise1).not.toBe(promise2);

    resolveRefresh?.(new Response(null, { status: 204 }));

    expect(await promise1).toBe(true);
  });

  it("prevents stale refresh from joining a new request after invalidation", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const promise1 = restoreNativeAuthentication(fetchMock);
    invalidatePendingRefresh();
    const promise2 = restoreNativeAuthentication(fetchMock);

    expect(await promise1).toBe(false);
    expect(await promise2).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("loginWithNativeAuthentication", () => {
  it("posts credentials to /api/auth/login and returns true on 204", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await loginWithNativeAuthentication(
      { email: "user@test.com", password: "pass" },
      fetchMock,
    );

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "user@test.com", password: "pass" }),
      }),
    );
  });

  it("returns false on 401", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await loginWithNativeAuthentication(
      { email: "user@test.com", password: "wrong" },
      fetchMock,
    );

    expect(result).toBe(false);
  });
});

describe("logoutFromNativeAuthentication", () => {
  it("posts to /api/auth/logout and returns true on 204", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await logoutFromNativeAuthentication(fetchMock);

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/logout",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("concurrent pageshow + mount single-flight (regression)", () => {
  it("simulates mount + pageshow arriving at the same time without duplicate requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    // Simulate the effect of restoreAuthentication() being called from both
    // the initial useEffect mount and a pageshow event arriving synchronously.
    const mountCall = restoreNativeAuthentication(fetchMock);
    const pageshowCall = restoreNativeAuthentication(fetchMock);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(mountCall).toBe(pageshowCall);

    const [mountResult, pageshowResult] = await Promise.all([mountCall, pageshowCall]);
    expect(mountResult).toBe(true);
    expect(pageshowResult).toBe(true);
  });

  it("both callers receive the same authentication result even on failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    const promise1 = restoreNativeAuthentication(fetchMock);
    const promise2 = restoreNativeAuthentication(fetchMock);

    expect(fetchMock).toHaveBeenCalledOnce();

    const [r1, r2] = await Promise.all([promise1, promise2]);
    expect(r1).toBe(false);
    expect(r2).toBe(false);
  });

  it("does not re-use inflight promise after invalidation during login", async () => {
    let resolveRefresh: ((response: Response) => void) | undefined;
    const slowRefresh = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });
    const fetchMock = vi.fn()
      .mockReturnValueOnce(slowRefresh)
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    // Initial mount calls restore
    const mountPromise = restoreNativeAuthentication(fetchMock);
    expect(fetchMock).toHaveBeenCalledOnce();

    // Login starts — invalidates in-flight
    invalidatePendingRefresh();

    // pageshow fires — should create a NEW request, not join the old one
    const pageshowPromise = restoreNativeAuthentication(fetchMock);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(mountPromise).not.toBe(pageshowPromise);

    // Old refresh resolves 401
    resolveRefresh?.(new Response(null, { status: 401 }));

    expect(await mountPromise).toBe(false);
    expect(await pageshowPromise).toBe(true);
  });
});

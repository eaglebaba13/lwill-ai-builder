import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import Home from "../app/page";
import { invalidatePendingRefresh } from "../lib/auth/native-auth-client";

describe("X Nail native authentication integration", () => {
  afterEach(() => {
    invalidatePendingRefresh();
    vi.unstubAllGlobals();
  });

  it("submits user-entered credentials to the approved login route", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ customers: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    const email = await screen.findByLabelText("Email");
    const password = await screen.findByLabelText("Password");
    expect(email).toHaveValue("");
    expect(password).toHaveValue("");

    await user.type(email, "operator@example.test");
    await user.type(password, "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({
          email: "operator@example.test",
          password: "test-password",
        }),
      }),
    ));
    expect(await screen.findByText("Operations dashboard")).toBeInTheDocument();
  });

  it("keeps the login screen on rejection and uses the approved logout route", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ customers: [] }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Authentication failed.")).toBeInTheDocument();

    await user.clear(await screen.findByLabelText("Password"));
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await user.click(await screen.findByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/auth/logout",
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
    ));
    expect(await screen.findByText("Operations login")).toBeInTheDocument();
  });

  it("restores the authenticated dashboard after a simulated browser reload", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ customers: [] }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ customers: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    const firstPage = render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Operations dashboard")).toBeInTheDocument();

    firstPage.unmount();
    render(<Home />);

    expect(await screen.findByText("Operations dashboard")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/refresh",
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
    );
  });

  it("revalidates a browser-restored document after logout before showing the dashboard", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Operations dashboard")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByText("Operations login")).toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    });

    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/auth/refresh",
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
    ));
    expect(await screen.findByText("Operations login")).toBeInTheDocument();
    expect(screen.queryByText("Operations dashboard")).not.toBeInTheDocument();
  });

  it("revalidates the dashboard when browser Back restores the current document after logout", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Operations dashboard")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByText("Operations login")).toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/auth/refresh",
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
    ));
    expect(screen.queryByText("Operations dashboard")).not.toBeInTheDocument();
  });

  it("revalidates authentication on a direct revisit instead of trusting stale dashboard state", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    const firstPage = render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Operations dashboard")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByText("Operations login")).toBeInTheDocument();
    firstPage.unmount();
    render(<Home />);

    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/auth/refresh",
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
    ));
    expect(await screen.findByText("Operations login")).toBeInTheDocument();
    expect(screen.queryByText("Operations dashboard")).not.toBeInTheDocument();
  });

  it("does not restore the dashboard from an older in-flight refresh after logout", async () => {
    let resolveRefresh: ((response: Response) => void) | undefined;
    const inFlightRefresh = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockReturnValueOnce(inFlightRefresh)
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Operations dashboard")).toBeInTheDocument();

    const signOutButton = screen.getByRole("button", { name: "Sign out" });
    await act(async () => {
      window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
      fireEvent.click(signOutButton);
    });
    expect(await screen.findByText("Operations login")).toBeInTheDocument();

    await act(async () => {
      resolveRefresh?.(new Response(null, { status: 204 }));
    });

    expect(screen.queryByText("Operations dashboard")).not.toBeInTheDocument();
    expect(screen.getByText("Operations login")).toBeInTheDocument();
  });

  it("revalidates through refresh when pageshow fires while authenticated", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ customers: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Operations dashboard")).toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    });

    expect(await screen.findByText("Operations dashboard")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/refresh",
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
    );
  });

  it("preserves login result when pageshow fires during login (race condition fix)", async () => {
    let resolveLogin: ((response: Response) => void) | undefined;
    const loginRequest = new Promise<Response>((resolve) => {
      resolveLogin = resolve;
    });
    let resolveCustomers: ((response: Response) => void) | undefined;
    const customersRequest = new Promise<Response>((resolve) => {
      resolveCustomers = resolve;
    });

    const fetchMock = vi.fn()
      // Mount refresh resolves immediately so the login form appears
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      // Login request is controllable so we can fire pageshow during login
      .mockReturnValueOnce(loginRequest)
      // Customers request is controllable
      .mockReturnValueOnce(customersRequest);
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    const email = await screen.findByLabelText("Email");
    const password = await screen.findByLabelText("Password");
    await user.type(email, "operator@example.test");
    await user.type(password, "test-password");

    // Use fireEvent.click to trigger the login WITHOUT awaiting the async handler.
    // This lets handleLogin start (setting isLoginInProgress.current = true)
    // and then suspend at the await for loginRequest.
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    // While login is in flight, fire pageshow.
    // The isLoginInProgress guard should prevent restoreAuthentication from running.
    await act(async () => {
      window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    });

    // Complete login with success
    await act(async () => {
      resolveLogin?.(new Response(null, { status: 204 }));
    });

    // Complete customers fetch
    await act(async () => {
      resolveCustomers?.(Response.json({ customers: [] }));
    });

    // The login result should be preserved — we should see the dashboard.
    // Only 3 fetches: mount refresh + login + customers.
    // If the guard were missing, pageshow would trigger a 4th refresh that
    // arrives after login and overwrites authenticated=false.
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(await screen.findByText("Operations dashboard")).toBeInTheDocument();
  });

  it("keeps authenticated dashboard after pageshow with valid cookies", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ customers: [] }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ customers: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Operations dashboard")).toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    });

    await waitFor(() => expect(screen.getByText("Operations dashboard")).toBeInTheDocument());
  });

  it("keeps authenticated dashboard after popstate with valid cookies", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ customers: [] }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ customers: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Operations dashboard")).toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await waitFor(() => expect(screen.getByText("Operations dashboard")).toBeInTheDocument());
  });

  it("logout still revokes the session and shows login page", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ customers: [] }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Operations dashboard")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/auth/logout",
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
    ));
    expect(await screen.findByText("Operations login")).toBeInTheDocument();
  });
});

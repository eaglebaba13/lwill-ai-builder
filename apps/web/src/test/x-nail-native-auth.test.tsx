import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import Home from "../app/xnail/page";
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
      .mockResolvedValueOnce(Response.json({ roles: [], permissionCodes: [] }))
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
      .mockResolvedValueOnce(Response.json({ roles: [], permissionCodes: [] }))
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
      .mockResolvedValueOnce(Response.json({ roles: [], permissionCodes: [] }))
      .mockResolvedValueOnce(Response.json({ customers: [] }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ roles: [], permissionCodes: [] }))
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
      .mockResolvedValueOnce(Response.json({ roles: [], permissionCodes: [] }))
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
      .mockResolvedValueOnce(Response.json({ roles: [], permissionCodes: [] }))
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
      .mockResolvedValueOnce(Response.json({ roles: [], permissionCodes: [] }))
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
      .mockResolvedValueOnce(Response.json({ roles: [], permissionCodes: [] }))
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
      .mockResolvedValueOnce(Response.json({ roles: [], permissionCodes: [] }))
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ roles: [], permissionCodes: [] }))
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
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
      // Auth/me request after successful login
      .mockResolvedValueOnce(Response.json({ roles: [], permissionCodes: [] }))
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
    // 4 fetches: mount refresh + login + /api/auth/me + customers.
    // If the guard were missing, pageshow would trigger a 5th refresh that
    // arrives after login and overwrites authenticated=false.
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    expect(await screen.findByText("Operations dashboard")).toBeInTheDocument();
  });

  it("keeps authenticated dashboard after pageshow with valid cookies", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ roles: [], permissionCodes: [] }))
      .mockResolvedValueOnce(Response.json({ customers: [] }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ roles: [], permissionCodes: [] }))
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
      .mockResolvedValueOnce(Response.json({ roles: [], permissionCodes: [] }))
      .mockResolvedValueOnce(Response.json({ customers: [] }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ roles: [], permissionCodes: [] }))
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
      .mockResolvedValueOnce(Response.json({ roles: [], permissionCodes: [] }))
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

  it("redirects to login when GET /api/customers returns 401 (unauthenticated)", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ roles: [], permissionCodes: [] }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    // After login succeeds, the customer fetch returns 401.
    // The client treats 401 as "no session" and redirects to login.
    expect(await screen.findByText("Operations login")).toBeInTheDocument();
    expect(screen.queryByText("Operations dashboard")).not.toBeInTheDocument();
  });

  it("stays on dashboard when GET /api/customers returns 403 (forbidden, not unauthenticated)", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ roles: [], permissionCodes: [] }))
      .mockResolvedValueOnce(new Response(null, { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    // After login succeeds, the customer fetch returns 403.
    // The client treats 403 as "authorized session, insufficient permission" —
    // the user stays on the dashboard and is NOT redirected to login.
    // (Before the authorize() fix, 403 was incorrectly returned as 401,
    // which caused the client to set authenticated=false and show the login screen.)
    expect(await screen.findByText("Operations dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Operations login")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/customers",
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });

  it("fetches appointments when the Appointments tab is activated", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ roles: [], permissionCodes: [] }))
      .mockResolvedValueOnce(Response.json({ customers: [] }))
      .mockResolvedValueOnce(Response.json({ appointments: [] }))
      .mockResolvedValueOnce(Response.json({ customers: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Operations dashboard")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Appointments" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/appointments",
      expect.objectContaining({ credentials: "same-origin" }),
    ));
  });

  it("populates the appointment list from the API response", async () => {
    const mockAppointments = [
      {
        id: "apt-1",
        tenantId: "tenant-xnail",
        customerId: "cust-1",
        serviceId: "svc-1",
        startsAt: "2026-08-30T10:00:00.000Z",
        endsAt: "2026-08-30T10:45:00.000Z",
        status: "Booked",
        notes: null,
      },
    ];
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ roles: [], permissionCodes: [] }))
      .mockResolvedValueOnce(Response.json({ customers: [] }))
      .mockResolvedValueOnce(Response.json({ appointments: mockAppointments }))
      .mockResolvedValueOnce(Response.json({ customers: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Operations dashboard")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Appointments" }));

    await waitFor(() => expect(screen.getByText("Customer cust-1")).toBeInTheDocument());
    expect(screen.getByText("2026-08-30T10:00:00.000Z")).toBeInTheDocument();
    expect(screen.getByText("Booked")).toBeInTheDocument();
  });

  it("shows loading state while appointments request is pending", async () => {
    let resolveAppointments: ((response: Response) => void) | undefined;
    const appointmentsRequest = new Promise<Response>((resolve) => {
      resolveAppointments = resolve;
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ roles: [], permissionCodes: [] }))
      .mockResolvedValueOnce(Response.json({ customers: [] }))
      .mockReturnValueOnce(appointmentsRequest);
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Operations dashboard")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Appointments" }));

    await waitFor(() => expect(screen.getByText("Loading appointments...")).toBeInTheDocument());

    await act(async () => {
      resolveAppointments?.(Response.json({ appointments: [] }));
    });

    expect(screen.queryByText("Loading appointments...")).not.toBeInTheDocument();
  });

  it("shows error and stays on dashboard when appointments fetch returns 403", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ roles: [], permissionCodes: [] }))
      .mockResolvedValueOnce(Response.json({ customers: [] }))
      .mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve(new Response(null, { status: 403 })), 50)));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Operations dashboard")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Appointments" }));

    expect(await screen.findByText("You are not authorized to view appointments.")).toBeInTheDocument();
    expect(screen.queryByText("Operations login")).not.toBeInTheDocument();
  });

  it("shows error on unexpected API failure for appointments", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ roles: [], permissionCodes: [] }))
      .mockResolvedValueOnce(Response.json({ customers: [] }))
      .mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve(new Response(null, { status: 500 })), 50)));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Operations dashboard")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Appointments" }));

    expect(await screen.findByText("Appointments could not be loaded.")).toBeInTheDocument();
    expect(screen.queryByText("Operations login")).not.toBeInTheDocument();
  });

  it("creates an appointment after appointments tab is activated", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ roles: [{ id: "role-1", code: "tenant-admin", name: "Admin", scope: { kind: "tenant" }, permissions: [] }], permissionCodes: ["tenant.manage"] }))
      .mockResolvedValueOnce(Response.json({ customers: [{ id: "cust-1", name: "Test Customer", tenantId: "tenant-xnail", phone: "555-0100", email: null, notes: null, isActive: true }] }))
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        const method = init?.method ?? (typeof input === "object" && "method" in input ? (input as Request).method : "GET");
        if (url === "/api/services") return Response.json({ services: [{ id: "svc-1", name: "Test Service", tenantId: "tenant-xnail", durationMinutes: 30, priceCents: 1500, description: null, isActive: true }] });
        if (url === "/api/settings") return Response.json({ settings: [] });
        if (url === "/api/users") return Response.json({ users: [{ id: "user-1", membershipId: "m-1", email: "admin@test.com", displayName: "Admin", isActive: true }] });
        if (url === "/api/roles") return Response.json({ roles: [{ id: "role-1", code: "tenant-admin", name: "Admin" }] });
        if (url === "/api/appointments" && method === "GET") return Response.json({ appointments: [] });
        if (url === "/api/appointments" && method === "POST") return Response.json({
          appointment: {
            id: "apt-new",
            tenantId: "tenant-xnail",
            customerId: "cust-1",
            serviceId: "svc-1",
            startsAt: "2026-08-12T10:30:00.000Z",
            endsAt: "2026-08-12T11:15:00.000Z",
            status: "Booked",
            notes: null,
          },
        });
        return new Response(null, { status: 404 });
      });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Admin dashboard")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Settings" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/services", expect.anything()));

    await user.click(screen.getByRole("button", { name: "Appointments" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/appointments", expect.anything()));

    await user.click(screen.getByRole("button", { name: "Save appointment" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/appointments",
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
    ));

    expect(await screen.findAllByText("Test Customer")).toHaveLength(2);
    expect(screen.getByText("2026-08-12T10:30:00.000Z")).toBeInTheDocument();
    expect(screen.getByText("Booked")).toBeInTheDocument();
  });

  it("Settings tab loads services and Users & Access tab loads users/roles", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ roles: [{ id: "role-1", code: "tenant-admin", name: "Admin", scope: { kind: "tenant" }, permissions: [] }], permissionCodes: ["tenant.manage"] }))
      .mockResolvedValueOnce(Response.json({ customers: [] }))
      .mockResolvedValueOnce(Response.json({ services: [] }))
      .mockResolvedValueOnce(Response.json({ settings: [] }))
      .mockResolvedValueOnce(Response.json({ users: [] }))
      .mockResolvedValueOnce(Response.json({ roles: [] }))
      .mockResolvedValueOnce(Response.json({ appointments: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Admin dashboard")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Settings" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/services", expect.anything()));

    await user.click(screen.getByRole("button", { name: "Users & Access" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/users", expect.anything()));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/roles", expect.anything()));

    await user.click(screen.getByRole("button", { name: "Appointments" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/appointments", expect.anything()));

    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/services").length).toBe(1);
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/users").length).toBe(1);
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/roles").length).toBe(1);
  });

  it("fetches packages when the Packages tab is activated", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ roles: [], permissionCodes: [] }))
      .mockResolvedValueOnce(Response.json({ customers: [] }))
      .mockResolvedValueOnce(Response.json({ packages: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Operations dashboard")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Packages" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/packages",
      expect.objectContaining({ credentials: "same-origin" }),
    ));
  });

  it("populates the package list from the API response", async () => {
    const mockPackages = [
      {
        id: "pkg-1",
        name: "Glow Facial",
        serviceIds: ["svc-1"],
        priceCents: 12000,
        durationDays: 30,
        isActive: true,
      },
    ];
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ roles: [], permissionCodes: [] }))
      .mockResolvedValueOnce(Response.json({ customers: [] }))
      .mockResolvedValueOnce(Response.json({ packages: mockPackages }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Operations dashboard")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Packages" }));

    await waitFor(() => expect(screen.getByText("Glow Facial")).toBeInTheDocument());
    expect(screen.getByText("₹120")).toBeInTheDocument();
    expect(screen.getByText("1 service(s)")).toBeInTheDocument();
  });

  it("shows error and stays on dashboard when packages fetch returns 403", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ roles: [], permissionCodes: [] }))
      .mockResolvedValueOnce(Response.json({ customers: [] }))
      .mockResolvedValueOnce(new Response(null, { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Operations dashboard")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Packages" }));

    await waitFor(() => expect(screen.getByText("You are not authorized to view packages.")).toBeInTheDocument());
    expect(screen.queryByText("Operations login")).not.toBeInTheDocument();
  });

  it("creates a package after packages tab is activated", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ roles: [], permissionCodes: [] }))
      .mockResolvedValueOnce(Response.json({ customers: [] }))
      .mockResolvedValueOnce(Response.json({ packages: [] }))
      .mockResolvedValueOnce(Response.json({
        package: {
          id: "pkg-new",
          name: "Mani Pedi Combo",
          serviceIds: [],
          priceCents: 8000,
          durationDays: 14,
          isActive: true,
        },
      }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Operations dashboard")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Packages" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/packages", expect.anything()));

    await user.type(screen.getByPlaceholderText("Package name"), "Mani Pedi Combo");
    await user.click(screen.getByRole("button", { name: "Save package" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/packages",
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
    ));

    expect(await screen.findByText("Mani Pedi Combo")).toBeInTheDocument();
    expect(screen.getByText("₹80")).toBeInTheDocument();
  });

  it("shows role assignment form in Users & Access tab when authenticated", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ roles: [{ id: "role-1", code: "tenant-admin", name: "Admin", scope: { kind: "tenant" }, permissions: [] }], permissionCodes: ["tenant.manage"] }))
      .mockResolvedValueOnce(Response.json({ customers: [] }))
      .mockResolvedValueOnce(Response.json({ services: [] }))
      .mockResolvedValueOnce(Response.json({ settings: [] }))
      .mockResolvedValueOnce(Response.json({ users: [{ id: "user-1", membershipId: "m-1", email: "admin@test.com", displayName: "Admin", isActive: true }] }))
      .mockResolvedValueOnce(Response.json({ roles: [{ id: "role-1", code: "branch-manager", name: "Branch Manager" }] }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Admin dashboard")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Users & Access" }));
    expect(screen.getByRole("heading", { name: "Assign role" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "User" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Role" })).toBeInTheDocument();
  });

  it("assigns a role through the Users & Access tab form", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ roles: [{ id: "role-1", code: "tenant-admin", name: "Admin", scope: { kind: "tenant" }, permissions: [] }], permissionCodes: ["tenant.manage"] }))
      .mockResolvedValueOnce(Response.json({ customers: [] }))
      .mockImplementation(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url === "/api/users") return Response.json({ users: [{ id: "user-1", membershipId: "m-1", email: "admin@test.com", displayName: "Admin", isActive: true }] });
        if (url === "/api/roles") return Response.json({ roles: [{ id: "role-1", code: "branch-manager", name: "Branch Manager" }] });
        if (url === "/api/membership-roles") return Response.json({ assignment: { id: "assign-1", membershipId: "m-1", roleId: "role-1", scope: { kind: "tenant" } } });
        if (url === "/api/auth/me") return Response.json({ roles: [{ id: "role-1", code: "tenant-admin", name: "Admin", scope: { kind: "tenant" }, permissions: [] }], permissionCodes: ["tenant.manage"] });
        if (url === "/api/services") return Response.json({ services: [] });
        if (url === "/api/settings") return Response.json({ settings: [] });
        return new Response(null, { status: 404 });
      });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Admin dashboard")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Users & Access" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/users", expect.anything()));
    await user.selectOptions(screen.getByRole("combobox", { name: "User" }), "user-1");
    await user.selectOptions(screen.getByRole("combobox", { name: "Role" }), "role-1");
    await user.click(screen.getByRole("button", { name: "Assign role" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/membership-roles",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({ membershipId: "m-1", roleId: "role-1", scope: { kind: "tenant" } }),
      }),
    ));
    expect(await screen.findByText("Role assigned successfully.")).toBeInTheDocument();
  });

  it("shows error when role assignment is unauthorized", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ roles: [{ id: "role-1", code: "tenant-admin", name: "Admin", scope: { kind: "tenant" }, permissions: [] }], permissionCodes: ["tenant.manage"] }))
      .mockResolvedValueOnce(Response.json({ customers: [] }))
      .mockImplementation(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url === "/api/users") return new Response(null, { status: 403 });
        if (url === "/api/roles") return new Response(null, { status: 403 });
        if (url === "/api/services") return Response.json({ services: [] });
        if (url === "/api/settings") return Response.json({ settings: [] });
        return new Response(null, { status: 404 });
      });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Admin dashboard")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Users & Access" }));
    expect(await screen.findByText("You are not authorized to assign roles.")).toBeInTheDocument();
  });

  it("hides Users & Access tab without tenant.manage permission", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ roles: [], permissionCodes: ["customer.read"] }))
      .mockResolvedValueOnce(Response.json({ customers: [] }))
      .mockResolvedValueOnce(Response.json({ settings: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Operations dashboard")).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: "Users & Access" })).not.toBeInTheDocument();
  });

  it("shows admin navigation when authenticated as tenant-admin", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ roles: [{ id: "role-1", code: "tenant-admin", name: "Admin", scope: { kind: "tenant" }, permissions: [] }], permissionCodes: ["tenant.manage"] }))
      .mockResolvedValueOnce(Response.json({ customers: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Admin dashboard")).toBeInTheDocument();

    for (const tab of ["Overview", "Customers", "Services", "Packages", "Memberships", "Inventory", "Staff", "Attendance", "Appointments", "Billing", "Branches", "Reports", "Settings", "Notifications"]) {
      expect(screen.getByRole("button", { name: tab })).toBeInTheDocument();
    }
  });

  it("shows branch manager navigation when authenticated as branch-manager", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ roles: [{ id: "role-1", code: "branch-manager", name: "Branch", scope: { kind: "tenant" }, permissions: [] }], permissionCodes: [] }))
      .mockResolvedValueOnce(Response.json({ customers: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Branch dashboard")).toBeInTheDocument();

    for (const tab of ["Overview", "Customers", "Services", "Packages", "Memberships", "Inventory", "Staff", "Attendance", "Appointments", "Billing", "Reports"]) {
      expect(screen.getByRole("button", { name: tab })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "Branches" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Settings" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Notifications" })).not.toBeInTheDocument();
  });

  it("shows staff navigation when authenticated as staff", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ roles: [{ id: "role-1", code: "staff", name: "Staff", scope: { kind: "tenant" }, permissions: [] }], permissionCodes: [] }))
      .mockResolvedValueOnce(Response.json({ customers: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Staff dashboard")).toBeInTheDocument();

    for (const tab of ["Overview", "Appointments", "Customers", "Services", "Memberships", "Attendance"]) {
      expect(screen.getByRole("button", { name: tab })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "Billing" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Inventory" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Staff" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Branches" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reports" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Settings" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Notifications" })).not.toBeInTheDocument();
  });

  it("shows accounts navigation when authenticated as accounts", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ roles: [{ id: "role-1", code: "accounts", name: "Accounts", scope: { kind: "tenant" }, permissions: [] }], permissionCodes: [] }))
      .mockResolvedValueOnce(Response.json({ customers: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Accounts dashboard")).toBeInTheDocument();

    for (const tab of ["Overview", "Billing", "Reports", "Settings"]) {
      expect(screen.getByRole("button", { name: tab })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "Customers" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Inventory" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Staff" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Branches" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Notifications" })).not.toBeInTheDocument();
  });

  it("shows franchise navigation when authenticated as franchise", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ roles: [{ id: "role-1", code: "franchise", name: "Franchise", scope: { kind: "tenant" }, permissions: [] }], permissionCodes: [] }))
      .mockResolvedValueOnce(Response.json({ customers: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Franchise dashboard")).toBeInTheDocument();

    for (const tab of ["Overview", "Branches", "Reports", "Inventory", "Appointments", "Customers"]) {
      expect(screen.getByRole("button", { name: tab })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "Billing" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Staff" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Settings" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Notifications" })).not.toBeInTheDocument();
  });

  it("refreshes profile after role assignment", async () => {
    let authMeCallCount = 0;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockImplementation(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url === "/api/auth/me") {
          authMeCallCount++;
          if (authMeCallCount > 1) return Response.json({ roles: [{ id: "role-1", code: "branch-manager", name: "Branch Manager" }], permissionCodes: ["tenant.manage"] });
          return Response.json({ roles: [{ id: "role-1", code: "tenant-admin", name: "Admin", scope: { kind: "tenant" }, permissions: [] }], permissionCodes: ["tenant.manage"] });
        }
        if (url === "/api/users") return Response.json({ users: [{ id: "user-1", membershipId: "m-1", email: "admin@test.com", displayName: "Admin", isActive: true }] });
        if (url === "/api/roles") return Response.json({ roles: [{ id: "role-1", code: "branch-manager", name: "Branch Manager" }] });
        if (url === "/api/membership-roles") return Response.json({ assignment: { id: "assign-1", membershipId: "m-1", roleId: "role-1", scope: { kind: "tenant" } } });
        if (url === "/api/services") return Response.json({ services: [] });
        if (url === "/api/settings") return Response.json({ settings: [] });
        if (url === "/api/customers") return Response.json({ customers: [] });
        return new Response(null, { status: 404 });
      });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Admin dashboard")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Users & Access" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/users", expect.anything()));
    await user.selectOptions(screen.getByRole("combobox", { name: "User" }), "user-1");
    await user.selectOptions(screen.getByRole("combobox", { name: "Role" }), "role-1");
    await user.click(screen.getByRole("button", { name: "Assign role" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/me",
      expect.objectContaining({ credentials: "same-origin", cache: "no-store" }),
    ));
    expect(await screen.findByText("Branch dashboard")).toBeInTheDocument();
  });

  it("denies tenant API access to branch-scoped roles", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ roles: [{ id: "role-1", code: "branch-manager", name: "Branch", scope: { kind: "branch", businessUnitId: "bu-1", branchId: "branch-1" }, permissions: [] }], permissionCodes: [] }))
      .mockResolvedValueOnce(new Response(null, { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<Home />);
    await user.type(await screen.findByLabelText("Email"), "operator@example.test");
    await user.type(await screen.findByLabelText("Password"), "test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Branch dashboard")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Customers" }));
    expect(await screen.findByText("You are not authorized to view customers.")).toBeInTheDocument();
  });
});

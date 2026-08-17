import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import Home from "../app/page";

describe("X Nail native authentication integration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("submits user-entered credentials to the approved login route", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
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
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
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
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/auth/refresh",
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
    );
  });
});

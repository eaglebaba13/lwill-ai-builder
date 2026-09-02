import { describe, expect, it } from "vitest";
import { renderVariables } from "./notification-variable-renderer";

describe("notification variable renderer", () => {
  it("renders variables from template", () => {
    const result = renderVariables("Hello {{name}}", { name: "Alice" });
    expect(result.rendered).toBe("Hello Alice");
    expect(result.missingVariables).toEqual([]);
  });

  it("preserves unknown variables in template", () => {
    const result = renderVariables("Hello {{name}}, missing {{unknown}}", { name: "Alice" });
    expect(result.rendered).toBe("Hello Alice, missing {{unknown}}");
    expect(result.missingVariables).toEqual(["unknown"]);
  });

  it("handles null variables object", () => {
    const result = renderVariables("Hello {{name}}", null);
    expect(result.rendered).toBe("Hello {{name}}");
    expect(result.missingVariables).toEqual([]);
  });

  it("handles undefined variables", () => {
    const result = renderVariables("Hello {{name}}", undefined);
    expect(result.rendered).toBe("Hello {{name}}");
    expect(result.missingVariables).toEqual([]);
  });

  it("replaces null variable values with empty string", () => {
    const result = renderVariables("Hello {{name}}", { name: null });
    expect(result.rendered).toBe("Hello ");
    expect(result.missingVariables).toEqual([]);
  });

  it("handles multiple variables", () => {
    const result = renderVariables("{{greeting}} {{name}}", { greeting: "Hi", name: "Bob" });
    expect(result.rendered).toBe("Hi Bob");
    expect(result.missingVariables).toEqual([]);
  });

  it("handles variables with dots", () => {
    const result = renderVariables("Hello {{user.name}}", { user: { name: "Alice" } });
    expect(result.rendered).toBe("Hello {{user.name}}");
    expect(result.missingVariables).toEqual(["user.name"]);
  });
});

import { describe, expect, it } from "vitest";
import {
  aiProjectCreateSchema,
  aiPromptStorageSchema,
  aiSessionCreateSchema,
  modelUsageCreateSchema,
  parseAiProjectCreateInput,
  parseAiPromptStorageInput,
  ValidationError,
} from "./ai-builder-schemas";

const VALID_UUID_1 = "11111111-1111-1111-1111-111111111111";
const VALID_UUID_2 = "22222222-2222-2222-2222-222222222222";

describe("aiProjectCreateSchema", () => {
  it("parses valid project create input", () => {
    const input = {
      name: "My AI App",
      description: "App description",
      status: "active",
      metadata: { theme: "dark" },
    };

    const result = aiProjectCreateSchema.parse(input);
    expect(result).toEqual({
      name: "My AI App",
      description: "App description",
      status: "active",
      metadata: { theme: "dark" },
    });

    const safeResult = aiProjectCreateSchema.safeParse(input);
    expect(safeResult.success).toBe(true);
    if (safeResult.success) {
      expect(safeResult.data.name).toBe("My AI App");
    }
  });

  it("parses minimal project create input with optional nulls", () => {
    const input = {
      name: "Minimal App",
      description: null,
      metadata: null,
    };

    const result = aiProjectCreateSchema.parse(input);
    expect(result).toEqual({
      name: "Minimal App",
      description: null,
      metadata: null,
    });
  });

  it("fails on empty or invalid name", () => {
    expect(() => parseAiProjectCreateInput({})).toThrow(ValidationError);
    expect(() => parseAiProjectCreateInput({ name: "   " })).toThrow(
      "Project name is required and must be a non-empty string",
    );

    const safeResult = aiProjectCreateSchema.safeParse({ name: "" });
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.message).toContain("Project name is required");
    }
  });

  it("fails when input is not an object", () => {
    expect(() => parseAiProjectCreateInput(null)).toThrow(ValidationError);
    expect(() => parseAiProjectCreateInput("invalid")).toThrow(ValidationError);
  });
});

describe("aiPromptStorageSchema", () => {
  it("parses valid prompt storage input", () => {
    const input = {
      projectId: VALID_UUID_1,
      sessionId: VALID_UUID_2,
      role: "user",
      content: "Build me a landing page",
      tokenCount: 15,
    };

    const result = aiPromptStorageSchema.parse(input);
    expect(result).toEqual({
      projectId: VALID_UUID_1,
      sessionId: VALID_UUID_2,
      role: "user",
      content: "Build me a landing page",
      tokenCount: 15,
    });

    const safeResult = aiPromptStorageSchema.safeParse(input);
    expect(safeResult.success).toBe(true);
  });

  it("fails on invalid UUID or missing fields", () => {
    const invalidInput = {
      projectId: "not-a-uuid",
      sessionId: VALID_UUID_2,
      role: "user",
      content: "Hello",
    };

    expect(() => parseAiPromptStorageInput(invalidInput)).toThrow(ValidationError);

    const safeResult = aiPromptStorageSchema.safeParse(invalidInput);
    expect(safeResult.success).toBe(false);
    if (!safeResult.success) {
      expect(safeResult.error.message).toContain("projectId must be a valid UUID");
    }
  });

  it("fails on negative or non-integer tokenCount", () => {
    const invalidInput = {
      projectId: VALID_UUID_1,
      sessionId: VALID_UUID_2,
      role: "assistant",
      content: "Response",
      tokenCount: -5,
    };

    expect(() => parseAiPromptStorageInput(invalidInput)).toThrow("tokenCount must be a non-negative integer or null");
  });
});

describe("aiSessionCreateSchema", () => {
  it("parses valid session create input", () => {
    const input = {
      projectId: VALID_UUID_1,
      userId: VALID_UUID_2,
      title: "Initial Chat",
    };

    const result = aiSessionCreateSchema.parse(input);
    expect(result).toEqual({
      projectId: VALID_UUID_1,
      userId: VALID_UUID_2,
      title: "Initial Chat",
    });

    const safeResult = aiSessionCreateSchema.safeParse(input);
    expect(safeResult.success).toBe(true);
  });

  it("fails on missing title", () => {
    const invalid = {
      projectId: VALID_UUID_1,
      title: "  ",
    };

    expect(() => aiSessionCreateSchema.parse(invalid)).toThrow(ValidationError);
  });
});

describe("modelUsageCreateSchema", () => {
  it("parses valid model usage create input", () => {
    const input = {
      projectId: VALID_UUID_1,
      provider: "openai",
      modelName: "gpt-4o",
      promptTokens: 100,
      completionTokens: 200,
      totalTokens: 300,
      durationMs: 1200,
    };

    const result = modelUsageCreateSchema.parse(input);
    expect(result).toEqual({
      projectId: VALID_UUID_1,
      provider: "openai",
      modelName: "gpt-4o",
      promptTokens: 100,
      completionTokens: 200,
      totalTokens: 300,
      durationMs: 1200,
    });

    const safeResult = modelUsageCreateSchema.safeParse(input);
    expect(safeResult.success).toBe(true);
  });

  it("fails on missing tokens or negative token counts", () => {
    const invalid = {
      provider: "anthropic",
      modelName: "claude-3-5-sonnet",
      promptTokens: -1,
      completionTokens: 10,
      totalTokens: 9,
      durationMs: 500,
    };

    const safeResult = modelUsageCreateSchema.safeParse(invalid);
    expect(safeResult.success).toBe(false);
  });
});

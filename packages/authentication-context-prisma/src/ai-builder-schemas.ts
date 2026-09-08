export interface SafeParseSuccess<T> {
  readonly success: true;
  readonly data: T;
}

export interface SafeParseError {
  readonly success: false;
  readonly error: {
    readonly message: string;
    readonly issues: ReadonlyArray<{ readonly path: readonly (string | number)[]; readonly message: string }>;
  };
}

export type SafeParseResult<T> = SafeParseSuccess<T> | SafeParseError;

export interface ZodLikeSchema<T> {
  parse(input: unknown): T;
  safeParse(input: unknown): SafeParseResult<T>;
}

export class ValidationError extends Error {
  readonly issues: ReadonlyArray<{ readonly path: readonly (string | number)[]; readonly message: string }>;

  constructor(message: string, issues: ReadonlyArray<{ readonly path: readonly (string | number)[]; readonly message: string }> = []) {
    super(message);
    this.name = "ValidationError";
    this.issues = issues;
  }
}

// --------------------------------------------------
// AiProject Creation Schema
// --------------------------------------------------

export interface AiProjectCreateInput {
  readonly name: string;
  readonly description?: string | null;
  readonly status?: string;
  readonly metadata?: Record<string, unknown> | null;
}

export function parseAiProjectCreateInput(input: unknown): AiProjectCreateInput {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError("Input must be an object", [{ path: [], message: "Expected object" }]);
  }

  const record = input as Record<string, unknown>;
  const issues: Array<{ path: (string | number)[]; message: string }> = [];

  // Validate name
  if (typeof record.name !== "string" || record.name.trim().length === 0) {
    issues.push({ path: ["name"], message: "Project name is required and must be a non-empty string" });
  } else if (record.name.length > 255) {
    issues.push({ path: ["name"], message: "Project name must not exceed 255 characters" });
  }

  // Validate description
  let description: string | null | undefined = undefined;
  if (record.description !== undefined) {
    if (record.description === null) {
      description = null;
    } else if (typeof record.description !== "string") {
      issues.push({ path: ["description"], message: "Description must be a string or null" });
    } else if (record.description.length > 2000) {
      issues.push({ path: ["description"], message: "Description must not exceed 2000 characters" });
    } else {
      description = record.description.trim();
    }
  }

  // Validate status
  let status: string | undefined = undefined;
  if (record.status !== undefined) {
    if (typeof record.status !== "string" || record.status.trim().length === 0) {
      issues.push({ path: ["status"], message: "Status must be a non-empty string" });
    } else {
      status = record.status.trim();
    }
  }

  // Validate metadata
  let metadata: Record<string, unknown> | null | undefined = undefined;
  if (record.metadata !== undefined) {
    if (record.metadata === null) {
      metadata = null;
    } else if (typeof record.metadata !== "object" || Array.isArray(record.metadata)) {
      issues.push({ path: ["metadata"], message: "Metadata must be a key-value object or null" });
    } else {
      metadata = record.metadata as Record<string, unknown>;
    }
  }

  if (issues.length > 0) {
    throw new ValidationError(issues[0]!.message, issues);
  }

  return {
    name: (record.name as string).trim(),
    ...(description !== undefined && { description }),
    ...(status !== undefined && { status }),
    ...(metadata !== undefined && { metadata }),
  };
}

export const aiProjectCreateSchema: ZodLikeSchema<AiProjectCreateInput> = {
  parse: parseAiProjectCreateInput,
  safeParse(input: unknown): SafeParseResult<AiProjectCreateInput> {
    try {
      const data = parseAiProjectCreateInput(input);
      return { success: true, data };
    } catch (err) {
      if (err instanceof ValidationError) {
        return {
          success: false,
          error: { message: err.message, issues: err.issues },
        };
      }
      return {
        success: false,
        error: { message: "Validation failed", issues: [{ path: [], message: String(err) }] },
      };
    }
  },
};

// --------------------------------------------------
// AiPrompt Storage Schema
// --------------------------------------------------

export interface AiPromptStorageInput {
  readonly projectId: string;
  readonly sessionId: string;
  readonly role: "user" | "assistant" | "system" | string;
  readonly content: string;
  readonly tokenCount?: number | null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseAiPromptStorageInput(input: unknown): AiPromptStorageInput {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError("Input must be an object", [{ path: [], message: "Expected object" }]);
  }

  const record = input as Record<string, unknown>;
  const issues: Array<{ path: (string | number)[]; message: string }> = [];

  // Validate projectId
  if (typeof record.projectId !== "string" || record.projectId.trim().length === 0) {
    issues.push({ path: ["projectId"], message: "projectId is required and must be a non-empty string" });
  } else if (!UUID_REGEX.test(record.projectId.trim())) {
    issues.push({ path: ["projectId"], message: "projectId must be a valid UUID" });
  }

  // Validate sessionId
  if (typeof record.sessionId !== "string" || record.sessionId.trim().length === 0) {
    issues.push({ path: ["sessionId"], message: "sessionId is required and must be a non-empty string" });
  } else if (!UUID_REGEX.test(record.sessionId.trim())) {
    issues.push({ path: ["sessionId"], message: "sessionId must be a valid UUID" });
  }

  // Validate role
  if (typeof record.role !== "string" || record.role.trim().length === 0) {
    issues.push({ path: ["role"], message: "role is required and must be a non-empty string" });
  }

  // Validate content
  if (typeof record.content !== "string" || record.content.trim().length === 0) {
    issues.push({ path: ["content"], message: "content is required and must be a non-empty string" });
  }

  // Validate tokenCount
  let tokenCount: number | null | undefined = undefined;
  if (record.tokenCount !== undefined) {
    if (record.tokenCount === null) {
      tokenCount = null;
    } else if (typeof record.tokenCount !== "number" || !Number.isInteger(record.tokenCount) || record.tokenCount < 0) {
      issues.push({ path: ["tokenCount"], message: "tokenCount must be a non-negative integer or null" });
    } else {
      tokenCount = record.tokenCount;
    }
  }

  if (issues.length > 0) {
    throw new ValidationError(issues[0]!.message, issues);
  }

  return {
    projectId: (record.projectId as string).trim(),
    sessionId: (record.sessionId as string).trim(),
    role: (record.role as string).trim(),
    content: (record.content as string).trim(),
    ...(tokenCount !== undefined && { tokenCount }),
  };
}

export const aiPromptStorageSchema: ZodLikeSchema<AiPromptStorageInput> = {
  parse: parseAiPromptStorageInput,
  safeParse(input: unknown): SafeParseResult<AiPromptStorageInput> {
    try {
      const data = parseAiPromptStorageInput(input);
      return { success: true, data };
    } catch (err) {
      if (err instanceof ValidationError) {
        return {
          success: false,
          error: { message: err.message, issues: err.issues },
        };
      }
      return {
        success: false,
        error: { message: "Validation failed", issues: [{ path: [], message: String(err) }] },
      };
    }
  },
};

// --------------------------------------------------
// AiSession Creation Schema
// --------------------------------------------------

export interface AiSessionCreateInput {
  readonly projectId: string;
  readonly userId?: string | null;
  readonly title: string;
}

export function parseAiSessionCreateInput(input: unknown): AiSessionCreateInput {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError("Input must be an object", [{ path: [], message: "Expected object" }]);
  }

  const record = input as Record<string, unknown>;
  const issues: Array<{ path: (string | number)[]; message: string }> = [];

  if (typeof record.projectId !== "string" || record.projectId.trim().length === 0) {
    issues.push({ path: ["projectId"], message: "projectId is required and must be a non-empty string" });
  } else if (!UUID_REGEX.test(record.projectId.trim())) {
    issues.push({ path: ["projectId"], message: "projectId must be a valid UUID" });
  }

  if (typeof record.title !== "string" || record.title.trim().length === 0) {
    issues.push({ path: ["title"], message: "title is required and must be a non-empty string" });
  } else if (record.title.length > 255) {
    issues.push({ path: ["title"], message: "title must not exceed 255 characters" });
  }

  let userId: string | null | undefined = undefined;
  if (record.userId !== undefined) {
    if (record.userId === null) {
      userId = null;
    } else if (typeof record.userId !== "string" || !UUID_REGEX.test(record.userId.trim())) {
      issues.push({ path: ["userId"], message: "userId must be a valid UUID or null" });
    } else {
      userId = record.userId.trim();
    }
  }

  if (issues.length > 0) {
    throw new ValidationError(issues[0]!.message, issues);
  }

  return {
    projectId: (record.projectId as string).trim(),
    title: (record.title as string).trim(),
    ...(userId !== undefined && { userId }),
  };
}

export const aiSessionCreateSchema: ZodLikeSchema<AiSessionCreateInput> = {
  parse: parseAiSessionCreateInput,
  safeParse(input: unknown): SafeParseResult<AiSessionCreateInput> {
    try {
      const data = parseAiSessionCreateInput(input);
      return { success: true, data };
    } catch (err) {
      if (err instanceof ValidationError) {
        return {
          success: false,
          error: { message: err.message, issues: err.issues },
        };
      }
      return {
        success: false,
        error: { message: "Validation failed", issues: [{ path: [], message: String(err) }] },
      };
    }
  },
};

// --------------------------------------------------
// ModelUsage Creation Schema
// --------------------------------------------------

export interface ModelUsageCreateInput {
  readonly projectId?: string | null;
  readonly provider: string;
  readonly modelName: string;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly durationMs: number;
}

export function parseModelUsageCreateInput(input: unknown): ModelUsageCreateInput {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError("Input must be an object", [{ path: [], message: "Expected object" }]);
  }

  const record = input as Record<string, unknown>;
  const issues: Array<{ path: (string | number)[]; message: string }> = [];

  let projectId: string | null | undefined = undefined;
  if (record.projectId !== undefined) {
    if (record.projectId === null) {
      projectId = null;
    } else if (typeof record.projectId !== "string" || !UUID_REGEX.test(record.projectId.trim())) {
      issues.push({ path: ["projectId"], message: "projectId must be a valid UUID or null" });
    } else {
      projectId = record.projectId.trim();
    }
  }

  if (typeof record.provider !== "string" || record.provider.trim().length === 0) {
    issues.push({ path: ["provider"], message: "provider is required and must be a non-empty string" });
  }

  if (typeof record.modelName !== "string" || record.modelName.trim().length === 0) {
    issues.push({ path: ["modelName"], message: "modelName is required and must be a non-empty string" });
  }

  for (const field of ["promptTokens", "completionTokens", "totalTokens", "durationMs"] as const) {
    const val = record[field];
    if (typeof val !== "number" || !Number.isInteger(val) || val < 0) {
      issues.push({ path: [field], message: `${field} must be a non-negative integer` });
    }
  }

  if (issues.length > 0) {
    throw new ValidationError(issues[0]!.message, issues);
  }

  return {
    ...(projectId !== undefined && { projectId }),
    provider: (record.provider as string).trim(),
    modelName: (record.modelName as string).trim(),
    promptTokens: record.promptTokens as number,
    completionTokens: record.completionTokens as number,
    totalTokens: record.totalTokens as number,
    durationMs: record.durationMs as number,
  };
}

export const modelUsageCreateSchema: ZodLikeSchema<ModelUsageCreateInput> = {
  parse: parseModelUsageCreateInput,
  safeParse(input: unknown): SafeParseResult<ModelUsageCreateInput> {
    try {
      const data = parseModelUsageCreateInput(input);
      return { success: true, data };
    } catch (err) {
      if (err instanceof ValidationError) {
        return {
          success: false,
          error: { message: err.message, issues: err.issues },
        };
      }
      return {
        success: false,
        error: { message: "Validation failed", issues: [{ path: [], message: String(err) }] },
      };
    }
  },
};

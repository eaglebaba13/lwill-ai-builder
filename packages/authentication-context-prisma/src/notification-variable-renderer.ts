const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\}\}/g;

export interface VariableRenderResult {
  readonly rendered: string;
  readonly missingVariables: readonly string[];
}

export function renderVariables(template: string, variables: Record<string, unknown> | null | undefined): VariableRenderResult {
  if (variables === null || variables === undefined) {
    return { rendered: template, missingVariables: [] };
  }

  const missingVariables: string[] = [];
  const rendered = template.replace(VARIABLE_PATTERN, (match, key) => {
    if (!(key in variables)) {
      missingVariables.push(key);
      return match;
    }
    const value = variables[key];
    if (value === null || value === undefined) {
      return "";
    }
    return String(value);
  });

  return { rendered, missingVariables };
}

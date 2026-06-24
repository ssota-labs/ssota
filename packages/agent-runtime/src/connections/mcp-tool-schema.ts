type JsonSchemaObject = {
  type?: string | string[];
  description?: string;
  properties?: Record<string, JsonSchemaObject>;
  required?: string[];
};

export interface CompactArgsSchema {
  required?: string[];
  properties: Record<string, string>;
}

const COMMON_ARG_ALIASES: Record<string, string> = {
  channel: "channel_id",
  channelId: "channel_id",
  message: "text",
  body: "text",
};

/**
 * Summarize a JSON Schema object into compact property hints for connection_search.
 */
export function summarizeInputSchema(schema: unknown): CompactArgsSchema | undefined {
  if (!schema || typeof schema !== "object") return undefined;

  const json = schema as JsonSchemaObject;
  const properties = json.properties;
  if (!properties || typeof properties !== "object") return undefined;

  const summarized: Record<string, string> = {};
  for (const [name, prop] of Object.entries(properties)) {
    if (!prop || typeof prop !== "object") continue;
    const type =
      typeof prop.type === "string"
        ? prop.type
        : Array.isArray(prop.type)
          ? prop.type.join("|")
          : "unknown";
    summarized[name] = prop.description?.trim()
      ? `${type} — ${prop.description.trim()}`
      : type;
  }

  if (Object.keys(summarized).length === 0) return undefined;

  return {
    required: Array.isArray(json.required) ? json.required : undefined,
    properties: summarized,
  };
}

/**
 * Normalize common model arg mistakes before calling remote MCP tools.
 */
export function normalizeMcpToolArgs(
  args: Record<string, unknown>,
  schema?: CompactArgsSchema,
): Record<string, unknown> {
  const normalized = { ...args };

  for (const [from, to] of Object.entries(COMMON_ARG_ALIASES)) {
    if (from in normalized && !(to in normalized)) {
      normalized[to] = normalized[from];
      delete normalized[from];
    }
  }

  if (!schema?.required?.length) return normalized;

  const missing = schema.required.filter((key) => normalized[key] === undefined);
  if (missing.length > 0) {
    const hint = schema.required
      .map((key) => `${key}${schema.properties[key] ? ` (${schema.properties[key]})` : ""}`)
      .join(", ");
    throw new Error(
      `Missing required args: ${missing.join(", ")}. Expected: ${hint}`,
    );
  }

  return normalized;
}

export function enrichGenericMcpError(
  message: string,
  toolName: string,
  args: Record<string, unknown>,
  schema?: CompactArgsSchema,
): string {
  if (message !== "Internal Server Error" && !message.includes("HTTP 500")) {
    return message;
  }

  const argKeys = Object.keys(args);
  const expected = schema?.required?.length
    ? schema.required.join(", ")
  : "check the remote tool schema";

  return `${message} while calling ${toolName}. Args sent: ${argKeys.join(", ") || "(none)"}. Expected parameters include: ${expected}.`;
}

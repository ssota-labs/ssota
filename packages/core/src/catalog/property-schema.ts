import type { PropertySchema, PropertySchemaField, PropertySchemaPatch } from "@ssota/contracts";
import { ActionRejectedError } from "../domain/types.js";

export const SYSTEM_TITLE_KEY = "title";

export const DEFAULT_TITLE_FIELD: PropertySchemaField = {
  valueType: "string",
  constraints: { minLength: 1, maxLength: 500 },
  required: true,
  system: true,
};

export function ensureTitleInPropertySchema(
  schema: PropertySchema | undefined,
): PropertySchema {
  const base = { ...(schema ?? {}) };
  if (!base[SYSTEM_TITLE_KEY]) {
    base[SYSTEM_TITLE_KEY] = { ...DEFAULT_TITLE_FIELD };
  }
  return base;
}

export function getPropertyField(
  schema: PropertySchema,
  propertyKey: string,
): PropertySchemaField | null {
  return schema[propertyKey] ?? null;
}

export function applyPropertySchemaPatch(
  existing: PropertySchema,
  patch: PropertySchemaPatch,
): PropertySchema {
  const next: PropertySchema = { ...existing };

  if (patch.remove) {
    for (const key of patch.remove) {
      if (next[key]?.system) {
        throw new ActionRejectedError(
          "UNSAFE_EFFECT",
          `Cannot remove system property '${key}'`,
        );
      }
      delete next[key];
    }
  }

  if (patch.rename) {
    for (const [from, to] of Object.entries(patch.rename)) {
      if (!next[from]) {
        throw new ActionRejectedError(
          "CATALOG_NOT_FOUND",
          `Property '${from}' does not exist on node type`,
        );
      }
      if (next[from]?.system) {
        throw new ActionRejectedError(
          "UNSAFE_EFFECT",
          `Cannot rename system property '${from}'`,
        );
      }
      if (next[to]) {
        throw new ActionRejectedError(
          "DUPLICATE_PROPERTY",
          `Property '${to}' already exists on node type`,
        );
      }
      next[to] = next[from];
      delete next[from];
    }
  }

  if (patch.update) {
    for (const [key, fieldPatch] of Object.entries(patch.update)) {
      if (!next[key]) {
        throw new ActionRejectedError(
          "CATALOG_NOT_FOUND",
          `Property '${key}' does not exist on node type`,
        );
      }
      if (next[key]?.system && fieldPatch.valueType && fieldPatch.valueType !== next[key]?.valueType) {
        throw new ActionRejectedError(
          "UNSAFE_EFFECT",
          `Cannot change valueType of system property '${key}'`,
        );
      }
      next[key] = { ...next[key], ...fieldPatch };
    }
  }

  if (patch.add) {
    for (const [key, field] of Object.entries(patch.add)) {
      if (next[key]) {
        throw new ActionRejectedError(
          "DUPLICATE_PROPERTY",
          `Property '${key}' already exists on node type`,
        );
      }
      next[key] = field;
    }
  }

  return ensureTitleInPropertySchema(next);
}

export function detectBreakingPropertySchemaChange(
  before: PropertySchema,
  after: PropertySchema,
): boolean {
  for (const [key, field] of Object.entries(before)) {
    const next = after[key];
    if (!next) return true;
    if (field.valueType !== next.valueType) return true;
    if (field.required && !next.required) return false;
    if (!field.required && next.required) return true;
    const beforeOptions = field.options ?? [];
    const afterOptions = next.options ?? [];
    if (beforeOptions.length > 0) {
      for (const option of beforeOptions) {
        if (!afterOptions.includes(option)) return true;
      }
    }
  }
  return false;
}

export function enforcePropertyFieldValue(
  propertyKey: string,
  field: PropertySchemaField,
  value: unknown,
): void {
  if (value === undefined || value === null) return;

  const valueType = field.valueType.toLowerCase();
  const constraints = field.constraints ?? {};
  const enumValues =
    field.options ??
    (constraints.enum as unknown[] | undefined) ??
    (constraints.options as unknown[] | undefined);

  if ((valueType === "string" || valueType === "text") && typeof value !== "string") {
    throw new ActionRejectedError(
      "INVALID_PROPERTY_VALUE",
      `Property '${propertyKey}' must be a string`,
    );
  }
  if (valueType === "number" && typeof value !== "number") {
    throw new ActionRejectedError(
      "INVALID_PROPERTY_VALUE",
      `Property '${propertyKey}' must be a number`,
    );
  }
  if (valueType === "boolean" && typeof value !== "boolean") {
    throw new ActionRejectedError(
      "INVALID_PROPERTY_VALUE",
      `Property '${propertyKey}' must be a boolean`,
    );
  }
  if ((valueType === "enum" || enumValues) && enumValues && !enumValues.includes(value)) {
    throw new ActionRejectedError(
      "INVALID_PROPERTY_VALUE",
      `Property '${propertyKey}' must match one of its enum options`,
    );
  }
  if (
    typeof value === "string" &&
    typeof constraints.maxLength === "number" &&
    value.length > constraints.maxLength
  ) {
    throw new ActionRejectedError(
      "INVALID_PROPERTY_VALUE",
      `Property '${propertyKey}' exceeds maxLength ${constraints.maxLength}`,
    );
  }
  if (
    typeof value === "string" &&
    typeof constraints.minLength === "number" &&
    value.length < constraints.minLength
  ) {
    throw new ActionRejectedError(
      "INVALID_PROPERTY_VALUE",
      `Property '${propertyKey}' is shorter than minLength ${constraints.minLength}`,
    );
  }
}

export function resolveDisplayAction(
  actionType: string,
  input: Record<string, unknown>,
  nodeType?: string,
): string | undefined {
  if (actionType === "create_node") {
    const nt = (input.nodeType as string | undefined) ?? nodeType;
    if (nt) return `create_${nt.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase().replace(/\s+/g, "_")}`;
  }
  if (actionType === "update_node_properties" && nodeType) {
    return `update_${nodeType.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase().replace(/\s+/g, "_")}_properties`;
  }
  return undefined;
}

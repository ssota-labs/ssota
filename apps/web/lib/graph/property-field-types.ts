export type PropertyFieldDefinition = {
  key: string;
  label: string;
  valueType: string;
  required?: boolean;
  system?: boolean;
  options?: string[];
  constraints?: Record<string, unknown>;
};

export function enumOptions(field: PropertyFieldDefinition): string[] {
  if (field.options?.length) return field.options;
  const constraints = field.constraints as
    | { enum?: string[]; options?: string[] }
    | undefined;
  return constraints?.enum ?? constraints?.options ?? [];
}

export function isBooleanField(field: PropertyFieldDefinition): boolean {
  return field.valueType === "boolean";
}

export function isNumberField(field: PropertyFieldDefinition): boolean {
  return field.valueType === "number";
}

export function isTextAreaField(field: PropertyFieldDefinition): boolean {
  return field.valueType === "text";
}

export function isEnumField(field: PropertyFieldDefinition): boolean {
  return field.valueType === "enum" || enumOptions(field).length > 0;
}

export function isJsonField(field: PropertyFieldDefinition, value: unknown): boolean {
  if (field.valueType === "json" || field.valueType === "jsonb") return true;
  return value !== null && value !== undefined && typeof value === "object";
}

export function supabaseTypeLabel(field: PropertyFieldDefinition): string {
  switch (field.valueType) {
    case "string":
      return "text";
    case "text":
      return "text";
    case "number":
      return "int8";
    case "boolean":
      return "bool";
    case "enum":
      return "text";
    case "json":
    case "jsonb":
      return "jsonb";
    default:
      return field.valueType;
  }
}

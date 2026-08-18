import { z } from "zod";

/**
 * L1 카탈로그 `property_schema`의 저장 형식 — **닫힌 JSON Schema 서브셋**.
 *
 * 왜 서브셋인가 (ADR-runtime-ontology-with-closed-edit-vocabulary):
 * - 런타임에 사용자·에이전트가 타입을 정의하므로 형식은 직렬화 가능해야 한다 (Zod 객체 불가).
 * - 어휘를 닫아야 검증기가 하나로 유지되고 표현력 확장 압력을 구조적으로 막는다.
 * - `ajv` 같은 범용 검증기 대신 Zod로 컴파일한다 — contracts는 zod 단일 의존을 유지하고,
 *   출하 타입의 하드코딩 Zod와 같은 에러 경로·같은 타입 시스템을 쓴다.
 *
 * 지원 어휘: type(object|string|number|integer|boolean|array), properties, required,
 * items, enum, minimum/maximum, minLength/maxLength, format(date|date-time|uuid|email|uri),
 * description. 그 외 키워드($ref·oneOf·anyOf·allOf·patternProperties·additionalProperties…)는
 * **정의 자체가 거부**된다. 확장은 ADR을 요구한다 [ACTION-02].
 *
 * 선언되지 않은 키는 통과한다 — properties JSONB의 롱테일 payload 정책.
 */

const scalarType = z.enum(["string", "number", "integer", "boolean"]);

/** 재귀 정의를 위한 인터페이스 (Zod lazy). */
export interface PropertyFieldSchema {
  type: "string" | "number" | "integer" | "boolean" | "array" | "object";
  description?: string;
  enum?: Array<string | number>;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  format?: "date" | "date-time" | "uuid" | "email" | "uri";
  items?: PropertyFieldSchema;
  properties?: Record<string, PropertyFieldSchema>;
  required?: string[];
}

const propertyFieldSchema: z.ZodType<PropertyFieldSchema> = z.lazy(() =>
  z
    .object({
      type: z.union([scalarType, z.literal("array"), z.literal("object")]),
      description: z.string().optional(),
      enum: z.array(z.union([z.string(), z.number()])).min(1).optional(),
      minimum: z.number().optional(),
      maximum: z.number().optional(),
      minLength: z.number().int().nonnegative().optional(),
      maxLength: z.number().int().nonnegative().optional(),
      format: z.enum(["date", "date-time", "uuid", "email", "uri"]).optional(),
      items: propertyFieldSchema.optional(),
      properties: z.record(propertyFieldSchema).optional(),
      required: z.array(z.string()).optional(),
    })
    .strict(),
);

/** 루트는 반드시 object. */
export const propertySchemaDefinitionSchema = z
  .object({
    type: z.literal("object"),
    description: z.string().optional(),
    properties: z.record(propertyFieldSchema).optional(),
    required: z.array(z.string()).optional(),
  })
  .strict();

export type PropertySchemaDefinition = z.infer<typeof propertySchemaDefinitionSchema>;

/** 카탈로그 행에서 읽은 임의 JSON을 닫힌 서브셋으로 파싱한다. 위반 시 ZodError. */
export function parsePropertySchemaDefinition(input: unknown): PropertySchemaDefinition {
  return propertySchemaDefinitionSchema.parse(input);
}

/** 정의는 서브셋에 맞지만 컴파일 불가능한 경우 (required가 미선언 키 참조 등). */
export class PropertySchemaCompileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PropertySchemaCompileError";
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function compileField(field: PropertyFieldSchema, path: string): z.ZodTypeAny {
  switch (field.type) {
    case "string": {
      let s = z.string();
      if (field.minLength !== undefined) s = s.min(field.minLength);
      if (field.maxLength !== undefined) s = s.max(field.maxLength);
      switch (field.format) {
        case "date":
          s = s.regex(DATE_RE, "expected YYYY-MM-DD");
          break;
        case "date-time":
          s = s.datetime({ offset: true });
          break;
        case "uuid":
          s = s.uuid();
          break;
        case "email":
          s = s.email();
          break;
        case "uri":
          s = s.url();
          break;
      }
      if (field.enum) {
        const values = field.enum.filter((v): v is string => typeof v === "string");
        if (values.length !== field.enum.length) {
          throw new PropertySchemaCompileError(`${path}: string enum must contain only strings`);
        }
        return z.enum(values as [string, ...string[]]);
      }
      return s;
    }
    case "number":
    case "integer": {
      let n = z.number();
      if (field.type === "integer") n = n.int();
      if (field.minimum !== undefined) n = n.min(field.minimum);
      if (field.maximum !== undefined) n = n.max(field.maximum);
      if (field.enum) {
        const values = field.enum.filter((v): v is number => typeof v === "number");
        if (values.length !== field.enum.length) {
          throw new PropertySchemaCompileError(`${path}: number enum must contain only numbers`);
        }
        return n.refine((v) => values.includes(v), { message: `expected one of ${values.join(", ")}` });
      }
      return n;
    }
    case "boolean":
      return z.boolean();
    case "array": {
      const item = field.items ? compileField(field.items, `${path}[]`) : z.unknown();
      return z.array(item);
    }
    case "object":
      return compileObject(field, path);
  }
}

function compileObject(
  def: { properties?: Record<string, PropertyFieldSchema>; required?: string[] },
  path: string,
): z.ZodType<Record<string, unknown>> {
  const props = def.properties ?? {};
  const required = new Set(def.required ?? []);
  for (const key of required) {
    if (!(key in props)) {
      throw new PropertySchemaCompileError(
        `${path}: required key "${key}" is not declared in properties`,
      );
    }
  }
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, field] of Object.entries(props)) {
    const compiled = compileField(field, path ? `${path}.${key}` : key);
    shape[key] = required.has(key) ? compiled : compiled.optional();
  }
  // passthrough: 선언되지 않은 키는 그대로 통과 (롱테일 payload)
  return z.object(shape).passthrough();
}

/**
 * 정의를 검증 함수로 컴파일한다. 반환 함수는 성공 시 파싱된 properties를,
 * 실패 시 ZodError(경로 포함)를 던진다 — 호출자가 GraphError(VALIDATION_FAILED)로 감싼다.
 */
export function compilePropertySchema(
  definition: PropertySchemaDefinition,
): (properties: unknown) => Record<string, unknown> {
  const schema = compileObject(definition, "");
  return (properties) => schema.parse(properties ?? {});
}

/**
 * 컴파일 캐시 — 같은 정의 객체(참조 동일)에 대해 재컴파일하지 않는다.
 * 카탈로그 행은 포트 레벨에서 캐시되므로 참조 동일성이 대체로 유지된다.
 */
const compiledCache = new WeakMap<object, (p: unknown) => Record<string, unknown>>();

export function compilePropertySchemaCached(
  raw: Record<string, unknown>,
): (properties: unknown) => Record<string, unknown> {
  const hit = compiledCache.get(raw);
  if (hit) return hit;
  const compiled = compilePropertySchema(parsePropertySchemaDefinition(raw));
  compiledCache.set(raw, compiled);
  return compiled;
}

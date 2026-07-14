/**
 * REST-API-reference model for the `SchemaDisplay` catalog component. Domain-
 * agnostic: one or more endpoints, each with a method/path, parameters, a request
 * body schema, and responses. The property schema is recursive (objects nest
 * `properties`, arrays carry `items`) so any JSON shape can be documented.
 *
 * Mirrors the ai-sdk "schema-display" element + the builder.io rich API-reference
 * demo (collapsible endpoint rows, parameter table, response shapes).
 */

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export type ParamLocation = "path" | "query" | "header" | "cookie" | "body";

/** One request/response field — recursive for nested objects & arrays. */
export type SchemaProperty = {
  name: string;
  type?: string;
  required?: boolean;
  description?: string;
  /** Child fields when `type` is an object. */
  properties?: SchemaProperty[];
  /** Element schema when `type` is an array. */
  items?: SchemaProperty[];
};

export type SchemaParameter = {
  name: string;
  in: ParamLocation;
  type?: string;
  required?: boolean;
  description?: string;
};

export type SchemaResponse = {
  status: string;
  description?: string;
  /** One-line shape summary, e.g. "{ run: AgentRun, steps: RunStep[] }". */
  shape?: string;
  /** Full recursive body schema (optional, shown when present). */
  body?: SchemaProperty[];
};

export type ApiEndpoint = {
  id: string;
  method: HttpMethod;
  path: string;
  summary?: string;
  description?: string;
  /** Auth scheme label, e.g. "Bearer" — renders a lock badge. */
  auth?: string;
  /** Small status tag, e.g. "ADDED" / "BETA". */
  tag?: string;
  parameters?: SchemaParameter[];
  requestBody?: SchemaProperty[];
  responses?: SchemaResponse[];
  defaultOpen?: boolean;
};

export type SchemaDoc = {
  endpoints: ApiEndpoint[];
};

const METHODS: readonly HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];
const LOCATIONS: readonly ParamLocation[] = [
  "path",
  "query",
  "header",
  "cookie",
  "body",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function coerceProperty(raw: unknown): SchemaProperty | null {
  if (!isRecord(raw)) return null;
  const name = str(raw.name);
  if (!name) return null;
  const prop: SchemaProperty = { name };
  if (str(raw.type)) prop.type = raw.type as string;
  if (raw.required === true) prop.required = true;
  if (str(raw.description)) prop.description = raw.description as string;
  if (Array.isArray(raw.properties)) {
    const children = raw.properties
      .map(coerceProperty)
      .filter((p): p is SchemaProperty => p !== null);
    if (children.length) prop.properties = children;
  }
  if (Array.isArray(raw.items)) {
    const items = raw.items
      .map(coerceProperty)
      .filter((p): p is SchemaProperty => p !== null);
    if (items.length) prop.items = items;
  }
  return prop;
}

function coerceParameter(raw: unknown): SchemaParameter | null {
  if (!isRecord(raw)) return null;
  const name = str(raw.name);
  if (!name) return null;
  const location =
    typeof raw.in === "string" && LOCATIONS.includes(raw.in as ParamLocation)
      ? (raw.in as ParamLocation)
      : "query";
  const param: SchemaParameter = { name, in: location };
  if (str(raw.type)) param.type = raw.type as string;
  if (raw.required === true) param.required = true;
  if (str(raw.description)) param.description = raw.description as string;
  return param;
}

function coerceResponse(raw: unknown): SchemaResponse | null {
  if (!isRecord(raw)) return null;
  // status may be a number (200) or string ("2XX").
  const status =
    typeof raw.status === "number"
      ? String(raw.status)
      : str(raw.status) ?? str(raw.code);
  if (!status) return null;
  const res: SchemaResponse = { status };
  if (str(raw.description)) res.description = raw.description as string;
  if (str(raw.shape)) res.shape = raw.shape as string;
  if (Array.isArray(raw.body)) {
    const body = raw.body
      .map(coerceProperty)
      .filter((p): p is SchemaProperty => p !== null);
    if (body.length) res.body = body;
  }
  return res;
}

function coerceEndpoint(raw: unknown, index: number): ApiEndpoint | null {
  if (!isRecord(raw)) return null;
  const method =
    typeof raw.method === "string" &&
    METHODS.includes(raw.method.toUpperCase() as HttpMethod)
      ? (raw.method.toUpperCase() as HttpMethod)
      : "GET";
  const path = str(raw.path) ?? "/";
  const id = str(raw.id) ?? `${method}-${path}-${index}`;
  const ep: ApiEndpoint = { id, method, path };
  if (str(raw.summary)) ep.summary = raw.summary as string;
  if (str(raw.description)) ep.description = raw.description as string;
  if (str(raw.auth)) ep.auth = raw.auth as string;
  if (str(raw.tag)) ep.tag = raw.tag as string;
  if (Array.isArray(raw.parameters)) {
    ep.parameters = raw.parameters
      .map(coerceParameter)
      .filter((p): p is SchemaParameter => p !== null);
  }
  if (Array.isArray(raw.requestBody)) {
    ep.requestBody = raw.requestBody
      .map(coerceProperty)
      .filter((p): p is SchemaProperty => p !== null);
  }
  if (Array.isArray(raw.responses)) {
    ep.responses = raw.responses
      .map(coerceResponse)
      .filter((r): r is SchemaResponse => r !== null);
  }
  if (raw.defaultOpen === true) ep.defaultOpen = true;
  return ep;
}

/**
 * Normalize an unknown value into a SchemaDoc. Accepts `{ endpoints: [...] }`, a
 * bare array of endpoints, or a single endpoint object.
 */
export function coerceSchemaDoc(value: unknown): SchemaDoc {
  let rawList: unknown[];
  if (Array.isArray(value)) rawList = value;
  else if (isRecord(value) && Array.isArray(value.endpoints))
    rawList = value.endpoints;
  else if (isRecord(value) && (value.method || value.path)) rawList = [value];
  else rawList = [];
  const endpoints = rawList
    .map((e, i) => coerceEndpoint(e, i))
    .filter((e): e is ApiEndpoint => e !== null);
  return { endpoints };
}

/** compare 모드 diff 태그: 현재 스키마 vs 베이스라인 스키마의 엔트리별 상태. */
export type SchemaDiffTag = "ADDED" | "REMOVED" | "CHANGED";

/** diff 주석이 붙은 endpoint. `diff` 없음 = 양쪽 동일(UNCHANGED). */
export type DiffedEndpoint = ApiEndpoint & { diff?: SchemaDiffTag };

/** 엔트리 identity: method + path (diff 매칭 키). */
function endpointKey(ep: ApiEndpoint): string {
  return `${ep.method} ${ep.path}`;
}

/**
 * CHANGED 판정용 시그니처: parameters / requestBody / responses / auth 를
 * 정규화 JSON 으로 비교한다. summary·description·tag 같은 문서용 필드 변경은
 * CHANGED 로 치지 않는다.
 */
function endpointSignature(ep: ApiEndpoint): string {
  return JSON.stringify({
    auth: ep.auth ?? null,
    parameters: ep.parameters ?? [],
    requestBody: ep.requestBody ?? [],
    responses: ep.responses ?? [],
  });
}

/**
 * 현재(current) 스키마를 베이스라인(baseline)과 비교해 엔트리별 diff 태그를
 * 계산한다. current 에만 있으면 ADDED, 같은 method+path 인데 시그니처가 다르면
 * CHANGED, baseline 에만 있으면 REMOVED (current 목록 뒤에 dimmed 렌더용으로
 * 덧붙임). 순서는 current 순서 + REMOVED 순서를 유지한다.
 */
export function diffSchemaDocs(
  current: SchemaDoc,
  baseline: SchemaDoc,
): DiffedEndpoint[] {
  const baseByKey = new Map(
    baseline.endpoints.map((ep) => [endpointKey(ep), ep]),
  );
  const currentKeys = new Set(current.endpoints.map(endpointKey));
  const out: DiffedEndpoint[] = current.endpoints.map((ep) => {
    const base = baseByKey.get(endpointKey(ep));
    if (!base) return { ...ep, diff: "ADDED" };
    if (endpointSignature(base) !== endpointSignature(ep)) {
      return { ...ep, diff: "CHANGED" };
    }
    return ep;
  });
  for (const base of baseline.endpoints) {
    if (!currentKeys.has(endpointKey(base))) {
      out.push({ ...base, id: `removed-${base.id}`, diff: "REMOVED" });
    }
  }
  return out;
}

/** Tailwind classes for an HTTP method badge (surface/text). */
export const METHOD_BADGE_CLASSES: Record<HttpMethod, string> = {
  GET: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  POST: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  PUT: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  PATCH: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  DELETE: "bg-red-500/15 text-red-600 dark:text-red-400",
  HEAD: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  OPTIONS: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
};

export function methodBadgeClass(method: HttpMethod): string {
  return METHOD_BADGE_CLASSES[method] ?? METHOD_BADGE_CLASSES.GET;
}

/** Split a path into segments, flagging `:param` / `{param}` placeholders. */
export function pathSegments(
  path: string,
): { text: string; param: boolean }[] {
  return path.split(/(?=\/)/).map((seg) => {
    const param = /[:{]/.test(seg);
    return { text: seg, param };
  });
}

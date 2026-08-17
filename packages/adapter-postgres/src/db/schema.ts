/**
 * Drizzle 스키마 barrel — 정의는 schema/{platform,ontology,agents}.ts (버티컬별).
 * drizzle-kit은 schema/*.ts glob을 읽는다 (drizzle.config.ts).
 */
export * from "./schema/platform.js";
export * from "./schema/ontology.js";
export * from "./schema/agents.js";

import { z } from "zod";

export const mutabilitySchema = z.enum(["living", "versioned", "immutable"]);
export type Mutability = z.infer<typeof mutabilitySchema>;

/** Properties bag: known keys validated per node_type; extras allowed. */
export const loosePropertiesSchema = z
  .object({})
  .passthrough()
  .catchall(z.unknown());

export function propertiesWithKnownKeys<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).passthrough();
}

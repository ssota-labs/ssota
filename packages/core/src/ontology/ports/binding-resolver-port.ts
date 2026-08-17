import type { BindingDef } from "@ssota/contracts";

/** Resolves page bindings to a data context — implementation post-release (PR6). */
export interface BindingResolverPort {
  resolveBindings(
    teamspaceId: string,
    bindings: Record<string, BindingDef>,
    context?: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
}

export function createStubBindingResolverPort(): BindingResolverPort {
  return {
    async resolveBindings(_projectId, bindings) {
      const data: Record<string, unknown> = {};
      for (const key of Object.keys(bindings)) {
        data[key] = null;
      }
      return data;
    },
  };
}

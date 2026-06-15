import type { CreateInitiativeBundleInput } from "@ssota/contracts/graph";
import type { CatalogReadPort } from "../../ports/catalog-read-port.js";
import type { GraphWritePort } from "../../ports/graph-write-port.js";

export async function createInitiativeBundle(
  deps: { catalog: CatalogReadPort; graphWrite: GraphWritePort },
  input: CreateInitiativeBundleInput,
) {
  return deps.graphWrite.createInitiativeBundle(input);
}

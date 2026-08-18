import type { CatalogReadPort } from "@ssota/core";
import type { Db } from "../../db/client.js";
import { createDbCatalogReadPort } from "./db-catalog-read-port.js";
import { createGraphReadPort, type GraphPortsScope } from "./graph-read-port.js";
import { createGraphWritePort } from "./graph-write-port.js";

export type { GraphPortsScope };

export function createGraphPorts(
  db: Db,
  scope: GraphPortsScope,
): {
  catalog: CatalogReadPort;
  graphRead: ReturnType<typeof createGraphReadPort>;
  graphWrite: ReturnType<typeof createGraphWritePort>;
} {
  return {
    catalog: createDbCatalogReadPort(db, scope),
    graphRead: createGraphReadPort(db, scope),
    graphWrite: createGraphWritePort(db, scope),
  };
}

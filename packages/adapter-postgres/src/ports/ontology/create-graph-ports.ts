import type { CatalogReadPort, GraphCommitPort } from "@ssota/core";
import type { Db } from "../../db/client.js";
import { createDbCatalogReadPort } from "./db-catalog-read-port.js";
import { createGraphReadPort, type GraphPortsScope } from "./graph-read-port.js";
import { createGraphWritePort } from "./graph-write-port.js";
import { createDbGraphCommitPort } from "./graph-commit-port.js";

export type { GraphPortsScope };

export function createGraphPorts(
  db: Db,
  scope: GraphPortsScope,
): {
  catalog: CatalogReadPort;
  graphRead: ReturnType<typeof createGraphReadPort>;
  graphWrite: ReturnType<typeof createGraphWritePort>;
  /** [ACTION-01] runAction 전용 단일 커밋 경로 — 한 트랜잭션·락·감사·멱등 */
  commit: GraphCommitPort;
} {
  return {
    catalog: createDbCatalogReadPort(db, scope),
    graphRead: createGraphReadPort(db, scope),
    graphWrite: createGraphWritePort(db, scope),
    commit: createDbGraphCommitPort(db, scope),
  };
}

import type { RestConnectionDef } from "./rest-connection-def.js";
import { resolveApiConnectorUid } from "./connect-credential.js";
import twitter from "../tools/twitter.js";

const ALL_REST_CONNECTIONS: RestConnectionDef[] = [twitter];

/** REST connections with a configured API connector uid for this deployment. */
export function getConfiguredRestConnections(): RestConnectionDef[] {
  return ALL_REST_CONNECTIONS.filter(
    (c) => resolveApiConnectorUid(c.provider) !== null,
  );
}

export function getRestConnectionById(id: string): RestConnectionDef | null {
  return getConfiguredRestConnections().find((c) => c.id === id) ?? null;
}

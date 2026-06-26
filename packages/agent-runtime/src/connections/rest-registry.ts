import type { RestConnectionDef } from "./rest-connection-def.js";
import { resolveApiConnectorUid } from "./connect-credential.js";
import twitter from "../tools/twitter.js";
import gmail from "../tools/google-gmail.js";
import drive from "../tools/google-drive.js";
import calendar from "../tools/google-calendar.js";

// Gmail/Drive/Calendar are separate connection ids sharing provider "google" —
// one Vercel Connect OAuth grant (GOOGLE_API_CONNECTOR) enables all three.
const ALL_REST_CONNECTIONS: RestConnectionDef[] = [
  twitter,
  gmail,
  drive,
  calendar,
];

/** REST connections with a configured API connector uid for this deployment. */
export function getConfiguredRestConnections(): RestConnectionDef[] {
  return ALL_REST_CONNECTIONS.filter(
    (c) => resolveApiConnectorUid(c.provider) !== null,
  );
}

export function getRestConnectionById(id: string): RestConnectionDef | null {
  return getConfiguredRestConnections().find((c) => c.id === id) ?? null;
}

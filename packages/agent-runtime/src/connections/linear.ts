import { defineMcpClientConnection } from "./define-mcp-connection.js";
import { connectCredential as connect } from "./connect-credential.js";

export default defineMcpClientConnection("linear", {
  // Streamable HTTP (recommended). Legacy /sse returns 404 on many clients.
  url: "https://mcp.linear.app/mcp",
  transport: "http",
  description: "Linear workspace: issues, projects, cycles, and comments.",
  auth: connect("linear"),
});

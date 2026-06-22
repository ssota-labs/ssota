import { defineMcpClientConnection } from "./define-mcp-connection.js";
import { connectCredential as connect } from "./connect-credential.js";

export default defineMcpClientConnection("linear", {
  url: "https://mcp.linear.app/sse",
  transport: "sse",
  description: "Linear workspace: issues, projects, cycles, and comments.",
  auth: connect("linear"),
});

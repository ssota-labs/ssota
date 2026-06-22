import { defineMcpClientConnection } from "./define-mcp-connection.js";
import { connectCredential as connect } from "./connect-credential.js";

export default defineMcpClientConnection("slack", {
  // Streamable HTTP (recommended). Legacy /sse redirects then 404 on Slack MCP.
  url: "https://mcp.slack.com/mcp",
  transport: "http",
  description: "Slack workspaces: channels, messages, users, and search.",
  auth: connect("slack"),
});

import { defineMcpClientConnection } from "./define-mcp-connection.js";
import { connectCredential as connect } from "./connect-credential.js";

export default defineMcpClientConnection("slack", {
  url: "https://mcp.slack.com/mcp",
  description: "Slack workspaces: channels, messages, users, and search.",
  auth: connect("slack"),
});

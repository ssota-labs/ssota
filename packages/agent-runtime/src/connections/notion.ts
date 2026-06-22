import { defineMcpClientConnection } from "./define-mcp-connection.js";
import { connectCredential as connect } from "./connect-credential.js";

export default defineMcpClientConnection("notion", {
  url: "https://mcp.notion.com/mcp",
  description: "Notion workspaces: pages, databases, and search.",
  auth: connect("notion"),
});

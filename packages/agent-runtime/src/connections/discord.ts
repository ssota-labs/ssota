import { defineMcpClientConnection } from "./define-mcp-connection.js";
import { connectCredential as connect } from "./connect-credential.js";

const discordMcpUrl = process.env.DISCORD_MCP_URL;

/** Discord has no first-party hosted MCP; optional self-hosted URL via DISCORD_MCP_URL. */
export default discordMcpUrl
  ? defineMcpClientConnection("discord", {
      url: discordMcpUrl,
      description:
        "Discord servers: channels, messages, and moderation (self-hosted MCP).",
      auth: connect("discord"),
    })
  : null;

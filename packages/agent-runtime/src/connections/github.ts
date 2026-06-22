import { defineMcpClientConnection } from "./define-mcp-connection.js";
import { connectCredential as connect } from "./connect-credential.js";

export default defineMcpClientConnection("github", {
  url: "https://api.githubcopilot.com/mcp/",
  description: "GitHub orgs: repositories, issues, pull requests, and code search.",
  auth: connect("github"),
  tools: {
    allow: [
      "search_repositories",
      "get_file_contents",
      "list_issues",
      "issue_read",
      "list_pull_requests",
      "pull_request_read",
      "search_code",
      "search_issues",
    ],
  },
});

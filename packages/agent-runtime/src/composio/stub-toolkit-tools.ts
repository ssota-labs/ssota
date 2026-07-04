type StubToolkitTool = {
  slug: string;
  name: string;
  description?: string;
};

/**
 * Dev/stub preview toolkit tools — mirrors Composio's Notion toolkit (slug NOTION,
 * 48 tools). Subset covers the actions agents most often use: search, read, create,
 * update, database ops, and block/content writes.
 *
 * @see https://docs.composio.dev/toolkits/notion
 */
export const NOTION_STUB_TOOLS: StubToolkitTool[] = [
  {
    slug: "NOTION_SEARCH_NOTION_PAGE",
    name: "Search Notion pages and databases",
    description:
      "Searches Notion pages and databases by title; empty query lists accessible items.",
  },
  {
    slug: "NOTION_FETCH_DATA",
    name: "Fetch Notion Data",
    description:
      "Fetches pages and/or databases from the workspace with minimal metadata.",
  },
  {
    slug: "NOTION_RETRIEVE_PAGE",
    name: "Retrieve page",
    description: "Retrieves a Notion page by ID.",
  },
  {
    slug: "NOTION_GET_PAGE_MARKDOWN",
    name: "Get page markdown",
    description: "Returns a Notion page as markdown text.",
  },
  {
    slug: "NOTION_FETCH_BLOCK_CONTENTS",
    name: "Fetch Notion Block Children",
    description: "Lists direct child blocks for a page or block.",
  },
  {
    slug: "NOTION_CREATE_NOTION_PAGE",
    name: "Create Notion page",
    description: "Creates a new page under a parent page or database.",
  },
  {
    slug: "NOTION_APPEND_TEXT_BLOCKS",
    name: "Append text blocks",
    description: "Appends paragraphs, headings, and list blocks to a page.",
  },
  {
    slug: "NOTION_UPDATE_PAGE",
    name: "Update page",
    description: "Updates page properties, icon, cover, or archive state.",
  },
  {
    slug: "NOTION_ARCHIVE_NOTION_PAGE",
    name: "Archive Notion Page",
    description: "Archives or restores a Notion page.",
  },
  {
    slug: "NOTION_FETCH_DATABASE",
    name: "Fetch Database",
    description: "Fetches database schema and metadata by database ID.",
  },
  {
    slug: "NOTION_QUERY_DATABASE",
    name: "Query database",
    description: "Queries rows in a Notion database with filters and sorts.",
  },
  {
    slug: "NOTION_INSERT_ROW_DATABASE",
    name: "Insert row database",
    description: "Creates a new row (page) in a Notion database.",
  },
  {
    slug: "NOTION_UPDATE_ROW_DATABASE",
    name: "Update row database",
    description: "Updates properties on an existing database row.",
  },
  {
    slug: "NOTION_CREATE_DATABASE",
    name: "Create Notion Database",
    description: "Creates a database as a subpage under a parent page.",
  },
  {
    slug: "NOTION_DELETE_BLOCK",
    name: "Delete a block",
    description: "Archives a block, page, or database by ID.",
  },
  {
    slug: "NOTION_LIST_USERS",
    name: "List users",
    description: "Lists users in the Notion workspace.",
  },
];

const STUB_TOOLKIT_TOOLS: Record<string, StubToolkitTool[]> = {
  notion: NOTION_STUB_TOOLS,
};

export function shouldUseStubToolkitTools(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.AGENT_TOOLS_CONNECTION_SEED === "1" ||
    process.env.CONNECT_STUB === "1"
  );
}

export function getStubToolkitTools(toolkit: string): StubToolkitTool[] {
  return STUB_TOOLKIT_TOOLS[toolkit.toLowerCase()] ?? [];
}

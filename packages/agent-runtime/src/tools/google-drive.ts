import type {
  RestConnectionDef,
  RestCallContext,
} from "../connections/rest-connection-def.js";
import { gapi } from "./google-fetch.js";
import { s, n, b, obj } from "./google-schema.js";

const FILES = "https://www.googleapis.com/drive/v3/files";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const DRIVES = "https://www.googleapis.com/drive/v3/drives";
const ABOUT = "https://www.googleapis.com/drive/v3/about";

const FILE_FIELDS =
  "id,name,mimeType,modifiedTime,createdTime,size,parents,trashed,starred,owners(displayName,emailAddress),webViewLink,iconLink";
const COMMENT_FIELDS =
  "comments(id,content,author(displayName),createdTime,resolved,replies(id,content,author(displayName),createdTime)),nextPageToken";
const PERMISSION_FIELDS =
  "permissions(id,type,role,emailAddress,domain,displayName)";

const FOLDER_MIME = "application/vnd.google-apps.folder";

/** Multipart upload (metadata + media) used by create/update with content. */
async function multipartUpload(
  token: string,
  method: "POST" | "PATCH",
  url: string,
  metadata: Record<string, unknown>,
  content: string,
  mimeType: string,
): Promise<unknown> {
  const boundary = "ssota-drive-boundary";
  const body =
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n` +
    `${content}\r\n` +
    `--${boundary}--`;
  const res = await fetch(`${url}?uploadType=multipart&fields=${FILE_FIELDS}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Google API ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

function splitIds(value: unknown): string[] | undefined {
  if (!value) return undefined;
  return String(value)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

// ── Execute dispatcher ───────────────────────────────────────────────────────

async function execute(
  toolName: string,
  args: unknown,
  ctx: RestCallContext,
): Promise<unknown> {
  const a = (args ?? {}) as Record<string, unknown>;
  const t = ctx.token;

  switch (toolName) {
    // ── Files: read ────────────────────────────────────────────────────────
    case "drive_search_files": {
      const raw = (a.q as string) ?? "";
      const q =
        raw && !/[:=]|contains|fullText|mimeType|name\s|trashed/.test(raw)
          ? `fullText contains '${raw.replace(/'/g, "\\'")}'`
          : raw;
      return gapi(t, "GET", FILES, {
        query: {
          q: q || undefined,
          pageSize: (a.pageSize as number) ?? 20,
          pageToken: a.pageToken as string,
          fields: `files(${FILE_FIELDS}),nextPageToken`,
          orderBy: (a.orderBy as string) ?? "modifiedTime desc",
          includeItemsFromAllDrives: true,
          supportsAllDrives: true,
          ...(a.driveId
            ? { driveId: a.driveId as string, corpora: "drive" }
            : {}),
        },
      });
    }

    case "drive_get_file":
      return gapi(t, "GET", `${FILES}/${a.fileId as string}`, {
        query: { fields: FILE_FIELDS, supportsAllDrives: true },
      });

    case "drive_download_file": {
      // Raw media for non-Google-native files (text/binary).
      const res = await fetch(
        `${FILES}/${a.fileId as string}?alt=media&supportsAllDrives=true`,
        { headers: { Authorization: `Bearer ${t}` } },
      );
      if (!res.ok) {
        throw new Error(`Google API ${res.status}: ${await res.text()}`);
      }
      return { content: await res.text() };
    }

    case "drive_export_file": {
      const mimeType = (a.mimeType as string) ?? "text/plain";
      const res = await fetch(
        `${FILES}/${a.fileId as string}/export?mimeType=${encodeURIComponent(mimeType)}`,
        { headers: { Authorization: `Bearer ${t}` } },
      );
      if (!res.ok) {
        throw new Error(`Google API ${res.status}: ${await res.text()}`);
      }
      return { mimeType, content: await res.text() };
    }

    case "drive_get_about":
      return gapi(t, "GET", ABOUT, {
        query: { fields: "storageQuota,user,maxImportSizes,maxUploadSize" },
      });

    // ── Files: write ───────────────────────────────────────────────────────
    case "drive_create_file": {
      const metadata: Record<string, unknown> = {
        name: a.name as string,
        ...(a.mimeType ? { mimeType: a.mimeType as string } : {}),
        ...(splitIds(a.parents) ? { parents: splitIds(a.parents) } : {}),
      };
      return multipartUpload(
        t,
        "POST",
        UPLOAD,
        metadata,
        (a.content as string) ?? "",
        (a.mimeType as string) ?? "text/plain",
      );
    }

    case "drive_create_folder":
      return gapi(t, "POST", FILES, {
        query: { fields: FILE_FIELDS, supportsAllDrives: true },
        body: {
          name: a.name as string,
          mimeType: FOLDER_MIME,
          ...(splitIds(a.parents) ? { parents: splitIds(a.parents) } : {}),
        },
      });

    case "drive_update_file": {
      // Metadata update — rename, (un)trash, star, and move via parents.
      const metadata: Record<string, unknown> = {
        ...(a.name ? { name: a.name as string } : {}),
        ...(a.trashed !== undefined ? { trashed: a.trashed as boolean } : {}),
        ...(a.starred !== undefined ? { starred: a.starred as boolean } : {}),
      };
      return gapi(t, "PATCH", `${FILES}/${a.fileId as string}`, {
        query: {
          fields: FILE_FIELDS,
          supportsAllDrives: true,
          addParents: splitIds(a.addParents),
          removeParents: splitIds(a.removeParents),
        },
        body: metadata,
      });
    }

    case "drive_update_file_content":
      return multipartUpload(
        t,
        "PATCH",
        `${UPLOAD}/${a.fileId as string}`,
        a.name ? { name: a.name as string } : {},
        (a.content as string) ?? "",
        (a.mimeType as string) ?? "text/plain",
      );

    case "drive_copy_file":
      return gapi(t, "POST", `${FILES}/${a.fileId as string}/copy`, {
        query: { fields: FILE_FIELDS, supportsAllDrives: true },
        body: {
          ...(a.name ? { name: a.name as string } : {}),
          ...(splitIds(a.parents) ? { parents: splitIds(a.parents) } : {}),
        },
      });

    case "drive_trash_file":
      return gapi(t, "PATCH", `${FILES}/${a.fileId as string}`, {
        query: { fields: FILE_FIELDS, supportsAllDrives: true },
        body: { trashed: true },
      });

    case "drive_delete_file":
      return gapi(t, "DELETE", `${FILES}/${a.fileId as string}`, {
        query: { supportsAllDrives: true },
      });

    case "drive_empty_trash":
      return gapi(t, "DELETE", `${FILES}/trash`);

    // ── Permissions (sharing) ──────────────────────────────────────────────
    case "drive_list_permissions":
      return gapi(t, "GET", `${FILES}/${a.fileId as string}/permissions`, {
        query: { fields: PERMISSION_FIELDS, supportsAllDrives: true },
      });

    case "drive_create_permission":
      return gapi(t, "POST", `${FILES}/${a.fileId as string}/permissions`, {
        query: {
          supportsAllDrives: true,
          sendNotificationEmail: a.sendNotificationEmail as boolean,
          transferOwnership: a.role === "owner" ? true : undefined,
        },
        body: {
          type: (a.type as string) ?? "user",
          role: (a.role as string) ?? "reader",
          ...(a.emailAddress ? { emailAddress: a.emailAddress as string } : {}),
          ...(a.domain ? { domain: a.domain as string } : {}),
        },
      });

    case "drive_update_permission":
      return gapi(
        t,
        "PATCH",
        `${FILES}/${a.fileId as string}/permissions/${a.permissionId as string}`,
        {
          query: { supportsAllDrives: true },
          body: { role: a.role as string },
        },
      );

    case "drive_delete_permission":
      return gapi(
        t,
        "DELETE",
        `${FILES}/${a.fileId as string}/permissions/${a.permissionId as string}`,
        { query: { supportsAllDrives: true } },
      );

    // ── Comments & replies ─────────────────────────────────────────────────
    case "drive_list_comments":
      return gapi(t, "GET", `${FILES}/${a.fileId as string}/comments`, {
        query: {
          fields: COMMENT_FIELDS,
          pageSize: (a.pageSize as number) ?? 20,
          pageToken: a.pageToken as string,
        },
      });

    case "drive_create_comment":
      return gapi(t, "POST", `${FILES}/${a.fileId as string}/comments`, {
        query: { fields: "id,content,author(displayName),createdTime" },
        body: { content: a.content as string },
      });

    case "drive_reply_comment":
      return gapi(
        t,
        "POST",
        `${FILES}/${a.fileId as string}/comments/${a.commentId as string}/replies`,
        {
          query: { fields: "id,content,author(displayName),createdTime" },
          body: {
            content: a.content as string,
            ...(a.action ? { action: a.action as string } : {}),
          },
        },
      );

    case "drive_delete_comment":
      return gapi(
        t,
        "DELETE",
        `${FILES}/${a.fileId as string}/comments/${a.commentId as string}`,
      );

    // ── Revisions ──────────────────────────────────────────────────────────
    case "drive_list_revisions":
      return gapi(t, "GET", `${FILES}/${a.fileId as string}/revisions`, {
        query: {
          fields:
            "revisions(id,modifiedTime,size,lastModifyingUser(displayName))",
        },
      });

    case "drive_get_revision":
      return gapi(
        t,
        "GET",
        `${FILES}/${a.fileId as string}/revisions/${a.revisionId as string}`,
      );

    // ── Shared drives ──────────────────────────────────────────────────────
    case "drive_list_drives":
      return gapi(t, "GET", DRIVES, {
        query: { pageSize: (a.pageSize as number) ?? 20 },
      });

    case "drive_get_drive":
      return gapi(t, "GET", `${DRIVES}/${a.driveId as string}`);

    default:
      throw new Error(`Unknown Drive tool: ${toolName}`);
  }
}

const drive: RestConnectionDef = {
  id: "drive",
  description:
    "Google Drive — files, folders, sharing, comments, revisions, shared drives, storage",
  provider: "google",
  execute,
  tools: [
    // Files: read
    {
      name: "drive_search_files",
      description:
        "Search Drive. Pass a plain phrase (full-text) or a Drive query expression. Includes shared drives.",
      inputSchema: obj(["q"], {
        q: s("Search phrase or Drive query (e.g. \"name contains 'budget'\")."),
        pageSize: n("Max files (1–100, default 20).", 1, 100, 20),
        pageToken: s("Page token from a previous response."),
        orderBy: s("Sort, e.g. 'modifiedTime desc', 'name', 'quotaBytesUsed'."),
        driveId: s("Restrict to a specific shared drive id (optional)."),
      }),
    },
    {
      name: "drive_get_file",
      description: "Get metadata for a single Drive file by id.",
      inputSchema: obj(["fileId"], { fileId: s("Drive file id.") }),
    },
    {
      name: "drive_download_file",
      description:
        "Download a non-Google-native file's content (text/binary stored as text). For Docs/Sheets/Slides use drive_export_file.",
      inputSchema: obj(["fileId"], { fileId: s("Drive file id.") }),
    },
    {
      name: "drive_export_file",
      description:
        "Export a Google-native doc (Docs/Sheets/Slides) as text or another mimeType.",
      inputSchema: obj(["fileId"], {
        fileId: s("File id of a Google-native document."),
        mimeType: s(
          "Export mimeType (default 'text/plain'; e.g. 'application/pdf', 'text/csv').",
        ),
      }),
    },
    {
      name: "drive_get_about",
      description: "Get storage quota and the authenticated user's info.",
      inputSchema: obj([], {}),
    },
    // Files: write
    {
      name: "drive_create_file",
      description: "Create a new file with inline text content.",
      inputSchema: obj(["name", "content"], {
        name: s("File name."),
        content: s("File text content."),
        mimeType: s("MIME type (default 'text/plain')."),
        parents: s("Comma-separated parent folder ids (optional)."),
      }),
    },
    {
      name: "drive_create_folder",
      description: "Create a new folder.",
      inputSchema: obj(["name"], {
        name: s("Folder name."),
        parents: s("Comma-separated parent folder ids (optional)."),
      }),
    },
    {
      name: "drive_update_file",
      description:
        "Update file metadata: rename, trash/untrash, star, or move (addParents/removeParents).",
      inputSchema: obj(["fileId"], {
        fileId: s("Drive file id."),
        name: s("New name (optional)."),
        trashed: b("Set trashed state."),
        starred: b("Set starred state."),
        addParents: s("Comma-separated folder ids to add (move into)."),
        removeParents: s("Comma-separated folder ids to remove (move out of)."),
      }),
    },
    {
      name: "drive_update_file_content",
      description: "Replace a file's content with new inline text.",
      inputSchema: obj(["fileId", "content"], {
        fileId: s("Drive file id."),
        content: s("New file text content."),
        mimeType: s("MIME type (default 'text/plain')."),
        name: s("Optionally rename while updating."),
      }),
    },
    {
      name: "drive_copy_file",
      description: "Make a copy of a file.",
      inputSchema: obj(["fileId"], {
        fileId: s("Source file id."),
        name: s("Name for the copy (optional)."),
        parents: s("Comma-separated parent folder ids for the copy (optional)."),
      }),
    },
    {
      name: "drive_trash_file",
      description: "Move a file to Trash (reversible).",
      inputSchema: obj(["fileId"], { fileId: s("Drive file id.") }),
    },
    {
      name: "drive_delete_file",
      description: "Permanently delete a file (NOT reversible).",
      inputSchema: obj(["fileId"], { fileId: s("Drive file id.") }),
    },
    {
      name: "drive_empty_trash",
      description: "Permanently delete all files in the user's Trash.",
      inputSchema: obj([], {}),
    },
    // Permissions
    {
      name: "drive_list_permissions",
      description: "List who a file is shared with.",
      inputSchema: obj(["fileId"], { fileId: s("Drive file id.") }),
    },
    {
      name: "drive_create_permission",
      description:
        "Share a file: grant a role to a user/group/domain/anyone.",
      inputSchema: obj(["fileId", "role"], {
        fileId: s("Drive file id."),
        role: s("owner | organizer | fileOrganizer | writer | commenter | reader."),
        type: s("user | group | domain | anyone (default user)."),
        emailAddress: s("Email for type user/group."),
        domain: s("Domain for type domain."),
        sendNotificationEmail: b("Send a notification email (default Google's)."),
      }),
    },
    {
      name: "drive_update_permission",
      description: "Change the role of an existing permission.",
      inputSchema: obj(["fileId", "permissionId", "role"], {
        fileId: s("Drive file id."),
        permissionId: s("Permission id (from drive_list_permissions)."),
        role: s("New role."),
      }),
    },
    {
      name: "drive_delete_permission",
      description: "Revoke a share (delete a permission).",
      inputSchema: obj(["fileId", "permissionId"], {
        fileId: s("Drive file id."),
        permissionId: s("Permission id."),
      }),
    },
    // Comments
    {
      name: "drive_list_comments",
      description: "List comments (and replies) on a file.",
      inputSchema: obj(["fileId"], {
        fileId: s("Drive file id."),
        pageSize: n("Max comments (1–100, default 20).", 1, 100, 20),
        pageToken: s("Page token from a previous response."),
      }),
    },
    {
      name: "drive_create_comment",
      description: "Add a comment to a file.",
      inputSchema: obj(["fileId", "content"], {
        fileId: s("Drive file id."),
        content: s("Comment text."),
      }),
    },
    {
      name: "drive_reply_comment",
      description: "Reply to a comment; optionally resolve/reopen it.",
      inputSchema: obj(["fileId", "commentId", "content"], {
        fileId: s("Drive file id."),
        commentId: s("Comment id."),
        content: s("Reply text."),
        action: s("'resolve' or 'reopen' (optional)."),
      }),
    },
    {
      name: "drive_delete_comment",
      description: "Delete a comment.",
      inputSchema: obj(["fileId", "commentId"], {
        fileId: s("Drive file id."),
        commentId: s("Comment id."),
      }),
    },
    // Revisions
    {
      name: "drive_list_revisions",
      description: "List a file's revision history.",
      inputSchema: obj(["fileId"], { fileId: s("Drive file id.") }),
    },
    {
      name: "drive_get_revision",
      description: "Get a single revision's metadata.",
      inputSchema: obj(["fileId", "revisionId"], {
        fileId: s("Drive file id."),
        revisionId: s("Revision id."),
      }),
    },
    // Shared drives
    {
      name: "drive_list_drives",
      description: "List shared drives the user is a member of.",
      inputSchema: obj([], {
        pageSize: n("Max drives (1–100, default 20).", 1, 100, 20),
      }),
    },
    {
      name: "drive_get_drive",
      description: "Get metadata for a shared drive.",
      inputSchema: obj(["driveId"], { driveId: s("Shared drive id.") }),
    },
  ],
};

export default drive;

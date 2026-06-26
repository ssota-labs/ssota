import type {
  RestConnectionDef,
  RestCallContext,
} from "../connections/rest-connection-def.js";
import { gapi, toBase64Url, fromBase64Url } from "./google-fetch.js";
import { s, n, b, arr, obj } from "./google-schema.js";

const BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

// ── Payload helpers ──────────────────────────────────────────────────────────

interface GmailHeader {
  name: string;
  value: string;
}
interface GmailPayloadPart {
  mimeType?: string;
  filename?: string;
  body?: { data?: string; size?: number; attachmentId?: string };
  parts?: GmailPayloadPart[];
  headers?: GmailHeader[];
}
interface GmailMessage {
  id: string;
  threadId?: string;
  snippet?: string;
  payload?: GmailPayloadPart;
  labelIds?: string[];
}

/** Recursively pull the best-effort text body out of a Gmail payload tree. */
function extractBody(part: GmailPayloadPart | undefined): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) {
    return fromBase64Url(part.body.data);
  }
  if (part.parts) {
    for (const child of part.parts) {
      const found = extractBody(child);
      if (found) return found;
    }
  }
  if (part.mimeType === "text/html" && part.body?.data) {
    return fromBase64Url(part.body.data);
  }
  return "";
}

/** Flatten the attachment parts (filename + attachmentId) of a message. */
function listAttachments(
  part: GmailPayloadPart | undefined,
  out: Array<{ filename: string; mimeType?: string; attachmentId: string; size?: number }> = [],
): Array<{ filename: string; mimeType?: string; attachmentId: string; size?: number }> {
  if (!part) return out;
  if (part.filename && part.body?.attachmentId) {
    out.push({
      filename: part.filename,
      mimeType: part.mimeType,
      attachmentId: part.body.attachmentId,
      size: part.body.size,
    });
  }
  for (const child of part.parts ?? []) listAttachments(child, out);
  return out;
}

function headerValue(payload: GmailPayloadPart | undefined, name: string): string {
  const h = payload?.headers?.find(
    (x) => x.name.toLowerCase() === name.toLowerCase(),
  );
  return h?.value ?? "";
}

function summarizeMessage(msg: GmailMessage) {
  return {
    id: msg.id,
    threadId: msg.threadId,
    snippet: msg.snippet,
    from: headerValue(msg.payload, "From"),
    to: headerValue(msg.payload, "To"),
    cc: headerValue(msg.payload, "Cc"),
    subject: headerValue(msg.payload, "Subject"),
    date: headerValue(msg.payload, "Date"),
    labelIds: msg.labelIds,
  };
}

/** Build an RFC 822 message and encode it for messages/send & drafts. */
function buildRawMessage(
  a: Record<string, unknown>,
  extraHeaders?: Record<string, string>,
): string {
  const lines: string[] = [];
  if (a.from) lines.push(`From: ${a.from as string}`);
  lines.push(`To: ${a.to as string}`);
  if (a.cc) lines.push(`Cc: ${a.cc as string}`);
  if (a.bcc) lines.push(`Bcc: ${a.bcc as string}`);
  lines.push(`Subject: ${(a.subject as string) ?? ""}`);
  for (const [k, v] of Object.entries(extraHeaders ?? {})) {
    if (v) lines.push(`${k}: ${v}`);
  }
  lines.push("MIME-Version: 1.0");
  const contentType = a.html
    ? 'text/html; charset="UTF-8"'
    : 'text/plain; charset="UTF-8"';
  lines.push(`Content-Type: ${contentType}`);
  lines.push("");
  lines.push((a.body as string) ?? "");
  return toBase64Url(lines.join("\r\n"));
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
    // ── Messages: read ─────────────────────────────────────────────────────
    case "gmail_search_messages": {
      const list = (await gapi(t, "GET", `${BASE}/messages`, {
        query: {
          q: a.q as string,
          maxResults: (a.maxResults as number) ?? 20,
          pageToken: a.pageToken as string,
          labelIds: a.labelIds as string[],
          includeSpamTrash: a.includeSpamTrash as boolean,
        },
      })) as {
        messages?: Array<{ id: string }>;
        nextPageToken?: string;
        resultSizeEstimate?: number;
      };
      const ids = (list.messages ?? []).map((m) => m.id);
      const messages = await Promise.all(
        ids.map(async (id) => {
          const msg = (await gapi(t, "GET", `${BASE}/messages/${id}`, {
            query: {
              format: "metadata",
              metadataHeaders: ["From", "To", "Cc", "Subject", "Date"],
            },
          })) as GmailMessage;
          return summarizeMessage(msg);
        }),
      );
      return {
        messages,
        nextPageToken: list.nextPageToken,
        resultSizeEstimate: list.resultSizeEstimate,
      };
    }

    case "gmail_get_message": {
      const msg = (await gapi(t, "GET", `${BASE}/messages/${a.id as string}`, {
        query: { format: (a.format as string) ?? "full" },
      })) as GmailMessage;
      return {
        ...summarizeMessage(msg),
        body: extractBody(msg.payload),
        attachments: listAttachments(msg.payload),
      };
    }

    case "gmail_get_attachment":
      return gapi(
        t,
        "GET",
        `${BASE}/messages/${a.messageId as string}/attachments/${a.attachmentId as string}`,
      );

    case "gmail_get_profile":
      return gapi(t, "GET", `${BASE}/profile`);

    case "gmail_list_history":
      return gapi(t, "GET", `${BASE}/history`, {
        query: {
          startHistoryId: a.startHistoryId as string,
          maxResults: (a.maxResults as number) ?? 100,
          pageToken: a.pageToken as string,
          labelId: a.labelId as string,
        },
      });

    // ── Messages: compose / send ───────────────────────────────────────────
    case "gmail_send_message":
      return gapi(t, "POST", `${BASE}/messages/send`, {
        body: {
          raw: buildRawMessage(a),
          ...(a.threadId ? { threadId: a.threadId as string } : {}),
        },
      });

    case "gmail_reply_message": {
      // Fetch the original to thread the reply (Subject, Message-ID, References).
      const orig = (await gapi(
        t,
        "GET",
        `${BASE}/messages/${a.messageId as string}`,
        {
          query: {
            format: "metadata",
            metadataHeaders: ["From", "Subject", "Message-ID", "References"],
          },
        },
      )) as GmailMessage;
      const origSubject = headerValue(orig.payload, "Subject");
      const messageId = headerValue(orig.payload, "Message-ID");
      const references = headerValue(orig.payload, "References");
      const replyArgs = {
        ...a,
        to: a.to ?? headerValue(orig.payload, "From"),
        subject: /^re:/i.test(origSubject) ? origSubject : `Re: ${origSubject}`,
      };
      return gapi(t, "POST", `${BASE}/messages/send`, {
        body: {
          raw: buildRawMessage(replyArgs, {
            "In-Reply-To": messageId,
            References: [references, messageId].filter(Boolean).join(" "),
          }),
          threadId: orig.threadId,
        },
      });
    }

    // ── Messages: labels / state ───────────────────────────────────────────
    case "gmail_modify_message":
      return gapi(t, "POST", `${BASE}/messages/${a.id as string}/modify`, {
        body: {
          addLabelIds: (a.addLabelIds as string[]) ?? [],
          removeLabelIds: (a.removeLabelIds as string[]) ?? [],
        },
      });

    case "gmail_batch_modify_messages":
      return gapi(t, "POST", `${BASE}/messages/batchModify`, {
        body: {
          ids: a.ids as string[],
          addLabelIds: (a.addLabelIds as string[]) ?? [],
          removeLabelIds: (a.removeLabelIds as string[]) ?? [],
        },
      });

    case "gmail_mark_read":
      return gapi(t, "POST", `${BASE}/messages/${a.id as string}/modify`, {
        body: { removeLabelIds: ["UNREAD"] },
      });

    case "gmail_mark_unread":
      return gapi(t, "POST", `${BASE}/messages/${a.id as string}/modify`, {
        body: { addLabelIds: ["UNREAD"] },
      });

    case "gmail_trash_message":
      return gapi(t, "POST", `${BASE}/messages/${a.id as string}/trash`);

    case "gmail_untrash_message":
      return gapi(t, "POST", `${BASE}/messages/${a.id as string}/untrash`);

    // ── Threads ────────────────────────────────────────────────────────────
    case "gmail_list_threads":
      return gapi(t, "GET", `${BASE}/threads`, {
        query: {
          q: a.q as string,
          maxResults: (a.maxResults as number) ?? 20,
          pageToken: a.pageToken as string,
          labelIds: a.labelIds as string[],
          includeSpamTrash: a.includeSpamTrash as boolean,
        },
      });

    case "gmail_get_thread": {
      const thread = (await gapi(
        t,
        "GET",
        `${BASE}/threads/${a.id as string}`,
        { query: { format: (a.format as string) ?? "full" } },
      )) as { id: string; messages?: GmailMessage[] };
      return {
        id: thread.id,
        messages: (thread.messages ?? []).map((m) => ({
          ...summarizeMessage(m),
          body: extractBody(m.payload),
        })),
      };
    }

    case "gmail_modify_thread":
      return gapi(t, "POST", `${BASE}/threads/${a.id as string}/modify`, {
        body: {
          addLabelIds: (a.addLabelIds as string[]) ?? [],
          removeLabelIds: (a.removeLabelIds as string[]) ?? [],
        },
      });

    case "gmail_trash_thread":
      return gapi(t, "POST", `${BASE}/threads/${a.id as string}/trash`);

    case "gmail_untrash_thread":
      return gapi(t, "POST", `${BASE}/threads/${a.id as string}/untrash`);

    // ── Drafts ─────────────────────────────────────────────────────────────
    case "gmail_list_drafts":
      return gapi(t, "GET", `${BASE}/drafts`, {
        query: {
          q: a.q as string,
          maxResults: (a.maxResults as number) ?? 20,
          pageToken: a.pageToken as string,
        },
      });

    case "gmail_get_draft":
      return gapi(t, "GET", `${BASE}/drafts/${a.id as string}`, {
        query: { format: (a.format as string) ?? "full" },
      });

    case "gmail_create_draft":
      return gapi(t, "POST", `${BASE}/drafts`, {
        body: {
          message: {
            raw: buildRawMessage(a),
            ...(a.threadId ? { threadId: a.threadId as string } : {}),
          },
        },
      });

    case "gmail_update_draft":
      return gapi(t, "PUT", `${BASE}/drafts/${a.id as string}`, {
        body: { message: { raw: buildRawMessage(a) } },
      });

    case "gmail_send_draft":
      return gapi(t, "POST", `${BASE}/drafts/send`, {
        body: { id: a.id as string },
      });

    case "gmail_delete_draft":
      return gapi(t, "DELETE", `${BASE}/drafts/${a.id as string}`);

    // ── Labels ─────────────────────────────────────────────────────────────
    case "gmail_list_labels":
      return gapi(t, "GET", `${BASE}/labels`);

    case "gmail_get_label":
      return gapi(t, "GET", `${BASE}/labels/${a.id as string}`);

    case "gmail_create_label":
      return gapi(t, "POST", `${BASE}/labels`, {
        body: {
          name: a.name as string,
          labelListVisibility:
            (a.labelListVisibility as string) ?? "labelShow",
          messageListVisibility:
            (a.messageListVisibility as string) ?? "show",
        },
      });

    case "gmail_update_label":
      return gapi(t, "PATCH", `${BASE}/labels/${a.id as string}`, {
        body: {
          ...(a.name ? { name: a.name as string } : {}),
          ...(a.labelListVisibility
            ? { labelListVisibility: a.labelListVisibility as string }
            : {}),
          ...(a.messageListVisibility
            ? { messageListVisibility: a.messageListVisibility as string }
            : {}),
        },
      });

    case "gmail_delete_label":
      return gapi(t, "DELETE", `${BASE}/labels/${a.id as string}`);

    // ── Settings: filters ──────────────────────────────────────────────────
    case "gmail_list_filters":
      return gapi(t, "GET", `${BASE}/settings/filters`);

    case "gmail_create_filter":
      return gapi(t, "POST", `${BASE}/settings/filters`, {
        body: {
          criteria: {
            ...(a.from ? { from: a.from as string } : {}),
            ...(a.to ? { to: a.to as string } : {}),
            ...(a.subject ? { subject: a.subject as string } : {}),
            ...(a.query ? { query: a.query as string } : {}),
            ...(a.hasAttachment ? { hasAttachment: true } : {}),
          },
          action: {
            ...(a.addLabelIds
              ? { addLabelIds: a.addLabelIds as string[] }
              : {}),
            ...(a.removeLabelIds
              ? { removeLabelIds: a.removeLabelIds as string[] }
              : {}),
            ...(a.forward ? { forward: a.forward as string } : {}),
          },
        },
      });

    case "gmail_delete_filter":
      return gapi(t, "DELETE", `${BASE}/settings/filters/${a.id as string}`);

    // ── Settings: vacation responder ───────────────────────────────────────
    case "gmail_get_vacation":
      return gapi(t, "GET", `${BASE}/settings/vacation`);

    case "gmail_update_vacation":
      return gapi(t, "PUT", `${BASE}/settings/vacation`, {
        body: {
          enableAutoReply: (a.enableAutoReply as boolean) ?? false,
          ...(a.responseSubject
            ? { responseSubject: a.responseSubject as string }
            : {}),
          ...(a.responseBody
            ? { responseBodyPlainText: a.responseBody as string }
            : {}),
          ...(a.restrictToContacts !== undefined
            ? { restrictToContacts: a.restrictToContacts as boolean }
            : {}),
        },
      });

    default:
      throw new Error(`Unknown Gmail tool: ${toolName}`);
  }
}

// ── Reusable arg fragments ───────────────────────────────────────────────────

const COMPOSE_PROPS = {
  to: s("Recipient email address (comma-separate multiple)."),
  subject: s("Email subject line."),
  body: s("Email body."),
  cc: s("Cc recipients (comma-separated)."),
  bcc: s("Bcc recipients (comma-separated)."),
  from: s("From address (optional; must be a verified send-as alias)."),
  html: b("If true, send body as text/html instead of text/plain."),
};

const gmail: RestConnectionDef = {
  id: "gmail",
  description:
    "Gmail — messages, threads, drafts, labels, filters, vacation responder, attachments",
  provider: "google",
  execute,
  tools: [
    // Messages: read
    {
      name: "gmail_search_messages",
      description:
        "Search Gmail using Gmail query syntax (e.g. 'from:alice subject:invoice newer_than:7d is:unread'). Returns message metadata + snippets.",
      inputSchema: obj(["q"], {
        q: s("Gmail search query (Gmail search operators supported)."),
        maxResults: n("Max messages (1–50, default 20).", 1, 50, 20),
        pageToken: s("Page token from a previous response."),
        labelIds: arr("Restrict to these label ids."),
        includeSpamTrash: b("Include SPAM and TRASH (default false)."),
      }),
    },
    {
      name: "gmail_get_message",
      description:
        "Fetch a single message in full: headers, decoded text body, and attachment list.",
      inputSchema: obj(["id"], {
        id: s("Gmail message id."),
        format: s("full | metadata | minimal | raw (default full)."),
      }),
    },
    {
      name: "gmail_get_attachment",
      description:
        "Download an attachment's bytes (base64url) by messageId + attachmentId (from gmail_get_message).",
      inputSchema: obj(["messageId", "attachmentId"], {
        messageId: s("Message id."),
        attachmentId: s("Attachment id from the message's attachments list."),
      }),
    },
    {
      name: "gmail_get_profile",
      description:
        "Get the user's Gmail profile (email address, total messages/threads, history id).",
      inputSchema: obj([], {}),
    },
    {
      name: "gmail_list_history",
      description:
        "List mailbox change history since a startHistoryId (for incremental sync).",
      inputSchema: obj(["startHistoryId"], {
        startHistoryId: s("History id to list changes since."),
        maxResults: n("Max records (default 100).", 1, 500, 100),
        pageToken: s("Page token from a previous response."),
        labelId: s("Only return changes affecting this label."),
      }),
    },
    // Messages: compose
    {
      name: "gmail_send_message",
      description: "Send a new email. Set threadId to send within an existing thread.",
      inputSchema: obj(["to", "subject", "body"], {
        ...COMPOSE_PROPS,
        threadId: s("Thread id to send this message into (optional)."),
      }),
    },
    {
      name: "gmail_reply_message",
      description:
        "Reply to a message — auto-threads (sets In-Reply-To/References, Re: subject, recipient).",
      inputSchema: obj(["messageId", "body"], {
        messageId: s("Message id being replied to."),
        body: s("Reply body."),
        to: s("Override recipient (defaults to original sender)."),
        cc: s("Cc recipients (comma-separated)."),
        bcc: s("Bcc recipients (comma-separated)."),
        html: b("If true, send body as text/html."),
      }),
    },
    // Messages: labels / state
    {
      name: "gmail_modify_message",
      description: "Add and/or remove label ids on a single message.",
      inputSchema: obj(["id"], {
        id: s("Message id."),
        addLabelIds: arr("Label ids to add."),
        removeLabelIds: arr("Label ids to remove."),
      }),
    },
    {
      name: "gmail_batch_modify_messages",
      description: "Add/remove labels on many messages at once.",
      inputSchema: obj(["ids"], {
        ids: arr("Message ids to modify."),
        addLabelIds: arr("Label ids to add."),
        removeLabelIds: arr("Label ids to remove."),
      }),
    },
    {
      name: "gmail_mark_read",
      description: "Mark a message read (removes the UNREAD label).",
      inputSchema: obj(["id"], { id: s("Message id.") }),
    },
    {
      name: "gmail_mark_unread",
      description: "Mark a message unread (adds the UNREAD label).",
      inputSchema: obj(["id"], { id: s("Message id.") }),
    },
    {
      name: "gmail_trash_message",
      description: "Move a message to Trash.",
      inputSchema: obj(["id"], { id: s("Message id.") }),
    },
    {
      name: "gmail_untrash_message",
      description: "Remove a message from Trash.",
      inputSchema: obj(["id"], { id: s("Message id.") }),
    },
    // Threads
    {
      name: "gmail_list_threads",
      description: "Search Gmail threads (same query syntax as messages).",
      inputSchema: obj(["q"], {
        q: s("Gmail search query."),
        maxResults: n("Max threads (1–50, default 20).", 1, 50, 20),
        pageToken: s("Page token from a previous response."),
        labelIds: arr("Restrict to these label ids."),
        includeSpamTrash: b("Include SPAM and TRASH (default false)."),
      }),
    },
    {
      name: "gmail_get_thread",
      description: "Fetch a full thread with all messages and decoded bodies.",
      inputSchema: obj(["id"], {
        id: s("Thread id."),
        format: s("full | metadata | minimal (default full)."),
      }),
    },
    {
      name: "gmail_modify_thread",
      description: "Add/remove labels across all messages in a thread.",
      inputSchema: obj(["id"], {
        id: s("Thread id."),
        addLabelIds: arr("Label ids to add."),
        removeLabelIds: arr("Label ids to remove."),
      }),
    },
    {
      name: "gmail_trash_thread",
      description: "Move an entire thread to Trash.",
      inputSchema: obj(["id"], { id: s("Thread id.") }),
    },
    {
      name: "gmail_untrash_thread",
      description: "Remove an entire thread from Trash.",
      inputSchema: obj(["id"], { id: s("Thread id.") }),
    },
    // Drafts
    {
      name: "gmail_list_drafts",
      description: "List drafts (optionally filtered by query).",
      inputSchema: obj([], {
        q: s("Gmail search query (optional)."),
        maxResults: n("Max drafts (1–50, default 20).", 1, 50, 20),
        pageToken: s("Page token from a previous response."),
      }),
    },
    {
      name: "gmail_get_draft",
      description: "Fetch a single draft.",
      inputSchema: obj(["id"], {
        id: s("Draft id."),
        format: s("full | metadata | minimal | raw (default full)."),
      }),
    },
    {
      name: "gmail_create_draft",
      description: "Create a draft (not sent).",
      inputSchema: obj(["to", "subject", "body"], {
        ...COMPOSE_PROPS,
        threadId: s("Thread id to attach the draft to (optional)."),
      }),
    },
    {
      name: "gmail_update_draft",
      description: "Replace the contents of an existing draft.",
      inputSchema: obj(["id", "to", "subject", "body"], {
        id: s("Draft id."),
        ...COMPOSE_PROPS,
      }),
    },
    {
      name: "gmail_send_draft",
      description: "Send an existing draft by id.",
      inputSchema: obj(["id"], { id: s("Draft id.") }),
    },
    {
      name: "gmail_delete_draft",
      description: "Permanently delete a draft.",
      inputSchema: obj(["id"], { id: s("Draft id.") }),
    },
    // Labels
    {
      name: "gmail_list_labels",
      description: "List all labels.",
      inputSchema: obj([], {}),
    },
    {
      name: "gmail_get_label",
      description: "Get a single label (includes message/thread counts).",
      inputSchema: obj(["id"], { id: s("Label id.") }),
    },
    {
      name: "gmail_create_label",
      description: "Create a new label.",
      inputSchema: obj(["name"], {
        name: s("Label name (use '/' for nesting, e.g. 'Work/Clients')."),
        labelListVisibility: s("labelShow | labelShowIfUnread | labelHide."),
        messageListVisibility: s("show | hide."),
      }),
    },
    {
      name: "gmail_update_label",
      description: "Rename or change visibility of a label.",
      inputSchema: obj(["id"], {
        id: s("Label id."),
        name: s("New name (optional)."),
        labelListVisibility: s("labelShow | labelShowIfUnread | labelHide."),
        messageListVisibility: s("show | hide."),
      }),
    },
    {
      name: "gmail_delete_label",
      description: "Delete a label.",
      inputSchema: obj(["id"], { id: s("Label id.") }),
    },
    // Settings: filters
    {
      name: "gmail_list_filters",
      description: "List Gmail filters.",
      inputSchema: obj([], {}),
    },
    {
      name: "gmail_create_filter",
      description:
        "Create a filter: match on from/to/subject/query/hasAttachment, then apply/remove labels or forward.",
      inputSchema: obj([], {
        from: s("Match sender."),
        to: s("Match recipient."),
        subject: s("Match subject."),
        query: s("Match Gmail query (e.g. 'has:attachment larger:5M')."),
        hasAttachment: b("Match only messages with attachments."),
        addLabelIds: arr("Label ids to apply."),
        removeLabelIds: arr("Label ids to remove (e.g. INBOX to archive)."),
        forward: s("Forward matching mail to this verified address."),
      }),
    },
    {
      name: "gmail_delete_filter",
      description: "Delete a filter by id.",
      inputSchema: obj(["id"], { id: s("Filter id.") }),
    },
    // Settings: vacation
    {
      name: "gmail_get_vacation",
      description: "Get the vacation auto-responder settings.",
      inputSchema: obj([], {}),
    },
    {
      name: "gmail_update_vacation",
      description: "Enable or disable the vacation auto-responder.",
      inputSchema: obj(["enableAutoReply"], {
        enableAutoReply: b("Turn the auto-responder on/off."),
        responseSubject: s("Auto-reply subject."),
        responseBody: s("Auto-reply body (plain text)."),
        restrictToContacts: b("Only auto-reply to known contacts."),
      }),
    },
  ],
};

export default gmail;

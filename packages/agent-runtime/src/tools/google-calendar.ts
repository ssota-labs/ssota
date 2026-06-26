import type {
  RestConnectionDef,
  RestCallContext,
} from "../connections/rest-connection-def.js";
import { gapi } from "./google-fetch.js";
import { s, n, b, arr, obj } from "./google-schema.js";

const BASE = "https://www.googleapis.com/calendar/v3";

function calId(a: Record<string, unknown>): string {
  return encodeURIComponent((a.calendarId as string) ?? "primary");
}

/** Build a Calendar event time object — date-only (all-day) or RFC3339. */
function eventTime(value: string, timeZone?: string): Record<string, string> {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? { date: value }
    : { dateTime: value, ...(timeZone ? { timeZone } : {}) };
}

function attendeeList(value: unknown) {
  if (!value) return undefined;
  return String(value)
    .split(",")
    .map((e) => ({ email: e.trim() }))
    .filter((x) => x.email);
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
    // ── Calendar list (subscriptions) ──────────────────────────────────────
    case "calendar_list_calendars":
      return gapi(t, "GET", `${BASE}/users/me/calendarList`, {
        query: {
          fields:
            "items(id,summary,description,primary,accessRole,timeZone,backgroundColor,selected),nextPageToken",
          showHidden: a.showHidden as boolean,
        },
      });

    case "calendar_get_calendar_list_entry":
      return gapi(t, "GET", `${BASE}/users/me/calendarList/${calId(a)}`);

    case "calendar_add_calendar":
      return gapi(t, "POST", `${BASE}/users/me/calendarList`, {
        body: {
          id: a.calendarId as string,
          ...(a.colorId ? { colorId: a.colorId as string } : {}),
        },
      });

    case "calendar_update_calendar_list_entry":
      return gapi(t, "PATCH", `${BASE}/users/me/calendarList/${calId(a)}`, {
        body: {
          ...(a.colorId ? { colorId: a.colorId as string } : {}),
          ...(a.selected !== undefined ? { selected: a.selected as boolean } : {}),
          ...(a.summaryOverride
            ? { summaryOverride: a.summaryOverride as string }
            : {}),
        },
      });

    case "calendar_remove_calendar":
      return gapi(t, "DELETE", `${BASE}/users/me/calendarList/${calId(a)}`);

    // ── Calendars (the underlying calendar resource) ───────────────────────
    case "calendar_get_calendar":
      return gapi(t, "GET", `${BASE}/calendars/${calId(a)}`);

    case "calendar_create_calendar":
      return gapi(t, "POST", `${BASE}/calendars`, {
        body: {
          summary: a.summary as string,
          ...(a.description ? { description: a.description as string } : {}),
          ...(a.timeZone ? { timeZone: a.timeZone as string } : {}),
        },
      });

    case "calendar_update_calendar":
      return gapi(t, "PATCH", `${BASE}/calendars/${calId(a)}`, {
        body: {
          ...(a.summary ? { summary: a.summary as string } : {}),
          ...(a.description ? { description: a.description as string } : {}),
          ...(a.timeZone ? { timeZone: a.timeZone as string } : {}),
        },
      });

    case "calendar_delete_calendar":
      return gapi(t, "DELETE", `${BASE}/calendars/${calId(a)}`);

    case "calendar_clear_calendar":
      return gapi(t, "POST", `${BASE}/calendars/${calId(a)}/clear`);

    // ── Events: read ───────────────────────────────────────────────────────
    case "calendar_list_events":
      return gapi(t, "GET", `${BASE}/calendars/${calId(a)}/events`, {
        query: {
          timeMin: a.timeMin as string,
          timeMax: a.timeMax as string,
          q: a.q as string,
          maxResults: (a.maxResults as number) ?? 20,
          pageToken: a.pageToken as string,
          singleEvents: (a.singleEvents as boolean) ?? true,
          orderBy: (a.orderBy as string) ?? "startTime",
          showDeleted: a.showDeleted as boolean,
        },
      });

    case "calendar_get_event":
      return gapi(
        t,
        "GET",
        `${BASE}/calendars/${calId(a)}/events/${a.eventId as string}`,
      );

    case "calendar_list_event_instances":
      return gapi(
        t,
        "GET",
        `${BASE}/calendars/${calId(a)}/events/${a.eventId as string}/instances`,
        {
          query: {
            timeMin: a.timeMin as string,
            timeMax: a.timeMax as string,
            maxResults: (a.maxResults as number) ?? 20,
          },
        },
      );

    // ── Events: write ──────────────────────────────────────────────────────
    case "calendar_create_event": {
      const attendees = attendeeList(a.attendees);
      return gapi(t, "POST", `${BASE}/calendars/${calId(a)}/events`, {
        query: {
          sendUpdates: (a.sendUpdates as string) ?? "none",
          conferenceDataVersion: a.addMeet ? 1 : undefined,
        },
        body: {
          summary: a.summary as string,
          ...(a.description ? { description: a.description as string } : {}),
          ...(a.location ? { location: a.location as string } : {}),
          start: eventTime(a.start as string, a.timeZone as string),
          end: eventTime(a.end as string, a.timeZone as string),
          ...(attendees ? { attendees } : {}),
          ...(a.recurrence
            ? { recurrence: (a.recurrence as string[]) }
            : {}),
          ...(a.colorId ? { colorId: a.colorId as string } : {}),
          ...(a.addMeet
            ? {
                conferenceData: {
                  createRequest: { requestId: `ssota-${a.summary as string}` },
                },
              }
            : {}),
        },
      });
    }

    case "calendar_update_event": {
      const attendees = attendeeList(a.attendees);
      return gapi(
        t,
        "PATCH",
        `${BASE}/calendars/${calId(a)}/events/${a.eventId as string}`,
        {
          query: { sendUpdates: (a.sendUpdates as string) ?? "none" },
          body: {
            ...(a.summary ? { summary: a.summary as string } : {}),
            ...(a.description ? { description: a.description as string } : {}),
            ...(a.location ? { location: a.location as string } : {}),
            ...(a.start
              ? { start: eventTime(a.start as string, a.timeZone as string) }
              : {}),
            ...(a.end
              ? { end: eventTime(a.end as string, a.timeZone as string) }
              : {}),
            ...(attendees ? { attendees } : {}),
            ...(a.colorId ? { colorId: a.colorId as string } : {}),
          },
        },
      );
    }

    case "calendar_quick_add_event":
      return gapi(t, "POST", `${BASE}/calendars/${calId(a)}/events/quickAdd`, {
        query: {
          text: a.text as string,
          sendUpdates: (a.sendUpdates as string) ?? "none",
        },
      });

    case "calendar_move_event":
      return gapi(
        t,
        "POST",
        `${BASE}/calendars/${calId(a)}/events/${a.eventId as string}/move`,
        {
          query: {
            destination: a.destination as string,
            sendUpdates: (a.sendUpdates as string) ?? "none",
          },
        },
      );

    case "calendar_respond_event":
      // Set the authenticated user's responseStatus on an event via patch.
      return gapi(
        t,
        "PATCH",
        `${BASE}/calendars/${calId(a)}/events/${a.eventId as string}`,
        {
          query: { sendUpdates: "all" },
          body: {
            attendees: [
              {
                email: a.email as string,
                responseStatus: a.responseStatus as string,
              },
            ],
          },
        },
      );

    case "calendar_delete_event":
      return gapi(
        t,
        "DELETE",
        `${BASE}/calendars/${calId(a)}/events/${a.eventId as string}`,
        { query: { sendUpdates: (a.sendUpdates as string) ?? "none" } },
      );

    // ── ACL (calendar sharing) ─────────────────────────────────────────────
    case "calendar_list_acl":
      return gapi(t, "GET", `${BASE}/calendars/${calId(a)}/acl`);

    case "calendar_create_acl":
      return gapi(t, "POST", `${BASE}/calendars/${calId(a)}/acl`, {
        body: {
          role: (a.role as string) ?? "reader",
          scope: {
            type: (a.scopeType as string) ?? "user",
            ...(a.value ? { value: a.value as string } : {}),
          },
        },
      });

    case "calendar_delete_acl":
      return gapi(
        t,
        "DELETE",
        `${BASE}/calendars/${calId(a)}/acl/${a.ruleId as string}`,
      );

    // ── Free/busy & misc ───────────────────────────────────────────────────
    case "calendar_freebusy":
      return gapi(t, "POST", `${BASE}/freeBusy`, {
        body: {
          timeMin: a.timeMin as string,
          timeMax: a.timeMax as string,
          items: (
            String(a.calendarIds ?? "primary")
              .split(",")
              .map((id) => id.trim())
              .filter(Boolean)
          ).map((id) => ({ id })),
        },
      });

    case "calendar_get_colors":
      return gapi(t, "GET", `${BASE}/colors`);

    case "calendar_list_settings":
      return gapi(t, "GET", `${BASE}/users/me/settings`);

    default:
      throw new Error(`Unknown Calendar tool: ${toolName}`);
  }
}

const SEND_UPDATES = s(
  "Who to notify: 'all' | 'externalOnly' | 'none' (default none).",
);

const calendar: RestConnectionDef = {
  id: "calendar",
  description:
    "Google Calendar — calendars, events, recurring instances, free/busy, sharing (ACL), colors",
  provider: "google",
  execute,
  tools: [
    // Calendar list
    {
      name: "calendar_list_calendars",
      description: "List the calendars the user is subscribed to.",
      inputSchema: obj([], {
        showHidden: b("Include hidden calendars."),
      }),
    },
    {
      name: "calendar_get_calendar_list_entry",
      description: "Get a calendar list entry (color, access role, etc.).",
      inputSchema: obj([], {
        calendarId: s("Calendar id (default 'primary')."),
      }),
    },
    {
      name: "calendar_add_calendar",
      description: "Subscribe to an existing calendar by id.",
      inputSchema: obj(["calendarId"], {
        calendarId: s("Calendar id to subscribe to."),
        colorId: s("Color id (see calendar_get_colors)."),
      }),
    },
    {
      name: "calendar_update_calendar_list_entry",
      description: "Change a subscribed calendar's color/visibility/override.",
      inputSchema: obj([], {
        calendarId: s("Calendar id (default 'primary')."),
        colorId: s("Color id."),
        selected: b("Whether it shows in the UI."),
        summaryOverride: s("Custom display name."),
      }),
    },
    {
      name: "calendar_remove_calendar",
      description: "Unsubscribe from a calendar.",
      inputSchema: obj(["calendarId"], {
        calendarId: s("Calendar id to unsubscribe."),
      }),
    },
    // Calendars
    {
      name: "calendar_get_calendar",
      description: "Get metadata for a calendar resource.",
      inputSchema: obj([], {
        calendarId: s("Calendar id (default 'primary')."),
      }),
    },
    {
      name: "calendar_create_calendar",
      description: "Create a new secondary calendar.",
      inputSchema: obj(["summary"], {
        summary: s("Calendar name."),
        description: s("Description (optional)."),
        timeZone: s("IANA time zone, e.g. 'Asia/Seoul' (optional)."),
      }),
    },
    {
      name: "calendar_update_calendar",
      description: "Update a calendar's name/description/time zone.",
      inputSchema: obj([], {
        calendarId: s("Calendar id (default 'primary')."),
        summary: s("New name."),
        description: s("New description."),
        timeZone: s("New IANA time zone."),
      }),
    },
    {
      name: "calendar_delete_calendar",
      description: "Delete a secondary calendar (cannot delete 'primary').",
      inputSchema: obj(["calendarId"], { calendarId: s("Calendar id.") }),
    },
    {
      name: "calendar_clear_calendar",
      description: "Delete all events from the user's primary calendar.",
      inputSchema: obj([], {
        calendarId: s("Calendar id (default 'primary')."),
      }),
    },
    // Events: read
    {
      name: "calendar_list_events",
      description:
        "List events within an optional time window. Times are RFC3339 (e.g. '2026-06-26T00:00:00Z').",
      inputSchema: obj([], {
        calendarId: s("Calendar id (default 'primary')."),
        timeMin: s("Lower bound (inclusive) RFC3339 timestamp."),
        timeMax: s("Upper bound (exclusive) RFC3339 timestamp."),
        q: s("Free-text search over event fields."),
        maxResults: n("Max events (1–100, default 20).", 1, 100, 20),
        pageToken: s("Page token from a previous response."),
        singleEvents: b("Expand recurring events into instances (default true)."),
        orderBy: s("'startTime' (needs singleEvents) or 'updated'."),
        showDeleted: b("Include cancelled events."),
      }),
    },
    {
      name: "calendar_get_event",
      description: "Get a single event by id.",
      inputSchema: obj(["eventId"], {
        calendarId: s("Calendar id (default 'primary')."),
        eventId: s("Event id."),
      }),
    },
    {
      name: "calendar_list_event_instances",
      description: "List the instances of a recurring event.",
      inputSchema: obj(["eventId"], {
        calendarId: s("Calendar id (default 'primary')."),
        eventId: s("Recurring event id."),
        timeMin: s("Lower bound RFC3339 timestamp (optional)."),
        timeMax: s("Upper bound RFC3339 timestamp (optional)."),
        maxResults: n("Max instances (1–100, default 20).", 1, 100, 20),
      }),
    },
    // Events: write
    {
      name: "calendar_create_event",
      description:
        "Create an event. Use 'YYYY-MM-DD' for all-day or RFC3339 dateTime for timed events. Supports recurrence and Google Meet.",
      inputSchema: obj(["summary", "start", "end"], {
        calendarId: s("Calendar id (default 'primary')."),
        summary: s("Event title."),
        start: s("Start: 'YYYY-MM-DD' (all-day) or RFC3339 dateTime."),
        end: s("End: 'YYYY-MM-DD' (all-day) or RFC3339 dateTime."),
        timeZone: s("IANA time zone for timed events (e.g. 'Asia/Seoul')."),
        description: s("Event description."),
        location: s("Event location."),
        attendees: s("Comma-separated attendee emails."),
        recurrence: arr("RRULE strings, e.g. ['RRULE:FREQ=WEEKLY;COUNT=10']."),
        colorId: s("Event color id (see calendar_get_colors)."),
        addMeet: b("Attach a Google Meet conference link."),
        sendUpdates: SEND_UPDATES,
      }),
    },
    {
      name: "calendar_update_event",
      description: "Update fields on an existing event (only provided fields change).",
      inputSchema: obj(["eventId"], {
        calendarId: s("Calendar id (default 'primary')."),
        eventId: s("Event id."),
        summary: s("New title."),
        start: s("New start ('YYYY-MM-DD' or RFC3339)."),
        end: s("New end ('YYYY-MM-DD' or RFC3339)."),
        timeZone: s("IANA time zone."),
        description: s("New description."),
        location: s("New location."),
        attendees: s("Comma-separated attendee emails (replaces the list)."),
        colorId: s("Event color id."),
        sendUpdates: SEND_UPDATES,
      }),
    },
    {
      name: "calendar_quick_add_event",
      description:
        "Create an event from natural language, e.g. 'Lunch with Sam tomorrow 1pm'.",
      inputSchema: obj(["text"], {
        calendarId: s("Calendar id (default 'primary')."),
        text: s("Natural-language event description."),
        sendUpdates: SEND_UPDATES,
      }),
    },
    {
      name: "calendar_move_event",
      description: "Move an event to a different calendar.",
      inputSchema: obj(["eventId", "destination"], {
        calendarId: s("Source calendar id (default 'primary')."),
        eventId: s("Event id."),
        destination: s("Destination calendar id."),
        sendUpdates: SEND_UPDATES,
      }),
    },
    {
      name: "calendar_respond_event",
      description:
        "Set an attendee's RSVP (responseStatus) on an event: accepted | declined | tentative | needsAction.",
      inputSchema: obj(["eventId", "email", "responseStatus"], {
        calendarId: s("Calendar id (default 'primary')."),
        eventId: s("Event id."),
        email: s("Attendee email (usually the user's own)."),
        responseStatus: s("accepted | declined | tentative | needsAction."),
      }),
    },
    {
      name: "calendar_delete_event",
      description: "Delete an event.",
      inputSchema: obj(["eventId"], {
        calendarId: s("Calendar id (default 'primary')."),
        eventId: s("Event id."),
        sendUpdates: SEND_UPDATES,
      }),
    },
    // ACL
    {
      name: "calendar_list_acl",
      description: "List the access-control rules (who the calendar is shared with).",
      inputSchema: obj([], {
        calendarId: s("Calendar id (default 'primary')."),
      }),
    },
    {
      name: "calendar_create_acl",
      description: "Share a calendar: grant a role to a user/group/domain.",
      inputSchema: obj(["value"], {
        calendarId: s("Calendar id (default 'primary')."),
        role: s("none | freeBusyReader | reader | writer | owner (default reader)."),
        scopeType: s("user | group | domain | default (default user)."),
        value: s("Email/domain for the scope."),
      }),
    },
    {
      name: "calendar_delete_acl",
      description: "Remove an access-control rule (unshare).",
      inputSchema: obj(["ruleId"], {
        calendarId: s("Calendar id (default 'primary')."),
        ruleId: s("ACL rule id (from calendar_list_acl)."),
      }),
    },
    // Free/busy & misc
    {
      name: "calendar_freebusy",
      description:
        "Query free/busy intervals across one or more calendars in a time window.",
      inputSchema: obj(["timeMin", "timeMax"], {
        timeMin: s("Window start, RFC3339."),
        timeMax: s("Window end, RFC3339."),
        calendarIds: s("Comma-separated calendar ids (default 'primary')."),
      }),
    },
    {
      name: "calendar_get_colors",
      description: "Get the available calendar/event color palette.",
      inputSchema: obj([], {}),
    },
    {
      name: "calendar_list_settings",
      description: "List the user's Calendar settings (time zone, format, etc.).",
      inputSchema: obj([], {}),
    },
  ],
};

export default calendar;

import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type { CredentialProvider } from "../credentials/provider.js";

export interface TwitterRestToolsInput {
  credentials: CredentialProvider;
  /** Vercel Connect API connector uid, e.g. "twitter/ssota". */
  connectorUid: string;
  projectId: string;
  accountId?: string;
  /** subject_user_id from account_connections — required for user-subject OAuth. */
  userId?: string;
}

/**
 * First-class AI SDK tools for X (Twitter) API v2, used when the Twitter API
 * connector is configured (TWITTER_API_CONNECTOR env var). These tools resolve
 * the user's OAuth token via the Vercel Connect credential provider at call
 * time, then call X API v2 REST directly — no MCP server required.
 *
 * Returns an empty ToolSet when the connector is unconfigured or when no
 * connected user account is found, so the caller can spread the result
 * unconditionally.
 */
export function createTwitterRestTools(input: TwitterRestToolsInput): ToolSet {
  if (!input.userId) return {};

  const getToken = async (): Promise<string> => {
    const cred = await input.credentials.getToken(input.connectorUid, {
      projectId: input.projectId,
      accountId: input.accountId,
      userId: input.userId,
    });
    if (!cred) {
      throw new Error(
        "Twitter not authorized. Use request_connection to connect your X account.",
      );
    }
    return cred.token;
  };

  return {
    twitter_post_tweet: tool({
      description:
        "Post a tweet to the connected X account. Optionally reply to an existing tweet.",
      inputSchema: z.object({
        text: z.string().max(280).describe("Tweet text (max 280 characters)."),
        replyToId: z
          .string()
          .optional()
          .describe("Tweet ID to reply to (optional)."),
      }),
      execute: async ({ text, replyToId }) => {
        const token = await getToken();
        const body: Record<string, unknown> = { text };
        if (replyToId) body.reply = { in_reply_to_tweet_id: replyToId };
        const res = await fetch("https://api.twitter.com/2/tweets", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            `Twitter API error ${res.status}: ${(err as { detail?: string }).detail ?? res.statusText}`,
          );
        }
        return res.json() as Promise<unknown>;
      },
    }),

    twitter_search_tweets: tool({
      description:
        "Search recent tweets (last 7 days) matching a query. Returns up to maxResults tweets.",
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            "Twitter search query, e.g. 'from:elonmusk' or '#nextjs lang:en'.",
          ),
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(10)
          .describe("Number of results to return (1–100, default 10)."),
      }),
      execute: async ({ query, maxResults }) => {
        const token = await getToken();
        const params = new URLSearchParams({
          query,
          max_results: String(maxResults),
          "tweet.fields": "created_at,author_id,public_metrics",
        });
        const res = await fetch(
          `https://api.twitter.com/2/tweets/search/recent?${params}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) {
          throw new Error(`Twitter search failed: ${res.statusText}`);
        }
        return res.json() as Promise<unknown>;
      },
    }),

    twitter_get_my_profile: tool({
      description:
        "Get the profile of the connected X account (username, name, bio, follower count).",
      inputSchema: z.object({}),
      execute: async () => {
        const token = await getToken();
        const res = await fetch(
          "https://api.twitter.com/2/users/me?user.fields=username,name,description,public_metrics,profile_image_url",
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) {
          throw new Error(`Twitter profile fetch failed: ${res.statusText}`);
        }
        return res.json() as Promise<unknown>;
      },
    }),

    twitter_get_timeline: tool({
      description:
        "Get the reverse-chronological home timeline of the connected X account.",
      inputSchema: z.object({
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(10)
          .describe("Number of tweets to return (1–100, default 10)."),
      }),
      execute: async ({ maxResults }) => {
        const token = await getToken();
        const meRes = await fetch("https://api.twitter.com/2/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!meRes.ok) {
          throw new Error(`Twitter user lookup failed: ${meRes.statusText}`);
        }
        const { data: me } = (await meRes.json()) as { data: { id: string } };
        const params = new URLSearchParams({
          max_results: String(maxResults),
          "tweet.fields": "created_at,author_id,public_metrics",
        });
        const res = await fetch(
          `https://api.twitter.com/2/users/${me.id}/timelines/reverse_chronological?${params}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) {
          throw new Error(`Twitter timeline fetch failed: ${res.statusText}`);
        }
        return res.json() as Promise<unknown>;
      },
    }),

    twitter_like_tweet: tool({
      description: "Like a tweet on behalf of the connected X account.",
      inputSchema: z.object({
        tweetId: z.string().describe("ID of the tweet to like."),
      }),
      execute: async ({ tweetId }) => {
        const token = await getToken();
        const meRes = await fetch("https://api.twitter.com/2/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!meRes.ok) {
          throw new Error(`Twitter user lookup failed: ${meRes.statusText}`);
        }
        const { data: me } = (await meRes.json()) as { data: { id: string } };
        const res = await fetch(
          `https://api.twitter.com/2/users/${me.id}/likes`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ tweet_id: tweetId }),
          },
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            `Twitter like failed: ${(err as { detail?: string }).detail ?? res.statusText}`,
          );
        }
        return res.json() as Promise<unknown>;
      },
    }),
  };
}

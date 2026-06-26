import { Client } from "@xdevplatform/xdk";
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
 * First-class AI SDK tools for X (Twitter) API v2 using @xdevplatform/xdk.
 * Tools are only registered when the connector is configured and the user has
 * an active connected account (userId present). Returns {} otherwise so the
 * caller can spread unconditionally.
 */
export function createTwitterRestTools(input: TwitterRestToolsInput): ToolSet {
  if (!input.userId) return {};

  const userId = input.userId;

  const getClient = async (): Promise<Client> => {
    const cred = await input.credentials.getToken(input.connectorUid, {
      projectId: input.projectId,
      accountId: input.accountId,
      userId,
    });
    if (!cred) {
      throw new Error(
        "Twitter not authorized. Use request_connection to connect your X account.",
      );
    }
    return new Client({ accessToken: cred.token });
  };

  const POST_FIELDS = {
    tweetFields: [
      "created_at",
      "author_id",
      "public_metrics",
      "entities",
      "conversation_id",
    ] as string[],
  };

  const USER_FIELDS = {
    userFields: [
      "username",
      "name",
      "description",
      "public_metrics",
      "profile_image_url",
      "created_at",
      "verified",
    ] as string[],
  };

  return {
    // ── Posts ──────────────────────────────────────────────────────────────

    twitter_post_tweet: tool({
      description:
        "Post a new tweet to the connected X account. Optionally reply to a tweet, quote-tweet, or specify media IDs.",
      inputSchema: z.object({
        text: z
          .string()
          .max(280)
          .describe("Tweet text, max 280 characters."),
        replyToId: z
          .string()
          .optional()
          .describe("Tweet ID to reply to (makes this a reply thread)."),
        quoteTweetId: z
          .string()
          .optional()
          .describe("Tweet ID to quote-tweet."),
      }),
      execute: async ({ text, replyToId, quoteTweetId }) => {
        const client = await getClient();
        return client.posts.create({
          text,
          ...(replyToId ? { reply: { inReplyToTweetId: replyToId } } : {}),
          ...(quoteTweetId ? { quoteTweetId } : {}),
        });
      },
    }),

    twitter_delete_tweet: tool({
      description: "Delete a tweet by ID. Only works on tweets posted by the connected account.",
      inputSchema: z.object({
        tweetId: z.string().describe("ID of the tweet to delete."),
      }),
      execute: async ({ tweetId }) => {
        const client = await getClient();
        return client.posts.delete(tweetId);
      },
    }),

    twitter_get_tweet: tool({
      description: "Get a single tweet by ID, including author info and engagement metrics.",
      inputSchema: z.object({
        tweetId: z.string().describe("ID of the tweet to fetch."),
      }),
      execute: async ({ tweetId }) => {
        const client = await getClient();
        return client.posts.getById(tweetId, {
          ...POST_FIELDS,
          expansions: ["author_id"],
          ...USER_FIELDS,
        });
      },
    }),

    twitter_search_tweets: tool({
      description:
        "Search recent tweets (last 7 days) by query. Supports operators like 'from:user', '#hashtag', 'lang:en', '-filter:retweets'.",
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            "X search query, e.g. 'from:elonmusk', '#nextjs lang:en -filter:retweets'.",
          ),
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(10)
          .describe("Number of results (1–100, default 10)."),
      }),
      execute: async ({ query, maxResults }) => {
        const client = await getClient();
        return client.posts.searchRecent(query, {
          maxResults,
          ...POST_FIELDS,
          expansions: ["author_id"],
          ...USER_FIELDS,
        });
      },
    }),

    // ── Timeline & Mentions ────────────────────────────────────────────────

    twitter_get_home_timeline: tool({
      description:
        "Get the reverse-chronological home timeline of the connected X account (tweets from accounts they follow).",
      inputSchema: z.object({
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(20)
          .describe("Number of tweets (1–100, default 20)."),
      }),
      execute: async ({ maxResults }) => {
        const client = await getClient();
        return client.users.getTimeline(userId, {
          maxResults,
          ...POST_FIELDS,
          expansions: ["author_id"],
          ...USER_FIELDS,
        });
      },
    }),

    twitter_get_mentions: tool({
      description: "Get recent tweets mentioning the connected X account.",
      inputSchema: z.object({
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(20)
          .describe("Number of results (1–100, default 20)."),
      }),
      execute: async ({ maxResults }) => {
        const client = await getClient();
        return client.users.getMentions(userId, {
          maxResults,
          ...POST_FIELDS,
          expansions: ["author_id"],
          ...USER_FIELDS,
        });
      },
    }),

    twitter_get_my_tweets: tool({
      description: "Get tweets posted by the connected X account.",
      inputSchema: z.object({
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(10)
          .describe("Number of tweets (1–100, default 10)."),
      }),
      execute: async ({ maxResults }) => {
        const client = await getClient();
        return client.users.getPosts(userId, {
          maxResults,
          ...POST_FIELDS,
        });
      },
    }),

    // ── User Profiles ──────────────────────────────────────────────────────

    twitter_get_my_profile: tool({
      description:
        "Get the profile of the connected X account: username, display name, bio, follower/following counts.",
      inputSchema: z.object({}),
      execute: async () => {
        const client = await getClient();
        return client.users.getMe({ ...USER_FIELDS });
      },
    }),

    twitter_get_user_profile: tool({
      description:
        "Get the public profile of any X user by their username (handle without @).",
      inputSchema: z.object({
        username: z
          .string()
          .describe("X username without @, e.g. 'elonmusk'."),
      }),
      execute: async ({ username }) => {
        const client = await getClient();
        return client.users.getByUsername(username, { ...USER_FIELDS });
      },
    }),

    twitter_get_followers: tool({
      description: "Get the followers of any X user by their user ID.",
      inputSchema: z.object({
        targetUserId: z
          .string()
          .describe(
            "User ID whose followers to retrieve. Use twitter_get_my_profile to get the connected account's ID.",
          ),
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(1000)
          .default(100)
          .describe("Number of followers (1–1000, default 100)."),
      }),
      execute: async ({ targetUserId, maxResults }) => {
        const client = await getClient();
        return client.users.getFollowers(targetUserId, {
          maxResults,
          ...USER_FIELDS,
        });
      },
    }),

    twitter_get_following: tool({
      description: "Get the accounts that a given X user is following.",
      inputSchema: z.object({
        targetUserId: z
          .string()
          .describe("User ID whose following list to retrieve."),
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(1000)
          .default(100)
          .describe("Number of results (1–1000, default 100)."),
      }),
      execute: async ({ targetUserId, maxResults }) => {
        const client = await getClient();
        return client.users.getFollowing(targetUserId, {
          maxResults,
          ...USER_FIELDS,
        });
      },
    }),

    // ── Engagement ─────────────────────────────────────────────────────────

    twitter_follow_user: tool({
      description: "Follow another X user on behalf of the connected account.",
      inputSchema: z.object({
        targetUserId: z
          .string()
          .describe("User ID to follow. Look up IDs via twitter_get_user_profile."),
      }),
      execute: async ({ targetUserId }) => {
        const client = await getClient();
        return client.users.followUser(userId, {
          body: { targetUserId },
        });
      },
    }),

    twitter_unfollow_user: tool({
      description: "Unfollow an X user on behalf of the connected account.",
      inputSchema: z.object({
        targetUserId: z
          .string()
          .describe("User ID to unfollow."),
      }),
      execute: async ({ targetUserId }) => {
        const client = await getClient();
        return client.users.unfollowUser(userId, targetUserId);
      },
    }),

    twitter_like_tweet: tool({
      description: "Like a tweet on behalf of the connected X account.",
      inputSchema: z.object({
        tweetId: z.string().describe("ID of the tweet to like."),
      }),
      execute: async ({ tweetId }) => {
        const client = await getClient();
        return client.users.likePost(userId, {
          body: { tweetId },
        });
      },
    }),

    twitter_unlike_tweet: tool({
      description: "Remove a like from a tweet on behalf of the connected account.",
      inputSchema: z.object({
        tweetId: z.string().describe("ID of the tweet to unlike."),
      }),
      execute: async ({ tweetId }) => {
        const client = await getClient();
        return client.users.unlikePost(userId, tweetId);
      },
    }),

    twitter_retweet: tool({
      description: "Repost (retweet) a tweet on behalf of the connected X account.",
      inputSchema: z.object({
        tweetId: z.string().describe("ID of the tweet to repost."),
      }),
      execute: async ({ tweetId }) => {
        const client = await getClient();
        return client.users.repostPost(userId, {
          body: { tweetId },
        });
      },
    }),

    twitter_unretweet: tool({
      description: "Undo a repost on behalf of the connected X account.",
      inputSchema: z.object({
        tweetId: z.string().describe("ID of the tweet to un-repost."),
      }),
      execute: async ({ tweetId }) => {
        const client = await getClient();
        return client.users.unrepostPost(userId, tweetId);
      },
    }),

    // ── Bookmarks ──────────────────────────────────────────────────────────

    twitter_get_bookmarks: tool({
      description: "Get the bookmarked tweets of the connected X account.",
      inputSchema: z.object({
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(20)
          .describe("Number of bookmarks (1–100, default 20)."),
      }),
      execute: async ({ maxResults }) => {
        const client = await getClient();
        return client.users.getBookmarks(userId, {
          maxResults,
          ...POST_FIELDS,
          expansions: ["author_id"],
          ...USER_FIELDS,
        });
      },
    }),

    twitter_bookmark_tweet: tool({
      description: "Add a tweet to the bookmarks of the connected X account.",
      inputSchema: z.object({
        tweetId: z.string().describe("ID of the tweet to bookmark."),
      }),
      execute: async ({ tweetId }) => {
        const client = await getClient();
        return client.users.createBookmark(userId, { tweetId });
      },
    }),

    twitter_remove_bookmark: tool({
      description: "Remove a tweet from bookmarks of the connected X account.",
      inputSchema: z.object({
        tweetId: z.string().describe("ID of the tweet to remove from bookmarks."),
      }),
      execute: async ({ tweetId }) => {
        const client = await getClient();
        return client.users.deleteBookmark(userId, tweetId);
      },
    }),

    // ── Direct Messages ────────────────────────────────────────────────────

    twitter_send_dm: tool({
      description:
        "Send a Direct Message to another X user from the connected account.",
      inputSchema: z.object({
        recipientId: z
          .string()
          .describe("User ID of the DM recipient. Look up via twitter_get_user_profile."),
        text: z.string().describe("Message text to send."),
      }),
      execute: async ({ recipientId, text }) => {
        const client = await getClient();
        return client.directMessages.createByParticipantId(recipientId, {
          body: { text },
        });
      },
    }),

    twitter_get_dms: tool({
      description:
        "Get recent Direct Message events for the connected X account.",
      inputSchema: z.object({
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(20)
          .describe("Number of DM events (1–100, default 20)."),
      }),
      execute: async ({ maxResults }) => {
        const client = await getClient();
        return client.directMessages.getEvents({ maxResults });
      },
    }),

    // ── Trends ────────────────────────────────────────────────────────────

    twitter_get_trends: tool({
      description:
        "Get trending topics on X. Uses WOEID (Where On Earth ID) — 1 = worldwide, 23424977 = United States, 23424868 = South Korea.",
      inputSchema: z.object({
        woeid: z
          .number()
          .int()
          .default(1)
          .describe(
            "WOEID location ID. 1=worldwide, 23424977=USA, 23424868=South Korea. Default 1.",
          ),
      }),
      execute: async ({ woeid }) => {
        const client = await getClient();
        return client.trends.getByWoeid(woeid);
      },
    }),
  };
}

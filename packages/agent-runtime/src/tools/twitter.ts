import { Client } from "@xdevplatform/xdk";
import type { RestConnectionDef, RestCallContext } from "../connections/rest-connection-def.js";
import { resolveTwitterUserId } from "./twitter-user-id.js";

// ── JSON Schema helpers ──────────────────────────────────────────────────────

const s = (description: string, extra?: Record<string, unknown>) => ({
  type: "string",
  description,
  ...extra,
});
const n = (description: string, min?: number, max?: number, def?: number) => ({
  type: "number",
  description,
  ...(min !== undefined ? { minimum: min } : {}),
  ...(max !== undefined ? { maximum: max } : {}),
  ...(def !== undefined ? { default: def } : {}),
});
const obj = (
  required: string[],
  properties: Record<string, unknown>,
): Record<string, unknown> => ({
  type: "object",
  properties,
  ...(required.length ? { required } : {}),
});

// ── Common field sets ────────────────────────────────────────────────────────

const POST_FIELDS = {
  tweetFields: ["created_at", "author_id", "public_metrics", "entities", "conversation_id"] as string[],
  expansions: ["author_id"] as string[],
  userFields: ["username", "name", "profile_image_url", "verified"] as string[],
};

const USER_FIELDS = {
  userFields: ["username", "name", "description", "public_metrics", "profile_image_url", "created_at", "verified"] as string[],
};

const MAX_RESULTS_OPT = n("Number of results (1–100, default 20).", 1, 100, 20);

// ── Execute dispatcher ───────────────────────────────────────────────────────

async function execute(toolName: string, args: unknown, ctx: RestCallContext): Promise<unknown> {
  const client = new Client({ accessToken: ctx.token });
  const a = (args ?? {}) as Record<string, unknown>;
  const uid = await resolveTwitterUserId(client, ctx.userId);

  switch (toolName) {
    // ── Posts ──────────────────────────────────────────────────────────────

    case "twitter_post_tweet":
      return client.posts.create({
        text: a.text as string,
        ...(a.replyToId ? { reply: { inReplyToTweetId: a.replyToId as string } } : {}),
        ...(a.quoteTweetId ? { quoteTweetId: a.quoteTweetId as string } : {}),
      });

    case "twitter_delete_tweet":
      return client.posts.delete(a.tweetId as string);

    case "twitter_get_tweet":
      return client.posts.getById(a.tweetId as string, { ...POST_FIELDS });

    case "twitter_search_tweets":
      return client.posts.searchRecent(a.query as string, {
        maxResults: (a.maxResults as number | undefined) ?? 10,
        ...POST_FIELDS,
      });

    case "twitter_get_tweet_likes":
      return client.posts.getLikingUsers(a.tweetId as string, {
        maxResults: (a.maxResults as number | undefined) ?? 20,
        ...USER_FIELDS,
      });

    case "twitter_get_tweet_retweets":
      return client.posts.getRepostedBy(a.tweetId as string, {
        maxResults: (a.maxResults as number | undefined) ?? 20,
        ...USER_FIELDS,
      });

    case "twitter_get_quote_tweets":
      return client.posts.getQuoted(a.tweetId as string, {
        maxResults: (a.maxResults as number | undefined) ?? 10,
        ...POST_FIELDS,
      });

    case "twitter_hide_reply":
      return client.posts.hideReply(a.tweetId as string, {
        body: { hidden: true },
      });

    case "twitter_unhide_reply":
      return client.posts.hideReply(a.tweetId as string, {
        body: { hidden: false },
      });

    // ── Timeline ───────────────────────────────────────────────────────────

    case "twitter_get_home_timeline":
      return client.users.getTimeline(uid, {
        maxResults: (a.maxResults as number | undefined) ?? 20,
        ...POST_FIELDS,
      });

    case "twitter_get_mentions":
      return client.users.getMentions(uid, {
        maxResults: (a.maxResults as number | undefined) ?? 20,
        ...POST_FIELDS,
      });

    case "twitter_get_my_tweets":
      return client.users.getPosts(uid, {
        maxResults: (a.maxResults as number | undefined) ?? 10,
        ...POST_FIELDS,
      });

    // ── User Profiles ──────────────────────────────────────────────────────

    case "twitter_get_my_profile":
      return client.users.getMe({ ...USER_FIELDS });

    case "twitter_get_user_profile":
      return client.users.getByUsername(a.username as string, { ...USER_FIELDS });

    case "twitter_get_followers":
      return client.users.getFollowers(a.userId as string, {
        maxResults: (a.maxResults as number | undefined) ?? 100,
        ...USER_FIELDS,
      });

    case "twitter_get_following":
      return client.users.getFollowing(a.userId as string, {
        maxResults: (a.maxResults as number | undefined) ?? 100,
        ...USER_FIELDS,
      });

    case "twitter_search_users":
      return client.users.search(a.query as string, {
        maxResults: (a.maxResults as number | undefined) ?? 10,
        ...USER_FIELDS,
      });

    case "twitter_get_liked_tweets":
      return client.users.getLikedPosts(a.userId as string, {
        maxResults: (a.maxResults as number | undefined) ?? 10,
        ...POST_FIELDS,
      });

    // ── Social Graph ───────────────────────────────────────────────────────

    case "twitter_follow_user":
      return client.users.followUser(uid, { body: { targetUserId: a.targetUserId as string } });

    case "twitter_unfollow_user":
      return client.users.unfollowUser(uid, a.targetUserId as string);

    case "twitter_mute_user":
      return client.users.muteUser(uid, { body: { targetUserId: a.targetUserId as string } });

    case "twitter_unmute_user":
      return client.users.unmuteUser(uid, a.targetUserId as string);

    case "twitter_get_muted":
      return client.users.getMuting(uid, {
        maxResults: (a.maxResults as number | undefined) ?? 100,
        ...USER_FIELDS,
      });

    case "twitter_get_blocked":
      return client.users.getBlocking(uid, {
        maxResults: (a.maxResults as number | undefined) ?? 100,
        ...USER_FIELDS,
      });

    // ── Engagement ─────────────────────────────────────────────────────────

    case "twitter_like_tweet":
      return client.users.likePost(uid, { body: { tweetId: a.tweetId as string } });

    case "twitter_unlike_tweet":
      return client.users.unlikePost(uid, a.tweetId as string);

    case "twitter_retweet":
      return client.users.repostPost(uid, { body: { tweetId: a.tweetId as string } });

    case "twitter_unretweet":
      return client.users.unrepostPost(uid, a.tweetId as string);

    // ── Bookmarks ──────────────────────────────────────────────────────────

    case "twitter_get_bookmarks":
      return client.users.getBookmarks(uid, {
        maxResults: (a.maxResults as number | undefined) ?? 20,
        ...POST_FIELDS,
      });

    case "twitter_bookmark_tweet":
      return client.users.createBookmark(uid, { tweetId: a.tweetId as string });

    case "twitter_remove_bookmark":
      return client.users.deleteBookmark(uid, a.tweetId as string);

    // ── Lists ──────────────────────────────────────────────────────────────

    case "twitter_get_my_lists":
      return client.users.getOwnedLists(uid, {
        maxResults: (a.maxResults as number | undefined) ?? 100,
      });

    case "twitter_create_list":
      return client.lists.create({
        body: {
          name: a.name as string,
          ...(a.description ? { description: a.description as string } : {}),
          ...(a.private !== undefined ? { private: a.private as boolean } : {}),
        },
      });

    case "twitter_delete_list":
      return client.lists.delete(a.listId as string);

    case "twitter_update_list":
      return client.lists.update(a.listId as string, {
        body: {
          ...(a.name ? { name: a.name as string } : {}),
          ...(a.description ? { description: a.description as string } : {}),
          ...(a.private !== undefined ? { private: a.private as boolean } : {}),
        },
      });

    case "twitter_get_list_tweets":
      return client.lists.getPosts(a.listId as string, {
        maxResults: (a.maxResults as number | undefined) ?? 20,
        ...POST_FIELDS,
      });

    case "twitter_get_list_members":
      return client.lists.getMembers(a.listId as string, {
        maxResults: (a.maxResults as number | undefined) ?? 100,
        ...USER_FIELDS,
      });

    case "twitter_add_list_member":
      return client.lists.addMember(a.listId as string, {
        body: { userId: a.targetUserId as string },
      });

    case "twitter_remove_list_member":
      return client.lists.removeMemberByUserId(a.listId as string, a.targetUserId as string);

    // ── Direct Messages ────────────────────────────────────────────────────

    case "twitter_send_dm":
      return client.directMessages.createByParticipantId(a.recipientId as string, {
        body: { text: a.text as string },
      });

    case "twitter_reply_dm":
      return client.directMessages.createByConversationId(a.conversationId as string, {
        body: { text: a.text as string },
      });

    case "twitter_get_dms":
      return client.directMessages.getEvents({
        maxResults: (a.maxResults as number | undefined) ?? 20,
      });

    case "twitter_get_dm_conversation":
      return client.directMessages.getEventsByConversationId(a.conversationId as string, {
        maxResults: (a.maxResults as number | undefined) ?? 20,
      });

    // ── Trends ────────────────────────────────────────────────────────────

    case "twitter_get_trends":
      return client.trends.getByWoeid((a.woeid as number | undefined) ?? 1);

    case "twitter_get_personalized_trends":
      return client.trends.getPersonalized();

    // ── Spaces ────────────────────────────────────────────────────────────

    case "twitter_search_spaces":
      return client.spaces.search(a.query as string, {
        maxResults: (a.maxResults as number | undefined) ?? 10,
      });

    default:
      throw new Error(`Unknown Twitter tool: ${toolName}`);
  }
}

// ── RestConnectionDef ────────────────────────────────────────────────────────

const twitter: RestConnectionDef = {
  id: "twitter",
  description: "X (Twitter) account — post, search, engage, DMs, lists, and trends",
  provider: "twitter",
  execute,
  tools: [
    // ── Posts ──────────────────────────────────────────────────────────────
    {
      name: "twitter_post_tweet",
      description: "Post a new tweet. Optionally reply to or quote-tweet another tweet.",
      inputSchema: obj(["text"], {
        text: s("Tweet text (max 280 characters)."),
        replyToId: s("Tweet ID to reply to — makes this a thread reply."),
        quoteTweetId: s("Tweet ID to quote-tweet."),
      }),
    },
    {
      name: "twitter_delete_tweet",
      description: "Delete a tweet posted by the connected account.",
      inputSchema: obj(["tweetId"], { tweetId: s("ID of the tweet to delete.") }),
    },
    {
      name: "twitter_get_tweet",
      description: "Get a tweet by ID, including author info and engagement metrics.",
      inputSchema: obj(["tweetId"], { tweetId: s("Tweet ID to look up.") }),
    },
    {
      name: "twitter_search_tweets",
      description: "Search tweets from the last 7 days. Supports operators: from:user, #hashtag, lang:en, -filter:retweets.",
      inputSchema: obj(["query"], {
        query: s("X search query, e.g. 'from:elonmusk lang:en -filter:retweets'."),
        maxResults: n("Number of results (1–100, default 10).", 1, 100, 10),
      }),
    },
    {
      name: "twitter_get_tweet_likes",
      description: "Get the list of users who liked a specific tweet.",
      inputSchema: obj(["tweetId"], {
        tweetId: s("Tweet ID to fetch liking users for."),
        maxResults: MAX_RESULTS_OPT,
      }),
    },
    {
      name: "twitter_get_tweet_retweets",
      description: "Get the list of users who retweeted a specific tweet.",
      inputSchema: obj(["tweetId"], {
        tweetId: s("Tweet ID to fetch retweeters for."),
        maxResults: MAX_RESULTS_OPT,
      }),
    },
    {
      name: "twitter_get_quote_tweets",
      description: "Get quote tweets for a specific tweet.",
      inputSchema: obj(["tweetId"], {
        tweetId: s("Tweet ID whose quote tweets to retrieve."),
        maxResults: n("Number of results (1–100, default 10).", 1, 100, 10),
      }),
    },
    {
      name: "twitter_hide_reply",
      description: "Hide a reply on a tweet posted by the connected account.",
      inputSchema: obj(["tweetId"], { tweetId: s("Tweet ID of the reply to hide.") }),
    },
    {
      name: "twitter_unhide_reply",
      description: "Un-hide a previously hidden reply.",
      inputSchema: obj(["tweetId"], { tweetId: s("Tweet ID of the reply to un-hide.") }),
    },

    // ── Timeline ───────────────────────────────────────────────────────────
    {
      name: "twitter_get_home_timeline",
      description: "Get the reverse-chronological home timeline (tweets from followed accounts).",
      inputSchema: obj([], { maxResults: MAX_RESULTS_OPT }),
    },
    {
      name: "twitter_get_mentions",
      description: "Get tweets that mention the connected X account.",
      inputSchema: obj([], { maxResults: MAX_RESULTS_OPT }),
    },
    {
      name: "twitter_get_my_tweets",
      description: "Get tweets posted by the connected X account.",
      inputSchema: obj([], { maxResults: n("Number of tweets (1–100, default 10).", 1, 100, 10) }),
    },

    // ── User Profiles ──────────────────────────────────────────────────────
    {
      name: "twitter_get_my_profile",
      description: "Get the profile of the connected X account: username, display name, bio, follower/following counts.",
      inputSchema: obj([], {}),
    },
    {
      name: "twitter_get_user_profile",
      description: "Get the public profile of any X user by their @username.",
      inputSchema: obj(["username"], { username: s("X username without @, e.g. 'elonmusk'.") }),
    },
    {
      name: "twitter_get_followers",
      description: "Get the followers of a user by their user ID.",
      inputSchema: obj(["userId"], {
        userId: s("User ID whose followers to list. Use twitter_get_my_profile for the connected account's ID."),
        maxResults: n("Number of results (1–1000, default 100).", 1, 1000, 100),
      }),
    },
    {
      name: "twitter_get_following",
      description: "Get the accounts a user is following.",
      inputSchema: obj(["userId"], {
        userId: s("User ID whose following list to retrieve."),
        maxResults: n("Number of results (1–1000, default 100).", 1, 1000, 100),
      }),
    },
    {
      name: "twitter_search_users",
      description: "Search for X users by query string (name, username, bio).",
      inputSchema: obj(["query"], {
        query: s("Search query, e.g. 'AI researcher'."),
        maxResults: n("Number of results (1–100, default 10).", 1, 100, 10),
      }),
    },
    {
      name: "twitter_get_liked_tweets",
      description: "Get tweets liked by a specific user.",
      inputSchema: obj(["userId"], {
        userId: s("User ID whose liked tweets to retrieve."),
        maxResults: n("Number of tweets (1–100, default 10).", 1, 100, 10),
      }),
    },

    // ── Social Graph ───────────────────────────────────────────────────────
    {
      name: "twitter_follow_user",
      description: "Follow a user on behalf of the connected account.",
      inputSchema: obj(["targetUserId"], { targetUserId: s("User ID to follow.") }),
    },
    {
      name: "twitter_unfollow_user",
      description: "Unfollow a user on behalf of the connected account.",
      inputSchema: obj(["targetUserId"], { targetUserId: s("User ID to unfollow.") }),
    },
    {
      name: "twitter_mute_user",
      description: "Mute a user so their tweets don't appear in the timeline.",
      inputSchema: obj(["targetUserId"], { targetUserId: s("User ID to mute.") }),
    },
    {
      name: "twitter_unmute_user",
      description: "Remove a mute from a user.",
      inputSchema: obj(["targetUserId"], { targetUserId: s("User ID to unmute.") }),
    },
    {
      name: "twitter_get_muted",
      description: "Get the list of users muted by the connected account.",
      inputSchema: obj([], { maxResults: n("Number of results (1–1000, default 100).", 1, 1000, 100) }),
    },
    {
      name: "twitter_get_blocked",
      description: "Get the list of users blocked by the connected account.",
      inputSchema: obj([], { maxResults: n("Number of results (1–1000, default 100).", 1, 1000, 100) }),
    },

    // ── Engagement ─────────────────────────────────────────────────────────
    {
      name: "twitter_like_tweet",
      description: "Like a tweet on behalf of the connected account.",
      inputSchema: obj(["tweetId"], { tweetId: s("Tweet ID to like.") }),
    },
    {
      name: "twitter_unlike_tweet",
      description: "Remove a like from a tweet.",
      inputSchema: obj(["tweetId"], { tweetId: s("Tweet ID to unlike.") }),
    },
    {
      name: "twitter_retweet",
      description: "Repost (retweet) a tweet on behalf of the connected account.",
      inputSchema: obj(["tweetId"], { tweetId: s("Tweet ID to repost.") }),
    },
    {
      name: "twitter_unretweet",
      description: "Undo a repost.",
      inputSchema: obj(["tweetId"], { tweetId: s("Tweet ID to un-repost.") }),
    },

    // ── Bookmarks ──────────────────────────────────────────────────────────
    {
      name: "twitter_get_bookmarks",
      description: "Get the bookmarked tweets of the connected account.",
      inputSchema: obj([], { maxResults: MAX_RESULTS_OPT }),
    },
    {
      name: "twitter_bookmark_tweet",
      description: "Add a tweet to the connected account's bookmarks.",
      inputSchema: obj(["tweetId"], { tweetId: s("Tweet ID to bookmark.") }),
    },
    {
      name: "twitter_remove_bookmark",
      description: "Remove a tweet from bookmarks.",
      inputSchema: obj(["tweetId"], { tweetId: s("Tweet ID to remove from bookmarks.") }),
    },

    // ── Lists ──────────────────────────────────────────────────────────────
    {
      name: "twitter_get_my_lists",
      description: "Get the X lists owned by the connected account.",
      inputSchema: obj([], { maxResults: n("Number of lists (1–100, default 100).", 1, 100, 100) }),
    },
    {
      name: "twitter_create_list",
      description: "Create a new X list.",
      inputSchema: obj(["name"], {
        name: s("List name."),
        description: s("List description (optional)."),
        private: { type: "boolean", description: "Make the list private. Default false." },
      }),
    },
    {
      name: "twitter_delete_list",
      description: "Delete an X list owned by the connected account.",
      inputSchema: obj(["listId"], { listId: s("ID of the list to delete.") }),
    },
    {
      name: "twitter_update_list",
      description: "Update the name, description, or privacy of an X list.",
      inputSchema: obj(["listId"], {
        listId: s("ID of the list to update."),
        name: s("New list name (optional)."),
        description: s("New list description (optional)."),
        private: { type: "boolean", description: "Set privacy status (optional)." },
      }),
    },
    {
      name: "twitter_get_list_tweets",
      description: "Get the timeline of tweets from an X list.",
      inputSchema: obj(["listId"], {
        listId: s("ID of the list."),
        maxResults: MAX_RESULTS_OPT,
      }),
    },
    {
      name: "twitter_get_list_members",
      description: "Get the members of an X list.",
      inputSchema: obj(["listId"], {
        listId: s("ID of the list."),
        maxResults: n("Number of results (1–100, default 100).", 1, 100, 100),
      }),
    },
    {
      name: "twitter_add_list_member",
      description: "Add a user to an X list.",
      inputSchema: obj(["listId", "targetUserId"], {
        listId: s("ID of the list."),
        targetUserId: s("User ID to add to the list."),
      }),
    },
    {
      name: "twitter_remove_list_member",
      description: "Remove a user from an X list.",
      inputSchema: obj(["listId", "targetUserId"], {
        listId: s("ID of the list."),
        targetUserId: s("User ID to remove from the list."),
      }),
    },

    // ── Direct Messages ────────────────────────────────────────────────────
    {
      name: "twitter_send_dm",
      description: "Send a Direct Message to another X user.",
      inputSchema: obj(["recipientId", "text"], {
        recipientId: s("User ID of the DM recipient. Look up via twitter_get_user_profile."),
        text: s("Message text."),
      }),
    },
    {
      name: "twitter_reply_dm",
      description: "Send a reply within an existing DM conversation.",
      inputSchema: obj(["conversationId", "text"], {
        conversationId: s("DM conversation ID from twitter_get_dms."),
        text: s("Message text."),
      }),
    },
    {
      name: "twitter_get_dms",
      description: "Get recent Direct Message events for the connected account.",
      inputSchema: obj([], { maxResults: MAX_RESULTS_OPT }),
    },
    {
      name: "twitter_get_dm_conversation",
      description: "Get messages in a specific DM conversation by conversation ID.",
      inputSchema: obj(["conversationId"], {
        conversationId: s("DM conversation ID."),
        maxResults: MAX_RESULTS_OPT,
      }),
    },

    // ── Trends ────────────────────────────────────────────────────────────
    {
      name: "twitter_get_trends",
      description: "Get trending topics by location (WOEID). 1=worldwide, 23424977=USA, 23424868=South Korea.",
      inputSchema: obj([], {
        woeid: n("WOEID location ID (default 1 = worldwide).", undefined, undefined, 1),
      }),
    },
    {
      name: "twitter_get_personalized_trends",
      description: "Get personalized trending topics for the connected X account.",
      inputSchema: obj([], {}),
    },

    // ── Spaces ────────────────────────────────────────────────────────────
    {
      name: "twitter_search_spaces",
      description: "Search live and scheduled X Spaces by keyword.",
      inputSchema: obj(["query"], {
        query: s("Keyword to search Spaces for."),
        maxResults: n("Number of results (1–100, default 10).", 1, 100, 10),
      }),
    },
  ],
};

export default twitter;

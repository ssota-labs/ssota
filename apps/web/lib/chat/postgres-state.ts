import {
  PostgresStateAdapter,
  type PostgresStateAdapterOptions,
  type PostgresStateAdapterUrlOptions,
} from "@chat-adapter/state-pg";

type ConnectablePostgresState = {
  connected: boolean;
  connectPromise: Promise<void> | null;
  getClient(): { query: (sql: string) => Promise<unknown> };
  logger: { error: (message: string, context: unknown) => void };
};

/**
 * Chat SDK Postgres state where DDL is owned by `supabase/migrations`
 * (`20250630000200_chat_sdk_state.sql`). The upstream adapter calls
 * `ensureSchema()` on connect; we skip that so schema changes ship only via
 * migrations (including RLS), not at runtime.
 */
class MigrationBackedPostgresState extends PostgresStateAdapter {
  override async connect(): Promise<void> {
    const self = this as unknown as ConnectablePostgresState;
    if (self.connected) return;

    if (!self.connectPromise) {
      self.connectPromise = (async () => {
        try {
          await self.getClient().query("SELECT 1");
          self.connected = true;
        } catch (error) {
          self.connectPromise = null;
          self.logger.error("Postgres connect failed", { error });
          throw error;
        }
      })();
    }
    await self.connectPromise;
  }
}

export function createMigrationBackedPostgresState(
  options: PostgresStateAdapterOptions = {},
): MigrationBackedPostgresState {
  if ("client" in options && options.client) {
    return new MigrationBackedPostgresState(options);
  }

  const urlOptions = options as PostgresStateAdapterUrlOptions;
  const url =
    urlOptions.url ?? process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Postgres url is required. Set POSTGRES_URL or DATABASE_URL, or provide it in options.",
    );
  }

  return new MigrationBackedPostgresState({
    url,
    keyPrefix: urlOptions.keyPrefix,
    logger: urlOptions.logger,
  });
}

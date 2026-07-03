/** Seed fragments for embedded emulate routes (non-production only). */
export const emulateGithubSeed = {
  users: [{ login: "smoke-dev", name: "Smoke Developer", email: "smoke@ssota.ai" }],
  orgs: [{ login: "ssota-labs", name: "SSOTA Labs" }],
  repos: [
    {
      owner: "ssota-labs",
      name: "ssota-dev",
      language: "TypeScript",
      auto_init: true,
    },
  ],
};

export const emulateSlackSeed = {
  team: { name: "SSOTA Dev", domain: "ssota-dev" },
  users: [
    { name: "smoke", real_name: "Smoke Test", email: "smoke@ssota.ai" },
  ],
  channels: [{ name: "general", topic: "SSOTA emulate dev channel" }],
  tokens: [
    {
      token: "xoxb-local-test",
      user: "smoke",
      scopes: ["chat:write", "channels:read", "team:read"],
    },
  ],
  strict_scopes: false,
};

export const emulateGoogleSeed = {
  users: [{ email: "smoke@ssota.ai", name: "Smoke Test" }],
  oauth_clients: [
    {
      client_id: "ssota-dev.apps.googleusercontent.com",
      client_secret: "GOCSPX-ssota-dev",
      redirect_uris: [
        "http://localhost:3000/api/auth/callback/google",
        "http://localhost:3100/api/auth/callback/google",
      ],
    },
  ],
};

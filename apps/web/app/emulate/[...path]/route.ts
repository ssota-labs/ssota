import { createEmulateHandler } from "@emulators/adapter-next";
import * as github from "@emulators/github";
import * as google from "@emulators/google";
import * as slack from "@emulators/slack";
import {
  emulateGithubSeed,
  emulateGoogleSeed,
  emulateSlackSeed,
} from "@/lib/emulate/dev-seed";

export const runtime = "nodejs";

function emulateEmbeddedEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" && process.env.EMULATE_ENABLED === "1"
  );
}

const handler = emulateEmbeddedEnabled()
  ? createEmulateHandler({
      services: {
        github: { emulator: github, seed: emulateGithubSeed },
        google: { emulator: google, seed: emulateGoogleSeed },
        slack: { emulator: slack, seed: emulateSlackSeed },
      },
    })
  : null;

function notFound(): Response {
  return new Response("Not Found", { status: 404 });
}

export const GET = handler?.GET ?? (async () => notFound());
export const POST = handler?.POST ?? (async () => notFound());
export const PUT = handler?.PUT ?? (async () => notFound());
export const PATCH = handler?.PATCH ?? (async () => notFound());
export const DELETE = handler?.DELETE ?? (async () => notFound());

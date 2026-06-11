-- User locale preference for console UI (default: English)

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "locale" text NOT NULL DEFAULT 'en';

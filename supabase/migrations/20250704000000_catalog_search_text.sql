-- Catalog search Phase 1: searchable text columns on the node/edge type catalog.
-- `description` (one-line, when-to-use) and `keywords` (ko/en aliases) feed the
-- progressive-disclosure search_catalog tool. Backfilled from the contracts SSOT
-- on the next seedDomainCatalog run; existing rows default to empty.

alter table node_catalog
  add column if not exists description text not null default '',
  add column if not exists keywords text[] not null default '{}'::text[];

alter table edge_catalog
  add column if not exists description text not null default '',
  add column if not exists keywords text[] not null default '{}'::text[];

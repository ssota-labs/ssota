-- Catalog search Phase 2: Postgres full-text search over the type catalog.
-- A generated tsvector column (key + label + description + keywords) with a GIN
-- index lets search_catalog rank by ts_rank in SQL instead of scoring rows in
-- the app. The 'simple' config is language-agnostic (no stemming/stopwords),
-- which suits the mixed ko/en catalog text; ILIKE remains a substring fallback.
--
-- `to_tsvector('simple', ...)` is only STABLE (config lookup), so it can't be
-- used directly in a generated column. We wrap it in an IMMUTABLE function — the
-- standard pattern — which the generated-column checker accepts.

create or replace function catalog_search_tsv(
  p_key text,
  p_label text,
  p_description text,
  p_keywords text[]
) returns tsvector
language sql
immutable
as $$
  select to_tsvector(
    'simple'::regconfig,
    coalesce(p_key, '') || ' ' ||
    coalesce(p_label, '') || ' ' ||
    coalesce(p_description, '') || ' ' ||
    coalesce(array_to_string(p_keywords, ' '), '')
  )
$$;

alter table node_catalog
  add column if not exists search_tsv tsvector
  generated always as (
    catalog_search_tsv(key, label, description, keywords)
  ) stored;

create index if not exists node_catalog_search_tsv_idx
  on node_catalog using gin (search_tsv);

alter table edge_catalog
  add column if not exists search_tsv tsvector
  generated always as (
    catalog_search_tsv(key, label, description, keywords)
  ) stored;

create index if not exists edge_catalog_search_tsv_idx
  on edge_catalog using gin (search_tsv);

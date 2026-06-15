-- Vivino enrichment pipeline columns for the canonical wines table.
-- Run in Supabase SQL editor before using `npm run enrich`.

alter table public.wines
  add column if not exists vivino_review_count integer,
  add column if not exists vivino_match_confidence integer
    check (vivino_match_confidence is null or (vivino_match_confidence >= 0 and vivino_match_confidence <= 100)),
  add column if not exists vivino_last_checked timestamptz,
  add column if not exists vivino_enrichment_status text
    check (
      vivino_enrichment_status is null
      or vivino_enrichment_status in ('pending', 'matched', 'review_required', 'failed', 'complete')
    );

create index if not exists wines_vivino_enrichment_pending_idx
  on public.wines (vivino_last_checked nulls first, producer, wine_name)
  where vivino_url is null or vivino_rating is null;

comment on column public.wines.vivino_review_count is 'Number of Vivino ratings/reviews when scraped.';
comment on column public.wines.vivino_match_confidence is '0-100 confidence score from enrichment matcher.';
comment on column public.wines.vivino_last_checked is 'Last time the enrichment pipeline processed this wine.';
comment on column public.wines.vivino_enrichment_status is 'Workflow status: matched, review_required, failed, complete, pending.';

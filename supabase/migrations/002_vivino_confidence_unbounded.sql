-- Allow any integer vivino_match_confidence (admin can set freely).
alter table public.wines
  drop constraint if exists wines_vivino_match_confidence_check;

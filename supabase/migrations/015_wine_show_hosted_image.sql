-- Per-wine control for whether the public UI displays the hosted Storage image.

ALTER TABLE public.wines
  ADD COLUMN IF NOT EXISTS show_hosted_image boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.wines.show_hosted_image IS
  'When true (and a successful hosted image exists), the public UI shows the Supabase Storage image instead of the retailer URL. Set false to keep showing the retailer image.';

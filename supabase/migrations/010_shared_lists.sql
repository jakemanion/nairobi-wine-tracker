-- Shared wine collections (read-only public links).
-- Built-in collections (wishlist, buy_again, shortlist) and future custom
-- collections use the same collection_key model.

-- ---------------------------------------------------------------------------
-- Future custom collections (membership table ready; UI comes later)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_collections_owner_id_idx
  ON public.user_collections (owner_id);

CREATE TABLE IF NOT EXISTS public.user_collection_wines (
  collection_id uuid NOT NULL REFERENCES public.user_collections (id) ON DELETE CASCADE,
  wine_id uuid NOT NULL REFERENCES public.wines (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, wine_id)
);

CREATE INDEX IF NOT EXISTS user_collection_wines_wine_id_idx
  ON public.user_collection_wines (wine_id);

-- ---------------------------------------------------------------------------
-- Share configurations
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.shared_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  -- Non-sequential public identifier used in /share/[slug]
  slug uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- One active share configuration per owner (regenerate updates slug in place)
  CONSTRAINT shared_lists_owner_id_unique UNIQUE (owner_id)
);

CREATE INDEX IF NOT EXISTS shared_lists_slug_idx
  ON public.shared_lists (slug);

-- Which collections are included in a share.
-- Built-in keys: wishlist | buy_again | shortlist
-- Custom keys: the user_collections.id as text (uuid)
CREATE TABLE IF NOT EXISTS public.shared_list_collections (
  shared_list_id uuid NOT NULL REFERENCES public.shared_lists (id) ON DELETE CASCADE,
  collection_key text NOT NULL,
  PRIMARY KEY (shared_list_id, collection_key),
  CONSTRAINT shared_list_collections_key_nonempty CHECK (char_length(trim(collection_key)) > 0)
);

CREATE INDEX IF NOT EXISTS shared_list_collections_key_idx
  ON public.shared_list_collections (collection_key);

-- ---------------------------------------------------------------------------
-- updated_at helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shared_lists_set_updated_at ON public.shared_lists;
CREATE TRIGGER shared_lists_set_updated_at
  BEFORE UPDATE ON public.shared_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS user_collections_set_updated_at ON public.user_collections;
CREATE TRIGGER user_collections_set_updated_at
  BEFORE UPDATE ON public.user_collections
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Owners manage their own share configs and custom collections.
-- Public page data is loaded via the server (service role) so private review
-- fields are never exposed through anon clients.
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_collection_wines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_list_collections ENABLE ROW LEVEL SECURITY;

-- user_collections
DROP POLICY IF EXISTS "Owners manage own collections" ON public.user_collections;
CREATE POLICY "Owners manage own collections"
ON public.user_collections
FOR ALL
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- user_collection_wines
DROP POLICY IF EXISTS "Owners manage own collection wines" ON public.user_collection_wines;
CREATE POLICY "Owners manage own collection wines"
ON public.user_collection_wines
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_collections uc
    WHERE uc.id = collection_id
      AND uc.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_collections uc
    WHERE uc.id = collection_id
      AND uc.owner_id = auth.uid()
  )
);

-- shared_lists
DROP POLICY IF EXISTS "Owners manage own shared lists" ON public.shared_lists;
CREATE POLICY "Owners manage own shared lists"
ON public.shared_lists
FOR ALL
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- shared_list_collections
DROP POLICY IF EXISTS "Owners manage own shared list collections" ON public.shared_list_collections;
CREATE POLICY "Owners manage own shared list collections"
ON public.shared_list_collections
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.shared_lists sl
    WHERE sl.id = shared_list_id
      AND sl.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.shared_lists sl
    WHERE sl.id = shared_list_id
      AND sl.owner_id = auth.uid()
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_collections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_collection_wines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_lists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_list_collections TO authenticated;

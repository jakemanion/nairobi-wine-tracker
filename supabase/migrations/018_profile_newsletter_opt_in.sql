-- Optional marketing / product-update email preference, captured at registration.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS newsletter_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS newsletter_opt_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS newsletter_opt_in_source text;

COMMENT ON COLUMN public.profiles.newsletter_opt_in IS
  'User opted in to occasional product updates and marketing email.';
COMMENT ON COLUMN public.profiles.newsletter_opt_in_at IS
  'UTC time when newsletter_opt_in was set true; null when false.';
COMMENT ON COLUMN public.profiles.newsletter_opt_in_source IS
  'Where consent was collected (e.g. registration).';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_local_part text;
  base_username text;
  profile_username text;
  newsletter_opted_in boolean := false;
  newsletter_at timestamptz := NULL;
  newsletter_source text := NULL;
BEGIN
  email_local_part := split_part(coalesce(NEW.email, ''), '@', 1);
  base_username := lower(regexp_replace(email_local_part, '[^a-z0-9_]', '', 'g'));

  IF base_username IS NULL OR base_username = '' THEN
    base_username := 'user';
  END IF;

  profile_username := base_username || '_' || left(replace(NEW.id::text, '-', ''), 6);

  newsletter_opted_in :=
    lower(coalesce(NEW.raw_user_meta_data->>'newsletter_opt_in', 'false')) IN ('true', 't', '1');
  newsletter_at := CASE WHEN newsletter_opted_in THEN timezone('utc', now()) ELSE NULL END;
  newsletter_source := CASE WHEN newsletter_opted_in THEN 'registration' ELSE NULL END;

  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    created_at,
    newsletter_opt_in,
    newsletter_opt_in_at,
    newsletter_opt_in_source
  )
  VALUES (
    NEW.id,
    profile_username,
    coalesce(nullif(email_local_part, ''), profile_username),
    timezone('utc', now()),
    newsletter_opted_in,
    newsletter_at,
    newsletter_source
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    INSERT INTO public.profiles (
      id,
      username,
      display_name,
      created_at,
      newsletter_opt_in,
      newsletter_opt_in_at,
      newsletter_opt_in_source
    )
    VALUES (
      NEW.id,
      'user_' || left(replace(NEW.id::text, '-', ''), 8),
      coalesce(nullif(email_local_part, ''), 'user'),
      timezone('utc', now()),
      newsletter_opted_in,
      newsletter_at,
      newsletter_source
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

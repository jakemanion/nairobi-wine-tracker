-- Fix profile creation trigger after "Database error saving new user" on signup.
-- Common causes: wrong timestamp column name, RLS, or missing grants.

-- Let the trigger role write to profiles.
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT INSERT ON TABLE public.profiles TO supabase_auth_admin;

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
BEGIN
  email_local_part := split_part(coalesce(NEW.email, ''), '@', 1);
  base_username := lower(regexp_replace(email_local_part, '[^a-z0-9_]', '', 'g'));

  IF base_username IS NULL OR base_username = '' THEN
    base_username := 'user';
  END IF;

  profile_username := base_username || '_' || left(replace(NEW.id::text, '-', ''), 6);

  INSERT INTO public.profiles (id, username, display_name, created_at)
  VALUES (
    NEW.id,
    profile_username,
    coalesce(nullif(email_local_part, ''), profile_username),
    timezone('utc', now())
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    INSERT INTO public.profiles (id, username, display_name, created_at)
    VALUES (
      NEW.id,
      'user_' || left(replace(NEW.id::text, '-', ''), 8),
      coalesce(nullif(email_local_part, ''), 'user'),
      timezone('utc', now())
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

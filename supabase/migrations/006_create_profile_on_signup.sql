-- Create a public.profiles row whenever a new auth user is created.
-- profiles.id matches auth.users.id (one profile per auth user).

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

  -- Suffix with part of the user id so usernames stay unique.
  profile_username := base_username || '_' || left(replace(NEW.id::text, '-', ''), 6);

  INSERT INTO public.profiles (id, username, display_name, create_at)
  VALUES (
    NEW.id,
    profile_username,
    coalesce(nullif(email_local_part, ''), profile_username),
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

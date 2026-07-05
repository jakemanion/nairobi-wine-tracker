import { createAuthServerClient } from '@/lib/supabase-auth-server'
import { createServerReadClient } from '@/lib/supabase-server'

export type PreviewSession =
  | { isLoggedIn: true; userId: string; userName: string }
  | { isLoggedIn: false; userId: null; userName: null }

export async function getPreviewSession(): Promise<PreviewSession> {
  const authClient = await createAuthServerClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return { isLoggedIn: false, userId: null, userName: null }
  }

  const supabase = createServerReadClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, username')
    .eq('id', user.id)
    .maybeSingle()

  const userName =
    profile?.display_name ?? profile?.username ?? user.email?.split('@')[0] ?? 'User'

  return { isLoggedIn: true, userId: user.id, userName }
}

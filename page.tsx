'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const [email, setEmail] = useState('')

  async function signIn() {
    await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'https://nairobi-wine-tracker-ekd6755zv-jakemanion.vercel.app/'
      }
    })

    alert('Check your email for login link')
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Login</h1>

      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />

      <button onClick={signIn}>
        Send Magic Link
      </button>
    </main>
  )
}
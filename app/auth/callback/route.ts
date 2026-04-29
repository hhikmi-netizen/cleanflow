import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (!code) return NextResponse.redirect(`${origin}/login`)

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )

  await supabase.auth.exchangeCodeForSession(code)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/login`)

  // Vérifie si l'utilisateur a déjà un pressing (compte existant)
  const { data: userData } = await supabase
    .from('users')
    .select('pressing_id')
    .eq('id', user.id)
    .single()

  if (userData?.pressing_id) {
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  // Nouvel utilisateur Google → créer pressing + user + settings
  const displayName = (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'Mon Pressing'

  const { data: pressing } = await supabase
    .from('pressings')
    .insert({ name: displayName, email: user.email || '', phone: '' })
    .select()
    .single()

  if (pressing) {
    await supabase.from('users').insert({
      id: user.id,
      pressing_id: pressing.id,
      role: 'admin',
      full_name: displayName,
      phone: '',
    })
    await supabase.from('settings').insert({ pressing_id: pressing.id })
  }

  return NextResponse.redirect(`${origin}/onboarding`)
}

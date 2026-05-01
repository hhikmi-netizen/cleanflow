import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type UserRole = 'admin' | 'employee'

/** Fetch the current user's role. Returns 'employee' if unauthenticated. */
export async function getUserRole(): Promise<UserRole> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'employee'
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
  return data?.role === 'admin' ? 'admin' : 'employee'
}

/**
 * Call at the top of any admin-only server page.
 * Redirects to /forbidden if the user is not admin.
 */
export async function requireAdmin(): Promise<void> {
  const role = await getUserRole()
  if (role !== 'admin') redirect('/forbidden')
}

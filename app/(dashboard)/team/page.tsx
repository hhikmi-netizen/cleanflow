export const dynamic = 'force-dynamic'

import { requireAdmin } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TeamManager from '@/components/team/TeamManager'
import { Users } from 'lucide-react'

export default async function TeamPage() {
  await requireAdmin()

  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('pressing_id, role, full_name')
    .eq('id', user.id)
    .single()

  if (!userData?.pressing_id) redirect('/onboarding')
  if (userData.role !== 'admin') redirect('/dashboard')

  const [membersRes, pressingRes] = await Promise.all([
    supabase
      .from('users')
      .select('id, full_name, phone, role, created_at')
      .eq('pressing_id', userData.pressing_id)
      .order('created_at'),
    supabase
      .from('pressings')
      .select('name')
      .eq('id', userData.pressing_id)
      .single(),
  ])

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
          <Users size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Équipe</h1>
          <p className="text-xs text-gray-400">Gérez les membres de votre pressing</p>
        </div>
      </div>

      <TeamManager
        members={membersRes.data || []}
        currentUserId={user.id}
        pressingId={userData.pressing_id}
        pressingName={pressingRes.data?.name || 'votre pressing'}
      />
    </div>
  )
}

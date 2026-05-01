export const dynamic = 'force-dynamic'

import { requireAdmin } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsForm from '@/components/settings/SettingsForm'

export default async function SettingsPage() {
  await requireAdmin()

  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('pressing_id, role')
    .eq('id', user.id)
    .single()

  if (!userData?.pressing_id) redirect('/onboarding')
  if (userData.role !== 'admin') redirect('/dashboard')

  const [pressingResult, settingsResult] = await Promise.all([
    supabase.from('pressings').select('*').eq('id', userData.pressing_id).single(),
    supabase.from('settings').select('*').eq('pressing_id', userData.pressing_id).single(),
  ])

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-sm text-gray-500 mt-1">Configurez les informations de votre pressing</p>
      </div>
      <SettingsForm
        pressing={pressingResult.data}
        settings={settingsResult.data}
        isAdmin={userData.role === 'admin'}
      />
    </div>
  )
}

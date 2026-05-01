export const dynamic = 'force-dynamic'

import { requireAdmin } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getClientsWithBalance } from '@/app/actions/credit'
import CreditDashboard from '@/components/credit/CreditDashboard'

export default async function CreditPage() {
  await requireAdmin()

  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('pressing_id').eq('id', user.id).single()
  if (!userData?.pressing_id) redirect('/onboarding')

  const clientsWithBalance = await getClientsWithBalance()

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Crédit & Impayés</h1>
          <p className="text-sm text-gray-500 mt-1">Suivi des soldes clients et paiements en attente</p>
        </div>
      </div>
      <CreditDashboard clients={clientsWithBalance} />
    </div>
  )
}

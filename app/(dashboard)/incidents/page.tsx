export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import IncidentList from '@/components/incidents/IncidentList'

export default async function IncidentsPage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('pressing_id').eq('id', user.id).single()
  if (!userData?.pressing_id) redirect('/onboarding')

  const { data: incidents } = await supabase
    .from('incidents')
    .select('*, orders(order_number), clients(name, phone)')
    .eq('pressing_id', userData.pressing_id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SAV & Réclamations</h1>
          <p className="text-sm text-gray-400 mt-1">{incidents?.length || 0} incident{(incidents?.length || 0) > 1 ? 's' : ''}</p>
        </div>
        <Link href="/incidents/new">
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            <Plus size={16} />
            Nouvel incident
          </button>
        </Link>
      </div>

      <IncidentList incidents={incidents || []} />
    </div>
  )
}

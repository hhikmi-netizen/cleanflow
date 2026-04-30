export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import IncidentForm from '@/components/incidents/IncidentForm'

export default async function NewIncidentPage({
  searchParams,
}: {
  searchParams: { orderId?: string; clientId?: string; orderNumber?: string }
}) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('pressing_id').eq('id', user.id).single()
  if (!userData?.pressing_id) redirect('/onboarding')

  // Charger les clients et commandes pour les selects
  const [{ data: clients }, { data: orders }] = await Promise.all([
    supabase.from('clients').select('id, name, phone')
      .eq('pressing_id', userData.pressing_id).order('name'),
    supabase.from('orders').select('id, order_number, client_id')
      .eq('pressing_id', userData.pressing_id)
      .not('status', 'eq', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/incidents" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Signaler un problème</h1>
      </div>

      <IncidentForm
        clients={clients || []}
        orders={orders || []}
        preOrderId={searchParams.orderId}
        preClientId={searchParams.clientId}
        preOrderNumber={searchParams.orderNumber}
      />
    </div>
  )
}

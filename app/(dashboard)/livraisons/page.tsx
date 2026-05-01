export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DeliveryBoard from '@/components/livraisons/DeliveryBoard'
import { Truck } from 'lucide-react'

export default async function LivraisonsPage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('pressing_id').eq('id', user.id).single()
  if (!userData?.pressing_id) redirect('/onboarding')

  const pid = userData.pressing_id

  const [{ data: orders }, { data: teamMembers }] = await Promise.all([
    supabase
      .from('orders')
      .select('id, order_number, status, deposit_mode, delivery_mode, pickup_address, delivery_address, pickup_slot, delivery_slot, assigned_to, delivery_status, created_at, clients(id, name, phone, address)')
      .eq('pressing_id', pid)
      .or('deposit_mode.eq.pickup,delivery_mode.eq.delivery')
      .not('status', 'in', '("delivered","cancelled")')
      .order('created_at', { ascending: false }),
    supabase
      .from('users')
      .select('id, full_name')
      .eq('pressing_id', pid)
      .order('full_name'),
  ])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-xl">
          <Truck size={20} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Collectes & Livraisons</h1>
          <p className="text-sm text-gray-500">Tournée du jour et planning</p>
        </div>
      </div>

      <DeliveryBoard
        orders={(orders || []) as any[]}
        teamMembers={teamMembers || []}
      />
    </div>
  )
}

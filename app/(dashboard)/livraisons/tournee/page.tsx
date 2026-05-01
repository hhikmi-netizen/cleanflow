export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TourneeMap from '@/components/livraisons/TourneeMap'
import Link from 'next/link'
import { ChevronLeft, MapPin } from 'lucide-react'

export default async function TourneePage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('pressing_id').eq('id', user.id).single()
  if (!userData?.pressing_id) redirect('/onboarding')

  const pid = userData.pressing_id

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayIso = today.toISOString()

  const [{ data: orders }, { data: teamMembers }, { data: pressing }] = await Promise.all([
    supabase
      .from('orders')
      .select(`
        id, order_number, tracking_token, status,
        deposit_mode, delivery_mode, delivery_status,
        pickup_address, pickup_latitude, pickup_longitude,
        delivery_address, delivery_latitude, delivery_longitude,
        pickup_slot, delivery_slot,
        assigned_to, stop_order, access_notes, notes,
        clients(id, name, phone, address)
      `)
      .eq('pressing_id', pid)
      .or('deposit_mode.eq.pickup,delivery_mode.eq.delivery')
      .not('status', 'in', '("delivered","cancelled")')
      .gte('created_at', todayIso)
      .order('stop_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }),
    supabase.from('users').select('id, full_name').eq('pressing_id', pid).order('full_name'),
    supabase.from('pressings').select('name, phone').eq('id', pid).single(),
  ])

  return (
    <div className="flex flex-col h-full -m-4 md:-m-6">
      {/* Compact header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shrink-0">
        <Link href="/livraisons" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
          <ChevronLeft size={18} />
        </Link>
        <div className="p-1.5 bg-blue-100 rounded-lg">
          <MapPin size={16} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-gray-900 leading-tight">Carte tournée</h1>
          <p className="text-xs text-gray-400">{orders?.length || 0} arrêt{(orders?.length || 0) > 1 ? 's' : ''} aujourd&apos;hui</p>
        </div>
      </div>

      <TourneeMap
        stops={(orders || []) as any[]}
        teamMembers={teamMembers || []}
        pressingName={pressing?.name || ''}
        pressingPhone={pressing?.phone || ''}
      />
    </div>
  )
}

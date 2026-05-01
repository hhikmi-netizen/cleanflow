export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReminderList from '@/components/reminders/ReminderList'

// Seuil en jours à partir duquel une commande "prête" devient une alerte
const READY_THRESHOLD_DAYS = 2

export default async function RemindersPage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('pressing_id').eq('id', user.id).single()

  const pid = userData?.pressing_id || ''
  const cutoff = new Date(Date.now() - READY_THRESHOLD_DAYS * 86_400_000).toISOString()
  const now = Date.now()

  const [
    { data: readyOrders },
    { data: unpaidOrders },
    { data: pressing },
  ] = await Promise.all([
    // Commandes prêtes depuis > N jours
    supabase
      .from('orders')
      .select('id, order_number, created_at, total, deposit, status, clients(name, phone)')
      .eq('pressing_id', pid)
      .eq('status', 'ready')
      .lt('created_at', cutoff)
      .order('created_at', { ascending: true }),

    // Commandes impayées (prêtes ou livrées, pas encore soldées)
    supabase
      .from('orders')
      .select('id, order_number, created_at, total, deposit, status, clients(name, phone)')
      .eq('pressing_id', pid)
      .eq('paid', false)
      .in('status', ['ready', 'delivered'])
      .order('created_at', { ascending: true }),

    supabase
      .from('pressings')
      .select('name, phone, address')
      .eq('id', pid)
      .single(),
  ])

  // Fusion + déduplication : une commande peut être à la fois prête ET impayée.
  // On garde le type 'ready' pour les commandes prêtes, et on ajoute 'remaining' à toutes.
  const readyIds = new Set((readyOrders || []).map((o: any) => o.id))

  const reminders = [
    ...(readyOrders || []).map((o: any) => ({
      id: o.id as string,
      orderNumber: o.order_number as string,
      createdAt: o.created_at as string,
      status: o.status as string,
      total: Number(o.total),
      deposit: Number(o.deposit),
      remaining: Math.max(0, Number(o.total) - Number(o.deposit)),
      clientName: (o.clients?.name as string) || '—',
      clientPhone: (o.clients?.phone as string) || '',
      type: 'ready' as const,
      daysPending: Math.floor((now - new Date(o.created_at).getTime()) / 86_400_000),
    })),
    ...(unpaidOrders || [])
      .filter((o: any) => !readyIds.has(o.id)) // éviter les doublons
      .map((o: any) => ({
        id: o.id as string,
        orderNumber: o.order_number as string,
        createdAt: o.created_at as string,
        status: o.status as string,
        total: Number(o.total),
        deposit: Number(o.deposit),
        remaining: Math.max(0, Number(o.total) - Number(o.deposit)),
        clientName: (o.clients?.name as string) || '—',
        clientPhone: (o.clients?.phone as string) || '',
        type: 'unpaid' as const,
        daysPending: Math.floor((now - new Date(o.created_at).getTime()) / 86_400_000),
      })),
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rappels WhatsApp</h1>
        <p className="text-sm text-gray-500 mt-1">
          Relancez vos clients en un clic — directement via WhatsApp
        </p>
      </div>

      <ReminderList
        reminders={reminders}
        pressing={{
          name: pressing?.name || '',
          phone: pressing?.phone || '',
          address: pressing?.address || '',
        }}
        readyThresholdDays={READY_THRESHOLD_DAYS}
      />
    </div>
  )
}

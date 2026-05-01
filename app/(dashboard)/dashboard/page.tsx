export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import StatCard from '@/components/shared/StatCard'
import AlertsPanel from '@/components/dashboard/AlertsPanel'
import { DollarSign, ShoppingBag, Users, Clock, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getStatusColor, getStatusLabel, formatDate } from '@/lib/utils'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('pressing_id, full_name, role')
    .eq('id', user.id)
    .single()

  if (!userData?.pressing_id) redirect('/onboarding')

  const pressingId = userData.pressing_id

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

  const readyThreshold    = new Date(today.getTime() - 3 * 24 * 3600 * 1000).toISOString()
  const processingThreshold = new Date(today.getTime() - 5 * 24 * 3600 * 1000).toISOString()

  const expiryThreshold = new Date(today.getTime() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0]

  const [ordersResult, clientsResult, recentOrdersResult, readyOverdueRes, processingLateRes, unpaidRes, expiringSubs, allActiveSubs] = await Promise.all([
    supabase
      .from('orders')
      .select('id, total, status, created_at')
      .eq('pressing_id', pressingId),
    supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('pressing_id', pressingId),
    supabase
      .from('orders')
      .select('id, order_number, status, total, created_at, clients(name)')
      .eq('pressing_id', pressingId)
      .order('created_at', { ascending: false })
      .limit(5),
    // Orders stuck at 'ready' for > 3 days
    supabase
      .from('orders')
      .select('id, order_number, created_at, total, deposit, clients(name, phone)')
      .eq('pressing_id', pressingId)
      .eq('status', 'ready')
      .lte('created_at', readyThreshold),
    // Orders stuck at 'in_progress' for > 5 days
    supabase
      .from('orders')
      .select('id, order_number, created_at, total, deposit, clients(name, phone)')
      .eq('pressing_id', pressingId)
      .eq('status', 'in_progress')
      .lte('created_at', processingThreshold),
    // Unpaid orders this month
    supabase
      .from('orders')
      .select('id, total, deposit')
      .eq('pressing_id', pressingId)
      .eq('paid', false)
      .neq('status', 'cancelled')
      .gte('created_at', monthStart),
    // Subscriptions expiring within 7 days
    supabase
      .from('customer_subscriptions')
      .select('id, expires_at, clients(name), subscriptions(name)')
      .eq('pressing_id', pressingId)
      .eq('status', 'active')
      .lte('expires_at', expiryThreshold)
      .gte('expires_at', todayStr),
    // All active subs for low-quota detection
    supabase
      .from('customer_subscriptions')
      .select('id, balance, quota_used, kilo_used, clients(id, name), subscriptions(name, sub_type, quota_quantity, quota_kilo, credits, price)')
      .eq('pressing_id', pressingId)
      .eq('status', 'active'),
  ])

  const orders = ordersResult.data || []
  const ordersToday = orders.filter(o => o.created_at.startsWith(todayStr))
  const revenueToday = ordersToday.reduce((sum, o) => sum + Number(o.total), 0)
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'in_progress').length
  const revenueMonth = orders
    .filter(o => o.created_at >= monthStart)
    .reduce((sum, o) => sum + Number(o.total), 0)

  const now = today.getTime()
  const toAlertOrder = (o: any, status: string) => ({
    id: o.id,
    order_number: o.order_number,
    created_at: o.created_at,
    status,
    total: Number(o.total),
    deposit: Number(o.deposit || 0),
    client_name: o.clients?.name || '—',
    client_phone: o.clients?.phone || '',
    days_ago: Math.floor((now - new Date(o.created_at).getTime()) / (24 * 3600 * 1000)),
  })

  const readyOverdue   = (readyOverdueRes.data || []).map(o => toAlertOrder(o, 'ready'))
  const processingLate = (processingLateRes.data || []).map(o => toAlertOrder(o, 'in_progress'))
  const unpaidOrders   = unpaidRes.data || []
  const unpaidTotal    = unpaidOrders.reduce((s, o) => s + Math.max(0, Number(o.total) - Number(o.deposit || 0)), 0)
  const unpaidCount    = unpaidOrders.length
  const expiringSubsList = (expiringSubs.data || []).map((cs: any) => ({
    id: cs.id,
    clientName: cs.clients?.name || '—',
    subName: cs.subscriptions?.name || '—',
    expiresAt: cs.expires_at,
    daysLeft: Math.ceil((new Date(cs.expires_at).getTime() - today.getTime()) / (24 * 3600 * 1000)),
  }))

  const lowQuotaSubsList = (allActiveSubs.data || []).flatMap((cs: any) => {
    const sub = cs.subscriptions
    const clientId = (cs.clients as any)?.id
    if (!sub || !clientId) return []
    let pctUsed: number | null = null
    if (sub.sub_type === 'prepaid') {
      const total = sub.credits || sub.price || 0
      if (total > 0) pctUsed = Math.round(((total - Number(cs.balance)) / total) * 100)
    } else if (sub.sub_type === 'shirts' && sub.quota_quantity) {
      pctUsed = Math.round((Number(cs.quota_used) / sub.quota_quantity) * 100)
    } else if (sub.sub_type === 'kilo' && sub.quota_kilo) {
      pctUsed = Math.round((Number(cs.kilo_used) / sub.quota_kilo) * 100)
    }
    if (pctUsed === null || pctUsed < 80) return []
    return [{ id: cs.id, clientId, clientName: (cs.clients as any)?.name || '—', subName: sub.name || '—', pctUsed }]
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bonjour, {userData.full_name.split(' ')[0]} 👋</h1>
          <p className="text-sm text-gray-500 mt-1">Voici l&apos;aperçu de votre pressing aujourd&apos;hui</p>
        </div>
        <Link href="/orders/new">
          <Button className="h-10">+ Nouvelle commande</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="CA Aujourd'hui"
          value={formatCurrency(revenueToday)}
          icon={DollarSign}
          color="blue"
          subtitle={`${ordersToday.length} commande${ordersToday.length > 1 ? 's' : ''}`}
        />
        <StatCard
          title="CA ce mois"
          value={formatCurrency(revenueMonth)}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="En cours"
          value={pendingOrders}
          icon={Clock}
          color="orange"
          subtitle="À traiter"
        />
        <StatCard
          title="Clients"
          value={clientsResult.count || 0}
          icon={Users}
          color="purple"
        />
      </div>

      <AlertsPanel
        readyOverdue={readyOverdue}
        processingLate={processingLate}
        unpaidTotal={unpaidTotal}
        unpaidCount={unpaidCount}
        expiringSubs={expiringSubsList}
        lowQuotaSubs={lowQuotaSubsList}
      />

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Dernières commandes</h3>
          <Link href="/orders" className="text-sm text-blue-600 hover:underline">Voir tout</Link>
        </div>
        {recentOrdersResult.data && recentOrdersResult.data.length > 0 ? (
          <div className="space-y-3">
            {recentOrdersResult.data.map((order: any) => (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <div className="flex items-center justify-between py-2 border-b border-gray-50 hover:bg-gray-50 rounded px-2 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.order_number}</p>
                    <p className="text-xs text-gray-400">{order.clients?.name || 'Client inconnu'} · {formatDate(order.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                    <span className="text-sm font-semibold">{formatCurrency(order.total)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">Aucune commande pour le moment</p>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/orders/new">
          <Card className="p-5 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer border-2 border-dashed border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <ShoppingBag size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Créer une commande</p>
                <p className="text-xs text-gray-400">Enregistrer une nouvelle commande client</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/clients">
          <Card className="p-5 hover:border-purple-200 hover:shadow-md transition-all cursor-pointer border-2 border-dashed border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Users size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Gérer les clients</p>
                <p className="text-xs text-gray-400">Consulter et ajouter des clients</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  )
}

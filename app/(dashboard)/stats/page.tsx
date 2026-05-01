export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import RevenueChart from '@/components/stats/RevenueChart'
import StatusDonut from '@/components/stats/StatusDonut'
import TopServicesChart from '@/components/stats/TopServicesChart'
import { TrendingUp, ShoppingBag, Users, ArrowUp, ArrowDown, Minus, Clock } from 'lucide-react'
import Link from 'next/link'

function pctChange(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? 100 : 0
  return Math.round(((curr - prev) / prev) * 100)
}

export default async function StatsPage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('pressing_id').eq('id', user.id).single()
  if (!userData?.pressing_id) redirect('/onboarding')
  const pid = userData.pressing_id

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const prevStart  = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const prevEnd    = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()
  const thirtyAgo  = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString()

  const [thisMonthRes, prevMonthRes, orders30Res, clientsRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, total, status')
      .eq('pressing_id', pid)
      .gte('created_at', monthStart),
    supabase
      .from('orders')
      .select('id, total, status')
      .eq('pressing_id', pid)
      .gte('created_at', prevStart)
      .lte('created_at', prevEnd),
    supabase
      .from('orders')
      .select('id, total, status, created_at')
      .eq('pressing_id', pid)
      .gte('created_at', thirtyAgo)
      .neq('status', 'cancelled'),
    supabase
      .from('clients')
      .select('id, name, total_orders, total_spent')
      .eq('pressing_id', pid)
      .order('total_spent', { ascending: false })
      .limit(5),
  ])

  const thisMonth = thisMonthRes.data || []
  const prevMonth = prevMonthRes.data || []
  const orders30  = orders30Res.data || []

  // KPIs
  const revenueMonth = thisMonth.reduce((s, o) => s + Number(o.total), 0)
  const revenuePrev  = prevMonth.reduce((s, o) => s + Number(o.total), 0)
  const ordersMonth  = thisMonth.length
  const ordersPrev   = prevMonth.length
  const pendingCount = thisMonth.filter(o => o.status === 'pending' || o.status === 'in_progress').length
  const avgOrder     = ordersMonth > 0 ? revenueMonth / ordersMonth : 0

  // Status distribution (30 days)
  const statusMap: Record<string, number> = {}
  orders30.forEach(o => { statusMap[o.status] = (statusMap[o.status] || 0) + 1 })
  const statusData = Object.entries(statusMap)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count)

  // Revenue by day (30 days)
  const dayMap: Record<string, { revenue: number; orders: number }> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 3600 * 1000)
    dayMap[d.toISOString().split('T')[0]] = { revenue: 0, orders: 0 }
  }
  orders30.forEach(o => {
    const key = o.created_at.split('T')[0]
    if (dayMap[key]) {
      dayMap[key].revenue += Number(o.total)
      dayMap[key].orders  += 1
    }
  })
  const revenueChartData = Object.entries(dayMap).map(([date, v]) => ({
    label: new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    revenue: v.revenue,
    orders: v.orders,
  }))

  // Top services via order IDs
  let topServices: { name: string; revenue: number; count: number }[] = []
  const order30Ids = orders30.map(o => o.id)
  if (order30Ids.length > 0) {
    const { data: items } = await supabase
      .from('order_items')
      .select('service_name, quantity, subtotal')
      .in('order_id', order30Ids)
    if (items && items.length > 0) {
      const svcMap: Record<string, { revenue: number; count: number }> = {}
      items.forEach((i: any) => {
        if (!svcMap[i.service_name]) svcMap[i.service_name] = { revenue: 0, count: 0 }
        svcMap[i.service_name].revenue += Number(i.subtotal)
        svcMap[i.service_name].count   += Number(i.quantity)
      })
      topServices = Object.entries(svcMap)
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6)
    }
  }

  const topClients = clientsRes.data || []

  const kpis = [
    {
      label: "CA ce mois",
      value: formatCurrency(revenueMonth),
      delta: pctChange(revenueMonth, revenuePrev),
      icon: TrendingUp,
      bg: 'bg-blue-50',
      fg: 'text-blue-600',
    },
    {
      label: "Commandes",
      value: ordersMonth,
      delta: pctChange(ordersMonth, ordersPrev),
      icon: ShoppingBag,
      bg: 'bg-indigo-50',
      fg: 'text-indigo-600',
    },
    {
      label: "En attente",
      value: pendingCount,
      delta: null,
      icon: Clock,
      bg: 'bg-orange-50',
      fg: 'text-orange-600',
    },
    {
      label: "Panier moyen",
      value: formatCurrency(avgOrder),
      delta: null,
      icon: Users,
      bg: 'bg-green-50',
      fg: 'text-green-600',
    },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>
        <p className="text-sm text-gray-500 mt-1">Mois en cours · comparaison mois précédent</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => {
          const Icon = k.icon
          return (
            <Card key={k.label} className="p-4">
              <div className="flex items-start justify-between">
                <div className={`p-2 rounded-xl ${k.bg} ${k.fg}`}>
                  <Icon size={16} />
                </div>
                {k.delta !== null && (
                  <div className={`flex items-center gap-0.5 text-xs font-medium ${
                    k.delta > 0 ? 'text-green-600' : k.delta < 0 ? 'text-red-500' : 'text-gray-400'
                  }`}>
                    {k.delta > 0
                      ? <ArrowUp size={11} />
                      : k.delta < 0
                        ? <ArrowDown size={11} />
                        : <Minus size={11} />
                    }
                    {Math.abs(k.delta)}%
                  </div>
                )}
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-3">{k.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{k.label}</p>
            </Card>
          )
        })}
      </div>

      {/* Revenue bar chart */}
      <Card className="p-5">
        <h3 className="font-semibold text-gray-900 mb-4">CA journalier — 30 derniers jours</h3>
        <RevenueChart data={revenueChartData} />
      </Card>

      {/* Status + Top services */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Commandes par statut (30j)</h3>
          {statusData.length > 0
            ? <StatusDonut data={statusData} />
            : <p className="text-sm text-gray-400 text-center py-10">Aucune commande</p>
          }
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Top services par CA (30j)</h3>
          {topServices.length > 0
            ? <TopServicesChart data={topServices} />
            : <p className="text-sm text-gray-400 text-center py-10">Aucune donnée</p>
          }
        </Card>
      </div>

      {/* Top clients */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Meilleurs clients (CA total)</h3>
          <Link href="/clients" className="text-xs text-blue-600 hover:underline">Voir tous</Link>
        </div>
        {topClients.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {topClients.map((c: any, i) => (
              <Link key={c.id} href={`/clients/${c.id}`}
                className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="w-5 text-center text-xs font-bold text-gray-300">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.total_orders} commande{c.total_orders !== 1 ? 's' : ''}</p>
                </div>
                <span className="text-sm font-semibold text-gray-900 shrink-0">
                  {formatCurrency(c.total_spent)}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">Aucun client encore</p>
        )}
      </Card>
    </div>
  )
}

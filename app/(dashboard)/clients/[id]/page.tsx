export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card } from '@/components/ui/card'
import ClientEditSection from '@/components/clients/ClientEditSection'
import OrderStatusBadge from '@/components/orders/OrderStatusBadge'
import {
  formatCurrency, formatDate,
  buildGoogleMapsUrl, buildWhatsAppUrl,
  getIncidentStatusLabel, getIncidentStatusColor,
} from '@/lib/utils'
import Link from 'next/link'
import {
  ChevronLeft, MapPin, Phone, MessageCircle, ShoppingBag,
  AlertTriangle, CreditCard, Package, TrendingUp, Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('pressing_id').eq('id', user.id).single()

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', params.id)
    .eq('pressing_id', userData?.pressing_id || '')
    .single()

  if (!client) notFound()

  // Full order history with items
  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, status, total, deposit, paid, created_at, order_items(id, service_name, article_code, quantity)')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })

  // Payments for this client's orders
  const orderIds = (orders || []).map(o => o.id)
  const { data: allPayments } = orderIds.length > 0
    ? await supabase.from('payments').select('*').in('order_id', orderIds)
    : { data: [] }

  // Incidents for this client
  const { data: incidents } = await supabase
    .from('incidents')
    .select('id, type, status, description, created_at')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Financial stats
  const totalPaid = (allPayments || []).reduce((s, p) => s + Number(p.amount), 0) +
    (orders || []).reduce((s, o) => s + Number(o.deposit || 0), 0)
  const totalDue = (orders || [])
    .filter(o => o.status !== 'cancelled')
    .reduce((s, o) => s + Number(o.total || 0), 0)
  const balance = totalDue - totalPaid

  // Visit frequency
  const ordersChron = [...(orders || [])].reverse()
  const firstOrder = ordersChron[0]
  const lastOrder = orders?.[0]
  let avgFreqDays: number | null = null
  if (orders && orders.length >= 2) {
    const diffMs = new Date(lastOrder!.created_at).getTime() - new Date(firstOrder.created_at).getTime()
    avgFreqDays = Math.round(diffMs / (1000 * 60 * 60 * 24) / (orders.length - 1))
  }

  // All articles
  const allItems = (orders || []).flatMap(o =>
    ((o.order_items as any[]) || []).map((item: any) => ({
      ...item,
      order_number: o.order_number,
      order_id: o.id,
    }))
  )

  const whatsappMsg = `Bonjour ${client.name}, nous avons une mise à jour concernant votre commande...`

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/clients" className="text-gray-400 hover:text-gray-600">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{client.name}</h1>
            {client.client_code && (
              <p className="text-xs text-gray-400 font-mono">{client.client_code}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <a href={`tel:${client.phone}`}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
            <Phone size={16} />
          </a>
          <a href={buildWhatsAppUrl(client.phone, whatsappMsg)}
            target="_blank" rel="noopener noreferrer"
            className="p-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-600 transition-colors">
            <MessageCircle size={16} />
          </a>
          {client.address && (
            <a href={buildGoogleMapsUrl(client.address)}
              target="_blank" rel="noopener noreferrer"
              className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors">
              <MapPin size={16} />
            </a>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <p className="text-xl font-bold text-gray-900">{orders?.length || 0}</p>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center justify-center gap-1">
            <ShoppingBag size={11} /> Commandes
          </p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xl font-bold text-gray-900">{formatCurrency(client.total_spent)}</p>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center justify-center gap-1">
            <TrendingUp size={11} /> CA total
          </p>
        </Card>
        <Card className={`p-3 text-center ${balance > 0 ? 'border-orange-200 bg-orange-50' : ''}`}>
          <p className={`text-xl font-bold ${balance > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
            {formatCurrency(balance > 0 ? balance : 0)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center justify-center gap-1">
            <CreditCard size={11} /> Reste à payer
          </p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xl font-bold text-gray-900">
            {avgFreqDays !== null ? `${avgFreqDays}j` : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center justify-center gap-1">
            <Clock size={11} /> Fréquence
          </p>
        </Card>
      </div>

      {/* Client info */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Informations</h3>
        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div>
            <p className="text-gray-400">Téléphone</p>
            <a href={`tel:${client.phone}`} className="font-medium text-blue-600">{client.phone}</a>
          </div>
          <div>
            <p className="text-gray-400">Type</p>
            <p className="font-medium text-gray-900">
              {client.client_type === 'business' ? 'Professionnel' : 'Particulier'}
            </p>
          </div>
          {client.email && (
            <div className="col-span-2">
              <p className="text-gray-400">Email</p>
              <p className="font-medium text-gray-900">{client.email}</p>
            </div>
          )}
          {client.address && (
            <div className="col-span-2">
              <p className="text-gray-400">Adresse</p>
              <p className="font-medium text-gray-900">{client.address}</p>
            </div>
          )}
          {client.ice && (
            <div>
              <p className="text-gray-400">ICE</p>
              <p className="font-medium text-gray-900">{client.ice}</p>
            </div>
          )}
          <div>
            <p className="text-gray-400">Client depuis</p>
            <p className="font-medium text-gray-900">{formatDate(client.created_at)}</p>
          </div>
          {lastOrder && (
            <div>
              <p className="text-gray-400">Dernière visite</p>
              <p className="font-medium text-gray-900">{formatDate(lastOrder.created_at)}</p>
            </div>
          )}
        </div>
        {client.notes && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-gray-400 text-xs mb-1">Notes</p>
            <p className="text-sm text-gray-700">{client.notes}</p>
          </div>
        )}
        <ClientEditSection client={client} pressingId={userData!.pressing_id} />
      </Card>

      {/* Recent articles */}
      {allItems.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Package size={14} /> Articles récents
          </h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {allItems.slice(0, 20).map((item: any) => (
              <div key={item.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  {item.article_code && (
                    <span className="font-mono text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      {item.article_code}
                    </span>
                  )}
                  <span className="text-gray-800">{item.service_name}</span>
                  {item.quantity > 1 && <span className="text-gray-400 text-xs">×{item.quantity}</span>}
                </div>
                <Link href={`/orders/${item.order_id}`} className="text-xs text-gray-400 font-mono hover:text-blue-500">
                  {item.order_number}
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Order history */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Historique commandes</h3>
          <Link href="/orders/new">
            <Button size="sm" variant="outline">+ Commande</Button>
          </Link>
        </div>
        {orders && orders.length > 0 ? (
          <div className="space-y-2">
            {orders.map(order => {
              const orderPayments = (allPayments || []).filter(p => p.order_id === order.id)
              const paid = Number(order.deposit || 0) + orderPayments.reduce((s, p) => s + Number(p.amount), 0)
              const remaining = Number(order.total) - paid
              return (
                <Link key={order.id} href={`/orders/${order.id}`}>
                  <div className="flex items-start justify-between py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded px-2 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-mono text-gray-700">{order.order_number}</p>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
                      {(order.order_items as any[])?.length > 0 && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {(order.order_items as any[]).slice(0, 3).map((i: any) => i.service_name).join(', ')}
                          {(order.order_items as any[]).length > 3 && ` +${(order.order_items as any[]).length - 3}`}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(order.total)}</p>
                      {remaining > 0.01 && order.status !== 'cancelled' && (
                        <p className="text-xs text-orange-500">Reste {formatCurrency(remaining)}</p>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <ShoppingBag size={24} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Aucune commande pour ce client</p>
          </div>
        )}
      </Card>

      {/* Incidents */}
      {incidents && incidents.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle size={14} /> SAV / Incidents
            </h3>
            <span className="text-xs text-gray-400">{incidents.length} signalé{incidents.length > 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-2">
            {incidents.map(inc => (
              <Link key={inc.id} href={`/incidents/${inc.id}`}>
                <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded px-2 transition-colors">
                  <div>
                    <p className="text-sm text-gray-800 line-clamp-1">{inc.description}</p>
                    <p className="text-xs text-gray-400">{formatDate(inc.created_at)}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2 ${getIncidentStatusColor(inc.status as any)}`}>
                    {getIncidentStatusLabel(inc.status as any)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

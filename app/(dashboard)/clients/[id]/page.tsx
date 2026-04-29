export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card } from '@/components/ui/card'
import ClientEditSection from '@/components/clients/ClientEditSection'
import OrderStatusBadge from '@/components/orders/OrderStatusBadge'
import { formatCurrency, formatDate, buildGoogleMapsUrl, buildWhatsAppUrl } from '@/lib/utils'
import Link from 'next/link'
import { ChevronLeft, MapPin, Phone, MessageCircle, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('pressing_id')
    .eq('id', user.id)
    .single()

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', params.id)
    .eq('pressing_id', userData?.pressing_id || '')
    .single()

  if (!client) notFound()

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, status, total, created_at')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const whatsappMsg = `Bonjour ${client.name}, nous avons une mise à jour concernant votre commande...`

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/clients" className="text-gray-400 hover:text-gray-600">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">{client.name}</h1>
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

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{client.total_orders}</p>
          <p className="text-xs text-gray-400 mt-1">Commandes</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(client.total_spent)}</p>
          <p className="text-xs text-gray-400 mt-1">CA total</p>
        </Card>
      </div>

      {/* Infos client */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Informations</h3>
        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div>
            <p className="text-gray-400">Téléphone</p>
            <a href={`tel:${client.phone}`} className="font-medium text-blue-600">{client.phone}</a>
          </div>
          <div>
            <p className="text-gray-400">Type</p>
            <p className="font-medium text-gray-900">{client.client_type === 'business' ? 'Professionnel' : 'Particulier'}</p>
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
        </div>
        {client.notes && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-gray-400 text-xs mb-1">Notes</p>
            <p className="text-sm text-gray-700">{client.notes}</p>
          </div>
        )}
        <ClientEditSection client={client} pressingId={userData!.pressing_id} />
      </Card>

      {/* Commandes */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Historique commandes</h3>
          <Link href={`/orders/new`}>
            <Button size="sm" variant="outline">+ Commande</Button>
          </Link>
        </div>
        {orders && orders.length > 0 ? (
          <div className="space-y-2">
            {orders.map(order => (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <div className="flex items-center justify-between py-2 border-b border-gray-50 hover:bg-gray-50 rounded px-2 transition-colors">
                  <div>
                    <p className="text-sm font-mono text-gray-700">{order.order_number}</p>
                    <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <OrderStatusBadge status={order.status} />
                    <span className="text-sm font-semibold">{formatCurrency(order.total)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <ShoppingBag size={24} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Aucune commande pour ce client</p>
          </div>
        )}
      </Card>
    </div>
  )
}

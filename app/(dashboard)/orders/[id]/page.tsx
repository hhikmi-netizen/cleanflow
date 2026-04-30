export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card } from '@/components/ui/card'
import OrderStatusBadge from '@/components/orders/OrderStatusBadge'
import OrderActions from '@/components/orders/OrderActions'
import { formatCurrency, formatDate, formatDateTime, getPaymentLabel, buildWhatsAppUrl, buildGoogleMapsUrl } from '@/lib/utils'
import Link from 'next/link'
import { ChevronLeft, MapPin, Phone, MessageCircle } from 'lucide-react'

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('pressing_id')
    .eq('id', user.id)
    .single()

  const { data: order } = await supabase
    .from('orders')
    .select('*, clients(id, name, phone, email, address, client_type), order_items(*)')
    .eq('id', params.id)
    .eq('pressing_id', userData?.pressing_id || '')
    .single()

  if (!order) notFound()

  const { data: pressing } = await supabase
    .from('pressings')
    .select('name, phone, address, currency, tax_rate, ice')
    .eq('id', userData!.pressing_id)
    .single()

  const whatsappMsg = order.status === 'ready'
    ? `Bonjour ${order.clients?.name}, votre commande ${order.order_number} est prête ! Vous pouvez venir la récupérer. Merci.`
    : `Bonjour ${order.clients?.name}, concernant votre commande ${order.order_number}...`

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/orders" className="text-gray-400 hover:text-gray-600">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 font-mono">{order.order_number}</h1>
            <p className="text-xs text-gray-400">{formatDateTime(order.created_at)}</p>
          </div>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Actions statut */}
      <OrderActions orderId={order.id} currentStatus={order.status} paid={order.paid} />

      {/* Client */}
      {order.clients && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Client</h3>
          <div className="flex items-start justify-between">
            <div>
              <Link href={`/clients/${order.clients.id}`} className="font-semibold text-gray-900 hover:text-blue-600">
                {order.clients.name}
              </Link>
              <p className="text-sm text-gray-500 mt-0.5">{order.clients.phone}</p>
              {order.clients.address && (
                <p className="text-sm text-gray-400 mt-0.5">{order.clients.address}</p>
              )}
            </div>
            <div className="flex gap-2">
              <a href={`tel:${order.clients.phone}`}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
                <Phone size={16} />
              </a>
              <a href={buildWhatsAppUrl(order.clients.phone, whatsappMsg)}
                target="_blank" rel="noopener noreferrer"
                className="p-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-600 transition-colors">
                <MessageCircle size={16} />
              </a>
              {order.clients.address && (
                <a href={buildGoogleMapsUrl(order.clients.address)}
                  target="_blank" rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors">
                  <MapPin size={16} />
                </a>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Articles */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Articles</h3>
        <div className="space-y-2">
          {order.order_items?.map((item: any) => (
            <div key={item.id} className="py-2 border-b border-gray-50 last:border-0">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.service_name}</p>
                  <p className="text-xs text-gray-400">x{item.quantity} · {formatCurrency(item.unit_price)} / unité</p>
                </div>
                <span className="text-sm font-semibold shrink-0 ml-3">{formatCurrency(item.subtotal)}</span>
              </div>
              {item.notes && (
                <p className="mt-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">{item.notes}</p>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100 space-y-1">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Sous-total</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          {Number(order.tax) > 0 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>TVA</span>
              <span>{formatCurrency(order.tax)}</span>
            </div>
          )}
          {Number(order.deposit) > 0 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>Acompte reçu</span>
              <span>− {formatCurrency(order.deposit)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t border-gray-200">
            <span>Total</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
          {Number(order.deposit) > 0 && (
            <div className="flex justify-between text-blue-600 font-medium text-sm">
              <span>Reste à payer</span>
              <span>{formatCurrency(Math.max(0, Number(order.total) - Number(order.deposit)))}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Infos commande */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Détails</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-400">Dépôt</p>
            <p className="font-medium text-gray-900">
              {order.deposit_mode === 'pickup' ? '🚗 Collecte domicile' : '🏪 Sur place'}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Retrait</p>
            <p className="font-medium text-gray-900">
              {order.delivery_mode === 'delivery' ? '🚚 Livraison domicile' : '🏪 Sur place'}
            </p>
          </div>
          {order.deposit_date && (
            <div>
              <p className="text-gray-400">Date de dépôt</p>
              <p className="font-medium text-gray-900">{formatDate(order.deposit_date)}</p>
            </div>
          )}
          {order.pickup_date && (
            <div>
              <p className="text-gray-400">Date de retrait prévue</p>
              <p className="font-medium text-gray-900">{formatDate(order.pickup_date)}</p>
            </div>
          )}
          <div>
            <p className="text-gray-400">Paiement</p>
            <p className="font-medium text-gray-900">{getPaymentLabel(order.payment_method)}</p>
          </div>
          <div>
            <p className="text-gray-400">Statut paiement</p>
            <p className={`font-medium ${order.paid ? 'text-green-600' : 'text-orange-500'}`}>
              {order.paid ? 'Payé ✓' : 'En attente'}
            </p>
          </div>
          {order.delivered_at && (
            <div>
              <p className="text-gray-400">Livré le</p>
              <p className="font-medium text-gray-900">{formatDate(order.delivered_at)}</p>
            </div>
          )}
          {order.cancelled_reason && (
            <div className="col-span-2">
              <p className="text-red-400 text-xs mb-1">Motif d&apos;annulation</p>
              <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded">{order.cancelled_reason}</p>
            </div>
          )}
        </div>
        {order.notes && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-gray-400 text-xs mb-1">Notes</p>
            <p className="text-sm text-gray-700">{order.notes}</p>
          </div>
        )}
      </Card>
    </div>
  )
}

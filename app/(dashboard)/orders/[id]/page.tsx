export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card } from '@/components/ui/card'
import OrderStatusBadge from '@/components/orders/OrderStatusBadge'
import OrderActions from '@/components/orders/OrderActions'
import PaymentHistory from '@/components/orders/PaymentHistory'
import OrderTicket from '@/components/orders/OrderTicket'
import ArticleStatusPanel from '@/components/orders/ArticleStatusPanel'
import WhatsAppNotifications from '@/components/orders/WhatsAppNotifications'
import ArticleLabels from '@/components/orders/ArticleLabels'
import { formatCurrency, formatDate, formatDateTime, getPaymentLabel, buildWhatsAppUrl, buildGoogleMapsUrl } from '@/lib/utils'
import Link from 'next/link'
import { ChevronLeft, MapPin, Phone, MessageCircle, AlertTriangle } from 'lucide-react'

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('pressing_id').eq('id', user.id).single()

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

  const { data: userData2 } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  const isAdmin = userData2?.role === 'admin'

  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', params.id)
    .order('created_at')

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
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
          {order.tracking_token && (
            <OrderTicket
              orderNumber={order.order_number}
              trackingToken={order.tracking_token}
              clientName={order.clients?.name}
              clientPhone={order.clients?.phone}
              items={(order.order_items || []) as any[]}
              total={Number(order.total)}
              deposit={Number(order.deposit)}
              pressingName={pressing?.name || 'Pressing'}
              pressingPhone={pressing?.phone}
              pressingAddress={pressing?.address}
              createdAt={order.created_at}
            />
          )}
        </div>
      </div>

      {/* Actions statut */}
      <OrderActions orderId={order.id} currentStatus={order.status} paid={order.paid} clientId={order.clients?.id} />

      {/* Actions secondaires */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <ArticleLabels
          items={(order.order_items || []) as any[]}
          orderNumber={order.order_number}
          pressingName={pressing?.name || 'Pressing'}
          trackingToken={order.tracking_token}
        />
        <div className="flex items-center gap-2">
          <Link href={`/orders/${order.id}/invoice`}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors border border-gray-200">
            Facture / Bon
          </Link>
          <Link href={`/incidents/new?orderId=${order.id}&clientId=${order.clients?.id || ''}&orderNumber=${order.order_number}`}>
            <button className="flex items-center gap-1.5 text-xs text-orange-500 hover:text-orange-700 hover:bg-orange-50 px-3 py-1.5 rounded-lg transition-colors">
              <AlertTriangle size={13} />
              Signaler un problème
            </button>
          </Link>
        </div>
      </div>

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
        <ArticleStatusPanel
          items={(order.order_items || []) as any[]}
          orderId={order.id}
        />
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

      {/* Notifications WhatsApp */}
      {order.clients?.phone && (
        <WhatsAppNotifications
          clientName={order.clients.name}
          clientPhone={order.clients.phone}
          orderNumber={order.order_number}
          pressingName={pressing?.name || 'Pressing'}
          pressingPhone={pressing?.phone}
          total={Number(order.total)}
          remaining={Math.max(0, Number(order.total) - Number(order.deposit))}
          trackingToken={order.tracking_token}
          pickupDate={order.pickup_date ? formatDate(order.pickup_date) : undefined}
        />
      )}

      {/* Paiements */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Paiements</h3>
        <PaymentHistory
          orderId={order.id}
          orderTotal={Number(order.total)}
          orderDeposit={Number(order.deposit)}
          payments={payments || []}
          isAdmin={isAdmin}
        />
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
        {order.tracking_token && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-gray-400 text-xs mb-1">Lien de suivi client</p>
            <p className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded break-all">
              /track/{order.tracking_token}
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}

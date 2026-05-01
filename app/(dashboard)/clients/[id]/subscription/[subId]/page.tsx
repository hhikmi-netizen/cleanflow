export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import OrderStatusBadge from '@/components/orders/OrderStatusBadge'
import Link from 'next/link'
import { ChevronLeft, RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/card'
import RenewButton from '@/components/pricing/RenewButton'

const SUB_TYPE_LABELS: Record<string, string> = {
  monthly: 'Forfait mensuel',
  shirts: 'Forfait chemises',
  kilo: 'Forfait au kilo',
  enterprise: 'Forfait entreprise',
  prepaid: 'Solde prépayé',
}

export default async function SubscriptionHistoryPage({
  params,
}: {
  params: Promise<{ id: string; subId: string }>
}) {
  const { id, subId } = await params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('pressing_id').eq('id', user.id).single()

  const { data: cs } = await supabase
    .from('customer_subscriptions')
    .select('*, subscriptions(*), clients(id, name, phone)')
    .eq('id', subId)
    .eq('pressing_id', userData?.pressing_id || '')
    .single()

  if (!cs) notFound()

  // Verify client matches
  if ((cs.clients as any)?.id !== id) notFound()

  const { data: linkedOrders } = await supabase
    .from('orders')
    .select('id, order_number, status, total, created_at, order_items(service_name, quantity)')
    .eq('customer_sub_id', subId)
    .eq('pressing_id', userData!.pressing_id)
    .order('created_at', { ascending: false })

  const sub = cs.subscriptions as any
  const client = cs.clients as any

  // Usage metrics
  const isPrepaid = sub?.sub_type === 'prepaid'
  const isShirts  = sub?.sub_type === 'shirts'
  const isKilo    = sub?.sub_type === 'kilo'

  const totalCredits = isPrepaid ? (sub.credits || sub.price || 0) : null
  const usedBalance  = isPrepaid ? (totalCredits! - Number(cs.balance)) : null
  const pctUsed = isPrepaid && totalCredits
    ? Math.min(100, Math.round((usedBalance! / totalCredits!) * 100))
    : isShirts && sub.quota_quantity
      ? Math.min(100, Math.round((Number(cs.quota_used) / sub.quota_quantity) * 100))
      : isKilo && sub.quota_kilo
        ? Math.min(100, Math.round((Number(cs.kilo_used) / sub.quota_kilo) * 100))
        : null

  const STATUS_COLORS: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    expired: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-700',
  }
  const STATUS_LABELS: Record<string, string> = {
    active: 'Actif', paused: 'Pausé', expired: 'Expiré', cancelled: 'Annulé',
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/clients/${id}`} className="text-gray-400 hover:text-gray-600">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <RefreshCw size={18} className="text-purple-500" />
            {sub?.name}
          </h1>
          <p className="text-xs text-gray-400">{client?.name} · {SUB_TYPE_LABELS[sub?.sub_type] || sub?.sub_type}</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[cs.status] || 'bg-gray-100 text-gray-600'}`}>
          {STATUS_LABELS[cs.status] || cs.status}
        </span>
      </div>

      {/* Usage card */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Utilisation</h3>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <p className="text-gray-400">Début</p>
            <p className="font-medium text-gray-900">{formatDate(cs.started_at)}</p>
          </div>
          {cs.expires_at && (
            <div>
              <p className="text-gray-400">Expiration</p>
              <p className={`font-medium ${new Date(cs.expires_at) < new Date() ? 'text-red-600' : 'text-gray-900'}`}>
                {formatDate(cs.expires_at)}
              </p>
            </div>
          )}
          {isPrepaid && (
            <>
              <div>
                <p className="text-gray-400">Crédit initial</p>
                <p className="font-medium text-gray-900">{formatCurrency(totalCredits)}</p>
              </div>
              <div>
                <p className="text-gray-400">Solde restant</p>
                <p className={`font-semibold text-lg ${Number(cs.balance) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {formatCurrency(cs.balance)}
                </p>
              </div>
            </>
          )}
          {isShirts && sub.quota_quantity && (
            <>
              <div>
                <p className="text-gray-400">Quota total</p>
                <p className="font-medium text-gray-900">{sub.quota_quantity} pièces</p>
              </div>
              <div>
                <p className="text-gray-400">Utilisé</p>
                <p className="font-semibold text-lg text-blue-700">
                  {cs.quota_used} / {sub.quota_quantity}
                </p>
              </div>
            </>
          )}
          {isKilo && sub.quota_kilo && (
            <>
              <div>
                <p className="text-gray-400">Quota total</p>
                <p className="font-medium text-gray-900">{sub.quota_kilo} kg</p>
              </div>
              <div>
                <p className="text-gray-400">Utilisé</p>
                <p className="font-semibold text-lg text-blue-700">
                  {Number(cs.kilo_used).toFixed(2)} / {sub.quota_kilo} kg
                </p>
              </div>
            </>
          )}
        </div>

        {/* Progress bar */}
        {pctUsed !== null && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{pctUsed}% utilisé</span>
              <span>{100 - pctUsed}% restant</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  pctUsed >= 80 ? 'bg-orange-500' : pctUsed >= 60 ? 'bg-yellow-400' : 'bg-green-500'
                }`}
                style={{ width: `${pctUsed}%` }}
              />
            </div>
          </div>
        )}

        {/* Renew button */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <RenewButton customerSubId={cs.id} clientId={id} />
        </div>
      </Card>

      {/* Linked orders */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Commandes liées ({(linkedOrders || []).length})
        </h3>
        {linkedOrders && linkedOrders.length > 0 ? (
          <div className="space-y-2">
            {linkedOrders.map(order => (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <div className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-gray-50 transition-colors border border-gray-50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-gray-700">{order.order_number}</span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.created_at)}</p>
                    {(order.order_items as any[])?.length > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {(order.order_items as any[]).slice(0, 3).map((i: any) => `${i.service_name}×${i.quantity}`).join(', ')}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-gray-900 ml-3 shrink-0">
                    {formatCurrency(order.total)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">Aucune commande liée à ce forfait</p>
        )}
      </Card>
    </div>
  )
}

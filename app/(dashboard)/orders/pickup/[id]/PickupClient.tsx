'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { quickPayAndDeliver, markAsDelivered } from '@/app/actions/pickup'
import { formatCurrency, formatDateTime, buildWhatsAppUrl, getOrderStatusLabel } from '@/lib/utils'
import { toast } from 'sonner'
import {
  CheckCircle2, CreditCard, Banknote, ArrowRightLeft,
  Package, Loader2, ArrowLeft, MessageCircle, Truck, User, Hash, Clock
} from 'lucide-react'

interface PickupOrder {
  id: string
  order_number: string
  tracking_token: string | null
  status: string
  subtotal: number
  tax: number
  total: number
  deposit: number
  paid: boolean
  payment_method: string
  delivery_mode: string | null
  notes: string | null
  created_at: string
  delivered_at: string | null
  client: { id: string; name: string; phone: string | null; email: string | null } | null
  items: {
    id: string
    service_name: string
    quantity: number
    unit_price: number
    subtotal: number
    item_status: string | null
    textile_type: string | null
    color: string | null
    brand: string | null
    notes: string | null
  }[]
}

interface Payment {
  id: string
  amount: number
  method: string
  notes: string | null
  created_at: string
}

interface Props {
  order: PickupOrder
  payments: Payment[]
  totalPaid: number
  remaining: number
  isAdmin: boolean
}

export default function PickupClient({ order, payments, totalPaid, remaining, isAdmin }: Props) {
  const router = useRouter()
  const [payMethod, setPayMethod] = useState<string>('cash')
  const [isPaying, startPaying] = useTransition()
  const [isDelivering, startDelivering] = useTransition()
  const [delivered, setDelivered] = useState(order.status === 'delivered')
  const [paidDone, setPaidDone] = useState(remaining <= 0)
  const [currentRemaining, setCurrentRemaining] = useState(remaining)

  const isAlreadyDelivered = order.status === 'delivered'
  const clientPhone = order.client?.phone || ''
  const clientName = order.client?.name || 'Client'

  const handleQuickPay = () => {
    if (currentRemaining <= 0) return
    startPaying(async () => {
      const res = await quickPayAndDeliver({
        orderId: order.id,
        amount: currentRemaining,
        method: payMethod,
      })
      if (res.success) {
        toast.success('Paiement enregistre !')
        setPaidDone(true)
        setCurrentRemaining(0)
      } else {
        toast.error(res.error || 'Erreur paiement')
      }
    })
  }

  const handleDeliver = () => {
    startDelivering(async () => {
      const res = await markAsDelivered(order.id)
      if (res.success) {
        toast.success('Commande livree !')
        setDelivered(true)
      } else {
        toast.error(res.error || 'Erreur livraison')
      }
    })
  }

  const whatsappMessage = delivered
    ? 'Bonjour ' + clientName + ', votre commande ' + order.order_number + ' a ete retiree. Merci pour votre confiance ! - CleanFlow'
    : 'Bonjour ' + clientName + ', votre commande ' + order.order_number + ' est prete. Vous pouvez la retirer. - CleanFlow'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header compact */}
      <div className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push('/orders')} className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">Retrait #{order.order_number}</h1>
          <p className="text-sm text-gray-500 truncate">{clientName}</p>
        </div>
        <span className={"px-3 py-1 rounded-full text-xs font-medium " + (
          delivered ? "bg-green-100 text-green-800" :
          order.status === "ready" ? "bg-blue-100 text-blue-800" :
          "bg-yellow-100 text-yellow-800"
        )}>
          {delivered ? "Livre" : getOrderStatusLabel(order.status)}
        </span>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">

        {/* Success banner if delivered */}
        {delivered && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
            <p className="text-xl font-bold text-green-800">Commande livree</p>
            <p className="text-sm text-green-600 mt-1">
              {order.delivered_at ? formatDateTime(order.delivered_at) : "A l'instant"}
            </p>
          </div>
        )}

        {/* Client info */}
        <div className="bg-white rounded-2xl border p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{clientName}</p>
              {clientPhone && <p className="text-sm text-gray-500">{clientPhone}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Hash className="w-4 h-4" />
              <span>{order.order_number}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{formatDateTime(order.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Articles */}
        <div className="bg-white rounded-2xl border p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Package className="w-5 h-5 text-gray-600" />
            Articles ({order.items.length})
          </h2>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.service_name}</p>
                  <p className="text-xs text-gray-500">
                    {[item.textile_type, item.color, item.brand].filter(Boolean).join(' - ')}
                  </p>
                </div>
                <div className="text-right ml-3 shrink-0">
                  <p className="text-sm font-medium">{formatCurrency(item.subtotal)}</p>
                  <p className="text-xs text-gray-400">x{item.quantity}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t flex justify-between items-center">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-bold">{formatCurrency(order.total)}</span>
          </div>
        </div>

        {/* Payment summary */}
        <div className="bg-white rounded-2xl border p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gray-600" />
            Paiement
          </h2>
          <div className="space-y-2 text-sm">
            {order.deposit > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Acompte</span>
                <span className="font-medium text-green-700">{formatCurrency(order.deposit)}</span>
              </div>
            )}
            {payments.map((p) => (
              <div key={p.id} className="flex justify-between">
                <span className="text-gray-600">{p.method === 'cash' ? 'Especes' : p.method === 'card' ? 'Carte' : 'Virement'}</span>
                <span className="font-medium text-green-700">{formatCurrency(p.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t">
              <span className="font-medium">Total paye</span>
              <span className="font-bold text-green-700">{formatCurrency(totalPaid)}</span>
            </div>
            {currentRemaining > 0 && (
              <div className="flex justify-between">
                <span className="font-medium text-red-600">Reste a payer</span>
                <span className="font-bold text-red-600">{formatCurrency(currentRemaining)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick payment if remaining > 0 and not delivered */}
        {currentRemaining > 0 && !isAlreadyDelivered && (
          <div className="bg-white rounded-2xl border p-4">
            <h2 className="font-semibold mb-4 text-center text-lg">
              Encaisser {formatCurrency(currentRemaining)}
            </h2>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { value: 'cash', label: 'Especes', icon: Banknote },
                { value: 'card', label: 'Carte', icon: CreditCard },
                { value: 'transfer', label: 'Virement', icon: ArrowRightLeft },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setPayMethod(value)}
                  className={"flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition " + (
                    payMethod === value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300 text-gray-600"
                  )}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={handleQuickPay}
              disabled={isPaying}
              className="w-full py-4 rounded-xl text-white font-bold text-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {isPaying ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Encaissement...</>
              ) : (
                <>Encaisser {formatCurrency(currentRemaining)}</>
              )}
            </button>
          </div>
        )}

        {/* Deliver button */}
        {(paidDone || currentRemaining <= 0) && !delivered && (
          <button
            onClick={handleDeliver}
            disabled={isDelivering}
            className="w-full py-5 rounded-2xl text-white font-bold text-xl bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-50 transition flex items-center justify-center gap-3 shadow-lg"
          >
            {isDelivering ? (
              <><Loader2 className="w-6 h-6 animate-spin" /> Validation...</>
            ) : (
              <><Truck className="w-6 h-6" /> Marquer comme livree</>
            )}
          </button>
        )}

        {/* WhatsApp button */}
        {clientPhone && (
          <a
            href={buildWhatsAppUrl(clientPhone, whatsappMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 rounded-2xl font-bold text-lg bg-green-500 hover:bg-green-600 text-white transition flex items-center justify-center gap-3"
          >
            <MessageCircle className="w-6 h-6" />
            {delivered ? 'Confirmer retrait WhatsApp' : 'Notifier client WhatsApp'}
          </a>
        )}

        {/* Link to full order */}
        <button
          onClick={() => router.push('/orders/' + order.id)}
          className="w-full py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition text-center"
        >
          Voir fiche commande complete
        </button>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { formatCurrency, formatDate, getOrderStatusLabel } from '@/lib/utils'
import QRCode from 'react-qr-code'
import { MessageCircle, MapPin, Phone } from 'lucide-react'

const STATUS_STEPS = ['pending', 'in_progress', 'ready', 'delivered'] as const

function buildWhatsApp(phone: string, msg: string) {
  const clean = phone.replace(/\D/g, '')
  return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`
}

export default async function TrackingPage({ params }: { params: { token: string } }) {
  // Anon key — seuls les champs non-sensibles sont exposés
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, status, total, deposit, paid, created_at, pickup_date, pressing_id, order_items(service_name, quantity, subtotal, article_code), pressings(name, phone, address), clients(name, phone)')
    .eq('tracking_token', params.token)
    .single()

  if (!order) notFound()

  const pressing = order.pressings as any
  const client = order.clients as any
  const items = (order.order_items as any[]) || []

  // Numéro WA Business (priorité sur téléphone général du pressing)
  const { data: pressingSettings } = await supabase
    .from('settings')
    .select('whatsapp_phone')
    .eq('pressing_id', (order as any).pressing_id)
    .single()

  const contactPhone = pressingSettings?.whatsapp_phone || pressing?.phone

  // Solde restant
  const { data: payments } = await supabase
    .from('payments')
    .select('amount')
    .eq('order_id', order.id)
  const totalPaid = Number(order.deposit || 0) + (payments || []).reduce((s: number, p: any) => s + Number(p.amount), 0)
  const balance = Math.max(0, Number(order.total) - totalPaid)

  const statusIndex = STATUS_STEPS.indexOf(order.status as any)
  const isCancelled = order.status === 'cancelled'

  const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/track/${params.token}`
  const whatsappMsg = `Bonjour, je voudrais des informations sur ma commande *${order.order_number}*.\n\nMerci 🙏`

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto space-y-4">

        {/* Header pressing */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-blue-600">{pressing?.name || 'Pressing'}</h1>
          {pressing?.address && (
            <p className="text-sm text-gray-500 mt-1 flex items-center justify-center gap-1">
              <MapPin size={13} /> {pressing.address}
            </p>
          )}
          {pressing?.phone && (
            <a href={`tel:${pressing.phone}`} className="text-sm text-blue-500 flex items-center justify-center gap-1 mt-1 hover:underline">
              <Phone size={13} /> {pressing.phone}
            </a>
          )}
        </div>

        {/* Carte commande */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Bandeau statut */}
          <div className={`px-5 py-3 text-center ${isCancelled ? 'bg-red-50' : 'bg-blue-50'}`}>
            <span className={`text-sm font-semibold ${isCancelled ? 'text-red-600' : 'text-blue-700'}`}>
              {getOrderStatusLabel(order.status)}
            </span>
          </div>

          <div className="p-5 space-y-4">
            {/* N° commande + QR */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">N° Commande</p>
                <p className="text-xl font-bold font-mono text-gray-900">{order.order_number}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.created_at)}</p>
              </div>
              <QRCode value={trackingUrl} size={72} />
            </div>

            {/* Barre de progression */}
            {!isCancelled && (
              <div className="flex justify-between gap-1">
                {STATUS_STEPS.map((s, i) => (
                  <div key={s} className="flex flex-col items-center flex-1">
                    <div className={`w-full h-1.5 rounded-full ${i <= statusIndex ? 'bg-blue-500' : 'bg-gray-200'}`} />
                    <p className={`text-[10px] mt-1 text-center leading-tight ${i <= statusIndex ? 'text-blue-600 font-medium' : 'text-gray-300'}`}>
                      {s === 'pending' ? 'Reçu' : s === 'in_progress' ? 'Traitement' : s === 'ready' ? 'Prêt' : 'Livré'}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Client */}
            {client?.name && (
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-sm font-medium text-gray-900">{client.name}</p>
              </div>
            )}

            {/* Articles */}
            <div className="space-y-1.5 border-t pt-3">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Articles</p>
              {items.map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-800">{item.service_name}</span>
                    {item.quantity > 1 && <span className="text-gray-400 text-xs">×{item.quantity}</span>}
                    {item.article_code && (
                      <span className="font-mono text-xs text-blue-500">[{item.article_code}]</span>
                    )}
                  </div>
                  <span className="text-gray-600">{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
            </div>

            {/* Résumé financier */}
            <div className="border-t pt-3 space-y-1">
              <div className="flex justify-between text-sm font-bold text-gray-900">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Déjà payé</span>
                <span>{formatCurrency(totalPaid)}</span>
              </div>
              {balance > 0 ? (
                <div className="flex justify-between text-sm font-semibold text-orange-600">
                  <span>Reste à payer</span>
                  <span>{formatCurrency(balance)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-sm font-semibold text-green-600">
                  <span>Entièrement payé</span>
                  <span>✓</span>
                </div>
              )}
            </div>

            {/* Date retrait prévue */}
            {order.pickup_date && (
              <div className="bg-blue-50 rounded-lg px-3 py-2 text-sm text-blue-700">
                📅 Retrait prévu le {formatDate(order.pickup_date)}
              </div>
            )}
          </div>
        </div>

        {/* Bouton WhatsApp — contacter le pressing */}
        {contactPhone && (
          <a
            href={buildWhatsApp(contactPhone, whatsappMsg)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold transition-colors shadow-sm"
          >
            <MessageCircle size={18} />
            Contacter le pressing via WhatsApp
          </a>
        )}

        <p className="text-center text-xs text-gray-300 pb-4">CleanFlow · Suivi commande</p>
      </div>
    </div>
  )
}

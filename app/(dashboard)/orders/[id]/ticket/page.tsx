export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import PrintButton from '@/components/orders/PrintButton'
import TicketQR from '@/components/orders/TicketQR'
import Link from 'next/link'
import { ChevronLeft, FileText } from 'lucide-react'

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('pressing_id').eq('id', user.id).single()

  const { data: order } = await supabase
    .from('orders')
    .select('*, clients(name, phone), order_items(*)')
    .eq('id', id)
    .eq('pressing_id', userData?.pressing_id || '')
    .single()

  if (!order) notFound()

  const { data: pressing } = await supabase
    .from('pressings')
    .select('name, phone, address, currency')
    .eq('id', userData!.pressing_id)
    .single()

  const { data: settings } = await supabase
    .from('settings')
    .select('invoice_footer')
    .eq('pressing_id', userData!.pressing_id)
    .single()

  const items = (order.order_items || []) as any[]
  const remaining = Math.max(0, Number(order.total) - Number(order.deposit))
  const cur = pressing?.currency

  return (
    <>
      {/* CSS thermique 80mm — injecté dans le document pour window.print() */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 3mm 3mm;
          }
          body {
            width: 80mm;
            font-size: 10pt;
            background: white !important;
          }
          nav, aside, header, .print-hide {
            display: none !important;
          }
          .ticket-wrapper {
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Contrôles — cachés à l'impression */}
      <div className="print-hide flex items-center gap-3 mb-6 px-4">
        <Link
          href={`/orders/${order.id}`}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm"
        >
          <ChevronLeft size={16} /> Retour
        </Link>
        <Link
          href={`/orders/${order.id}/invoice`}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          <FileText size={13} />
          Facture A4
        </Link>
        <PrintButton />
      </div>

      {/* ── Ticket thermique 80mm ── */}
      <div className="ticket-wrapper max-w-[302px] mx-auto bg-white p-4 shadow-sm border border-gray-200 font-mono">

        {/* En-tête pressing */}
        <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
          <p className="font-bold text-sm text-gray-900 uppercase tracking-wide leading-tight">
            {pressing?.name}
          </p>
          {pressing?.address && (
            <p className="text-[10px] text-gray-600 mt-0.5 leading-tight">{pressing.address}</p>
          )}
          {pressing?.phone && (
            <p className="text-[10px] text-gray-600">Tél : {pressing.phone}</p>
          )}
        </div>

        {/* Numéro commande */}
        <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Bon de dépôt</p>
          <p className="text-2xl font-black text-gray-900 tracking-wider leading-none">
            {order.order_number}
          </p>
          <div className="mt-2 space-y-0.5">
            <p className="text-[10px] text-gray-600">
              Dépôt : <span className="font-bold">{formatDate(order.created_at)}</span>
            </p>
            {order.pickup_date && (
              <p className="text-[10px] text-gray-600">
                Retrait prévu :{' '}
                <span className="font-bold text-blue-700">{formatDate(order.pickup_date)}</span>
              </p>
            )}
          </div>
        </div>

        {/* Client */}
        {order.clients && (
          <div className="border-b border-dashed border-gray-400 pb-3 mb-3">
            <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Client</p>
            <p className="text-xs font-bold text-gray-900">{order.clients.name}</p>
            {order.clients.phone && (
              <p className="text-[10px] text-gray-600">{order.clients.phone}</p>
            )}
          </div>
        )}

        {/* Articles */}
        <div className="border-b border-dashed border-gray-400 pb-3 mb-3">
          <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">Articles</p>
          <div className="space-y-1">
            {items.map((item: any, i: number) => (
              <div key={i} className="flex justify-between items-baseline text-[10px]">
                <span className="text-gray-800 flex-1 mr-2 leading-tight">
                  {item.quantity > 1 ? `${item.quantity}× ` : ''}
                  {item.service_name}
                </span>
                <span className="text-gray-900 shrink-0 font-bold">
                  {formatCurrency(item.subtotal, cur)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Totaux */}
        <div className="border-b border-dashed border-gray-400 pb-3 mb-3 space-y-1">
          {Number((order as any).discount_amount) > 0 && (
            <div className="flex justify-between text-[10px] text-green-700">
              <span>Remise</span>
              <span>− {formatCurrency((order as any).discount_amount, cur)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-black text-gray-900">
            <span>TOTAL</span>
            <span>{formatCurrency(order.total, cur)}</span>
          </div>
          {Number(order.deposit) > 0 && (
            <div className="flex justify-between text-[10px] text-gray-600">
              <span>Acompte versé</span>
              <span>− {formatCurrency(order.deposit, cur)}</span>
            </div>
          )}
          {Number(order.deposit) > 0 && !order.paid && (
            <div className="flex justify-between text-[10px] font-bold text-orange-600">
              <span>Reste à payer</span>
              <span>{formatCurrency(remaining, cur)}</span>
            </div>
          )}
          {order.paid && (
            <p className="text-center text-[10px] font-bold text-green-600 mt-1">✓ SOLDÉ</p>
          )}
        </div>

        {/* QR Code suivi */}
        {order.tracking_token && (
          <div className="flex justify-center border-b border-dashed border-gray-400 pb-3 mb-3">
            <TicketQR trackingToken={order.tracking_token} />
          </div>
        )}

        {/* Pied de page */}
        <div className="text-center">
          <p className="text-[9px] text-gray-500 italic leading-tight">
            {settings?.invoice_footer || 'Merci de votre confiance !'}
          </p>
          <p className="text-[8px] text-gray-400 mt-1">
            Conservez ce ticket · CleanFlow
          </p>
        </div>
      </div>
    </>
  )
}

export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { formatCurrency, formatDate, getPaymentLabel } from '@/lib/utils'
import PrintButton from '@/components/orders/PrintButton'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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
    .select('*, clients(name, phone, email, address, client_type, ice), order_items(*)')
    .eq('id', id)
    .eq('pressing_id', userData?.pressing_id || '')
    .single()

  if (!order) notFound()

  const { data: pressing } = await supabase
    .from('pressings')
    .select('name, phone, email, address, ice, currency, tax_rate')
    .eq('id', userData!.pressing_id)
    .single()

  const { data: settings } = await supabase
    .from('settings')
    .select('invoice_footer')
    .eq('pressing_id', userData!.pressing_id)
    .single()

  const items = order.order_items || []

  return (
    <>
      {/* Boutons hors impression */}
      <div className="print:hidden flex items-center gap-4 mb-6 px-4">
        <Link href={`/orders/${order.id}`} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm">
          <ChevronLeft size={16} /> Retour
        </Link>
        <Link
          href={`/orders/${order.id}/ticket`}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          🧾 Ticket 80mm
        </Link>
        <PrintButton />
      </div>

      {/* Ticket imprimable */}
      <div className="max-w-lg mx-auto bg-white p-8 print:p-4 print:max-w-none shadow-sm border border-gray-200 print:border-0 print:shadow-none">

        {/* En-tête pressing */}
        <div className="text-center border-b border-gray-200 pb-5 mb-5">
          <h1 className="text-2xl font-bold text-gray-900">{pressing?.name}</h1>
          {pressing?.address && <p className="text-sm text-gray-500 mt-1">{pressing.address}</p>}
          <div className="flex items-center justify-center gap-4 mt-1">
            {pressing?.phone && <p className="text-sm text-gray-500">Tél: {pressing.phone}</p>}
            {pressing?.email && <p className="text-sm text-gray-500">{pressing.email}</p>}
          </div>
          {pressing?.ice && <p className="text-xs text-gray-400 mt-1">ICE: {pressing.ice}</p>}
        </div>

        {/* Titre facture */}
        <div className="flex justify-between items-start mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {order.clients?.client_type === 'business' ? 'FACTURE' : 'BON DE COMMANDE'}
            </h2>
            {(order as any).invoice_number && (
              <p className="text-sm font-mono text-blue-700 mt-0.5">{(order as any).invoice_number}</p>
            )}
            <p className="text-xs font-mono text-gray-400 mt-0.5">Réf. {order.order_number}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Date : {formatDate(order.created_at)}</p>
            {order.pickup_date && (
              <p className="text-sm text-gray-500">Retrait prévu : {formatDate(order.pickup_date)}</p>
            )}
            {(order as any).payment_terms && (order as any).payment_terms !== 'immediate' && (
              <p className="text-xs text-gray-500 mt-0.5">
                {{'net15':'Net 15 jours','net30':'Net 30 jours','net45':'Net 45 jours','net60':'Net 60 jours'}[(order as any).payment_terms as string]}
              </p>
            )}
            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded font-medium ${
              order.paid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
            }`}>
              {order.paid ? 'PAYÉ' : 'EN ATTENTE'}
            </span>
          </div>
        </div>

        {/* Infos client */}
        {order.clients && (
          <div className="bg-gray-50 rounded-lg p-4 mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Client</p>
            <p className="font-semibold text-gray-900">{order.clients.name}</p>
            <p className="text-sm text-gray-600">{order.clients.phone}</p>
            {order.clients.email && <p className="text-sm text-gray-500">{order.clients.email}</p>}
            {order.clients.address && <p className="text-sm text-gray-500">{order.clients.address}</p>}
            {order.clients.client_type === 'business' && order.clients.ice && (
              <p className="text-xs text-gray-400 mt-1">ICE: {order.clients.ice}</p>
            )}
          </div>
        )}

        {/* Articles */}
        <table className="w-full mb-5">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Article</th>
              <th className="text-center py-2 text-xs font-semibold text-gray-500 uppercase">Qté</th>
              <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">P.U.</th>
              <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="py-2 text-sm text-gray-900">{item.service_name}</td>
                <td className="py-2 text-sm text-center text-gray-600">{item.quantity}</td>
                <td className="py-2 text-sm text-right text-gray-600">{formatCurrency(item.unit_price, pressing?.currency)}</td>
                <td className="py-2 text-sm text-right font-medium text-gray-900">{formatCurrency(item.subtotal, pressing?.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totaux */}
        <div className="border-t-2 border-gray-200 pt-3 space-y-1.5">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Sous-total</span>
            <span>{formatCurrency(order.subtotal, pressing?.currency)}</span>
          </div>
          {Number((order as any).discount_amount) > 0 && (
            <div className="flex justify-between text-sm text-green-700">
              <span>
                Remise
                {(order as any).discount_label ? ` — ${(order as any).discount_label}` : ''}
                {(order as any).discount_type === 'percentage' ? ` (${(order as any).discount_value}%)` : ''}
              </span>
              <span>− {formatCurrency((order as any).discount_amount, pressing?.currency)}</span>
            </div>
          )}
          {Number(order.tax) > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>TVA ({pressing?.tax_rate}%)</span>
              <span>{formatCurrency(order.tax, pressing?.currency)}</span>
            </div>
          )}
          {Number(order.deposit) > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>Acompte versé</span>
              <span>− {formatCurrency(order.deposit, pressing?.currency)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg text-gray-900 border-t border-gray-200 pt-2 mt-2">
            <span>TOTAL</span>
            <span>{formatCurrency(order.total, pressing?.currency)}</span>
          </div>
          {Number(order.deposit) > 0 && !order.paid && (
            <div className="flex justify-between font-semibold text-blue-600">
              <span>Reste à payer</span>
              <span>{formatCurrency(Math.max(0, Number(order.total) - Number(order.deposit)), pressing?.currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-gray-500 mt-1">
            <span>Mode de paiement</span>
            <span>{getPaymentLabel(order.payment_method)}</span>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="mt-4 p-3 bg-yellow-50 rounded text-sm text-gray-700">
            <p className="font-medium text-xs text-gray-400 uppercase mb-1">Notes</p>
            {order.notes}
          </div>
        )}

        {/* Pied de page */}
        <div className="mt-8 pt-4 border-t border-dashed border-gray-200 text-center">
          <p className="text-sm text-gray-500 italic">
            {settings?.invoice_footer || 'Merci de votre confiance !'}
          </p>
          <p className="text-xs text-gray-300 mt-2">CleanFlow · {new Date().getFullYear()}</p>
        </div>
      </div>

    </>
  )
}

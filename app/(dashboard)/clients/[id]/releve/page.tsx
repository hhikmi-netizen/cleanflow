export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import PrintButton from '@/components/orders/PrintButton'
import ReleveFilter from '@/components/clients/ReleveFilter'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function ClientReleve({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ from?: string, to?: string }> }) {
  const { id } = await params
  const sp = await searchParams
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('pressing_id').eq('id', user.id).single()

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('pressing_id', userData?.pressing_id || '')
    .single()

  if (!client) notFound()

  const { data: pressing } = await supabase
    .from('pressings')
    .select('name, phone, email, address, ice, currency')
    .eq('id', userData!.pressing_id)
    .single()

  const dateFrom = sp.from || ''
  const dateTo = sp.to || ''

  let ordersQuery = supabase
    .from('orders')
    .select('id, order_number, status, total, deposit, paid, created_at, payment_terms, invoice_number')
    .eq('client_id', client.id)
    .eq('pressing_id', userData!.pressing_id)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: true })

  if (dateFrom) ordersQuery = ordersQuery.gte('created_at', dateFrom)
  if (dateTo) ordersQuery = ordersQuery.lte('created_at', dateTo + 'T23:59:59')

  const { data: orders } = await ordersQuery

  const orderIds = (orders || []).map(o => o.id)
  const { data: payments } = orderIds.length > 0
    ? await supabase.from('payments').select('order_id, amount').in('order_id', orderIds)
    : { data: [] }

  const paymentsByOrder = (payments || []).reduce<Record<string, number>>((acc, p) => {
    acc[p.order_id] = (acc[p.order_id] || 0) + Number(p.amount)
    return acc
  }, {})

  const rows = (orders || []).map(o => {
    const paid = Number(o.deposit || 0) + (paymentsByOrder[o.id] || 0)
    const remaining = Math.max(0, Number(o.total) - paid)
    return { ...o, paidAmount: paid, remaining }
  })

  const totalDue = rows.reduce((s, r) => s + Number(r.total), 0)
  const totalPaid = rows.reduce((s, r) => s + r.paidAmount, 0)
  const totalOutstanding = rows.reduce((s, r) => s + r.remaining, 0)

  const TERMS_LABEL: Record<string, string> = {
    immediate: 'Paiement immédiat',
    net15: 'Net 15 jours',
    net30: 'Net 30 jours',
    net45: 'Net 45 jours',
    net60: 'Net 60 jours',
  }

  return (
    <>
      <div className="print:hidden flex flex-col gap-3 mb-6 px-4">
        <div className="flex items-center gap-4">
          <Link href={`/clients/${client.id}`} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm">
            <ChevronLeft size={16} /> Retour
          </Link>
          <PrintButton />
          {client.client_type === 'business' && (
            <Link
              href={`/clients/${client.id}/batch-invoice`}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Facture groupée →
            </Link>
          )}
        </div>
        <ReleveFilter clientId={client.id} defaultFrom={dateFrom} defaultTo={dateTo} />
      </div>

      <div className="max-w-3xl mx-auto bg-white p-8 print:p-4 print:max-w-none shadow-sm border border-gray-200 print:border-0 print:shadow-none">

        {/* Header */}
        <div className="flex justify-between items-start border-b border-gray-200 pb-5 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{pressing?.name}</h1>
            {pressing?.address && <p className="text-sm text-gray-500 mt-0.5">{pressing.address}</p>}
            {pressing?.phone && <p className="text-sm text-gray-500">{pressing.phone}</p>}
            {pressing?.ice && <p className="text-xs text-gray-400 mt-0.5">ICE: {pressing.ice}</p>}
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Relevé de compte</h2>
            <p className="text-sm text-gray-500 mt-1">Édité le {formatDate(new Date().toISOString())}</p>
            {(dateFrom || dateTo) && (
              <p className="text-xs text-gray-400 mt-0.5">
                Période : {dateFrom ? formatDate(dateFrom) : '…'} → {dateTo ? formatDate(dateTo) : '…'}
              </p>
            )}
          </div>
        </div>

        {/* Client info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Client</p>
          <p className="font-bold text-gray-900 text-lg">{client.name}</p>
          {client.phone && <p className="text-sm text-gray-600">{client.phone}</p>}
          {client.email && <p className="text-sm text-gray-500">{client.email}</p>}
          {client.address && <p className="text-sm text-gray-500">{client.address}</p>}
          {client.ice && <p className="text-xs text-gray-400 mt-1">ICE: {client.ice}</p>}
          {(client as any).credit_limit && (
            <p className="text-xs text-blue-600 mt-1">
              Plafond crédit: {formatCurrency((client as any).credit_limit, pressing?.currency)}
            </p>
          )}
        </div>

        {/* Transactions table */}
        <table className="w-full mb-6 text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Date</th>
              <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Réf.</th>
              <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Conditions</th>
              <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Montant</th>
              <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Réglé</th>
              <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Solde</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className={`border-b border-gray-100 ${row.remaining > 0 ? 'bg-orange-50' : ''}`}>
                <td className="py-2 text-gray-600">{formatDate(row.created_at)}</td>
                <td className="py-2">
                  <div>
                    <span className="font-mono text-gray-800 text-xs">{row.order_number}</span>
                    {(row as any).invoice_number && (
                      <span className="text-xs text-blue-600 ml-1 font-mono">{(row as any).invoice_number}</span>
                    )}
                  </div>
                </td>
                <td className="py-2 text-xs text-gray-500">
                  {TERMS_LABEL[(row as any).payment_terms || 'immediate'] || (row as any).payment_terms}
                </td>
                <td className="py-2 text-right font-medium text-gray-900">
                  {formatCurrency(row.total, pressing?.currency)}
                </td>
                <td className="py-2 text-right text-green-700">
                  {formatCurrency(row.paidAmount, pressing?.currency)}
                </td>
                <td className={`py-2 text-right font-semibold ${row.remaining > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                  {row.remaining > 0 ? formatCurrency(row.remaining, pressing?.currency) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary */}
        <div className="border-t-2 border-gray-200 pt-4 space-y-2 max-w-xs ml-auto">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Total facturé</span>
            <span className="font-medium">{formatCurrency(totalDue, pressing?.currency)}</span>
          </div>
          <div className="flex justify-between text-sm text-green-700">
            <span>Total réglé</span>
            <span className="font-medium">{formatCurrency(totalPaid, pressing?.currency)}</span>
          </div>
          <div className={`flex justify-between font-bold text-lg border-t border-gray-200 pt-2 ${totalOutstanding > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
            <span>Solde dû</span>
            <span>{formatCurrency(totalOutstanding, pressing?.currency)}</span>
          </div>
          {(client as any).credit_limit && totalOutstanding > Number((client as any).credit_limit) && (
            <p className="text-xs text-red-600 font-medium text-right">
              ⚠ Plafond crédit dépassé
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-10 pt-4 border-t border-dashed border-gray-200 text-center">
          <p className="text-xs text-gray-400">Document généré par CleanFlow · {new Date().getFullYear()}</p>
        </div>
      </div>
    </>
  )
}

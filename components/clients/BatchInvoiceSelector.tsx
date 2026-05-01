'use client'

import { useState, useMemo } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'

const TERMS_LABEL: Record<string, string> = {
  immediate: 'Paiement immédiat',
  net15: 'Net 15 jours',
  net30: 'Net 30 jours',
  net45: 'Net 45 jours',
  net60: 'Net 60 jours',
}

interface OrderRow {
  id: string
  order_number: string
  invoice_number?: string | null
  status: string
  total: number
  subtotal: number
  tax: number
  deposit: number
  paid: boolean
  created_at: string
  payment_terms?: string | null
  order_items: any[]
  paidAmount: number
  remaining: number
}

interface Props {
  client: any
  orders: OrderRow[]
  pressing: any
  invoiceFooter?: string | null
}

export default function BatchInvoiceSelector({ client, orders, pressing, invoiceFooter }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(orders.filter(o => o.remaining > 0).map(o => o.id))
  )
  const [filterUnpaid, setFilterUnpaid] = useState(false)
  const [paymentTerms, setPaymentTerms] = useState('immediate')

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }
  const selectAll = () => setSelected(new Set(orders.map(o => o.id)))
  const selectNone = () => setSelected(new Set())

  const displayedOrders = filterUnpaid ? orders.filter(o => o.remaining > 0) : orders
  const chosenOrders = orders.filter(o => selected.has(o.id))

  const allItems = chosenOrders.flatMap(o => (o.order_items || []).map((item: any) => ({
    ...item,
    orderNumber: o.order_number,
    orderDate: o.created_at,
  })))

  const grandTotal = chosenOrders.reduce((s, o) => s + Number(o.total), 0)
  const grandTax = chosenOrders.reduce((s, o) => s + Number(o.tax || 0), 0)
  const grandSubtotal = chosenOrders.reduce((s, o) => s + Number(o.subtotal || 0), 0)
  const totalPaid = chosenOrders.reduce((s, o) => s + o.paidAmount, 0)
  const totalRemaining = chosenOrders.reduce((s, o) => s + o.remaining, 0)

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Selection panel — hidden on print */}
      <div className="print:hidden bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Facture groupée — {client.name}</h2>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">Tout sélectionner</button>
            <span className="text-gray-300">|</span>
            <button onClick={selectNone} className="text-xs text-gray-500 hover:underline">Désélectionner</button>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={filterUnpaid}
              onChange={e => setFilterUnpaid(e.target.checked)}
              className="rounded"
            />
            Afficher seulement les impayés
          </label>
          <div className="flex items-center gap-2 text-sm">
            <label className="text-gray-600">Conditions de paiement :</label>
            <select
              value={paymentTerms}
              onChange={e => setPaymentTerms(e.target.value)}
              className="h-8 px-2 rounded border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(TERMS_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {displayedOrders.map(o => (
            <label
              key={o.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selected.has(o.id)
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(o.id)}
                onChange={() => toggle(o.id)}
                className="rounded shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-700">{o.order_number}</span>
                  {o.invoice_number && (
                    <span className="text-xs font-mono text-blue-600">{o.invoice_number}</span>
                  )}
                  <span className="text-xs text-gray-400">{formatDate(o.created_at)}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(o.total, pressing?.currency)}</p>
                {o.remaining > 0 && (
                  <p className="text-xs text-orange-500">Reste {formatCurrency(o.remaining, pressing?.currency)}</p>
                )}
              </div>
            </label>
          ))}
        </div>

        {chosenOrders.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-2">Aucune commande sélectionnée</p>
        )}
      </div>

      {/* Printable invoice */}
      {chosenOrders.length > 0 && (
        <div className="bg-white p-8 print:p-4 shadow-sm border border-gray-200 print:border-0 print:shadow-none">

          {/* Header */}
          <div className="flex justify-between items-start border-b border-gray-200 pb-5 mb-5">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{pressing?.name}</h1>
              {pressing?.address && <p className="text-sm text-gray-500 mt-0.5">{pressing.address}</p>}
              {pressing?.phone && <p className="text-sm text-gray-500">{pressing.phone}</p>}
              {pressing?.email && <p className="text-sm text-gray-500">{pressing.email}</p>}
              {pressing?.ice && <p className="text-xs text-gray-400 mt-0.5">ICE: {pressing.ice}</p>}
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-gray-900 uppercase">FACTURE GROUPÉE</h2>
              <p className="text-sm text-gray-500 mt-1">
                {chosenOrders.length} commande{chosenOrders.length > 1 ? 's' : ''}
              </p>
              <p className="text-sm text-gray-500">Date : {formatDate(new Date().toISOString())}</p>
              <p className="text-xs text-gray-400 mt-1">{TERMS_LABEL[paymentTerms]}</p>
            </div>
          </div>

          {/* Client */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Facturé à</p>
            <p className="font-bold text-gray-900 text-base">{client.name}</p>
            {client.phone && <p className="text-sm text-gray-600">{client.phone}</p>}
            {client.email && <p className="text-sm text-gray-500">{client.email}</p>}
            {client.address && <p className="text-sm text-gray-500">{client.address}</p>}
            {client.ice && <p className="text-xs text-gray-400 mt-1">ICE: {client.ice}</p>}
          </div>

          {/* Items table */}
          <table className="w-full mb-5 text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Réf.</th>
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Article</th>
                <th className="text-center py-2 text-xs font-semibold text-gray-500 uppercase">Qté</th>
                <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">P.U.</th>
                <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody>
              {allItems.map((item: any, idx: number) => (
                <tr key={`${item.id}-${idx}`} className="border-b border-gray-100">
                  <td className="py-1.5 text-xs font-mono text-gray-400">{item.orderNumber}</td>
                  <td className="py-1.5 text-gray-900">{item.service_name}</td>
                  <td className="py-1.5 text-center text-gray-600">{item.quantity}</td>
                  <td className="py-1.5 text-right text-gray-600">{formatCurrency(item.unit_price, pressing?.currency)}</td>
                  <td className="py-1.5 text-right font-medium text-gray-900">{formatCurrency(item.subtotal, pressing?.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="border-t-2 border-gray-200 pt-3 space-y-1.5 max-w-xs ml-auto">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Sous-total HT</span>
              <span>{formatCurrency(grandSubtotal, pressing?.currency)}</span>
            </div>
            {grandTax > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>TVA ({pressing?.tax_rate}%)</span>
                <span>{formatCurrency(grandTax, pressing?.currency)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg text-gray-900 border-t border-gray-200 pt-2 mt-1">
              <span>TOTAL TTC</span>
              <span>{formatCurrency(grandTotal, pressing?.currency)}</span>
            </div>
            {totalPaid > 0 && (
              <div className="flex justify-between text-sm text-green-700">
                <span>Déjà réglé</span>
                <span>− {formatCurrency(totalPaid, pressing?.currency)}</span>
              </div>
            )}
            {totalRemaining > 0 && (
              <div className="flex justify-between font-semibold text-orange-600 border-t border-gray-200 pt-2">
                <span>Reste à payer</span>
                <span>{formatCurrency(totalRemaining, pressing?.currency)}</span>
              </div>
            )}
          </div>

          {/* Order refs */}
          <div className="mt-5 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Commandes incluses :</p>
            <p className="text-xs font-mono text-gray-500">
              {chosenOrders.map(o => o.invoice_number || o.order_number).join(' · ')}
            </p>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-dashed border-gray-200 text-center">
            <p className="text-sm text-gray-500 italic">
              {invoiceFooter || 'Merci de votre confiance !'}
            </p>
            <p className="text-xs text-gray-300 mt-2">CleanFlow · {new Date().getFullYear()}</p>
          </div>
        </div>
      )}
    </div>
  )
}

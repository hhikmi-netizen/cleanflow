export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import PrintButton from '@/components/orders/PrintButton'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  draft:   'BROUILLON',
  sent:    'ENVOYÉ',
  paid:    'PAYÉ',
  partial: 'PARTIEL',
  unpaid:  'IMPAYÉ',
}
const STATUS_COLORS: Record<string, string> = {
  draft:   'bg-gray-100 text-gray-600',
  sent:    'bg-blue-100 text-blue-700',
  paid:    'bg-green-100 text-green-700',
  partial: 'bg-yellow-100 text-yellow-700',
  unpaid:  'bg-red-100 text-red-700',
}
const PAYMENT_TERMS_LABELS: Record<string, string> = {
  immediate: 'Paiement immédiat',
  net15:     'Net 15 jours',
  net30:     'Net 30 jours',
  net45:     'Net 45 jours',
  net60:     'Net 60 jours',
}

export default async function BillingDocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('pressing_id').eq('id', user.id).single()

  const { data: doc } = await supabase
    .from('billing_documents')
    .select('*')
    .eq('id', id)
    .eq('pressing_id', userData?.pressing_id || '')
    .single()

  if (!doc) notFound()

  const [itemsRes, clientRes, pressingRes, settingsRes] = await Promise.all([
    supabase
      .from('billing_document_items')
      .select('*')
      .eq('document_id', id)
      .order('order_date'),
    supabase
      .from('clients')
      .select('name, phone, email, address, ice, client_type')
      .eq('id', doc.client_id)
      .single(),
    supabase
      .from('pressings')
      .select('name, phone, email, address, ice, currency')
      .eq('id', userData!.pressing_id)
      .single(),
    supabase
      .from('settings')
      .select('invoice_footer')
      .eq('pressing_id', userData!.pressing_id)
      .single(),
  ])

  const items    = itemsRes.data || []
  const client   = clientRes.data
  const pressing = pressingRes.data
  const settings = settingsRes.data

  const currency    = pressing?.currency || 'DH'
  const isReleve    = doc.doc_type === 'REL'
  const docTitle    = isReleve ? 'RELEVÉ DE COMPTE' : 'FACTURE PÉRIODIQUE'

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          .print-hidden { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* Actions hors impression */}
      <div className="print-hidden flex items-center gap-4 mb-6 px-4">
        <Link href={`/clients/${doc.client_id}`}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm">
          <ChevronLeft size={16} /> Retour fiche client
        </Link>
        <PrintButton />
      </div>

      {/* Document A4 */}
      <div className="max-w-3xl mx-auto bg-white p-10 print:p-0 shadow-sm border border-gray-200 print:border-0 print:shadow-none">

        {/* En-tête pressing */}
        <div className="flex justify-between items-start border-b-2 border-gray-900 pb-5 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{pressing?.name}</h1>
            {pressing?.address && <p className="text-sm text-gray-500 mt-0.5">{pressing.address}</p>}
            {pressing?.phone  && <p className="text-sm text-gray-500">Tél : {pressing.phone}</p>}
            {pressing?.email  && <p className="text-sm text-gray-500">{pressing.email}</p>}
            {pressing?.ice    && <p className="text-xs text-gray-400 mt-1">ICE : {pressing.ice}</p>}
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-gray-900 uppercase">{docTitle}</h2>
            <p className="text-base font-mono text-blue-700 mt-1">{doc.document_number}</p>
            <p className="text-sm text-gray-500 mt-1">
              Période : {formatDate(doc.period_start)} – {formatDate(doc.period_end)}
            </p>
            <p className="text-sm text-gray-400">Émis le {formatDate(doc.created_at)}</p>
            <span className={`inline-block mt-2 text-xs px-2.5 py-0.5 rounded font-semibold uppercase tracking-wide ${STATUS_COLORS[doc.status] || 'bg-gray-100 text-gray-600'}`}>
              {STATUS_LABELS[doc.status] || doc.status}
            </span>
          </div>
        </div>

        {/* Infos client */}
        {client && (
          <div className="mb-7 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Destinataire</p>
            <p className="font-semibold text-gray-900">{client.name}</p>
            {client.phone   && <p className="text-sm text-gray-600">{client.phone}</p>}
            {client.email   && <p className="text-sm text-gray-500">{client.email}</p>}
            {client.address && <p className="text-sm text-gray-500">{client.address}</p>}
            {client.ice     && <p className="text-xs text-gray-400 mt-1">ICE : {client.ice}</p>}
          </div>
        )}

        {/* Conditions de paiement */}
        {doc.payment_terms && doc.payment_terms !== 'immediate' && (
          <p className="text-sm text-gray-600 mb-4">
            <span className="font-medium">Conditions : </span>
            {PAYMENT_TERMS_LABELS[doc.payment_terms] || doc.payment_terms}
          </p>
        )}

        {/* Tableau des commandes */}
        <table className="w-full mb-6 text-sm">
          <thead>
            <tr className="border-b-2 border-gray-900">
              <th className="text-left py-2.5 text-xs font-semibold text-gray-500 uppercase">Date</th>
              <th className="text-left py-2.5 text-xs font-semibold text-gray-500 uppercase">Commande</th>
              <th className="text-left py-2.5 text-xs font-semibold text-gray-500 uppercase">Description</th>
              <th className="text-right py-2.5 text-xs font-semibold text-gray-500 uppercase">Montant</th>
              <th className="text-right py-2.5 text-xs font-semibold text-gray-500 uppercase">Payé</th>
              <th className="text-right py-2.5 text-xs font-semibold text-gray-500 uppercase">Solde</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any) => (
              <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2.5 text-gray-500 whitespace-nowrap">{formatDate(item.order_date)}</td>
                <td className="py-2.5 font-mono text-gray-700 whitespace-nowrap">{item.order_number}</td>
                <td className="py-2.5 text-gray-600 max-w-xs truncate">{item.description || '—'}</td>
                <td className="py-2.5 text-right text-gray-900">{formatCurrency(item.subtotal, currency)}</td>
                <td className="py-2.5 text-right text-green-700">{formatCurrency(item.amount_paid, currency)}</td>
                <td className={`py-2.5 text-right font-semibold ${Number(item.balance) > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                  {formatCurrency(item.balance, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totaux */}
        <div className="flex justify-end mb-6">
          <div className="w-72 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Sous-total HT</span>
              <span>{formatCurrency(doc.subtotal, currency)}</span>
            </div>
            {Number(doc.tax) > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>TVA</span>
                <span>{formatCurrency(doc.tax, currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Déjà payé</span>
              <span className="text-green-700">− {formatCurrency(doc.amount_paid, currency)}</span>
            </div>
            <div className="flex justify-between font-bold text-base text-gray-900 border-t-2 border-gray-900 pt-2 mt-1">
              <span>SOLDE DÛ</span>
              <span className={Number(doc.balance_due) > 0 ? 'text-red-600' : 'text-green-600'}>
                {formatCurrency(doc.balance_due, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {doc.notes && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-line">{doc.notes}</p>
          </div>
        )}

        {/* Pied de page */}
        <div className="mt-8 pt-4 border-t border-dashed border-gray-300 text-center">
          <p className="text-sm text-gray-500 italic">
            {settings?.invoice_footer || 'Merci de votre confiance !'}
          </p>
          <p className="text-xs text-gray-300 mt-2">CleanFlow · {new Date().getFullYear()}</p>
        </div>
      </div>
    </>
  )
}

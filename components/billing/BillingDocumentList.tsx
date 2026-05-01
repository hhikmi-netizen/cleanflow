'use client'

import { useState, useTransition } from 'react'
import type { BillingDocSummary, BillingDocStatus } from '@/app/actions/billing'
import { updateBillingDocStatus } from '@/app/actions/billing'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FileText, ExternalLink, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_LABELS: Record<string, string> = {
  draft:   'Brouillon',
  sent:    'Envoyé',
  paid:    'Payé',
  partial: 'Partiel',
  unpaid:  'Impayé',
}
const STATUS_COLORS: Record<string, string> = {
  draft:   'bg-gray-100 text-gray-600',
  sent:    'bg-blue-100 text-blue-700',
  paid:    'bg-green-100 text-green-700',
  partial: 'bg-yellow-100 text-yellow-700',
  unpaid:  'bg-red-100 text-red-600',
}

const STATUS_TRANSITIONS: Record<string, BillingDocStatus[]> = {
  draft:   ['sent', 'unpaid'],
  sent:    ['paid', 'partial', 'unpaid'],
  unpaid:  ['paid', 'partial', 'sent'],
  partial: ['paid', 'sent'],
  paid:    [],
}

interface Props {
  docs: BillingDocSummary[]
  isAdmin: boolean
}

export default function BillingDocumentList({ docs, isAdmin }: Props) {
  const [list, setList]           = useState(docs)
  const [openMenu, setOpenMenu]   = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleStatusChange = (docId: string, status: BillingDocStatus) => {
    setOpenMenu(null)
    startTransition(async () => {
      const result = await updateBillingDocStatus(docId, status)
      if (result.ok) {
        setList(prev => prev.map(d => d.id === docId ? { ...d, status } : d))
        toast.success(`Statut mis à jour : ${STATUS_LABELS[status]}`)
      } else {
        toast.error(result.error || 'Erreur mise à jour')
      }
    })
  }

  if (list.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText size={28} className="text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">Aucun document généré</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {list.map(doc => {
        const transitions = STATUS_TRANSITIONS[doc.status] || []
        return (
          <div
            key={doc.id}
            className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-lg px-2 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={`/billing/${doc.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm font-mono text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  {doc.document_number}
                  <ExternalLink size={11} />
                </a>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[doc.status] || STATUS_COLORS.draft}`}>
                  {STATUS_LABELS[doc.status] || doc.status}
                </span>
                <span className="text-xs text-gray-400">
                  {doc.doc_type === 'REL' ? 'Relevé' : 'Facture'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatDate(doc.period_start)} – {formatDate(doc.period_end)}
                <span className="mx-1.5">·</span>
                émis le {formatDate(doc.created_at)}
              </p>
            </div>

            <div className="flex items-center gap-3 ml-3 shrink-0">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(doc.total)}</p>
                {Number(doc.balance_due) > 0.01 && (
                  <p className="text-xs text-red-500">Reste {formatCurrency(doc.balance_due)}</p>
                )}
              </div>

              {isAdmin && transitions.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setOpenMenu(openMenu === doc.id ? null : doc.id)}
                    disabled={isPending}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    Statut <ChevronDown size={12} />
                  </button>
                  {openMenu === doc.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                      <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[140px]">
                        {transitions.map(s => (
                          <button
                            key={s}
                            onClick={() => handleStatusChange(doc.id, s)}
                            className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${STATUS_COLORS[s].split(' ')[0]}`} />
                            Marquer {STATUS_LABELS[s].toLowerCase()}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

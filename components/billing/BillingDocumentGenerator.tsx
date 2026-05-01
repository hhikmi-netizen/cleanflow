'use client'

import { useState } from 'react'
import { generateBillingDocument } from '@/app/actions/billing'
import type { BillingDocType, PaymentTerms } from '@/app/actions/billing'
import { Loader2, FileText, X, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  clientId: string
  isAdmin: boolean
}

type Preset = 'current' | 'previous' | 'custom'

function getMonthRange(offset = 0): { start: string; end: string; label: string } {
  const now = new Date()
  const d   = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  const last  = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  const end   = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`
  const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  return { start, end, label }
}

const PAYMENT_TERMS: { value: PaymentTerms; label: string }[] = [
  { value: 'immediate', label: 'Paiement immédiat' },
  { value: 'net15',     label: 'Net 15 jours' },
  { value: 'net30',     label: 'Net 30 jours' },
  { value: 'net45',     label: 'Net 45 jours' },
  { value: 'net60',     label: 'Net 60 jours' },
]

export default function BillingDocumentGenerator({ clientId, isAdmin }: Props) {
  const [open, setOpen]               = useState(false)
  const [loading, setLoading]         = useState(false)
  const [generatedId, setGeneratedId] = useState<string | null>(null)
  const [generatedNum, setGeneratedNum] = useState<string | null>(null)

  const current  = getMonthRange(0)
  const previous = getMonthRange(-1)

  const [preset, setPreset]             = useState<Preset>('previous')
  const [customStart, setCustomStart]   = useState(previous.start)
  const [customEnd, setCustomEnd]       = useState(previous.end)
  const [docType, setDocType]           = useState<BillingDocType>('REL')
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('net30')
  const [notes, setNotes]               = useState('')

  if (!isAdmin) return null

  const periodStart = preset === 'current'  ? current.start
                    : preset === 'previous' ? previous.start
                    : customStart
  const periodEnd   = preset === 'current'  ? current.end
                    : preset === 'previous' ? previous.end
                    : customEnd

  const handleGenerate = async () => {
    setLoading(true)
    setGeneratedId(null)
    try {
      const result = await generateBillingDocument({
        clientId, docType, periodStart, periodEnd, paymentTerms,
        notes: notes || undefined,
      })
      if (!result.ok) {
        toast.error(result.error || 'Erreur génération')
      } else {
        setGeneratedId(result.docId!)
        setGeneratedNum(result.documentNumber!)
        toast.success(`${docType === 'FAC' ? 'Facture' : 'Relevé'} ${result.documentNumber} créé`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setGeneratedId(null)
    setGeneratedNum(null)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
      >
        <FileText size={14} />
        <span className="hidden sm:inline">Relevé / Facture</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Générer un document</h2>
              <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Type de document */}
              <div className="grid grid-cols-2 gap-2">
                {(['REL', 'FAC'] as BillingDocType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setDocType(t)}
                    className={`py-2.5 rounded-xl text-sm font-semibold transition-colors border-2 ${
                      docType === t
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {t === 'REL' ? '📊 Relevé' : '🧾 Facture'}
                  </button>
                ))}
              </div>

              {/* Période */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Période</p>
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  {([
                    { value: 'previous' as Preset, label: previous.label },
                    { value: 'current'  as Preset, label: current.label },
                    { value: 'custom'   as Preset, label: 'Personnalisée' },
                  ]).map(p => (
                    <button
                      key={p.value}
                      onClick={() => setPreset(p.value)}
                      className={`py-2 rounded-lg text-xs font-medium transition-colors border ${
                        preset === p.value
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {preset === 'custom' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Du</label>
                      <input
                        type="date" value={customStart}
                        onChange={e => setCustomStart(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Au</label>
                      <input
                        type="date" value={customEnd}
                        onChange={e => setCustomEnd(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Conditions de paiement */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                  Conditions de paiement
                </label>
                <select
                  value={paymentTerms}
                  onChange={e => setPaymentTerms(e.target.value as PaymentTerms)}
                  className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {PAYMENT_TERMS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                  Notes (optionnel)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Conditions spéciales, informations..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Résultat */}
              {generatedId && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-green-800">Document créé</p>
                    <p className="text-xs font-mono text-green-700">{generatedNum}</p>
                  </div>
                  <a
                    href={`/billing/${generatedId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 font-semibold"
                  >
                    Ouvrir <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={handleClose}
                className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="flex-1 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {loading
                  ? <><Loader2 size={14} className="animate-spin" /> Génération...</>
                  : `Générer ${docType === 'FAC' ? 'la facture' : 'le relevé'}`
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

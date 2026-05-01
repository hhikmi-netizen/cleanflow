'use client'

import { useState, useTransition } from 'react'
import { Download, Loader2, Users, ShoppingBag, CreditCard, Wallet, Calendar } from 'lucide-react'
import { exportClients, exportOrders, exportPayments, exportCaisse } from '@/app/actions/exports'
import type { ExportResult } from '@/app/actions/exports'
import { toast } from 'sonner'

// ── Helpers ────────────────────────────────────────────────────────────────

function triggerDownload(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function defaultRange(): { from: string; to: string } {
  const now   = new Date()
  const from  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const to    = now.toISOString().slice(0, 10)
  return { from, to }
}

// ── Types ──────────────────────────────────────────────────────────────────

type ExportKey = 'clients' | 'orders' | 'payments' | 'caisse'

const EXPORTS: {
  key:         ExportKey
  label:       string
  description: string
  icon:        React.ElementType
  color:       string
}[] = [
  {
    key:         'clients',
    label:       'Clients',
    description: 'Code, nom, téléphone, email, type, CA total, fidélité, date inscription',
    icon:        Users,
    color:       'blue',
  },
  {
    key:         'orders',
    label:       'Commandes',
    description: 'N° commande, date, statut, client, articles, sous-total, remise, TVA, total, mode paiement',
    icon:        ShoppingBag,
    color:       'indigo',
  },
  {
    key:         'payments',
    label:       'Paiements',
    description: 'Date, commande, client, montant, mode de règlement, notes',
    icon:        CreditCard,
    color:       'green',
  },
  {
    key:         'caisse',
    label:       'Caisse journalière',
    description: 'Clôtures quotidiennes : espèces, carte, virement, total, nb commandes',
    icon:        Wallet,
    color:       'amber',
  },
]

const COLOR_CLASSES: Record<string, { bg: string; border: string; icon: string; btn: string }> = {
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-100',   icon: 'text-blue-500',   btn: 'bg-blue-600 hover:bg-blue-700'   },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-100', icon: 'text-indigo-500', btn: 'bg-indigo-600 hover:bg-indigo-700' },
  green:  { bg: 'bg-green-50',  border: 'border-green-100',  icon: 'text-green-600',  btn: 'bg-green-600 hover:bg-green-700'  },
  amber:  { bg: 'bg-amber-50',  border: 'border-amber-100',  icon: 'text-amber-600',  btn: 'bg-amber-600 hover:bg-amber-700'  },
}

// ── Composant ──────────────────────────────────────────────────────────────

export default function ExportPanel() {
  const def = defaultRange()
  const [dateFrom,  setDateFrom]  = useState(def.from)
  const [dateTo,    setDateTo]    = useState(def.to)
  const [loading,   setLoading]   = useState<ExportKey | null>(null)
  const [, startTransition]       = useTransition()

  const handleExport = (key: ExportKey) => {
    setLoading(key)
    startTransition(async () => {
      try {
        let result: ExportResult
        switch (key) {
          case 'clients':  result = await exportClients(dateFrom, dateTo);  break
          case 'orders':   result = await exportOrders(dateFrom, dateTo);   break
          case 'payments': result = await exportPayments(dateFrom, dateTo); break
          case 'caisse':   result = await exportCaisse(dateFrom, dateTo);   break
        }

        if (!result.ok || !result.csv || !result.filename) {
          toast.error(result.error || 'Export échoué')
        } else {
          triggerDownload(result.csv, result.filename)
          toast.success(`${result.count} ligne${(result.count ?? 0) > 1 ? 's' : ''} exportée${(result.count ?? 0) > 1 ? 's' : ''} — ${result.filename}`)
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erreur inattendue')
      } finally {
        setLoading(null)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Sélecteur de période */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={16} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">Période d&apos;export</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 items-end">
          <div className="sm:col-span-1">
            <label className="text-xs text-gray-500 block mb-1.5">Du</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="text-xs text-gray-500 block mb-1.5">Au</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            {[
              { label: 'Ce mois', fn: () => {
                const n = new Date()
                setDateFrom(new Date(n.getFullYear(), n.getMonth(), 1).toISOString().slice(0, 10))
                setDateTo(n.toISOString().slice(0, 10))
              }},
              { label: 'Mois préc.', fn: () => {
                const n = new Date()
                setDateFrom(new Date(n.getFullYear(), n.getMonth() - 1, 1).toISOString().slice(0, 10))
                setDateTo(new Date(n.getFullYear(), n.getMonth(), 0).toISOString().slice(0, 10))
              }},
              { label: 'Cette année', fn: () => {
                const n = new Date()
                setDateFrom(`${n.getFullYear()}-01-01`)
                setDateTo(n.toISOString().slice(0, 10))
              }},
            ].map(p => (
              <button
                key={p.label}
                onClick={p.fn}
                className="flex-1 h-9 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grille des exports */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {EXPORTS.map(exp => {
          const c    = COLOR_CLASSES[exp.color]
          const Icon = exp.icon
          const busy = loading === exp.key
          return (
            <div
              key={exp.key}
              className={`${c.bg} border ${c.border} rounded-2xl p-5 flex flex-col gap-3`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Icon size={18} className={c.icon} />
                  <h4 className="font-semibold text-gray-900 text-sm">{exp.label}</h4>
                </div>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{exp.description}</p>
              <button
                onClick={() => handleExport(exp.key)}
                disabled={!!loading}
                className={`${c.btn} disabled:opacity-50 text-white text-xs font-semibold h-9 rounded-xl flex items-center justify-center gap-2 transition-colors`}
              >
                {busy
                  ? <><Loader2 size={14} className="animate-spin" /> Export en cours...</>
                  : <><Download size={14} /> Télécharger CSV</>
                }
              </button>
            </div>
          )
        })}
      </div>

      {/* Note sécurité */}
      <p className="text-xs text-gray-400 text-center">
        Les exports contiennent uniquement les données de votre pressing. Aucun accès inter-tenant.
      </p>
    </div>
  )
}

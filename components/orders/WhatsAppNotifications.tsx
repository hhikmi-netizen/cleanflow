'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { getWhatsAppTemplates, generateWhatsAppLink } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────

interface Props {
  clientName: string
  clientPhone: string
  orderNumber: string
  pressingName: string
  pressingPhone?: string
  pressingAddress?: string
  total?: number
  remaining?: number
  trackingToken?: string
  pickupDate?: string
}

// ── localStorage tracking ──────────────────────────────────────────────────
// Clé : cleanflow_wa_{orderId}_{templateId}  →  ISO timestamp dernier envoi

function lsKey(orderNumber: string, templateId: string) {
  return `cleanflow_wa_${orderNumber}_${templateId}`
}

function getSentAt(orderNumber: string, templateId: string): string | null {
  try { return localStorage.getItem(lsKey(orderNumber, templateId)) } catch { return null }
}

function setSentAt(orderNumber: string, templateId: string) {
  try { localStorage.setItem(lsKey(orderNumber, templateId), new Date().toISOString()) } catch { /* noop */ }
}

function formatAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1)   return 'à l\'instant'
  if (mins < 60)  return `il y a ${mins} min`
  const h = Math.floor(mins / 60)
  if (h < 24)     return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

// ── Label des boutons selon la spec ───────────────────────────────────────

const BUTTON_LABELS: Record<string, string> = {
  created:     'Commande créée',
  in_progress: 'En traitement',
  ready:       'Notifier prêt',
  reminder:    'Relancer client',
  delivery:    'Livraison en cours',
  delivered:   'Commande livrée',
  pickup_code: 'Envoyer code',
}

// ── Composant principal ────────────────────────────────────────────────────

export default function WhatsAppNotifications({
  clientName, clientPhone, orderNumber, pressingName,
  pressingPhone, pressingAddress, total, remaining, trackingToken, pickupDate,
}: Props) {
  const [open, setOpen] = useState(true)
  const [sentMap, setSentMap] = useState<Record<string, string | null>>({})

  const trackingUrl = trackingToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/track/${trackingToken}`
    : undefined

  const templates = getWhatsAppTemplates({
    clientName,
    orderNumber,
    pressingName,
    pressingPhone,
    pressingAddress,
    total,
    remaining,
    trackingUrl,
    pickupDate,
  })

  // Charger le tracking localStorage après hydratation
  useEffect(() => {
    const map: Record<string, string | null> = {}
    templates.forEach(t => { map[t.id] = getSentAt(orderNumber, t.id) })
    setSentMap(map)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber])

  const handleClick = (templateId: string) => {
    setSentAt(orderNumber, templateId)
    setSentMap(prev => ({ ...prev, [templateId]: new Date().toISOString() }))
  }

  if (!clientPhone) return null

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
            <MessageCircle size={14} className="text-green-600" />
          </div>
          <span className="text-sm font-semibold text-gray-700">Envoyer WhatsApp</span>
          <span className="text-xs text-gray-400 font-normal">— {templates.length} modèles</span>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {/* Grille de boutons */}
      {open && (
        <div className="border-t border-gray-100 bg-gray-50 p-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {templates.map(t => {
            const sentAt = sentMap[t.id]
            const label = BUTTON_LABELS[t.id] || t.label
            return (
              <a
                key={t.id}
                href={generateWhatsAppLink(clientPhone, t.message)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleClick(t.id)}
                className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-xl border border-gray-200 hover:border-green-400 hover:bg-green-50 active:scale-95 transition-all text-center touch-manipulation min-h-[72px] justify-center"
              >
                <span className="text-2xl leading-none">{t.emoji}</span>
                <span className="text-xs font-semibold text-gray-800 leading-tight">{label}</span>
                {sentAt && (
                  <span className="text-[10px] text-green-600 font-medium leading-none">
                    ✓ {formatAgo(sentAt)}
                  </span>
                )}
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { MessageCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { getWhatsAppTemplates, buildWhatsAppUrl } from '@/lib/utils'

interface Props {
  clientName: string
  clientPhone: string
  orderNumber: string
  pressingName: string
  pressingPhone?: string
  total?: number
  remaining?: number
  trackingToken?: string
  pickupDate?: string
}

export default function WhatsAppNotifications({
  clientName, clientPhone, orderNumber, pressingName,
  pressingPhone, total, remaining, trackingToken, pickupDate,
}: Props) {
  const [open, setOpen] = useState(false)

  const trackingUrl = trackingToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/track/${trackingToken}`
    : undefined

  const templates = getWhatsAppTemplates({
    clientName,
    orderNumber,
    pressingName,
    pressingPhone,
    total,
    remaining,
    trackingUrl,
    pickupDate,
  })

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
            <MessageCircle size={14} className="text-green-600" />
          </div>
          <span className="text-sm font-semibold text-gray-700">Notifications WhatsApp</span>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50 p-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {templates.map(t => (
            <a
              key={t.id}
              href={buildWhatsAppUrl(clientPhone, t.message)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors text-center"
            >
              <span className="text-xl">{t.emoji}</span>
              <span className="text-xs font-medium text-gray-700">{t.label}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

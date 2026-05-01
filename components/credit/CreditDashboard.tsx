'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatCurrency, buildWhatsAppUrl } from '@/lib/utils'
import {
  AlertTriangle, ChevronDown, ChevronUp, MessageCircle,
  Banknote, CreditCard, ArrowRight, CheckCircle, Search,
} from 'lucide-react'
import PaymentModal from '@/components/credit/PaymentModal'

type AgingClient = {
  clientId: string
  clientName: string
  clientPhone: string
  clientType: string
  totalDue: number
  orderCount: number
  oldestDays: number
  aging30: number
  aging60: number
  aging90: number
  agingOver90: number
  orders: { id: string; total: number; due: number; daysOld: number; createdAt: string }[]
}

function agingColor(days: number) {
  if (days > 90) return 'text-red-600 bg-red-50'
  if (days > 60) return 'text-orange-600 bg-orange-50'
  if (days > 30) return 'text-yellow-600 bg-yellow-50'
  return 'text-blue-600 bg-blue-50'
}

function AgingBar({ aging30, aging60, aging90, agingOver90 }: Pick<AgingClient, 'aging30' | 'aging60' | 'aging90' | 'agingOver90'>) {
  const total = aging30 + aging60 + aging90 + agingOver90
  if (total === 0) return null
  const pct = (v: number) => `${Math.round((v / total) * 100)}%`
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden w-full gap-px">
      {aging30 > 0    && <div className="bg-blue-400"   style={{ width: pct(aging30) }} title={`0-30j : ${formatCurrency(aging30)}`} />}
      {aging60 > 0    && <div className="bg-yellow-400" style={{ width: pct(aging60) }} title={`31-60j : ${formatCurrency(aging60)}`} />}
      {aging90 > 0    && <div className="bg-orange-400" style={{ width: pct(aging90) }} title={`61-90j : ${formatCurrency(aging90)}`} />}
      {agingOver90 > 0 && <div className="bg-red-500"  style={{ width: pct(agingOver90) }} title={`+90j : ${formatCurrency(agingOver90)}`} />}
    </div>
  )
}

export default function CreditDashboard({ clients }: { clients: AgingClient[] }) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [paymentTarget, setPaymentTarget] = useState<{ clientId: string; clientName: string; orders: AgingClient['orders'] } | null>(null)

  const totalOutstanding = clients.reduce((s, c) => s + c.totalDue, 0)
  const over90Count = clients.filter(c => c.agingOver90 > 0).length
  const over30Count = clients.filter(c => c.oldestDays > 30).length

  const filtered = search
    ? clients.filter(c =>
        c.clientName.toLowerCase().includes(search.toLowerCase()) ||
        c.clientPhone.includes(search)
      )
    : clients

  const getReminderUrl = (c: AgingClient) => {
    const msg = `Bonjour ${c.clientName},\n\nNous vous rappelons que vous avez un solde impayé de *${formatCurrency(c.totalDue)}* sur votre compte.\nMerci de régulariser votre situation.\n\nCordialement`
    return buildWhatsAppUrl(c.clientPhone, msg)
  }

  return (
    <div className="space-y-5">

      {/* KPI summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-black text-gray-900">{formatCurrency(totalOutstanding)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Total impayé</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-black text-gray-900">{clients.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Clients avec solde</p>
        </div>
        <div className={`border rounded-xl p-4 ${over30Count > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
          <p className={`text-2xl font-black ${over30Count > 0 ? 'text-orange-600' : 'text-gray-900'}`}>{over30Count}</p>
          <p className="text-xs text-gray-400 mt-0.5">Retard &gt; 30j</p>
        </div>
        <div className={`border rounded-xl p-4 ${over90Count > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
          <p className={`text-2xl font-black ${over90Count > 0 ? 'text-red-600' : 'text-gray-900'}`}>{over90Count}</p>
          <p className="text-xs text-gray-400 mt-0.5">Retard &gt; 90j</p>
        </div>
      </div>

      {/* Aging legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-400 inline-block" /> 0–30j</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-yellow-400 inline-block" /> 31–60j</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-400 inline-block" /> 61–90j</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> +90j</span>
      </div>

      {/* Search */}
      {clients.length > 5 && (
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un client..."
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
      )}

      {/* Client list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-300">
          <CheckCircle size={40} />
          <p className="text-sm font-medium text-gray-400">Aucun impayé — tout est à jour !</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <div key={c.clientId} className="bg-white border border-gray-200 rounded-xl overflow-hidden">

              {/* Client row */}
              <div className="flex items-center gap-3 p-4">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                  c.oldestDays > 90 ? 'bg-red-100 text-red-600' :
                  c.oldestDays > 60 ? 'bg-orange-100 text-orange-600' :
                  c.oldestDays > 30 ? 'bg-yellow-100 text-yellow-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {c.clientName.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/clients/${c.clientId}`} className="font-semibold text-gray-900 hover:text-blue-600 text-sm truncate">
                      {c.clientName}
                    </Link>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${agingColor(c.oldestDays)}`}>
                      {c.oldestDays}j max
                    </span>
                    <span className="text-xs text-gray-400">{c.orderCount} cmd{c.orderCount > 1 ? 's' : ''}</span>
                  </div>
                  <div className="mt-1.5">
                    <AgingBar aging30={c.aging30} aging60={c.aging60} aging90={c.aging90} agingOver90={c.agingOver90} />
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right shrink-0">
                  <p className="font-black text-lg text-gray-900">{formatCurrency(c.totalDue)}</p>
                  <p className="text-xs text-gray-400">dû</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {c.clientPhone && (
                    <a href={getReminderUrl(c)} target="_blank"
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                      title="Rappel WhatsApp">
                      <MessageCircle size={14} />
                    </a>
                  )}
                  <button
                    onClick={() => setPaymentTarget({ clientId: c.clientId, clientName: c.clientName, orders: c.orders })}
                    className="flex items-center gap-1 px-3 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                  >
                    <Banknote size={12} />
                    Encaisser
                  </button>
                  <button
                    onClick={() => setExpanded(expanded === c.clientId ? null : c.clientId)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-400 transition-colors"
                  >
                    {expanded === c.clientId ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Expanded: order breakdown */}
              {expanded === c.clientId && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {c.orders.map(order => (
                    <div key={order.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${agingColor(order.daysOld)}`}>
                        {order.daysOld}j
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString('fr-FR')} · total {formatCurrency(order.total)}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-gray-900 shrink-0">{formatCurrency(order.due)} dû</p>
                      <button
                        onClick={() => setPaymentTarget({ clientId: c.clientId, clientName: c.clientName, orders: [order] })}
                        className="flex items-center gap-1 px-2 h-7 rounded-lg bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-500 text-xs font-medium transition-colors shrink-0"
                      >
                        <ArrowRight size={11} /> Régler
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Payment modal */}
      {paymentTarget && (
        <PaymentModal
          clientId={paymentTarget.clientId}
          clientName={paymentTarget.clientName}
          orders={paymentTarget.orders}
          onClose={() => setPaymentTarget(null)}
        />
      )}
    </div>
  )
}

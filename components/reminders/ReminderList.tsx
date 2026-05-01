'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageCircle, Clock, CreditCard, RefreshCw, Bell, CheckCircle2, type LucideIcon } from 'lucide-react'
import {
  buildReminderUrl,
  buildReadyReminderMessage,
  buildUnpaidReminderMessage,
} from '@/lib/whatsapp/channel'

// ── Types ──────────────────────────────────────────────────────────────────

export interface Reminder {
  id: string
  orderNumber: string
  createdAt: string
  status: string
  total: number
  deposit: number
  remaining: number
  clientName: string
  clientPhone: string
  type: 'ready' | 'unpaid'
  daysPending: number
}

interface PressingInfo {
  name: string
  phone: string
  address: string
}

interface ReminderLog {
  sentAt: string  // ISO date
  type: 'ready' | 'unpaid'
}

// ── LocalStorage helpers ───────────────────────────────────────────────────

const LS_PREFIX = 'cleanflow_reminder_'
const RELANCE_COOLDOWN_H = 24  // heures avant de pouvoir relancer

function getLog(orderId: string): ReminderLog | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + orderId)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function setLog(orderId: string, log: ReminderLog) {
  try { localStorage.setItem(LS_PREFIX + orderId, JSON.stringify(log)) } catch { /* noop */ }
}

function hoursSince(isoDate: string): number {
  return (Date.now() - new Date(isoDate).getTime()) / 3_600_000
}

function formatRelativeTime(isoDate: string): string {
  const h = Math.floor(hoursSince(isoDate))
  if (h < 1) return 'il y a moins d\'1h'
  if (h < 24) return `il y a ${h}h`
  const d = Math.floor(h / 24)
  return `il y a ${d} jour${d > 1 ? 's' : ''}`
}

// ── Filter tabs ────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'ready' | 'unpaid' | 'to_remind'

const TABS: { id: FilterTab; label: string; icon: LucideIcon }[] = [
  { id: 'all',       label: 'Tout',             icon: Bell },
  { id: 'ready',     label: 'Prêtes en attente', icon: Clock },
  { id: 'unpaid',    label: 'Impayés',           icon: CreditCard },
  { id: 'to_remind', label: 'À relancer',        icon: RefreshCw },
]

// ── Main component ─────────────────────────────────────────────────────────

interface Props {
  reminders: Reminder[]
  pressing: PressingInfo
  readyThresholdDays: number
}

export default function ReminderList({ reminders, pressing, readyThresholdDays: _readyThresholdDays }: Props) {
  const [tab, setTab] = useState<FilterTab>('all')
  const [logs, setLogs] = useState<Record<string, ReminderLog | null>>({})

  // Charge localStorage côté client après hydratation
  useEffect(() => {
    const map: Record<string, ReminderLog | null> = {}
    reminders.forEach(r => { map[r.id] = getLog(r.id) })
    setLogs(map)
  }, [reminders])

  const recordSent = useCallback((orderId: string, type: 'ready' | 'unpaid') => {
    const log: ReminderLog = { sentAt: new Date().toISOString(), type }
    setLog(orderId, log)
    setLogs(prev => ({ ...prev, [orderId]: log }))
  }, [])

  // ── Filtering ────────────────────────────────────────────────────────────

  const filtered = reminders.filter(r => {
    if (tab === 'ready')     return r.type === 'ready'
    if (tab === 'unpaid')    return r.type === 'unpaid'
    if (tab === 'to_remind') {
      const log = logs[r.id]
      return !log || hoursSince(log.sentAt) >= RELANCE_COOLDOWN_H
    }
    return true
  })

  // Compteurs par onglet
  const counts: Record<FilterTab, number> = {
    all:       reminders.length,
    ready:     reminders.filter(r => r.type === 'ready').length,
    unpaid:    reminders.filter(r => r.type === 'unpaid').length,
    to_remind: reminders.filter(r => {
      const log = logs[r.id]
      return !log || hoursSince(log.sentAt) >= RELANCE_COOLDOWN_H
    }).length,
  }

  // ── Empty state ──────────────────────────────────────────────────────────

  if (reminders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mb-4">
          <CheckCircle2 size={28} className="text-green-500" />
        </div>
        <p className="text-lg font-semibold text-gray-800">Aucun rappel en attente</p>
        <p className="text-sm text-gray-400 mt-1 max-w-xs">
          Toutes vos commandes ont été retirées et tous vos paiements sont à jour.
        </p>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit flex-wrap">
        {TABS.map(t => {
          const Icon = t.icon
          const count = counts[t.id]
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={13} />
              {t.label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  tab === t.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Aucune commande dans ce filtre.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <ReminderRow
              key={r.id}
              reminder={r}
              pressing={pressing}
              log={logs[r.id] ?? null}
              onSent={recordSent}
            />
          ))}
        </div>
      )}

      {/* Légende canaux */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
        <MessageCircle size={12} className="text-green-500" />
        <p className="text-xs text-gray-400">
          Les messages s&apos;ouvrent dans WhatsApp Web. L&apos;envoi est confirmé quand vous cliquez sur
          &ldquo;Envoyer&rdquo; dans WhatsApp.
          {/* Future: intégration WATI API pour envoi automatique sans action manuelle */}
        </p>
      </div>
    </div>
  )
}

// ── ReminderRow ────────────────────────────────────────────────────────────

interface RowProps {
  reminder: Reminder
  pressing: PressingInfo
  log: ReminderLog | null
  onSent: (orderId: string, type: 'ready' | 'unpaid') => void
}

function ReminderRow({ reminder: r, pressing, log, onSent }: RowProps) {
  const alreadySent = log !== null
  const canRelance = !log || hoursSince(log.sentAt) >= RELANCE_COOLDOWN_H

  const message = r.type === 'ready'
    ? buildReadyReminderMessage({
        clientName: r.clientName,
        orderNumber: r.orderNumber,
        pressingName: pressing.name,
        pressingAddress: pressing.address,
        pressingPhone: pressing.phone,
        daysPending: r.daysPending,
      })
    : buildUnpaidReminderMessage({
        clientName: r.clientName,
        orderNumber: r.orderNumber,
        pressingName: pressing.name,
        pressingAddress: pressing.address,
        pressingPhone: pressing.phone,
        remaining: r.remaining,
      })

  const { url } = buildReminderUrl(r.clientPhone, message)

  const handleClick = () => {
    onSent(r.id, r.type)
  }

  return (
    <div className={`flex items-center justify-between gap-3 p-4 rounded-xl border transition-colors ${
      canRelance
        ? 'bg-white border-gray-200 hover:border-gray-300'
        : 'bg-gray-50 border-gray-100'
    }`}>
      {/* Badge type */}
      <div className="shrink-0">
        {r.type === 'ready' ? (
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <Clock size={14} className="text-amber-600" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
            <CreditCard size={14} className="text-red-500" />
          </div>
        )}
      </div>

      {/* Infos commande */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900 text-sm font-mono">{r.orderNumber}</span>
          {r.type === 'ready' && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              Prêt depuis {r.daysPending}j
            </span>
          )}
          {r.type === 'unpaid' && r.remaining > 0 && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
              {r.remaining.toFixed(0)} DH restants
            </span>
          )}
        </div>
        <p className="text-sm text-gray-700 mt-0.5 truncate">{r.clientName}</p>
        <p className="text-xs text-gray-400">{r.clientPhone}</p>

        {/* Historique local */}
        {alreadySent && log && (
          <p className="text-xs mt-1">
            <span className={canRelance ? 'text-gray-400' : 'text-green-600 font-medium'}>
              {canRelance ? '↻' : '✓'} Dernier rappel : {formatRelativeTime(log.sentAt)}
            </span>
            {!canRelance && (
              <span className="text-gray-400 ml-1">
                (disponible dans {Math.ceil(RELANCE_COOLDOWN_H - hoursSince(log.sentAt))}h)
              </span>
            )}
          </p>
        )}
      </div>

      {/* Bouton WhatsApp */}
      {r.clientPhone ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
            canRelance
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-gray-100 text-gray-400 cursor-default pointer-events-none'
          }`}
          title={canRelance ? 'Ouvrir WhatsApp' : 'Rappel récent — patientez 24h'}
        >
          <MessageCircle size={14} />
          {alreadySent && !canRelance ? 'Envoyé' : 'Relancer'}
        </a>
      ) : (
        <span className="shrink-0 text-xs text-gray-400 italic">Pas de téléphone</span>
      )}
    </div>
  )
}

'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { updateDeliveryStatus, assignDriver } from '@/app/actions/deliveries'
import { toast } from 'sonner'
import { MapPin, Phone, Clock, User, Truck, ArrowRight, Package, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react'
import { getWhatsAppTemplates } from '@/lib/utils'

type Mode = 'all' | 'pickup' | 'delivery'

const DELIVERY_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: 'En attente',  color: 'bg-gray-100 text-gray-600' },
  scheduled: { label: 'Planifié',    color: 'bg-blue-100 text-blue-700' },
  en_route:  { label: 'En route',    color: 'bg-amber-100 text-amber-700' },
  delivered: { label: 'Livré',       color: 'bg-green-100 text-green-700' },
  failed:    { label: 'Échec',       color: 'bg-red-100 text-red-600' },
}

const NEXT_STATUS: Record<string, string> = {
  pending:   'scheduled',
  scheduled: 'en_route',
  en_route:  'delivered',
}

const NEXT_LABEL: Record<string, string> = {
  pending:   'Planifier',
  scheduled: 'Départ',
  en_route:  'Livré ✓',
}

function getDateLabel(slot: string | null | undefined): string {
  if (!slot) return 'Sans créneau'
  const datePart = slot.split(' ')[0]
  try {
    const d = new Date(datePart)
    const today = new Date(); today.setHours(0,0,0,0)
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
    d.setHours(0,0,0,0)
    if (d.getTime() === today.getTime())    return "Aujourd'hui"
    if (d.getTime() === tomorrow.getTime()) return 'Demain'
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  } catch { return datePart }
}

interface TeamMember { id: string; full_name: string }
interface DeliveryOrder {
  id: string
  order_number: string
  status: string
  deposit_mode: string
  delivery_mode: string
  pickup_address?: string | null
  delivery_address?: string | null
  pickup_slot?: string | null
  delivery_slot?: string | null
  assigned_to?: string | null
  delivery_status?: string | null
  created_at: string
  clients?: { id: string; name: string; phone: string; address?: string | null } | null
}

interface WaConfig {
  enabled: boolean
  pressingName: string
  wa_notif_delivery: boolean
  wa_notif_delivered: boolean
}

interface Props {
  orders: DeliveryOrder[]
  teamMembers: TeamMember[]
  waConfig?: WaConfig
}

export default function DeliveryBoard({ orders, teamMembers, waConfig }: Props) {
  const [mode, setMode] = useState<Mode>('all')
  const [isPending, startTransition] = useTransition()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pendingNotif, setPendingNotif] = useState<{ url: string; label: string } | null>(null)

  const filtered = useMemo(() => {
    if (mode === 'pickup')   return orders.filter(o => o.deposit_mode === 'pickup')
    if (mode === 'delivery') return orders.filter(o => o.delivery_mode === 'delivery')
    return orders
  }, [orders, mode])

  // Group by date label
  const grouped = useMemo(() => {
    const map = new Map<string, DeliveryOrder[]>()
    filtered.forEach(o => {
      const slot = o.delivery_mode === 'delivery' ? o.delivery_slot : o.pickup_slot
      const label = getDateLabel(slot)
      if (!map.has(label)) map.set(label, [])
      map.get(label)!.push(o)
    })
    // Sort: "Aujourd'hui" first, then "Demain", then others
    const order = ["Aujourd'hui", 'Demain']
    return Array.from(map.entries()).sort(([a], [b]) => {
      const ai = order.indexOf(a); const bi = order.indexOf(b)
      if (ai !== -1 && bi !== -1) return ai - bi
      if (ai !== -1) return -1
      if (bi !== -1) return 1
      return a.localeCompare(b)
    })
  }, [filtered])

  const pickupCount   = orders.filter(o => o.deposit_mode === 'pickup').length
  const deliveryCount = orders.filter(o => o.delivery_mode === 'delivery').length

  const handleStatusNext = (order: DeliveryOrder) => {
    const current = order.delivery_status || 'pending'
    const next = NEXT_STATUS[current]
    if (!next) return
    startTransition(async () => {
      try {
        await updateDeliveryStatus(order.id, next)
        toast.success(`Statut → ${DELIVERY_STATUS_LABELS[next]?.label}`)

        // Show WhatsApp notification button if enabled
        if (waConfig?.enabled && order.clients?.phone) {
          const shouldNotify =
            (next === 'en_route' && waConfig.wa_notif_delivery) ||
            (next === 'delivered' && waConfig.wa_notif_delivered)
          if (shouldNotify) {
            const templates = getWhatsAppTemplates({
              clientName: order.clients.name,
              orderNumber: order.order_number,
              pressingName: waConfig.pressingName,
            })
            const tpl = templates.find(t => t.id === (next === 'en_route' ? 'delivery' : 'delivered'))
            if (tpl) {
              const url = `https://wa.me/${order.clients.phone.replace(/\D/g, '')}?text=${encodeURIComponent(tpl.message)}`
              setPendingNotif({ url, label: tpl.label })
            }
          }
        }
      } catch (e: unknown) { toast.error((e as Error).message) }
    })
  }

  const handleAssign = (orderId: string, userId: string) => {
    startTransition(async () => {
      try {
        await assignDriver(orderId, userId || null)
        toast.success('Chauffeur assigné')
      } catch (e: unknown) { toast.error((e as Error).message) }
    })
  }

  if (filtered.length === 0) {
    return (
      <div className="space-y-4">
        <FilterTabs mode={mode} setMode={setMode} pickupCount={pickupCount} deliveryCount={deliveryCount} total={orders.length} />
        {pendingNotif && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-2">
              <MessageCircle size={16} className="text-green-600 shrink-0" />
              <p className="text-sm text-green-800 font-medium">Notifier le client — {pendingNotif.label}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a href={pendingNotif.url} target="_blank" rel="noopener noreferrer" onClick={() => setPendingNotif(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors">
                <MessageCircle size={12} /> Envoyer
              </a>
              <button onClick={() => setPendingNotif(null)} className="text-xs text-green-600 hover:text-green-800 px-2 py-1.5">Ignorer</button>
            </div>
          </div>
        )}
        <div className="text-center py-16 text-gray-400">
          <Truck size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucune collecte ou livraison en cours</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <FilterTabs mode={mode} setMode={setMode} pickupCount={pickupCount} deliveryCount={deliveryCount} total={orders.length} />

      {/* WhatsApp notification prompt */}
      {pendingNotif && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center gap-2">
            <MessageCircle size={16} className="text-green-600 shrink-0" />
            <p className="text-sm text-green-800 font-medium">Notifier le client — {pendingNotif.label}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={pendingNotif.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setPendingNotif(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors"
            >
              <MessageCircle size={12} /> Envoyer
            </a>
            <button
              onClick={() => setPendingNotif(null)}
              className="text-xs text-green-600 hover:text-green-800 px-2 py-1.5"
            >
              Ignorer
            </button>
          </div>
        </div>
      )}

      {grouped.map(([dateLabel, dayOrders]) => (
        <div key={dateLabel}>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{dateLabel}</p>
            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{dayOrders.length}</span>
          </div>
          <div className="space-y-2">
            {dayOrders.map(order => {
              const isDelivery = order.delivery_mode === 'delivery'
              const isPickup   = order.deposit_mode === 'pickup'
              const address    = isDelivery ? (order.delivery_address || order.clients?.address) : order.pickup_address
              const slot       = isDelivery ? order.delivery_slot : order.pickup_slot
              const timePart   = slot?.includes(' ') ? slot.split(' ').slice(1).join(' ') : null
              const dsLabel    = DELIVERY_STATUS_LABELS[order.delivery_status || 'pending']
              const nextStatus = NEXT_STATUS[order.delivery_status || 'pending']
              const expanded   = expandedId === order.id
              const assignedMember = teamMembers.find(m => m.id === order.assigned_to)

              return (
                <div key={order.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  {/* Header */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className={`p-1.5 rounded-lg shrink-0 ${isDelivery ? 'bg-blue-100' : 'bg-purple-100'}`}>
                      {isDelivery ? <Truck size={14} className="text-blue-600" /> : <Package size={14} className="text-purple-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/orders/${order.id}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600 font-mono">
                          {order.order_number}
                        </Link>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dsLabel.color}`}>
                          {dsLabel.label}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${isDelivery ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                          {isDelivery ? 'Livraison' : 'Collecte'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{order.clients?.name}</p>
                    </div>
                    <button
                      onClick={() => setExpandedId(expanded ? null : order.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600"
                    >
                      {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>

                  {/* Quick info row */}
                  <div className="px-4 pb-3 flex flex-wrap gap-3 text-xs text-gray-500">
                    {order.clients?.phone && (
                      <a href={`tel:${order.clients.phone}`} className="flex items-center gap-1 hover:text-blue-600">
                        <Phone size={11} /> {order.clients.phone}
                      </a>
                    )}
                    {timePart && (
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {timePart}
                      </span>
                    )}
                    {address && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-blue-600 max-w-[200px] truncate"
                      >
                        <MapPin size={11} className="shrink-0" /> {address}
                      </a>
                    )}
                    {assignedMember && (
                      <span className="flex items-center gap-1">
                        <User size={11} /> {assignedMember.full_name}
                      </span>
                    )}
                  </div>

                  {/* Expanded: assign + status */}
                  {expanded && (
                    <div className="border-t border-gray-100 px-4 py-3 space-y-3 bg-gray-50">
                      {/* Assign driver */}
                      {teamMembers.length > 0 && (
                        <div className="flex items-center gap-2">
                          <User size={13} className="text-gray-400 shrink-0" />
                          <label className="text-xs text-gray-500 shrink-0">Chauffeur :</label>
                          <select
                            defaultValue={order.assigned_to || ''}
                            onChange={e => handleAssign(order.id, e.target.value)}
                            disabled={isPending}
                            className="flex-1 h-7 px-2 rounded border border-gray-200 bg-white text-xs focus:outline-none"
                          >
                            <option value="">— Non assigné —</option>
                            {teamMembers.map(m => (
                              <option key={m.id} value={m.id}>{m.full_name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      {/* Both modes badge */}
                      {isPickup && isDelivery && (
                        <p className="text-xs text-gray-400 italic">Collecte + livraison sur cette commande</p>
                      )}
                      {/* Missing address warning */}
                      {!address && (
                        <p className="text-xs text-orange-500 flex items-center gap-1">
                          <MapPin size={11} /> Adresse non renseignée —{' '}
                          <Link href={`/orders/${order.id}`} className="underline">compléter dans la commande</Link>
                        </p>
                      )}
                    </div>
                  )}

                  {/* CTA bottom */}
                  {nextStatus && (
                    <div className="border-t border-gray-100 px-4 py-2.5 flex justify-end">
                      <button
                        onClick={() => handleStatusNext(order)}
                        disabled={isPending}
                        className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      >
                        {NEXT_LABEL[order.delivery_status || 'pending']}
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function FilterTabs({ mode, setMode, pickupCount, deliveryCount, total }: {
  mode: Mode; setMode: (m: Mode) => void
  pickupCount: number; deliveryCount: number; total: number
}) {
  const tabs: { id: Mode; label: string; count: number }[] = [
    { id: 'all',      label: 'Tout',       count: total },
    { id: 'pickup',   label: 'Collectes',  count: pickupCount },
    { id: 'delivery', label: 'Livraisons', count: deliveryCount },
  ]
  return (
    <div className="flex gap-2">
      {tabs.map(t => (
        <button key={t.id} onClick={() => setMode(t.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            mode === t.id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
          }`}>
          {t.label}
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${mode === t.id ? 'bg-white/20' : 'bg-gray-100'}`}>
            {t.count}
          </span>
        </button>
      ))}
    </div>
  )
}

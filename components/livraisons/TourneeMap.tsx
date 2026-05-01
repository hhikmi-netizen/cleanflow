'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps'
import { buildWhatsAppUrl } from '@/lib/utils'
import {
  Phone, MessageCircle, MapPin, ChevronUp, ChevronDown,
  CheckCircle, XCircle, Truck, Package, AlertTriangle,
  List, Map as MapIcon, X, User, Clock, Key, RefreshCw,
} from 'lucide-react'
import {
  saveStopOrder, updateStopStatus, assignStopDriver, updateAccessNotes,
} from '@/app/actions/tournee'

// ── Types ───────────────────────────────────────────────────────────────────

interface RawStop {
  id: string
  order_number: string
  tracking_token: string | null
  status: string
  deposit_mode: string
  delivery_mode: string
  delivery_status: string | null
  pickup_address: string | null
  pickup_latitude: number | null
  pickup_longitude: number | null
  delivery_address: string | null
  delivery_latitude: number | null
  delivery_longitude: number | null
  pickup_slot: string | null
  delivery_slot: string | null
  assigned_to: string | null
  stop_order: number | null
  access_notes: string | null
  notes: string | null
  clients: { id: string; name: string; phone: string; address: string | null } | null
}

interface Stop extends RawStop {
  isDelivery: boolean
  address: string | null
  lat: number | null
  lng: number | null
  slot: string | null
  validationCode: string
  localOrder: number
}

interface TeamMember { id: string; full_name: string }

interface TourneeMapProps {
  stops: RawStop[]
  teamMembers: TeamMember[]
  pressingName: string
  pressingPhone: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function deriveStop(raw: RawStop, idx: number): Stop {
  const isDelivery = raw.delivery_mode === 'delivery'
  return {
    ...raw,
    isDelivery,
    address: isDelivery
      ? (raw.delivery_address || raw.clients?.address || null)
      : raw.pickup_address,
    lat: isDelivery ? raw.delivery_latitude : raw.pickup_latitude,
    lng: isDelivery ? raw.delivery_longitude : raw.pickup_longitude,
    slot: isDelivery ? raw.delivery_slot : raw.pickup_slot,
    validationCode: (raw.tracking_token?.replace(/-/g, '').slice(0, 4) ||
      raw.order_number.replace(/\D/g, '').slice(-4)).toUpperCase(),
    localOrder: raw.stop_order ?? idx + 1,
  }
}

function getStatusMeta(stop: Stop) {
  const ds = stop.delivery_status
  if (ds === 'delivered') return { label: 'Livré', color: 'bg-green-100 text-green-700', pin: '#16a34a' }
  if (ds === 'en_route')  return { label: 'En route', color: 'bg-blue-100 text-blue-700', pin: '#2563eb' }
  if (ds === 'failed')    return { label: 'Échoué', color: 'bg-red-100 text-red-700',  pin: '#dc2626' }
  if (stop.isDelivery)    return { label: 'En attente', color: 'bg-orange-100 text-orange-700', pin: '#ea580c' }
  return { label: 'À collecter', color: 'bg-purple-100 text-purple-700', pin: '#9333ea' }
}

function formatSlot(slot: string | null) {
  if (!slot) return null
  const [datePart, timePart] = slot.split('T')
  return timePart ? timePart.slice(0, 5) : datePart
}

function mapsUrl(stop: Stop) {
  if (stop.lat && stop.lng) return `https://www.google.com/maps?q=${stop.lat},${stop.lng}`
  if (stop.address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.address)}`
  return null
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StopPin({ stop, index, selected }: { stop: Stop; index: number; selected: boolean }) {
  const { pin } = getStatusMeta(stop)
  return (
    <div
      style={{
        width: selected ? 40 : 32,
        height: selected ? 40 : 32,
        background: pin,
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 700, fontSize: selected ? 14 : 12,
        boxShadow: selected ? '0 0 0 3px white, 0 4px 12px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.25)',
        border: '2px solid white',
        cursor: 'pointer',
        transition: 'all 0.15s',
        userSelect: 'none',
      }}
    >
      {index + 1}
    </div>
  )
}

function ValidationModal({
  stop, onClose, onConfirm, pending,
}: {
  stop: Stop; onClose: () => void; onConfirm: () => void; pending: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Code de validation</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <div className="text-center space-y-3">
          <p className="text-sm text-gray-500">
            Demandez au client de confirmer ce code pour valider la {stop.isDelivery ? 'livraison' : 'collecte'}
          </p>
          <div className="inline-block px-8 py-4 bg-gray-50 rounded-xl border-2 border-gray-200">
            <span className="text-4xl font-mono font-bold tracking-widest text-gray-900">
              {stop.validationCode}
            </span>
          </div>
          <p className="text-xs text-gray-400">Commande {stop.order_number} · {stop.clients?.name}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className="flex-1 h-11 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {pending ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle size={15} />}
            Confirmer
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Map-aware inner component ──────────────────────────────────────────────

function MapContent({
  orderedStops, selectedId, setSelectedId, pressingName,
}: {
  orderedStops: Stop[]
  selectedId: string | null
  setSelectedId: (id: string | null) => void
  pressingName: string
}) {
  const map = useMap()
  const stopsWithCoords = orderedStops.filter(s => s.lat && s.lng)
  const selectedStop = orderedStops.find(s => s.id === selectedId) ?? null

  useEffect(() => {
    if (!map || stopsWithCoords.length === 0) return
    if (typeof google === 'undefined') return
    const bounds = new google.maps.LatLngBounds()
    stopsWithCoords.forEach(s => bounds.extend({ lat: s.lat!, lng: s.lng! }))
    map.fitBounds(bounds, 64)
  }, [map]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {orderedStops.map((stop, idx) => {
        if (!stop.lat || !stop.lng) return null
        return (
          <AdvancedMarker
            key={stop.id}
            position={{ lat: stop.lat, lng: stop.lng }}
            onClick={() => setSelectedId(stop.id === selectedId ? null : stop.id)}
          >
            <StopPin stop={stop} index={idx} selected={stop.id === selectedId} />
          </AdvancedMarker>
        )
      })}

      {selectedStop && selectedStop.lat && selectedStop.lng && (
        <InfoWindow
          position={{ lat: selectedStop.lat, lng: selectedStop.lng }}
          pixelOffset={[0, -24]}
          onClose={() => setSelectedId(null)}
        >
          <InfoWindowContent stop={selectedStop} pressingName={pressingName} onClose={() => setSelectedId(null)} />
        </InfoWindow>
      )}
    </>
  )
}

function InfoWindowContent({ stop, pressingName, onClose }: { stop: Stop; pressingName: string; onClose: () => void }) {
  const { label, color } = getStatusMeta(stop)
  const url = mapsUrl(stop)
  const waMsg = `Bonjour ${stop.clients?.name}, votre commande *${stop.order_number}* est en route — *${pressingName}*`

  return (
    <div className="min-w-[220px] max-w-[260px] font-sans">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="font-bold text-gray-900 text-sm">{stop.clients?.name}</p>
          <p className="text-xs text-gray-500 font-mono">{stop.order_number}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${color}`}>{label}</span>
      </div>
      {stop.address && (
        <p className="text-xs text-gray-600 mb-2 flex items-start gap-1">
          <MapPin size={11} className="shrink-0 mt-0.5 text-gray-400" />
          {stop.address}
        </p>
      )}
      {stop.slot && (
        <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
          <Clock size={11} className="text-gray-400" />
          {formatSlot(stop.slot)}
        </p>
      )}
      {stop.access_notes && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mb-3 flex items-start gap-1">
          <Key size={11} className="shrink-0 mt-0.5" />
          {stop.access_notes}
        </p>
      )}
      <div className="flex gap-2">
        {stop.clients?.phone && (
          <>
            <a href={`tel:${stop.clients.phone}`}
              className="flex-1 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
              <Phone size={13} />
            </a>
            <a href={buildWhatsAppUrl(stop.clients.phone, waMsg)} target="_blank" rel="noopener noreferrer"
              className="flex-1 h-8 flex items-center justify-center rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-colors">
              <MessageCircle size={13} />
            </a>
          </>
        )}
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="flex-1 h-8 flex items-center justify-center rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors">
            <MapPin size={13} />
          </a>
        )}
      </div>
    </div>
  )
}

// ── Stop card (sidebar) ───────────────────────────────────────────────────────

function StopCard({
  stop, index, total, selected, teamMembers, pressingName,
  onSelect, onMoveUp, onMoveDown, onValidate, onStatusChange, onAssign,
}: {
  stop: Stop
  index: number
  total: number
  selected: boolean
  teamMembers: TeamMember[]
  pressingName: string
  onSelect: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onValidate: () => void
  onStatusChange: (s: 'en_route' | 'failed') => void
  onAssign: (uid: string | null) => void
}) {
  const { label, color, pin } = getStatusMeta(stop)
  const url = mapsUrl(stop)
  const waMsg = stop.isDelivery
    ? `Bonjour ${stop.clients?.name}, votre commande *${stop.order_number}* est en route — *${pressingName}*`
    : `Bonjour ${stop.clients?.name}, nous venons collecter votre commande *${stop.order_number}* — *${pressingName}*`
  const slotLabel = formatSlot(stop.slot)
  const assignedMember = teamMembers.find(m => m.id === stop.assigned_to)
  const isDone = stop.delivery_status === 'delivered' || stop.delivery_status === 'failed'

  return (
    <div
      className={`rounded-xl border transition-all cursor-pointer ${
        selected ? 'border-blue-300 bg-blue-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      {/* Header row */}
      <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ background: pin }}
        >
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{stop.clients?.name || '—'}</p>
          <p className="text-xs text-gray-400 font-mono">{stop.order_number}</p>
        </div>
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${color}`}>{label}</span>
      </div>

      {/* Details */}
      <div className="px-3 pb-2 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          {stop.isDelivery
            ? <Truck size={11} className="text-blue-400 shrink-0" />
            : <Package size={11} className="text-purple-400 shrink-0" />}
          <span className={stop.isDelivery ? 'text-blue-600' : 'text-purple-600'}>
            {stop.isDelivery ? 'Livraison' : 'Collecte'}
          </span>
          {slotLabel && (
            <span className="flex items-center gap-1 text-gray-400">
              <Clock size={10} /> {slotLabel}
            </span>
          )}
        </div>
        {stop.address && (
          <p className="text-xs text-gray-500 flex items-start gap-1">
            <MapPin size={10} className="shrink-0 mt-0.5 text-gray-400" />
            <span className="truncate">{stop.address}</span>
          </p>
        )}
        {!stop.lat && !stop.lng && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <AlertTriangle size={10} /> Pas de coordonnées GPS
          </p>
        )}
        {stop.access_notes && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 flex items-start gap-1">
            <Key size={10} className="shrink-0 mt-0.5" /> {stop.access_notes}
          </p>
        )}
        {assignedMember && (
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <User size={10} /> {assignedMember.full_name}
          </p>
        )}
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-1 px-3 pb-3 border-t border-gray-100 pt-2" onClick={e => e.stopPropagation()}>
        {/* Reorder */}
        <button
          onClick={onMoveUp} disabled={index === 0 || isDone}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Remonter"
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={onMoveDown} disabled={index === total - 1 || isDone}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Descendre"
        >
          <ChevronDown size={14} />
        </button>

        <div className="flex-1" />

        {/* Contact */}
        {stop.clients?.phone && (
          <>
            <a
              href={`tel:${stop.clients.phone}`}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
              title="Appeler"
            >
              <Phone size={13} />
            </a>
            <a
              href={buildWhatsAppUrl(stop.clients.phone, waMsg)}
              target="_blank" rel="noopener noreferrer"
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-colors"
              title="WhatsApp"
            >
              <MessageCircle size={13} />
            </a>
          </>
        )}
        {url && (
          <a
            href={url} target="_blank" rel="noopener noreferrer"
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors"
            title="Ouvrir dans Maps"
          >
            <MapPin size={13} />
          </a>
        )}

        {/* Status actions */}
        {!isDone && stop.delivery_status !== 'en_route' && (
          <button
            onClick={() => onStatusChange('en_route')}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            title="Marquer en route"
          >
            <Truck size={13} />
          </button>
        )}
        {!isDone && (
          <>
            <button
              onClick={() => onStatusChange('failed')}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
              title="Marquer échoué"
            >
              <XCircle size={13} />
            </button>
            <button
              onClick={onValidate}
              className="h-7 px-2.5 flex items-center justify-center rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors gap-1"
              title="Valider avec code"
            >
              <CheckCircle size={13} /> Valider
            </button>
          </>
        )}
        {isDone && stop.delivery_status === 'delivered' && (
          <span className="h-7 px-2 flex items-center text-xs text-green-700 font-medium gap-1">
            <CheckCircle size={12} /> Terminé
          </span>
        )}
      </div>

      {/* Driver assign (collapsed in small row) */}
      {teamMembers.length > 0 && !isDone && (
        <div className="px-3 pb-3 -mt-1" onClick={e => e.stopPropagation()}>
          <select
            value={stop.assigned_to || ''}
            onChange={e => onAssign(e.target.value || null)}
            className="w-full h-7 px-2 rounded-lg border border-gray-200 bg-white text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Aucun chauffeur</option>
            {teamMembers.map(m => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

// ── Fallback list (no Maps API) ───────────────────────────────────────────────

function FallbackList({
  stops, teamMembers, pressingName, onValidate, onStatusChange, onAssign, onMoveUp, onMoveDown,
}: {
  stops: Stop[]
  teamMembers: TeamMember[]
  pressingName: string
  onValidate: (stop: Stop) => void
  onStatusChange: (stop: Stop, s: 'en_route' | 'failed') => void
  onAssign: (stop: Stop, uid: string | null) => void
  onMoveUp: (idx: number) => void
  onMoveDown: (idx: number) => void
}) {
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-700 text-xs">
        <AlertTriangle size={14} className="shrink-0" />
        Mode liste — configurez <code className="font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> pour activer la carte.
      </div>
      {stops.map((stop, idx) => (
        <StopCard
          key={stop.id}
          stop={stop} index={idx} total={stops.length} selected={false}
          teamMembers={teamMembers} pressingName={pressingName}
          onSelect={() => {}}
          onMoveUp={() => onMoveUp(idx)}
          onMoveDown={() => onMoveDown(idx)}
          onValidate={() => onValidate(stop)}
          onStatusChange={s => onStatusChange(stop, s)}
          onAssign={uid => onAssign(stop, uid)}
        />
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const CASABLANCA = { lat: 33.5731, lng: -7.5898 }
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

export default function TourneeMap({ stops: rawStops, teamMembers, pressingName, pressingPhone: _pressingPhone }: TourneeMapProps) {
  const [stops, setStops] = useState<Stop[]>(() =>
    rawStops.map((r, i) => deriveStop(r, i)).sort((a, b) => a.localOrder - b.localOrder)
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileTab, setMobileTab] = useState<'list' | 'map'>('list')
  const [validatingStop, setValidatingStop] = useState<Stop | null>(null)
  const [isPending, startTransition] = useTransition()

  const hasMapsKey = !!API_KEY

  // ── Reorder ────────────────────────────────────────────────────────────────
  const move = useCallback((idx: number, dir: -1 | 1) => {
    const next = [...stops]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    const updated = next.map((s, i) => ({ ...s, localOrder: i + 1 }))
    setStops(updated)
    startTransition(async () => {
      await saveStopOrder(updated.map(s => ({ id: s.id, stop_order: s.localOrder })))
    })
  }, [stops])

  // ── Status change ──────────────────────────────────────────────────────────
  const handleStatusChange = useCallback((stop: Stop, status: 'en_route' | 'failed') => {
    setStops(prev => prev.map(s => s.id === stop.id ? { ...s, delivery_status: status } : s))
    startTransition(async () => {
      await updateStopStatus(stop.id, status)
    })
  }, [])

  // ── Validation confirm ─────────────────────────────────────────────────────
  const handleConfirmValidation = useCallback(() => {
    if (!validatingStop) return
    const id = validatingStop.id
    setStops(prev => prev.map(s => s.id === id ? { ...s, delivery_status: 'delivered' } : s))
    setValidatingStop(null)
    startTransition(async () => {
      await updateStopStatus(id, 'delivered', true)
    })
  }, [validatingStop])

  // ── Assign driver ──────────────────────────────────────────────────────────
  const handleAssign = useCallback((stop: Stop, uid: string | null) => {
    setStops(prev => prev.map(s => s.id === stop.id ? { ...s, assigned_to: uid } : s))
    startTransition(async () => {
      await assignStopDriver(stop.id, uid)
    })
  }, [])

  const selectedStop = stops.find(s => s.id === selectedId) ?? null

  // ── Legend ─────────────────────────────────────────────────────────────────
  const legend = [
    { label: 'À collecter', color: '#9333ea' },
    { label: 'En attente livraison', color: '#ea580c' },
    { label: 'En route', color: '#2563eb' },
    { label: 'Livré', color: '#16a34a' },
    { label: 'Échoué', color: '#dc2626' },
  ]

  if (stops.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <MapPin size={20} className="text-gray-400" />
          </div>
          <p className="font-semibold text-gray-700">Aucun arrêt aujourd&apos;hui</p>
          <p className="text-sm text-gray-400">Les collectes et livraisons du jour apparaissent ici</p>
        </div>
      </div>
    )
  }

  if (!hasMapsKey) {
    return (
      <div className="flex-1 overflow-y-auto">
        <FallbackList
          stops={stops} teamMembers={teamMembers} pressingName={pressingName}
          onValidate={s => setValidatingStop(s)}
          onStatusChange={handleStatusChange}
          onAssign={handleAssign}
          onMoveUp={idx => move(idx, -1)}
          onMoveDown={idx => move(idx, 1)}
        />
        {validatingStop && (
          <ValidationModal
            stop={validatingStop}
            onClose={() => setValidatingStop(null)}
            onConfirm={handleConfirmValidation}
            pending={isPending}
          />
        )}
      </div>
    )
  }

  // ── Full map layout ────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Mobile tab toggle */}
      <div className="flex md:hidden border-b border-gray-200 bg-white shrink-0">
        <button
          onClick={() => setMobileTab('list')}
          className={`flex-1 h-10 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
            mobileTab === 'list' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
          }`}
        >
          <List size={15} /> Arrêts ({stops.length})
        </button>
        <button
          onClick={() => setMobileTab('map')}
          className={`flex-1 h-10 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
            mobileTab === 'map' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
          }`}
        >
          <MapIcon size={15} /> Carte
        </button>
      </div>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar — list of stops */}
        <div className={`
          w-full md:w-80 lg:w-96 bg-gray-50 border-r border-gray-200 flex flex-col overflow-hidden
          ${mobileTab === 'map' ? 'hidden md:flex' : 'flex'}
        `}>
          {/* Legend */}
          <div className="px-3 py-2 bg-white border-b border-gray-100 flex flex-wrap gap-2">
            {legend.map(l => (
              <span key={l.label} className="flex items-center gap-1 text-xs text-gray-500">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
          </div>

          {/* Stop list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {stops.map((stop, idx) => (
              <StopCard
                key={stop.id}
                stop={stop} index={idx} total={stops.length}
                selected={stop.id === selectedId}
                teamMembers={teamMembers} pressingName={pressingName}
                onSelect={() => setSelectedId(stop.id === selectedId ? null : stop.id)}
                onMoveUp={() => move(idx, -1)}
                onMoveDown={() => move(idx, 1)}
                onValidate={() => setValidatingStop(stop)}
                onStatusChange={s => handleStatusChange(stop, s)}
                onAssign={uid => handleAssign(stop, uid)}
              />
            ))}
          </div>

          {/* Progress bar */}
          <div className="px-3 py-2.5 bg-white border-t border-gray-100">
            {(() => {
              const done = stops.filter(s => s.delivery_status === 'delivered').length
              const pct = Math.round((done / stops.length) * 100)
              return (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{done} / {stops.length} terminés</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })()}
          </div>
        </div>

        {/* Map */}
        <div className={`flex-1 relative ${mobileTab === 'list' ? 'hidden md:block' : 'block'}`}>
          <Map
            defaultCenter={CASABLANCA}
            defaultZoom={12}
            gestureHandling="greedy"
            disableDefaultUI={false}
            mapId="cleanflow-tournee"
            style={{ width: '100%', height: '100%' }}
          >
            <MapContent
              orderedStops={stops}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              pressingName={pressingName}
            />
          </Map>

          {/* Stops without coords warning */}
          {stops.some(s => !s.lat || !s.lng) && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-2 rounded-xl flex items-center gap-2 shadow-sm">
              <AlertTriangle size={12} />
              {stops.filter(s => !s.lat || !s.lng).length} arrêt(s) sans GPS — visible uniquement en liste
            </div>
          )}

          {/* Selected stop floating card (desktop) */}
          {selectedStop && (
            <div className="absolute top-3 right-3 hidden md:block w-72 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-10">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-900">{selectedStop.clients?.name}</p>
                <button onClick={() => setSelectedId(null)} className="p-1 text-gray-400 hover:text-gray-600">
                  <X size={15} />
                </button>
              </div>
              <div className="px-4 py-3 space-y-1.5 text-xs text-gray-600">
                {selectedStop.address && (
                  <p className="flex items-start gap-1.5">
                    <MapPin size={11} className="shrink-0 mt-0.5 text-gray-400" />
                    {selectedStop.address}
                  </p>
                )}
                {selectedStop.slot && (
                  <p className="flex items-center gap-1.5">
                    <Clock size={11} className="text-gray-400" />
                    {formatSlot(selectedStop.slot)}
                  </p>
                )}
                {selectedStop.access_notes && (
                  <p className="flex items-start gap-1.5 text-amber-700 bg-amber-50 rounded px-2 py-1">
                    <Key size={11} className="shrink-0 mt-0.5" />
                    {selectedStop.access_notes}
                  </p>
                )}
              </div>
              {!['delivered', 'failed'].includes(selectedStop.delivery_status || '') && (
                <div className="px-4 pb-3">
                  <button
                    onClick={() => setValidatingStop(selectedStop)}
                    className="w-full h-9 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={14} /> Valider avec code
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Validation modal */}
      {validatingStop && (
        <ValidationModal
          stop={validatingStop}
          onClose={() => setValidatingStop(null)}
          onConfirm={handleConfirmValidation}
          pending={isPending}
        />
      )}
    </div>
  )
}

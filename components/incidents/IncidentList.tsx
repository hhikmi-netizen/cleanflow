'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Incident } from '@/lib/types'
import { formatDate, getIncidentTypeLabel, getIncidentStatusLabel, getIncidentStatusColor } from '@/lib/utils'
import { AlertTriangle } from 'lucide-react'

interface IncidentListProps {
  incidents: Incident[]
}

const STATUS_FILTERS = [
  { value: 'all',            label: 'Tous' },
  { value: 'open',           label: 'Ouverts' },
  { value: 'in_progress',    label: 'En cours' },
  { value: 'waiting_client', label: 'En attente client' },
  { value: 'resolved',       label: 'Résolus' },
  { value: 'rejected',       label: 'Refusés' },
]

export default function IncidentList({ incidents }: IncidentListProps) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = incidents.filter(inc => {
    const matchStatus = filter === 'all' || inc.status === filter
    const q = search.toLowerCase()
    const matchSearch = !q ||
      inc.description.toLowerCase().includes(q) ||
      (inc.clients?.name || '').toLowerCase().includes(q) ||
      (inc.orders as any)?.order_number?.toLowerCase().includes(q) ||
      getIncidentTypeLabel(inc.type).toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  if (incidents.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <AlertTriangle size={40} className="mx-auto mb-3 opacity-30" />
        <p className="font-medium">Aucun incident signalé</p>
        <p className="text-sm mt-1">Bonne nouvelle !</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher…"
          className="flex-1 h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_FILTERS.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Liste */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">Aucun incident pour ce filtre</p>
        ) : (
          filtered.map(inc => (
            <Link key={inc.id} href={`/incidents/${inc.id}`}>
              <div className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {getIncidentTypeLabel(inc.type)}
                      </span>
                      {(inc.orders as any)?.order_number && (
                        <span className="text-xs text-blue-600 font-mono">
                          {(inc.orders as any).order_number}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-900 line-clamp-2">{inc.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      {inc.clients?.name && <span>{inc.clients.name}</span>}
                      <span>{formatDate(inc.created_at)}</span>
                    </div>
                  </div>
                  <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${getIncidentStatusColor(inc.status)}`}>
                    {getIncidentStatusLabel(inc.status)}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Search, Users, Phone, Download, Star, RefreshCw } from 'lucide-react'
import EmptyState from '@/components/shared/EmptyState'
import { Client } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

type SortKey = 'name' | 'total_spent' | 'total_orders' | 'created_at'
type TypeFilter = 'all' | 'individual' | 'business'

function exportCSV(clients: Client[]) {
  const headers = ['Code', 'Nom', 'Téléphone', 'Email', 'Type', 'Commandes', 'CA total', 'Points fidélité', 'Client depuis']
  const rows = clients.map(c => [
    (c as any).client_code || '',
    c.name,
    c.phone,
    c.email || '',
    c.client_type === 'business' ? 'Professionnel' : 'Particulier',
    c.total_orders,
    Number(c.total_spent).toFixed(2),
    (c as any).loyalty_points || 0,
    new Date(c.created_at).toLocaleDateString('fr-FR'),
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `clients_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ClientList({ clients, subscribedClientIds = new Set() }: { clients: Client[]; subscribedClientIds?: Set<string> }) {
  const [search, setSearch]       = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [sortKey, setSortKey]     = useState<SortKey>('name')
  const [sortAsc, setSortAsc]     = useState(true)

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc(a => !a)
    else { setSortKey(k); setSortAsc(k === 'name') }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return clients
      .filter(c => {
        const matchSearch =
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(search) ||
          (c.email || '').toLowerCase().includes(q) ||
          ((c as any).client_code || '').toLowerCase().includes(q)
        const matchType = typeFilter === 'all' || c.client_type === typeFilter
        return matchSearch && matchType
      })
      .sort((a, b) => {
        let va: string | number, vb: string | number
        if (sortKey === 'name')         { va = a.name.toLowerCase(); vb = b.name.toLowerCase() }
        else if (sortKey === 'total_spent')  { va = Number(a.total_spent); vb = Number(b.total_spent) }
        else if (sortKey === 'total_orders') { va = a.total_orders; vb = b.total_orders }
        else { va = a.created_at; vb = b.created_at }
        return sortAsc ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0)
      })
  }, [clients, search, typeFilter, sortKey, sortAsc])

  const totalCA = filtered.reduce((s, c) => s + Number(c.total_spent), 0)

  const SortArrow = ({ k }: { k: SortKey }) =>
    sortKey === k ? <span className="ml-0.5">{sortAsc ? '↑' : '↓'}</span> : null

  if (clients.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Aucun client"
        description="Ajoutez votre premier client pour commencer à créer des commandes."
        actionLabel="+ Nouveau client"
        actionHref="/clients/new"
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Nom, téléphone, email, code client…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as TypeFilter)}
          className="h-10 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tous types</option>
          <option value="individual">Particuliers</option>
          <option value="business">Professionnels</option>
        </select>
        <select
          value={sortKey}
          onChange={e => { setSortKey(e.target.value as SortKey); setSortAsc(e.target.value === 'name') }}
          className="h-10 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="name">Trier : Nom</option>
          <option value="total_spent">Trier : CA total</option>
          <option value="total_orders">Trier : Commandes</option>
          <option value="created_at">Trier : Date création</option>
        </select>
        <button
          onClick={() => exportCSV(filtered)}
          className="h-10 px-3 flex items-center gap-2 rounded-md border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
          title="Exporter en CSV"
        >
          <Download size={15} />
          <span className="hidden sm:inline">Export CSV</span>
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-8 text-sm">Aucun résultat</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    <button onClick={() => toggleSort('name')} className="hover:text-gray-800">
                      Nom <SortArrow k="name" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Téléphone</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    <button onClick={() => toggleSort('total_orders')} className="hover:text-gray-800">
                      Cmds <SortArrow k="total_orders" />
                    </button>
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    <button onClick={() => toggleSort('total_spent')} className="hover:text-gray-800">
                      CA total <SortArrow k="total_spent" />
                    </button>
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    <span className="flex items-center justify-end gap-1"><Star size={10} /> Points</span>
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(client => {
                  const pts = (client as any).loyalty_points || 0
                  const isSubscribed = subscribedClientIds.has(client.id)
                  return (
                    <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{client.name}</p>
                            {isSubscribed && (
                              <span className="inline-flex items-center gap-0.5 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">
                                <RefreshCw size={9} /> Abonné
                              </span>
                            )}
                          </div>
                          {(client as any).client_code && (
                            <p className="text-xs font-mono text-gray-400">{(client as any).client_code}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        <a href={`tel:${client.phone}`} className="hover:text-blue-600 flex items-center gap-1">
                          <Phone size={12} />{client.phone}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          client.client_type === 'business' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {client.client_type === 'business' ? 'Pro' : 'Particulier'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{client.total_orders}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(client.total_spent)}</td>
                      <td className="px-4 py-3 text-right">
                        {pts > 0 ? (
                          <span className="text-xs font-medium text-yellow-700 flex items-center justify-end gap-0.5">
                            <Star size={10} className="fill-yellow-400 text-yellow-500" />{pts}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/clients/${client.id}`} className="text-blue-600 hover:underline text-xs font-medium">
                          Voir →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden divide-y divide-gray-100">
            {filtered.map(client => {
              const pts = (client as any).loyalty_points || 0
              const isSubscribed = subscribedClientIds.has(client.id)
              return (
                <Link key={client.id} href={`/clients/${client.id}`}>
                  <div className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{client.name}</p>
                          {isSubscribed && (
                            <span className="inline-flex items-center gap-0.5 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">
                              <RefreshCw size={9} /> Abonné
                            </span>
                          )}
                        </div>
                        {(client as any).client_code && (
                          <p className="text-xs font-mono text-gray-400">{(client as any).client_code}</p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        client.client_type === 'business' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {client.client_type === 'business' ? 'Pro' : 'Particulier'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500">{client.phone}</p>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{client.total_orders} cmd · {formatCurrency(client.total_spent)}</p>
                        {pts > 0 && (
                          <p className="text-xs text-yellow-600 flex items-center justify-end gap-0.5">
                            <Star size={9} className="fill-yellow-400" />{pts} pts
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{filtered.length} client{filtered.length > 1 ? 's' : ''}</span>
        <span>CA total sélection : {formatCurrency(totalCA)}</span>
      </div>
    </div>
  )
}

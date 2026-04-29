'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Search, Users, Phone } from 'lucide-react'
import EmptyState from '@/components/shared/EmptyState'
import { Client } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

export default function ClientList({ clients }: { clients: Client[] }) {
  const [search, setSearch] = useState('')

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase())
  )

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
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Rechercher par nom, téléphone ou email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-8 text-sm">Aucun résultat</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Desktop */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nom</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Téléphone</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Commandes</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">CA total</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(client => (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{client.name}</td>
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
                      <Link href={`/clients/${client.id}`} className="text-blue-600 hover:underline text-xs font-medium">
                        Voir →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden divide-y divide-gray-100">
            {filtered.map(client => (
              <Link key={client.id} href={`/clients/${client.id}`}>
                <div className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-gray-900">{client.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      client.client_type === 'business' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {client.client_type === 'business' ? 'Pro' : 'Particulier'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">{client.phone}</p>
                    <p className="text-sm font-semibold text-gray-900">{client.total_orders} cmd · {formatCurrency(client.total_spent)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
      <p className="text-xs text-gray-400 text-right">{filtered.length} client{filtered.length > 1 ? 's' : ''}</p>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import OrderStatusBadge from './OrderStatusBadge'
import EmptyState from '@/components/shared/EmptyState'
import { ShoppingBag, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Order } from '@/lib/types'

interface OrderListProps {
  orders: Order[]
}

export default function OrderList({ orders }: OrderListProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = orders.filter(order => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(search.toLowerCase()) ||
      (order.clients?.name || '').toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Aucune commande"
        description="Créez votre première commande pour commencer à gérer votre pressing."
        actionLabel="+ Nouvelle commande"
        actionHref="/orders/new"
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Rechercher par numéro ou client..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="in_progress">En cours</option>
          <option value="ready">Prêt</option>
          <option value="delivered">Livré</option>
          <option value="cancelled">Annulé</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-8 text-sm">Aucun résultat pour cette recherche</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">N° Commande</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-700">{order.order_number}</td>
                    <td className="px-4 py-3 text-gray-700">{order.clients?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(order.created_at)}</td>
                    <td className="px-4 py-3"><OrderStatusBadge status={order.status} /></td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(order.total)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/orders/${order.id}`} className="text-blue-600 hover:underline text-xs font-medium">
                        Voir →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {filtered.map(order => (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <div className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-sm text-gray-700">{order.order_number}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{order.clients?.name || '—'}</p>
                      <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
                    </div>
                    <p className="text-base font-bold text-gray-900">{formatCurrency(order.total)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
      <p className="text-xs text-gray-400 text-right">{filtered.length} commande{filtered.length > 1 ? 's' : ''}</p>
    </div>
  )
}

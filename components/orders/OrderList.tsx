'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import OrderStatusBadge from './OrderStatusBadge'
import EmptyState from '@/components/shared/EmptyState'
import { ShoppingBag, Search, Download, Clock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Order } from '@/lib/types'

interface OrderListProps {
  orders: Order[]
}

type DateRange = 'all' | 'today' | 'week' | 'month'

function startOf(range: DateRange): Date | null {
  const now = new Date()
  if (range === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (range === 'week')  { const d = new Date(now); d.setDate(d.getDate() - 6); d.setHours(0,0,0,0); return d }
  if (range === 'month') return new Date(now.getFullYear(), now.getMonth(), 1)
  return null
}

function exportCSV(orders: Order[]) {
  const headers = ['N° Commande', 'Client', 'Date', 'Statut', 'Total', 'Acompte', 'Payé', 'Mode paiement']
  const rows = orders.map(o => [
    o.order_number,
    o.clients?.name || '',
    new Date(o.created_at).toLocaleDateString('fr-FR'),
    o.status,
    Number(o.total).toFixed(2),
    Number(o.deposit || 0).toFixed(2),
    o.paid ? 'Oui' : 'Non',
    o.payment_method,
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `commandes_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function OrderList({ orders }: OrderListProps) {
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateRange, setDateRange]     = useState<DateRange>('all')
  const [paidFilter, setPaidFilter]   = useState<'all' | 'paid' | 'unpaid'>('all')

  const filtered = useMemo(() => {
    const cutoff = startOf(dateRange)
    return orders.filter(order => {
      const q = search.toLowerCase()
      const matchSearch =
        order.order_number.toLowerCase().includes(q) ||
        (order.clients?.name || '').toLowerCase().includes(q) ||
        (order.clients?.phone || '').includes(q)
      const matchStatus = statusFilter === 'all' || order.status === statusFilter
      const matchDate   = !cutoff || new Date(order.created_at) >= cutoff
      const matchPaid   = paidFilter === 'all'
        || (paidFilter === 'paid'   && order.paid)
        || (paidFilter === 'unpaid' && !order.paid && order.status !== 'cancelled')
      return matchSearch && matchStatus && matchDate && matchPaid
    })
  }, [orders, search, statusFilter, dateRange, paidFilter])

  const overdueIds = useMemo(() => {
    const threshold = Date.now() - 3 * 24 * 3600 * 1000
    return new Set(orders.filter(o => o.status === 'ready' && new Date(o.created_at).getTime() < threshold).map(o => o.id))
  }, [orders])

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

  const dateRangeLabels: Record<DateRange, string> = {
    all: 'Toutes dates', today: "Aujourd'hui", week: '7 derniers jours', month: 'Ce mois',
  }

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Numéro, client, téléphone…"
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
        <select
          value={dateRange}
          onChange={e => setDateRange(e.target.value as DateRange)}
          className="h-10 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {(Object.keys(dateRangeLabels) as DateRange[]).map(k => (
            <option key={k} value={k}>{dateRangeLabels[k]}</option>
          ))}
        </select>
        <select
          value={paidFilter}
          onChange={e => setPaidFilter(e.target.value as typeof paidFilter)}
          className="h-10 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tous paiements</option>
          <option value="paid">Payé</option>
          <option value="unpaid">Non payé</option>
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
        <p className="text-center text-gray-400 py-8 text-sm">Aucun résultat pour ces filtres</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">N° Commande</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Paiement</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(order => {
                  const remaining = Math.max(0, Number(order.total) - Number(order.deposit || 0))
                  const isOverdue = overdueIds.has(order.id)
                  return (
                    <tr key={order.id} className={`hover:bg-gray-50 transition-colors ${isOverdue ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-4 py-3">
                        <span className="font-mono text-gray-700">{order.order_number}</span>
                        {isOverdue && (
                          <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                            <Clock size={9} /> En attente retrait
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{order.clients?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(order.created_at)}</td>
                      <td className="px-4 py-3"><OrderStatusBadge status={order.status} /></td>
                      <td className="px-4 py-3">
                        {order.paid ? (
                          <span className="text-xs font-medium text-green-600">✓ Payé</span>
                        ) : order.status !== 'cancelled' ? (
                          <span className="text-xs font-medium text-orange-500">
                            {remaining > 0 ? `${remaining.toFixed(0)} DH` : 'Impayé'}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(order.total)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/orders/${order.id}`} className="text-blue-600 hover:underline text-xs font-medium">
                          Voir →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {filtered.map(order => {
              const isOverdue = overdueIds.has(order.id)
              return (
                <Link key={order.id} href={`/orders/${order.id}`}>
                  <div className={`p-4 hover:bg-gray-50 transition-colors ${isOverdue ? 'bg-amber-50/40' : ''}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-sm text-gray-700">{order.order_number}</span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{order.clients?.name || '—'}</p>
                        <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-gray-900">{formatCurrency(order.total)}</p>
                        {!order.paid && order.status !== 'cancelled' && (
                          <p className="text-xs text-orange-500 font-medium">Non payé</p>
                        )}
                      </div>
                    </div>
                    {isOverdue && (
                      <p className="mt-1 text-xs text-amber-700 flex items-center gap-1">
                        <Clock size={10} /> En attente de retrait depuis plusieurs jours
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{filtered.length} commande{filtered.length > 1 ? 's' : ''} affichée{filtered.length > 1 ? 's' : ''}</span>
        {filtered.length > 0 && (
          <span>Total : {formatCurrency(filtered.reduce((s, o) => s + Number(o.total), 0))}</span>
        )}
      </div>
    </div>
  )
}

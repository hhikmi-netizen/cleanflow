'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getItemStatusLabel, getItemStatusColor, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import {
  ChevronDown, ChevronRight, AlertTriangle, Scissors,
  CheckCircle, Loader2, Package,
} from 'lucide-react'

type ItemStatus = 'received' | 'in_cleaning' | 'done' | 'ready' | 'issue'

interface ArticleItem {
  id: string
  service_name: string
  quantity: number
  unit_price: number
  article_code?: string
  item_status?: ItemStatus
  textile_type?: string
  stain_noted?: boolean
  stain_desc?: string
  alteration_needed?: boolean
  alteration_desc?: string
  notes?: string
  color?: string
  brand?: string
}

const STATUSES: ItemStatus[] = ['received', 'in_cleaning', 'done', 'ready', 'issue']
const TEXTILE_TYPES = ['Chemise', 'Pantalon', 'Costume', 'Robe', 'Veste', 'Manteau', 'Linge', 'Autre']

interface Props {
  items: ArticleItem[]
  orderId: string
}

export default function ArticleStatusPanel({ items: initialItems, orderId }: Props) {
  const [items, setItems] = useState(initialItems)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const supabase = createClient()

  const updateItem = async (id: string, patch: Partial<ArticleItem>) => {
    setSaving(id)
    const { error } = await supabase.from('order_items').update(patch).eq('id', id)
    if (error) { toast.error(error.message); setSaving(null); return }
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
    setSaving(null)
    toast.success('Article mis à jour')
  }

  const allDone = items.every(i => i.item_status === 'ready' || i.item_status === 'done')
  const hasIssues = items.some(i => i.item_status === 'issue')

  return (
    <div className="space-y-2">
      {/* Quick status summary */}
      <div className="flex items-center gap-2 flex-wrap mb-1">
        {STATUSES.map(s => {
          const count = items.filter(i => (i.item_status || 'received') === s).length
          if (count === 0) return null
          return (
            <span key={s} className={`text-xs px-2 py-0.5 rounded-full font-medium ${getItemStatusColor(s)}`}>
              {getItemStatusLabel(s)} ×{count}
            </span>
          )
        })}
      </div>

      {items.map(item => {
        const status = item.item_status || 'received'
        const isExpanded = expanded === item.id
        return (
          <div key={item.id} className={`rounded-lg border transition-colors ${
            status === 'issue' ? 'border-red-200 bg-red-50' :
            status === 'ready' ? 'border-green-200 bg-green-50' :
            'border-gray-200 bg-white'
          }`}>
            {/* Item header */}
            <div className="flex items-center gap-3 p-3">
              <button
                onClick={() => setExpanded(isExpanded ? null : item.id)}
                className="p-0.5 text-gray-400 hover:text-gray-600"
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.service_name}</p>
                  {item.quantity > 1 && <span className="text-xs text-gray-400">×{item.quantity}</span>}
                  {item.article_code && (
                    <span className="font-mono text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                      {item.article_code}
                    </span>
                  )}
                  {item.textile_type && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {item.textile_type}
                    </span>
                  )}
                  {item.stain_noted && (
                    <span className="text-xs text-orange-600 flex items-center gap-0.5">
                      <AlertTriangle size={10} /> Tâche
                    </span>
                  )}
                  {item.alteration_needed && (
                    <span className="text-xs text-purple-600 flex items-center gap-0.5">
                      <Scissors size={10} /> Retouche
                    </span>
                  )}
                </div>
              </div>

              {/* Quick status change */}
              <div className="flex items-center gap-1.5 shrink-0">
                {saving === item.id && <Loader2 size={12} className="animate-spin text-gray-400" />}
                <select
                  value={status}
                  onChange={e => updateItem(item.id, { item_status: e.target.value as ItemStatus })}
                  className={`text-xs h-7 px-2 rounded-lg border font-medium focus:outline-none cursor-pointer ${getItemStatusColor(status)}`}
                >
                  {STATUSES.map(s => (
                    <option key={s} value={s}>{getItemStatusLabel(s)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Expanded QC panel */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-3">
                {/* Textile type */}
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Type textile</p>
                  <div className="flex flex-wrap gap-1.5">
                    {TEXTILE_TYPES.map(t => (
                      <button key={t} type="button"
                        onClick={() => updateItem(item.id, { textile_type: t })}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          item.textile_type === t
                            ? 'border-blue-400 bg-blue-50 text-blue-700 font-medium'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stain */}
                <div className="flex items-start gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.stain_noted || false}
                      onChange={e => updateItem(item.id, { stain_noted: e.target.checked })}
                      className="w-4 h-4 rounded text-orange-500"
                    />
                    <span className="text-sm text-gray-700 flex items-center gap-1">
                      <AlertTriangle size={13} className="text-orange-500" /> Tâche signalée
                    </span>
                  </label>
                  {item.stain_noted && (
                    <input
                      value={item.stain_desc || ''}
                      onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, stain_desc: e.target.value } : i))}
                      onBlur={() => updateItem(item.id, { stain_desc: item.stain_desc })}
                      placeholder="Décrire la tâche…"
                      className="flex-1 h-8 px-2 rounded-lg border border-orange-200 bg-orange-50 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400"
                    />
                  )}
                </div>

                {/* Alteration */}
                <div className="flex items-start gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.alteration_needed || false}
                      onChange={e => updateItem(item.id, { alteration_needed: e.target.checked })}
                      className="w-4 h-4 rounded text-purple-500"
                    />
                    <span className="text-sm text-gray-700 flex items-center gap-1">
                      <Scissors size={13} className="text-purple-500" /> Retouche nécessaire
                    </span>
                  </label>
                  {item.alteration_needed && (
                    <input
                      value={item.alteration_desc || ''}
                      onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, alteration_desc: e.target.value } : i))}
                      onBlur={() => updateItem(item.id, { alteration_desc: item.alteration_desc })}
                      placeholder="Ourlet, bouton, fermeture…"
                      className="flex-1 h-8 px-2 rounded-lg border border-purple-200 bg-purple-50 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                    />
                  )}
                </div>

                {/* Color + brand */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Couleur</label>
                    <input
                      value={item.color || ''}
                      onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, color: e.target.value } : i))}
                      onBlur={() => updateItem(item.id, { color: item.color })}
                      placeholder="Bleu, blanc…"
                      className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Marque</label>
                    <input
                      value={item.brand || ''}
                      onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, brand: e.target.value } : i))}
                      onBlur={() => updateItem(item.id, { brand: item.brand })}
                      placeholder="Zara, H&M…"
                      className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Notes article</label>
                  <input
                    value={item.notes || ''}
                    onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, notes: e.target.value } : i))}
                    onBlur={() => updateItem(item.id, { notes: item.notes })}
                    placeholder="Instructions spécifiques…"
                    className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Global QC summary */}
      {(allDone || hasIssues) && (
        <div className={`flex items-center gap-2 text-sm font-medium p-3 rounded-lg ${
          hasIssues ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}>
          {hasIssues
            ? <><AlertTriangle size={14} /> Certains articles ont des problèmes signalés</>
            : <><CheckCircle size={14} /> Tous les articles sont traités</>
          }
        </div>
      )}
    </div>
  )
}

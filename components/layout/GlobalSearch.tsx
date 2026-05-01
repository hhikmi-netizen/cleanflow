'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, User, ShoppingBag, Package, Loader2, X } from 'lucide-react'

interface SearchResult {
  type: 'client' | 'order' | 'article'
  id: string
  label: string
  sublabel?: string
  href: string
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[\s\-.]/g, '')
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return }
    setLoading(true)
    const norm = normalize(q)

    const [clientsRes, ordersRes, articlesRes] = await Promise.all([
      supabase
        .from('clients')
        .select('id, name, phone, client_code')
        .or(`name.ilike.%${q}%,phone.ilike.%${q}%,client_code.ilike.%${q}%`)
        .limit(5),
      supabase
        .from('orders')
        .select('id, order_number, status, clients(name, phone)')
        .or(`order_number.ilike.%${q}%`)
        .limit(5),
      supabase
        .from('order_items')
        .select('id, article_code, service_name, order_id, orders(order_number)')
        .ilike('article_code', `%${q.toUpperCase()}%`)
        .limit(5),
    ])

    const items: SearchResult[] = []

    for (const c of clientsRes.data || []) {
      // Also match normalised phone
      if (
        c.name.toLowerCase().includes(q.toLowerCase()) ||
        normalize(c.phone).includes(norm) ||
        c.client_code?.toLowerCase().includes(q.toLowerCase())
      ) {
        items.push({
          type: 'client',
          id: c.id,
          label: c.name,
          sublabel: c.phone + (c.client_code ? ` · ${c.client_code}` : ''),
          href: `/clients/${c.id}`,
        })
      }
    }

    for (const o of ordersRes.data || []) {
      items.push({
        type: 'order',
        id: o.id,
        label: o.order_number,
        sublabel: (o.clients as any)?.name || '',
        href: `/orders/${o.id}`,
      })
    }

    for (const a of articlesRes.data || []) {
      if (!a.article_code) continue
      items.push({
        type: 'article',
        id: a.id,
        label: a.article_code,
        sublabel: `${a.service_name} · ${(a.orders as any)?.order_number || ''}`,
        href: `/orders/${a.order_id}`,
      })
    }

    setResults(items)
    setLoading(false)
    setOpen(items.length > 0 || q.length >= 2)
  }, [supabase])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300)
    return () => clearTimeout(timer)
  }, [query, search])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
      if (e.key === 'Escape') {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleSelect = (result: SearchResult) => {
    setQuery('')
    setOpen(false)
    router.push(result.href)
  }

  const iconFor = (type: SearchResult['type']) => {
    if (type === 'client') return <User size={14} className="text-blue-500" />
    if (type === 'order') return <ShoppingBag size={14} className="text-green-500" />
    return <Package size={14} className="text-purple-500" />
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Rechercher client, commande, article… (Ctrl+K)"
          className="w-full h-9 pl-8 pr-8 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-colors"
        />
        {loading && (
          <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
        )}
        {!loading && query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setOpen(false) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          {results.length === 0 && query.length >= 2 && !loading ? (
            <p className="text-sm text-gray-400 text-center py-4">Aucun résultat pour &ldquo;{query}&rdquo;</p>
          ) : (
            <ul>
              {results.map(r => (
                <li key={`${r.type}-${r.id}`}>
                  <button
                    onMouseDown={e => { e.preventDefault(); handleSelect(r) }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className="shrink-0">{iconFor(r.type)}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{r.label}</p>
                      {r.sublabel && (
                        <p className="text-xs text-gray-400 truncate">{r.sublabel}</p>
                      )}
                    </div>
                    <span className="ml-auto text-xs text-gray-300 capitalize shrink-0">
                      {r.type === 'client' ? 'client' : r.type === 'order' ? 'commande' : 'article'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

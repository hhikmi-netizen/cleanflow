'use client'

import { useState, useMemo } from 'react'
import { Minus, Plus } from 'lucide-react'
import { getPressingIcon, getCategoryColor, COLOR_CLASSES, type ArticleColor } from '@/components/icons/PressingIcons'
import { formatCurrency } from '@/lib/utils'

export interface CatalogService {
  id: string
  name: string
  base_price: number
  category?: string | null
}

export interface CartItem {
  serviceId: string
  serviceName: string
  quantity: number
  unitPrice: number
}

interface Props {
  services: CatalogService[]
  cart: CartItem[]
  onAdd: (service: CatalogService) => void
  onRemove: (serviceId: string) => void
  compact?: boolean
}

const CATEGORY_ORDER = ['Vêtements', 'Marocain', 'Linge maison', 'Kilo', 'Autre']

function categorize(name: string): string {
  const n = name.toLowerCase()
  if (['chemise', 'pantalon', 'costume', 'veste', 'blazer', 'robe', 'manteau', 'pull', 'jean', 'short', 'vêtement'].some(k => n.includes(k))) return 'Vêtements'
  if (['djellaba', 'jellaba', 'caftan', 'kaftan', 'burnous'].some(k => n.includes(k))) return 'Marocain'
  if (['couette', 'drap', 'tapis', 'rideau', 'lit', 'voilage', 'linge de maison'].some(k => n.includes(k))) return 'Linge maison'
  if (['kilo', 'kg', 'poids'].some(k => n.includes(k))) return 'Kilo'
  return 'Autre'
}

export default function ArticleCatalog({ services, cart, onAdd, onRemove, compact = false }: Props) {
  const [activeCategory, setActiveCategory] = useState('Tout')

  const categorized = useMemo(() => {
    const map = new Map<string, CatalogService[]>()
    services.forEach(s => {
      const cat = categorize(s.name)
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(s)
    })
    return map
  }, [services])

  const categories = ['Tout', ...CATEGORY_ORDER.filter(c => categorized.has(c))]

  const displayed = useMemo(() => {
    if (activeCategory === 'Tout') return services
    return categorized.get(activeCategory) || []
  }, [activeCategory, services, categorized])

  const cartMap = useMemo(() => {
    const m = new Map<string, number>()
    cart.forEach(i => m.set(i.serviceId, i.quantity))
    return m
  }, [cart])

  const tileSize = compact ? 'p-3' : 'p-4'
  const iconSize = compact ? 32 : 40

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Category tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeCategory === cat
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Tile grid */}
      <div className={`grid gap-2 overflow-y-auto flex-1 content-start ${compact ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'}`}>
        {displayed.map(service => {
          const qty = cartMap.get(service.id) || 0
          const color = getCategoryColor(service.name) as ArticleColor
          const cls = COLOR_CLASSES[color] || COLOR_CLASSES.blue
          const selected = qty > 0

          return (
            <div
              key={service.id}
              className={`relative border-2 rounded-2xl transition-all duration-150 ${tileSize} ${
                selected
                  ? `border-blue-400 bg-blue-50 shadow-md shadow-blue-100`
                  : `border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm`
              }`}
            >
              {/* Quantity badge */}
              {qty > 0 && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md z-10">
                  {qty}
                </div>
              )}

              {/* Icon */}
              <div className={`flex justify-center mb-2 ${cls.icon}`}>
                {getPressingIcon(service.name, iconSize)}
              </div>

              {/* Name */}
              <p className="text-center text-xs font-semibold text-gray-800 leading-tight line-clamp-2 mb-1">
                {service.name}
              </p>

              {/* Price */}
              <p className="text-center text-xs font-bold text-gray-500 mb-2">
                {formatCurrency(service.base_price)}
              </p>

              {/* Controls */}
              {qty === 0 ? (
                <button
                  onClick={() => onAdd(service)}
                  className="w-full h-9 rounded-xl bg-gray-900 hover:bg-gray-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-1"
                >
                  <Plus size={15} />
                </button>
              ) : (
                <div className="flex items-center justify-between gap-1">
                  <button
                    onClick={() => onRemove(service.id)}
                    className="flex-1 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-colors flex items-center justify-center"
                  >
                    <Minus size={15} />
                  </button>
                  <span className="text-sm font-bold text-gray-900 w-6 text-center">{qty}</span>
                  <button
                    onClick={() => onAdd(service)}
                    className="flex-1 h-9 rounded-xl bg-gray-900 hover:bg-gray-700 text-white font-bold transition-colors flex items-center justify-center"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {displayed.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400 text-sm">
            Aucun article dans cette catégorie
          </div>
        )}
      </div>
    </div>
  )
}

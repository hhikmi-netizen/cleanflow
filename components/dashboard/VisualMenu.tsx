'use client'

import Link from 'next/link'
import {
  ShoppingBag, Users, Wallet, Truck, Package, AlertTriangle, Settings,
  Zap, BarChart2, Tag, UserCog, Plus,
} from 'lucide-react'

interface MenuTile {
  href: string
  icon: React.ElementType
  label: string
  desc: string
  color: string
  iconBg: string
  textColor: string
  accent?: boolean
}

const TILES: MenuTile[] = [
  {
    href: '/orders/quick',
    icon: Plus,
    label: 'Nouvelle commande',
    desc: 'Mode caisse rapide',
    color: 'from-blue-600 to-blue-700',
    iconBg: 'bg-white/20',
    textColor: 'text-white',
    accent: true,
  },
  {
    href: '/orders',
    icon: ShoppingBag,
    label: 'Commandes',
    desc: 'Suivi & historique',
    color: 'bg-white',
    iconBg: 'bg-blue-100',
    textColor: 'text-gray-900',
  },
  {
    href: '/clients',
    icon: Users,
    label: 'Clients',
    desc: 'Fiche & fidélité',
    color: 'bg-white',
    iconBg: 'bg-purple-100',
    textColor: 'text-gray-900',
  },
  {
    href: '/caisse',
    icon: Wallet,
    label: 'Caisse',
    desc: 'Clôture du jour',
    color: 'bg-white',
    iconBg: 'bg-emerald-100',
    textColor: 'text-gray-900',
  },
  {
    href: '/livraisons',
    icon: Truck,
    label: 'Livraisons',
    desc: 'Collectes & tournée',
    color: 'bg-white',
    iconBg: 'bg-amber-100',
    textColor: 'text-gray-900',
  },
  {
    href: '/services',
    icon: Package,
    label: 'Catalogue',
    desc: 'Articles & prix',
    color: 'bg-white',
    iconBg: 'bg-cyan-100',
    textColor: 'text-gray-900',
  },
  {
    href: '/incidents',
    icon: AlertTriangle,
    label: 'SAV',
    desc: 'Réclamations',
    color: 'bg-white',
    iconBg: 'bg-red-100',
    textColor: 'text-gray-900',
  },
  {
    href: '/express',
    icon: Zap,
    label: 'Dépôt express',
    desc: 'Entrée rapide',
    color: 'bg-white',
    iconBg: 'bg-yellow-100',
    textColor: 'text-gray-900',
  },
  {
    href: '/stats',
    icon: BarChart2,
    label: 'Statistiques',
    desc: 'Chiffre d\'affaires',
    color: 'bg-white',
    iconBg: 'bg-indigo-100',
    textColor: 'text-gray-900',
  },
  {
    href: '/pricing',
    icon: Tag,
    label: 'Tarification',
    desc: 'Règles & forfaits',
    color: 'bg-white',
    iconBg: 'bg-pink-100',
    textColor: 'text-gray-900',
  },
  {
    href: '/team',
    icon: UserCog,
    label: 'Équipe',
    desc: 'Personnel & rôles',
    color: 'bg-white',
    iconBg: 'bg-orange-100',
    textColor: 'text-gray-900',
  },
  {
    href: '/settings',
    icon: Settings,
    label: 'Paramètres',
    desc: 'Configuration',
    color: 'bg-white',
    iconBg: 'bg-gray-100',
    textColor: 'text-gray-900',
  },
]

const ICON_COLORS: Record<string, string> = {
  'bg-blue-100': 'text-blue-600',
  'bg-purple-100': 'text-purple-600',
  'bg-emerald-100': 'text-emerald-600',
  'bg-amber-100': 'text-amber-600',
  'bg-cyan-100': 'text-cyan-600',
  'bg-red-100': 'text-red-600',
  'bg-yellow-100': 'text-yellow-600',
  'bg-indigo-100': 'text-indigo-600',
  'bg-pink-100': 'text-pink-600',
  'bg-orange-100': 'text-orange-600',
  'bg-gray-100': 'text-gray-600',
}

export default function VisualMenu() {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Accès rapide</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {TILES.map((tile) => {
          const Icon = tile.icon
          const isAccent = tile.accent

          if (isAccent) {
            return (
              <Link key={tile.href} href={tile.href}>
                <div className={`group relative col-span-2 sm:col-span-1 bg-gradient-to-br ${tile.color} rounded-2xl p-5 shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-300 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer overflow-hidden`}>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
                  <div className={`inline-flex p-2.5 rounded-xl ${tile.iconBg} mb-3`}>
                    <Icon size={22} className={tile.textColor} />
                  </div>
                  <p className={`text-base font-bold ${tile.textColor} leading-tight`}>{tile.label}</p>
                  <p className={`text-xs mt-0.5 ${tile.textColor} opacity-80`}>{tile.desc}</p>
                </div>
              </Link>
            )
          }

          const iconColor = ICON_COLORS[tile.iconBg] || 'text-gray-600'

          return (
            <Link key={tile.href} href={tile.href}>
              <div className="group bg-white border border-gray-100 rounded-2xl p-4 hover:border-gray-200 hover:shadow-md hover:shadow-gray-100 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer h-full">
                <div className={`inline-flex p-2.5 rounded-xl ${tile.iconBg} mb-3`}>
                  <Icon size={20} className={iconColor} />
                </div>
                <p className="text-sm font-semibold text-gray-900 leading-tight">{tile.label}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-snug">{tile.desc}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

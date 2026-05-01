'use client'

import { usePathname } from 'next/navigation'
import MobileNav from './MobileNav'
import GlobalSearch from './GlobalSearch'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/orders': 'Commandes',
  '/orders/new': 'Nouvelle commande',
  '/clients': 'Clients',
  '/services': 'Catalogue',
  '/incidents': 'SAV',
  '/express': 'Dépôt express',
  '/livraisons': 'Livraisons',
  '/stats':   'Statistiques',
  '/team':    'Équipe',
  '/settings': 'Paramètres',
  '/onboarding': 'Configuration',
}

export default function Header() {
  const pathname = usePathname()

  const title = Object.entries(pageTitles).find(([path]) =>
    pathname === path || (path !== '/' && pathname.startsWith(path))
  )?.[1] || 'CleanFlow'

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center gap-4">
      <div className="flex items-center gap-3 shrink-0">
        <MobileNav />
        <h2 className="text-base font-semibold text-gray-900 hidden sm:block">{title}</h2>
      </div>
      <div className="flex-1">
        <GlobalSearch />
      </div>
    </header>
  )
}

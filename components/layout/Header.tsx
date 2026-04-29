'use client'

import { usePathname } from 'next/navigation'
import MobileNav from './MobileNav'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/orders': 'Commandes',
  '/orders/new': 'Nouvelle commande',
  '/clients': 'Clients',
  '/services': 'Catalogue',
  '/settings': 'Paramètres',
  '/onboarding': 'Configuration',
}

export default function Header() {
  const pathname = usePathname()

  const title = Object.entries(pageTitles).find(([path]) =>
    pathname === path || (path !== '/' && pathname.startsWith(path))
  )?.[1] || 'CleanFlow'

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <MobileNav />
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
    </header>
  )
}

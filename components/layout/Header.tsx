'use client'

import { usePathname } from 'next/navigation'
import MobileNav from './MobileNav'
import GlobalSearch from './GlobalSearch'
import ScannerButton from '@/components/scanner/ScannerButton'

const pageTitles: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/orders':     'Commandes',
  '/orders/new': 'Nouvelle commande',
  '/quick-sale': 'Caisse rapide',
  '/clients':    'Clients',
  '/services':   'Catalogue',
  '/incidents':  'SAV',
  '/express':    'Depot express',
  '/livraisons': 'Livraisons',
  '/caisse':     'Caisse',
  '/stats':      'Statistiques',
  '/exports':    'Exports CSV',
  '/team':       'Equipe',
  '/settings':   'Parametres',
  '/onboarding': 'Configuration',
  '/forbidden':  'Acces refuse',
}

interface HeaderProps {
  role?: 'admin' | 'employee'
}

export default function Header({ role = 'employee' }: HeaderProps) {
  const pathname = usePathname()

  const title = Object.entries(pageTitles).find(([path]) =>
    pathname === path || (path !== '/' && pathname.startsWith(path))
  )?.[1] || 'CleanFlow'

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center gap-4">
      <div className="flex items-center gap-3 shrink-0">
        <MobileNav role={role} />
        <h2 className="text-base font-semibold text-gray-900 hidden sm:block">{title}</h2>
      </div>
      <div className="flex-1">
        <GlobalSearch />
      </div>
      <div className="shrink-0">
        <ScannerButton />
      </div>
    </header>
  )
}

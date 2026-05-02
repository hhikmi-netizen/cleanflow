'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import MobileNav from './MobileNav'
import GlobalSearch from './GlobalSearch'
import ScannerButton from '@/components/scanner/ScannerButton'
import { Clock } from 'lucide-react'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/orders': 'Commandes',
  '/orders/new': 'Nouvelle commande',
  '/quick-sale': 'Caisse rapide',
  '/pos': 'Caisse tactile',
  '/clients': 'Clients',
  '/services': 'Catalogue',
  '/incidents': 'SAV',
  '/express': 'DÃ©pÃ´t express',
  '/livraisons': 'Livraisons',
  '/caisse': 'Caisse',
  '/stats': 'Statistiques',
  '/exports': 'Exports CSV',
  '/team': 'Ãquipe',
  '/settings': 'ParamÃ¨tres',
  '/onboarding': 'Configuration',
  '/forbidden': 'AccÃ¨s refusÃ©',
}

interface HeaderProps {
  role?: 'admin' | 'employee'
}

export default function Header({ role = 'employee' }: HeaderProps) {
  const pathname = usePathname()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

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
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:flex items-center gap-1.5 text-gray-400 text-sm font-mono">
          <Clock className="w-4 h-4" />
          {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <ScannerButton />
      </div>
    </header>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Home, ShoppingBag, Users, Package, Settings, LogOut, AlertTriangle, Tag, Zap, BarChart2, UserCog, Truck, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard',  label: 'Dashboard',  icon: Home },
  { href: '/orders',     label: 'Commandes',   icon: ShoppingBag },
  { href: '/express',    label: 'Dépôt express', icon: Zap },
  { href: '/clients',    label: 'Clients',     icon: Users },
  { href: '/services',   label: 'Catalogue',   icon: Package },
  { href: '/incidents',  label: 'SAV',         icon: AlertTriangle },
  { href: '/livraisons', label: 'Livraisons',   icon: Truck },
  { href: '/caisse',     label: 'Caisse',       icon: Wallet },
  { href: '/stats',      label: 'Statistiques', icon: BarChart2 },
  { href: '/pricing',    label: 'Tarification', icon: Tag },
  { href: '/team',       label: 'Équipe',      icon: UserCog },
  { href: '/settings',   label: 'Paramètres',  icon: Settings },
]

export default function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    setOpen(false)
  }

  return (
    <div className="md:hidden">
      <button onClick={() => setOpen(true)} className="p-2 rounded-md text-gray-600 hover:bg-gray-100">
        <Menu size={22} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <span className="text-xl font-bold text-blue-600">CleanFlow</span>
              <button onClick={() => setOpen(false)} className="p-2 rounded-md hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems.map((item) => {
                const isActive = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={20} />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
            <div className="p-3 border-t">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 w-full"
              >
                <LogOut size={20} />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

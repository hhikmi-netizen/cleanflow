'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Menu, X, Home, ShoppingBag, Users, Package, Settings, LogOut,
  AlertTriangle, Tag, Zap, BarChart2, UserCog, Truck, Wallet,
  Monitor, Landmark, MapPin, Bell, ShieldAlert, Download, ScanLine,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { CleanFlowIcon, CleanFlowLogoFull } from '@/components/ui/CleanFlowLogo'

const employeeNavItems = [
  { href: '/pos',                label: 'Caisse tactile', icon: ScanLine   },
  { href: '/quick-sale',         label: 'Caisse rapide', icon: Monitor    },
  { href: '/orders',             label: 'Commandes',     icon: ShoppingBag },
  { href: '/clients',            label: 'Clients',       icon: Users      },
  { href: '/livraisons',         label: 'Livraisons',    icon: Truck      },
]

const adminOnlyNavItems = [
  { href: '/express',            label: 'Dépôt express', icon: Zap           },
  { href: '/services',           label: 'Catalogue',     icon: Package       },
  { href: '/livraisons/tournee', label: 'Carte tournée', icon: MapPin        },
  { href: '/caisse',             label: 'Caisse',        icon: Wallet        },
  { href: '/credit',             label: 'Impayés',       icon: Landmark      },
  { href: '/incidents',          label: 'SAV',           icon: AlertTriangle },
  { href: '/reminders',          label: 'Rappels WA',    icon: Bell          },
  { href: '/stats',              label: 'Statistiques',  icon: BarChart2     },
  { href: '/exports',            label: 'Exports CSV',   icon: Download      },
  { href: '/pricing',            label: 'Tarification',  icon: Tag           },
  { href: '/team',               label: 'Équipe',        icon: UserCog       },
  { href: '/settings',           label: 'Paramètres',    icon: Settings      },
]

interface MobileNavProps {
  role?: 'admin' | 'employee'
}

export default function MobileNav({ role = 'employee' }: MobileNavProps) {
  const [open, setOpen]  = useState(false)
  const isAdmin          = role === 'admin'
  const dashboardItem    = { href: '/dashboard', label: 'Dashboard', icon: Home }
  const navItems         = isAdmin
    ? [dashboardItem, ...employeeNavItems, ...adminOnlyNavItems]
    : employeeNavItems

  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    setOpen(false)
  }

  return (
    <div className="md:hidden">
      {/* Bouton hamburger avec icône logo */}
      <button onClick={() => setOpen(true)} className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100 flex items-center gap-1.5">
        <CleanFlowIcon size={26} />
        <Menu size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <CleanFlowLogoFull size="sm" />
                {!isAdmin && (
                  <div className="flex items-center gap-1 mt-1">
                    <ShieldAlert size={10} className="text-amber-500" />
                    <span className="text-xs text-amber-600 font-medium">Mode Employé</span>
                  </div>
                )}
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-md hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href)
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

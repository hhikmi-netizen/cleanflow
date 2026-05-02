'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, ShoppingBag, Users, Package, Settings, LogOut,
  AlertTriangle, Tag, Zap, BarChart2, UserCog, Truck, Wallet,
  Plus, MapPin, ShieldAlert, Monitor, Landmark, Bell, Download, ScanLine,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import ModeSwitch from '@/components/ui/ModeSwitch'
import { CleanFlowLogoFull } from '@/components/ui/CleanFlowLogo'

// Items visibles par les admins ET les employés (Dashboard affiché aux deux)
const employeeNavItems = [
  { href: '/pos',              label: 'Caisse tactile', icon: ScanLine },
  { href: '/quick-sale',         label: 'Caisse rapide', icon: Monitor  },
  { href: '/orders',             label: 'Commandes',     icon: ShoppingBag },
  { href: '/clients',            label: 'Clients',       icon: Users    },
  { href: '/livraisons',         label: 'Livraisons',    icon: Truck    },
]

// Items visibles uniquement par les admins
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

interface SidebarProps {
  role?: 'admin' | 'employee'
}

export default function Sidebar({ role = 'employee' }: SidebarProps) {
  const isAdmin  = role === 'admin'
  const dashboardItem = { href: '/dashboard', label: 'Dashboard', icon: Home }
  const navItems = isAdmin
    ? [dashboardItem, ...employeeNavItems, ...adminOnlyNavItems]
    : employeeNavItems

  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Déconnexion réussie')
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col">
      <div className="p-5 border-b border-gray-100">
        <CleanFlowLogoFull size="sm" />
        {!isAdmin && (
          <div className="flex items-center gap-1.5 mt-2">
            <ShieldAlert size={11} className="text-amber-500 shrink-0" />
            <p className="text-xs text-amber-600 font-medium">Mode Employé</p>
          </div>
        )}
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-gray-100 space-y-2">
        <Link
          href="/pos"
          className="flex items-center justify-center gap-2 w-full h-12 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition-colors shadow-md"
        >
          <ScanLine size={18} />
          Ouvrir la caisse
        </Link>
        {isAdmin && (
          <div className="flex justify-center py-1">
            <ModeSwitch />
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
        >
          <LogOut size={18} />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}

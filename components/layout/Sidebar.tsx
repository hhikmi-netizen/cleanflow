'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, ShoppingBag, Users, Package, Settings, LogOut,
  AlertTriangle, Tag, Zap, BarChart2, UserCog, Truck, Wallet,
  Plus, MapPin, ShieldAlert, Monitor, Landmark,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import ModeSwitch from '@/components/ui/ModeSwitch'

const allNavItems = [
  { href: '/dashboard',          label: 'Dashboard',     icon: Home,          adminOnly: false },
  { href: '/orders',             label: 'Commandes',     icon: ShoppingBag,   adminOnly: false },
  { href: '/express',            label: 'Dépôt express', icon: Zap,           adminOnly: false },
  { href: '/clients',            label: 'Clients',       icon: Users,         adminOnly: false },
  { href: '/services',           label: 'Catalogue',     icon: Package,       adminOnly: false },
  { href: '/incidents',          label: 'SAV',           icon: AlertTriangle, adminOnly: false },
  { href: '/livraisons',         label: 'Livraisons',    icon: Truck,         adminOnly: false },
  { href: '/livraisons/tournee', label: 'Carte tournée', icon: MapPin,        adminOnly: false },
  { href: '/caisse',             label: 'Caisse',        icon: Wallet,        adminOnly: false },
  { href: '/quick-sale',         label: 'Caisse rapide', icon: Monitor,       adminOnly: false },
  { href: '/credit',             label: 'Impayés',       icon: Landmark,      adminOnly: false },
  { href: '/stats',              label: 'Statistiques',  icon: BarChart2,     adminOnly: true  },
  { href: '/pricing',            label: 'Tarification',  icon: Tag,           adminOnly: true  },
  { href: '/team',               label: 'Équipe',        icon: UserCog,       adminOnly: true  },
  { href: '/settings',           label: 'Paramètres',    icon: Settings,      adminOnly: true  },
]

interface SidebarProps {
  role?: 'admin' | 'employee'
}

export default function Sidebar({ role = 'employee' }: SidebarProps) {
  const isAdmin = role === 'admin'
  const navItems = allNavItems.filter(item => isAdmin || !item.adminOnly)

  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Déconnexion réussie')
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col">
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-blue-600">CleanFlow</h1>
        {isAdmin ? (
          <p className="text-xs text-gray-400 mt-1">Gestion de pressing</p>
        ) : (
          <div className="flex items-center gap-1.5 mt-1.5">
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
          href="/orders/quick"
          className="flex items-center justify-center gap-2 w-full h-10 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus size={16} />
          Nouvelle commande
        </Link>
        <div className="flex justify-center py-1">
          <ModeSwitch />
        </div>
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

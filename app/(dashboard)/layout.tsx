import { createServerClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import MapsProvider from '@/components/layout/MapsProvider'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  let role: 'admin' | 'employee' = 'employee'
  if (user) {
    const { data } = await supabase
      .from('users').select('role').eq('id', user.id).single()
    if (data?.role === 'admin') role = 'admin'
  }

  return (
    <MapsProvider>
      <div className="flex h-screen bg-gray-50">
        <Sidebar role={role} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header role={role} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </MapsProvider>
  )
}

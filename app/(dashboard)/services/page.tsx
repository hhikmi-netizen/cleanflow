export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ServicesManager from '@/components/services/ServicesManager'

export default async function ServicesPage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('pressing_id, role')
    .eq('id', user.id)
    .single()

  if (!userData?.pressing_id) redirect('/onboarding')

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('pressing_id', userData.pressing_id)
    .order('category')
    .order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catalogue de services</h1>
          <p className="text-sm text-gray-500 mt-1">Gérez vos prestations et tarifs</p>
        </div>
      </div>
      <ServicesManager
        services={services || []}
        pressingId={userData.pressing_id}
        isAdmin={userData.role === 'admin'}
      />
    </div>
  )
}

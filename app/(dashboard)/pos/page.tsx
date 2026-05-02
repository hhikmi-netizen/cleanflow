export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PosClient from './PosClient'

export default async function PosPage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('pressing_id, role')
    .eq('id', user.id)
    .single()

  if (!userData?.pressing_id) redirect('/onboarding')

  const pressingId = userData.pressing_id

  const [servicesRes, clientsRes, pressingRes] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, price_individual, price_business, category')
      .eq('pressing_id', pressingId)
      .eq('active', true)
      .order('category')
      .order('name'),
    supabase
      .from('clients')
      .select('id, name, phone, type')
      .eq('pressing_id', pressingId)
      .order('name'),
    supabase
      .from('pressings')
      .select('name, phone')
      .eq('id', pressingId)
      .single(),
  ])

  const services = (servicesRes.data || []).map(s => ({
    id: s.id,
    name: s.name,
    category: s.category || 'Autre',
    price: s.price_individual,
  }))

  return (
    <PosClient
      services={services}
      clients={clientsRes.data || []}
      pressingId={pressingId}
      pressingName={pressingRes.data?.name || 'CleanFlow'}
      pressingPhone={pressingRes.data?.phone || ''}
    />
  )
}

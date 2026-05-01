export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import QuickOrderForm from '@/components/orders/QuickOrderForm'

export default async function QuickOrderPage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('pressing_id')
    .eq('id', user.id)
    .single()

  if (!userData?.pressing_id) redirect('/onboarding')

  const pressingId = userData.pressing_id

  const [servicesRes, pressingRes] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, price_individual, price_business, category')
      .eq('pressing_id', pressingId)
      .eq('active', true)
      .order('name'),
    supabase
      .from('pressings')
      .select('name, phone')
      .eq('id', pressingId)
      .single(),
  ])

  // Map price_individual → base_price for ArticleCatalog (individual tarif by default)
  const services = (servicesRes.data || []).map(s => ({
    id: s.id,
    name: s.name,
    category: s.category,
    base_price: s.price_individual,
  }))

  return (
    <QuickOrderForm
      services={services}
      pressingId={pressingId}
      pressingName={pressingRes.data?.name || ''}
      pressingPhone={pressingRes.data?.phone || undefined}
    />
  )
}

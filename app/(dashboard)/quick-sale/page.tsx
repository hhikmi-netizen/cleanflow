export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PosTerminal from '@/components/pos/PosTerminal'

export default async function QuickSalePage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('pressing_id').eq('id', user.id).single()
  if (!userData?.pressing_id) redirect('/onboarding')

  const pid = userData.pressing_id

  const [servicesRes, pressingRes, rulesRes] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, category, price_individual, price_business')
      .eq('pressing_id', pid)
      .eq('active', true)
      .order('category')
      .order('name'),
    supabase
      .from('pressings')
      .select('name, phone, currency')
      .eq('id', pid)
      .single(),
    supabase
      .from('price_rules')
      .select('id, name, service_id, rule_type, price_type, price, min_quantity, priority, valid_from, valid_until, zone_name, days_of_week, time_from, time_until')
      .eq('pressing_id', pid),
  ])

  const services = (servicesRes.data || []).map(s => ({
    id: s.id,
    name: s.name,
    category: s.category,
    base_price: s.price_individual,
    price_business: s.price_business,
  }))

  return (
    <PosTerminal
      services={services}
      pressingId={pid}
      pressingName={pressingRes.data?.name || ''}
      pressingPhone={pressingRes.data?.phone || undefined}
      priceRules={rulesRes.data || []}
    />
  )
}

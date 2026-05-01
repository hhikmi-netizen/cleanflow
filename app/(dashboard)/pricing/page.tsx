export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PricingManager from '@/components/pricing/PricingManager'

export default async function PricingPage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('pressing_id, role').eq('id', user.id).single()
  if (!userData?.pressing_id) redirect('/onboarding')
  if (userData.role !== 'admin') redirect('/dashboard')

  const pid = userData.pressing_id

  const [
    { data: priceRules },
    { data: subscriptions },
    { data: customerSubs },
    { data: discounts },
    { data: clients },
    { data: services },
  ] = await Promise.all([
    supabase.from('price_rules')
      .select('*, services(name)')
      .eq('pressing_id', pid)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('subscriptions')
      .select('*')
      .eq('pressing_id', pid)
      .order('created_at', { ascending: false }),
    supabase.from('customer_subscriptions')
      .select('*, subscriptions(name, sub_type, price, credits, quota_quantity, quota_kilo), clients(name, phone)')
      .eq('pressing_id', pid)
      .order('created_at', { ascending: false }),
    supabase.from('discount_rules')
      .select('*, clients(name), services(name)')
      .eq('pressing_id', pid)
      .order('created_at', { ascending: false }),
    supabase.from('clients').select('id, name, phone').eq('pressing_id', pid).order('name'),
    supabase.from('services').select('id, name, category').eq('pressing_id', pid).eq('active', true).order('name'),
  ])

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tarification</h1>
        <p className="text-sm text-gray-500 mt-1">Configurez vos règles de prix, forfaits et remises</p>
      </div>

      <PricingManager
        priceRules={priceRules || []}
        subscriptions={subscriptions || []}
        customerSubs={customerSubs || []}
        discounts={discounts || []}
        clients={clients || []}
        services={services || []}
      />
    </div>
  )
}

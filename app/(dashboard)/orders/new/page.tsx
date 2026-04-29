export const dynamic = 'force-dynamic'

import CreateOrderForm from '@/components/orders/CreateOrderForm'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function NewOrderPage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('pressing_id')
    .eq('id', user.id)
    .single()

  if (!userData?.pressing_id) redirect('/onboarding')

  const [clientsResult, servicesResult, pressingResult] = await Promise.all([
    supabase.from('clients').select('*').eq('pressing_id', userData.pressing_id).order('name'),
    supabase.from('services').select('*').eq('pressing_id', userData.pressing_id).eq('active', true).order('category').order('name'),
    supabase.from('pressings').select('tax_rate').eq('id', userData.pressing_id).single(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/orders" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nouvelle commande</h1>
      </div>
      <CreateOrderForm
        clients={clientsResult.data || []}
        services={servicesResult.data || []}
        pressingId={userData.pressing_id}
        taxRate={pressingResult.data?.tax_rate || 0}
      />
    </div>
  )
}

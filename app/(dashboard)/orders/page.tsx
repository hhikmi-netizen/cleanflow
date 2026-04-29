export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import OrderList from '@/components/orders/OrderList'
import { redirect } from 'next/navigation'

export default async function OrdersPage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('pressing_id')
    .eq('id', user.id)
    .single()

  if (!userData?.pressing_id) redirect('/onboarding')

  const { data: orders } = await supabase
    .from('orders')
    .select('*, clients(id, name, phone, address)')
    .eq('pressing_id', userData.pressing_id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Commandes</h1>
        <Link href="/orders/new">
          <Button>+ Nouvelle commande</Button>
        </Link>
      </div>
      <OrderList orders={orders || []} />
    </div>
  )
}

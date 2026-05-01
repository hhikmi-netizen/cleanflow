export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientList from '@/components/clients/ClientList'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function ClientsPage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('pressing_id')
    .eq('id', user.id)
    .single()

  if (!userData?.pressing_id) redirect('/onboarding')

  const [{ data: clients }, { data: activeSubs }] = await Promise.all([
    supabase.from('clients').select('*').eq('pressing_id', userData.pressing_id).order('name'),
    supabase.from('customer_subscriptions').select('client_id').eq('pressing_id', userData.pressing_id).eq('status', 'active'),
  ])

  const subscribedClientIds = new Set((activeSubs || []).map((s: any) => s.client_id as string))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <Link href="/clients/new">
          <Button>+ Nouveau client</Button>
        </Link>
      </div>
      <ClientList clients={clients || []} subscribedClientIds={subscribedClientIds} />
    </div>
  )
}

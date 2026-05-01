export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExpressDeposit from '@/components/express/ExpressDeposit'
import Link from 'next/link'
import { Zap, ChevronLeft } from 'lucide-react'

export default async function ExpressPage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('pressing_id').eq('id', user.id).single()
  if (!userData?.pressing_id) redirect('/onboarding')

  const [{ data: services }, { data: pressing }] = await Promise.all([
    supabase.from('services')
      .select('id, name, category, price_individual, price_business')
      .eq('pressing_id', userData.pressing_id)
      .eq('active', true)
      .order('category').order('name'),
    supabase.from('pressings')
      .select('name')
      .eq('id', userData.pressing_id)
      .single(),
  ])

  return (
    <div className="space-y-5 max-w-xl">
      <div className="flex items-center gap-3">
        <Link href="/orders" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dépôt express</h1>
            <p className="text-xs text-gray-400">Saisie rapide au comptoir</p>
          </div>
        </div>
      </div>

      <ExpressDeposit
        services={services || []}
        pressingId={userData.pressing_id}
        pressingName={pressing?.name || 'Pressing'}
      />
    </div>
  )
}

export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientForm from '@/components/clients/ClientForm'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function NewClientPage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('pressing_id')
    .eq('id', user.id)
    .single()

  if (!userData?.pressing_id) redirect('/onboarding')

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/clients" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nouveau client</h1>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <ClientForm pressingId={userData.pressing_id} />
      </div>
    </div>
  )
}

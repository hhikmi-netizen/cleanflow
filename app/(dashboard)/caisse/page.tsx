export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DayClosingForm from '@/components/caisse/DayClosingForm'
import ClosingHistory from '@/components/caisse/ClosingHistory'

export default async function CaissePage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('pressing_id, role').eq('id', user.id).single()
  if (!userData?.pressing_id) redirect('/onboarding')

  const today = new Date().toISOString().split('T')[0]

  // Today's collected payments (deposits + payments table)
  const [ordersRes, paymentsRes, closingsRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, deposit, payment_method, total, subtotal')
      .eq('pressing_id', userData.pressing_id)
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`),
    supabase
      .from('payments')
      .select('amount, method')
      .eq('pressing_id', userData.pressing_id)
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`),
    supabase
      .from('day_closings')
      .select('*, users(full_name)')
      .eq('pressing_id', userData.pressing_id)
      .order('closing_date', { ascending: false })
      .limit(30),
  ])

  const orders = ordersRes.data || []
  const payments = paymentsRes.data || []
  const closings = closingsRes.data || []

  // Aggregate by method (deposits counted by payment_method on order, payments table by method)
  const summary = { cash: 0, card: 0, transfer: 0 }

  // Deposits from today's orders
  for (const o of orders) {
    if (Number(o.deposit) > 0) {
      const m = o.payment_method as 'cash' | 'card' | 'transfer'
      if (m in summary) summary[m] += Number(o.deposit)
    }
  }

  // Payments from payments table
  for (const p of payments) {
    const m = p.method as 'cash' | 'card' | 'transfer'
    if (m in summary) summary[m] += Number(p.amount)
  }

  const todayAlreadyClosed = closings.some(c => c.closing_date === today)

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Caisse</h1>
        <p className="text-sm text-gray-500 mt-0.5">Clôture journalière des encaissements</p>
      </div>

      <DayClosingForm
        today={today}
        suggestedCash={summary.cash}
        suggestedCard={summary.card}
        suggestedTransfer={summary.transfer}
        ordersCount={orders.length}
        alreadyClosed={todayAlreadyClosed}
        isAdmin={userData.role === 'admin'}
      />

      <ClosingHistory closings={closings} />
    </div>
  )
}

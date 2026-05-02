import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PickupClient from './PickupClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PickupPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('pressing_id, role')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/onboarding')

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id, order_number, tracking_token, status, subtotal, tax, total,
      deposit, paid, payment_method, delivery_mode, notes,
      created_at, delivered_at,
      client:clients(id, name, phone, email),
      items:order_items(id, service_name, quantity, unit_price, subtotal, item_status, textile_type, color, brand, notes)
    `)
    .eq('id', id)
    .eq('pressing_id', profile.pressing_id)
    .single()

  if (error || !order) redirect('/orders')

  const { data: payments } = await supabase
    .from('payments')
    .select('id, amount, method, notes, created_at')
    .eq('order_id', id)
    .order('created_at', { ascending: true })

  const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0) + Number(order.deposit)
  const remaining = Math.max(0, Number(order.total) - totalPaid)

  const fixedOrder = {
    ...order,
    client: Array.isArray(order.client) ? order.client[0] || null : order.client,
  }

  return (
    <PickupClient
      order={fixedOrder as any}
      payments={payments || []}
      totalPaid={totalPaid}
      remaining={remaining}
      isAdmin={profile.role === 'admin'}
    />
  )
}

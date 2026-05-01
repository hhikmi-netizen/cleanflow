'use server'

import { createServerClient } from '@/lib/supabase/server'

export async function awardOrderPoints(orderId: string): Promise<{ points: number } | null> {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userData } = await supabase
    .from('users').select('pressing_id').eq('id', user.id).single()
  if (!userData?.pressing_id) return null

  const pid = userData.pressing_id

  const [orderRes, settingsRes] = await Promise.all([
    supabase.from('orders').select('id, total, client_id').eq('id', orderId).eq('pressing_id', pid).single(),
    supabase.from('settings').select('loyalty_enabled, points_per_dh').eq('pressing_id', pid).single(),
  ])

  const order = orderRes.data
  const settings = settingsRes.data

  if (!order?.client_id || !settings?.loyalty_enabled) return null

  // Don't double-award: check if already recorded for this order
  const { count } = await supabase
    .from('loyalty_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('order_id', orderId)
    .eq('type', 'earned')
  if ((count ?? 0) > 0) return null

  const pointsPerDh = Number(settings.points_per_dh) || 1
  const earned = Math.floor(Number(order.total) * pointsPerDh)
  if (earned <= 0) return null

  await supabase.from('loyalty_transactions').insert({
    pressing_id: pid,
    client_id: order.client_id,
    order_id: orderId,
    type: 'earned',
    points: earned,
    note: `Commande livrée`,
  })

  await supabase.rpc('increment_loyalty_points', {
    p_client_id: order.client_id,
    p_points: earned,
  })

  return { points: earned }
}

export async function adjustLoyaltyPoints(
  clientId: string,
  delta: number,
  note: string,
): Promise<void> {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: userData } = await supabase
    .from('users').select('pressing_id').eq('id', user.id).single()
  if (!userData?.pressing_id) return

  const pid = userData.pressing_id

  await supabase.from('loyalty_transactions').insert({
    pressing_id: pid,
    client_id: clientId,
    type: delta >= 0 ? 'adjustment' : 'redeemed',
    points: delta,
    note,
  })

  await supabase.rpc('increment_loyalty_points', {
    p_client_id: clientId,
    p_points: delta,
  })
}

'use server'

import { createServerClient as createSSRClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

function getSupabase(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { /* RSC cookie write no-op */ }
        },
      },
    }
  )
}

export async function quickPayAndDeliver(data: {
  orderId: string
  amount: number
  method: string
}): Promise<{ success: boolean; error?: string }> {
  const cookieStore = await cookies()
  const supabase = getSupabase(cookieStore)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Non authentifie' }

  const { data: profile } = await supabase
    .from('users')
    .select('pressing_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { success: false, error: 'Profil introuvable' }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, status, total, deposit, paid')
    .eq('id', data.orderId)
    .eq('pressing_id', profile.pressing_id)
    .single()

  if (orderError || !order) return { success: false, error: 'Commande introuvable' }
  if (order.status === 'delivered') return { success: false, error: 'Commande deja livree' }

  if (data.amount > 0) {
    const { error: payError } = await supabase.from('payments').insert({
      pressing_id: profile.pressing_id,
      order_id: data.orderId,
      amount: data.amount,
      method: data.method,
      notes: 'Paiement retrait rapide',
    })
    if (payError) return { success: false, error: 'Erreur paiement: ' + payError.message }
  }

  const { data: paymentsData } = await supabase
    .from('payments')
    .select('amount')
    .eq('order_id', data.orderId)
  const totalPaid = (paymentsData || []).reduce((sum, p) => sum + Number(p.amount), 0) + Number(order.deposit)
  const isPaid = totalPaid >= Number(order.total)

  if (isPaid && !order.paid) {
    await supabase.from('orders').update({ paid: true }).eq('id', data.orderId)
  }

  revalidatePath('/orders/pickup/' + data.orderId)
  revalidatePath('/orders/' + data.orderId)
  return { success: true }
}

export async function markAsDelivered(orderId: string): Promise<{ success: boolean; error?: string }> {
  const cookieStore = await cookies()
  const supabase = getSupabase(cookieStore)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Non authentifie' }

  const { data: profile } = await supabase
    .from('users')
    .select('pressing_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { success: false, error: 'Profil introuvable' }

  const { data: order } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', orderId)
    .eq('pressing_id', profile.pressing_id)
    .single()

  if (!order) return { success: false, error: 'Commande introuvable' }
  if (order.status === 'delivered') return { success: false, error: 'Deja livree' }

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'delivered',
      delivered_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (updateError) return { success: false, error: 'Erreur: ' + updateError.message }

  revalidatePath('/orders/pickup/' + orderId)
  revalidatePath('/orders/' + orderId)
  revalidatePath('/orders')
  return { success: true }
}

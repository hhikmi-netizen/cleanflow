'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

function getSupabase(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )
}

export async function addPayment(data: {
  orderId: string
  amount: number
  method: string
  notes?: string
}): Promise<void> {
  const cookieStore = await cookies()
  const supabase = getSupabase(cookieStore)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Non authentifié')

  const { data: userData } = await supabase
    .from('users').select('pressing_id').eq('id', user.id).single()
  if (!userData?.pressing_id) throw new Error('Pressing introuvable')

  const { error } = await supabase.from('payments').insert({
    pressing_id: userData.pressing_id,
    order_id: data.orderId,
    amount: data.amount,
    method: data.method,
    notes: data.notes || null,
  })
  if (error) throw new Error(error.message)

  // Marquer payé si le total est atteint
  const { data: order } = await supabase
    .from('orders')
    .select('total, deposit')
    .eq('id', data.orderId)
    .single()

  if (order) {
    const { data: paymentsData } = await supabase
      .from('payments')
      .select('amount')
      .eq('order_id', data.orderId)
    const totalPaid = (paymentsData || []).reduce((sum, p) => sum + Number(p.amount), 0) + Number(order.deposit)
    if (totalPaid >= Number(order.total)) {
      await supabase.from('orders').update({ paid: true }).eq('id', data.orderId)
    }
  }

  revalidatePath(`/orders/${data.orderId}`)
}

export async function deletePayment(paymentId: string, orderId: string): Promise<void> {
  const cookieStore = await cookies()
  const supabase = getSupabase(cookieStore)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Non authentifié')

  const { error } = await supabase.from('payments').delete().eq('id', paymentId)
  if (error) throw new Error(error.message)

  revalidatePath(`/orders/${orderId}`)
}

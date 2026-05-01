'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface DayClosingPayload {
  closing_date: string
  cash: number
  card: number
  transfer: number
  notes?: string
}

export async function closeDay(payload: DayClosingPayload) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: userData } = await supabase
    .from('users').select('pressing_id').eq('id', user.id).single()
  if (!userData?.pressing_id) throw new Error('Pressing introuvable')

  // Fetch orders for the day to compute orders_count
  const { count } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('pressing_id', userData.pressing_id)
    .gte('created_at', `${payload.closing_date}T00:00:00`)
    .lte('created_at', `${payload.closing_date}T23:59:59`)

  const total = payload.cash + payload.card + payload.transfer

  const { error } = await supabase.from('day_closings').upsert({
    pressing_id: userData.pressing_id,
    closed_by: user.id,
    closing_date: payload.closing_date,
    cash: payload.cash,
    card: payload.card,
    transfer: payload.transfer,
    total,
    orders_count: count || 0,
    notes: payload.notes || null,
  }, { onConflict: 'pressing_id,closing_date' })

  if (error) throw error
  revalidatePath('/caisse')
}

export async function getDayClosings(pressingId: string, limit = 30) {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('day_closings')
    .select('*, users(full_name)')
    .eq('pressing_id', pressingId)
    .order('closing_date', { ascending: false })
    .limit(limit)
  return data || []
}

'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getPressingId() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  const { data } = await supabase.from('users').select('pressing_id').eq('id', user.id).single()
  if (!data?.pressing_id) throw new Error('Pressing introuvable')
  return { supabase, pressingId: data.pressing_id, userId: user.id }
}

export async function updateDeliveryStatus(orderId: string, status: string) {
  const { supabase, pressingId } = await getPressingId()
  const { error } = await supabase
    .from('orders')
    .update({ delivery_status: status })
    .eq('id', orderId)
    .eq('pressing_id', pressingId)
  if (error) throw new Error(error.message)
  revalidatePath('/livraisons')
  revalidatePath(`/orders/${orderId}`)
}

export async function assignDriver(orderId: string, userId: string | null) {
  const { supabase, pressingId } = await getPressingId()
  const { error } = await supabase
    .from('orders')
    .update({ assigned_to: userId })
    .eq('id', orderId)
    .eq('pressing_id', pressingId)
  if (error) throw new Error(error.message)
  revalidatePath('/livraisons')
  revalidatePath(`/orders/${orderId}`)
}

export async function updateDeliveryDetails(orderId: string, data: {
  pickup_address?: string
  delivery_address?: string
  pickup_slot?: string
  delivery_slot?: string
}) {
  const { supabase, pressingId } = await getPressingId()
  const update: Record<string, string | null> = {}
  if ('pickup_address'   in data) update.pickup_address   = data.pickup_address   || null
  if ('delivery_address' in data) update.delivery_address = data.delivery_address || null
  if ('pickup_slot'      in data) update.pickup_slot      = data.pickup_slot      || null
  if ('delivery_slot'    in data) update.delivery_slot    = data.delivery_slot    || null
  const { error } = await supabase
    .from('orders')
    .update(update)
    .eq('id', orderId)
    .eq('pressing_id', pressingId)
  if (error) throw new Error(error.message)
  revalidatePath('/livraisons')
  revalidatePath(`/orders/${orderId}`)
}

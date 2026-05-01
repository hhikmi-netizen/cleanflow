'use server'

import { createServerClient as createSSRClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

function getSupabase(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cs) { try { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    }
  )
}

async function getPressingId() {
  const cookieStore = await cookies()
  const supabase = getSupabase(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('pressing_id').eq('id', user.id).single()
  return data?.pressing_id || null
}

export async function saveStopOrder(items: { id: string; stop_order: number }[]): Promise<{ ok: boolean }> {
  const cookieStore = await cookies()
  const supabase = getSupabase(cookieStore)
  const pressingId = await getPressingId()
  if (!pressingId) return { ok: false }

  for (const { id, stop_order } of items) {
    await supabase.from('orders').update({ stop_order }).eq('id', id).eq('pressing_id', pressingId)
  }
  revalidatePath('/livraisons/tournee')
  return { ok: true }
}

export async function updateStopStatus(
  orderId: string,
  deliveryStatus: 'pending' | 'en_route' | 'delivered' | 'failed',
  markOrderDelivered = false
): Promise<{ ok: boolean }> {
  const cookieStore = await cookies()
  const supabase = getSupabase(cookieStore)
  const pressingId = await getPressingId()
  if (!pressingId) return { ok: false }

  const update: Record<string, string> = { delivery_status: deliveryStatus }
  if (markOrderDelivered) update.status = 'delivered'

  await supabase.from('orders').update(update).eq('id', orderId).eq('pressing_id', pressingId)
  revalidatePath('/livraisons/tournee')
  revalidatePath('/livraisons')
  return { ok: true }
}

export async function assignStopDriver(orderId: string, userId: string | null): Promise<{ ok: boolean }> {
  const cookieStore = await cookies()
  const supabase = getSupabase(cookieStore)
  const pressingId = await getPressingId()
  if (!pressingId) return { ok: false }

  await supabase.from('orders').update({ assigned_to: userId }).eq('id', orderId).eq('pressing_id', pressingId)
  revalidatePath('/livraisons/tournee')
  return { ok: true }
}

export async function updateAccessNotes(orderId: string, notes: string): Promise<{ ok: boolean }> {
  const cookieStore = await cookies()
  const supabase = getSupabase(cookieStore)
  const pressingId = await getPressingId()
  if (!pressingId) return { ok: false }

  await supabase.from('orders').update({ access_notes: notes || null }).eq('id', orderId).eq('pressing_id', pressingId)
  revalidatePath('/livraisons/tournee')
  return { ok: true }
}

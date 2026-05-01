'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Helpers ───────────────────────────────────────────────────────────────

async function getPressingId() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  const { data } = await supabase.from('users').select('pressing_id').eq('id', user.id).single()
  if (!data?.pressing_id) throw new Error('Pressing introuvable')
  return { supabase, pressingId: data.pressing_id }
}

// ── Price Rules ───────────────────────────────────────────────────────────

export async function createPriceRule(payload: {
  name: string
  service_id?: string
  rule_type: string
  price_type: string
  price: number
  min_quantity?: number
  priority?: number
  valid_from?: string
  valid_until?: string
  zone_name?: string
  days_of_week?: number[]
  time_from?: string
  time_until?: string
}) {
  const { supabase, pressingId } = await getPressingId()
  const { error } = await supabase.from('price_rules').insert({
    pressing_id: pressingId,
    ...payload,
    service_id: payload.service_id || null,
    valid_from: payload.valid_from || null,
    valid_until: payload.valid_until || null,
    zone_name: payload.zone_name || null,
    days_of_week: payload.days_of_week?.length ? payload.days_of_week : null,
    time_from: payload.time_from || null,
    time_until: payload.time_until || null,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/pricing')
}

export async function togglePriceRule(id: string, active: boolean) {
  const { supabase, pressingId } = await getPressingId()
  const { error } = await supabase.from('price_rules')
    .update({ active })
    .eq('id', id).eq('pressing_id', pressingId)
  if (error) throw new Error(error.message)
  revalidatePath('/pricing')
}

export async function deletePriceRule(id: string) {
  const { supabase, pressingId } = await getPressingId()
  const { error } = await supabase.from('price_rules')
    .delete().eq('id', id).eq('pressing_id', pressingId)
  if (error) throw new Error(error.message)
  revalidatePath('/pricing')
}

// ── Subscriptions ─────────────────────────────────────────────────────────

export async function createSubscription(payload: {
  name: string
  description?: string
  sub_type: string
  price: number
  credits?: number
  quota_quantity?: number
  quota_kilo?: number
  duration_days?: number
}) {
  const { supabase, pressingId } = await getPressingId()
  const { error } = await supabase.from('subscriptions').insert({
    pressing_id: pressingId,
    ...payload,
    credits: payload.credits || null,
    quota_quantity: payload.quota_quantity || null,
    quota_kilo: payload.quota_kilo || null,
    duration_days: payload.duration_days || 30,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/pricing')
}

export async function deleteSubscription(id: string) {
  const { supabase, pressingId } = await getPressingId()
  const { error } = await supabase.from('subscriptions')
    .delete().eq('id', id).eq('pressing_id', pressingId)
  if (error) throw new Error(error.message)
  revalidatePath('/pricing')
}

// ── Customer Subscriptions ────────────────────────────────────────────────

export async function assignSubscription(payload: {
  client_id: string
  subscription_id: string
  started_at?: string
  notes?: string
}) {
  const { supabase, pressingId } = await getPressingId()

  // Get the subscription to set initial balance/expiry
  const { data: sub } = await supabase.from('subscriptions')
    .select('credits, duration_days, price')
    .eq('id', payload.subscription_id).single()

  const startDate = payload.started_at || new Date().toISOString().split('T')[0]
  const expiresAt = sub ? (() => {
    const d = new Date(startDate)
    d.setDate(d.getDate() + (sub.duration_days || 30))
    return d.toISOString().split('T')[0]
  })() : null

  const { error } = await supabase.from('customer_subscriptions').insert({
    pressing_id: pressingId,
    client_id: payload.client_id,
    subscription_id: payload.subscription_id,
    balance: sub?.credits || sub?.price || 0,
    started_at: startDate,
    expires_at: expiresAt,
    notes: payload.notes || null,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/pricing')
  revalidatePath(`/clients/${payload.client_id}`)
}

export async function updateCustomerSubStatus(id: string, status: string) {
  const { supabase, pressingId } = await getPressingId()
  const { error } = await supabase.from('customer_subscriptions')
    .update({ status })
    .eq('id', id).eq('pressing_id', pressingId)
  if (error) throw new Error(error.message)
  revalidatePath('/pricing')
}

export async function updateCustomerSubBalance(id: string, balance: number) {
  const { supabase, pressingId } = await getPressingId()
  const { error } = await supabase.from('customer_subscriptions')
    .update({ balance })
    .eq('id', id).eq('pressing_id', pressingId)
  if (error) throw new Error(error.message)
  revalidatePath('/pricing')
}

// ── Discount Rules ────────────────────────────────────────────────────────

export async function createDiscountRule(payload: {
  name: string
  discount_type: 'percentage' | 'fixed_amount'
  value: number
  scope: string
  client_id?: string
  service_id?: string
  min_order_amount?: number
  max_uses?: number
  valid_from?: string
  valid_until?: string
}) {
  const { supabase, pressingId } = await getPressingId()
  const { error } = await supabase.from('discount_rules').insert({
    pressing_id: pressingId,
    ...payload,
    client_id: payload.client_id || null,
    service_id: payload.service_id || null,
    min_order_amount: payload.min_order_amount || null,
    max_uses: payload.max_uses || null,
    valid_from: payload.valid_from || null,
    valid_until: payload.valid_until || null,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/pricing')
}

export async function toggleDiscountRule(id: string, active: boolean) {
  const { supabase, pressingId } = await getPressingId()
  const { error } = await supabase.from('discount_rules')
    .update({ active })
    .eq('id', id).eq('pressing_id', pressingId)
  if (error) throw new Error(error.message)
  revalidatePath('/pricing')
}

export async function deleteDiscountRule(id: string) {
  const { supabase, pressingId } = await getPressingId()
  const { error } = await supabase.from('discount_rules')
    .delete().eq('id', id).eq('pressing_id', pressingId)
  if (error) throw new Error(error.message)
  revalidatePath('/pricing')
}

// ── Subscription usage on order ───────────────────────────────────────────

export async function useSubscriptionOnOrder(payload: {
  customerSubId: string
  orderId: string
  itemCount?: number
  kiloAmount?: number
  amountUsed?: number
}): Promise<{ discountAmount: number }> {
  const { supabase, pressingId } = await getPressingId()

  const { data: cs } = await supabase
    .from('customer_subscriptions')
    .select('*, subscriptions(sub_type, quota_quantity, quota_kilo, credits)')
    .eq('id', payload.customerSubId)
    .eq('pressing_id', pressingId)
    .eq('status', 'active')
    .single()

  if (!cs) throw new Error('Abonnement introuvable ou inactif')

  const sub = cs.subscriptions as any
  const subType: string = sub?.sub_type || ''
  let discountAmount = 0
  const updates: Record<string, number> = {}

  if (subType === 'prepaid') {
    const use = Math.min(payload.amountUsed || 0, Number(cs.balance))
    discountAmount = use
    updates.balance = Math.max(0, Number(cs.balance) - use)
  } else if (subType === 'shirts') {
    const use = payload.itemCount || 0
    updates.quota_used = (Number(cs.quota_used) || 0) + use
  } else if (subType === 'kilo') {
    const use = payload.kiloAmount || 0
    updates.kilo_used = (Number(cs.kilo_used) || 0) + use
  }
  // monthly/enterprise: no numeric deduction, just link to order

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from('customer_subscriptions')
      .update(updates)
      .eq('id', payload.customerSubId)
    if (error) throw new Error(error.message)
  }

  // Link subscription to order
  await supabase
    .from('orders')
    .update({ customer_sub_id: payload.customerSubId })
    .eq('id', payload.orderId)
    .eq('pressing_id', pressingId)

  revalidatePath('/pricing')
  revalidatePath(`/clients`)
  return { discountAmount }
}

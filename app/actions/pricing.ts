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
}) {
  const { supabase, pressingId } = await getPressingId()
  const { error } = await supabase.from('price_rules').insert({
    pressing_id: pressingId,
    ...payload,
    service_id: payload.service_id || null,
    valid_from: payload.valid_from || null,
    valid_until: payload.valid_until || null,
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

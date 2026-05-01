'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getCtx() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  const { data } = await supabase.from('users').select('pressing_id').eq('id', user.id).single()
  if (!data?.pressing_id) throw new Error('Pressing introuvable')
  return { supabase, pressingId: data.pressing_id }
}

// ── Record a payment on a specific order ─────────────────────────────────────

export async function recordOrderPayment(payload: {
  orderId: string
  clientId: string
  amount: number
  method: string
  notes?: string
}) {
  const { supabase, pressingId } = await getCtx()

  const { error } = await supabase.from('payments').insert({
    pressing_id: pressingId,
    order_id: payload.orderId,
    client_id: payload.clientId,
    amount: payload.amount,
    method: payload.method,
    notes: payload.notes || null,
  })
  if (error) throw new Error(error.message)

  // Check if order is now fully paid
  const { data: order } = await supabase
    .from('orders')
    .select('total, deposit')
    .eq('id', payload.orderId)
    .single()

  if (order) {
    const { data: pms } = await supabase
      .from('payments')
      .select('amount')
      .eq('order_id', payload.orderId)
    const totalPaid = (pms || []).reduce((s, p) => s + Number(p.amount), 0) + Number(order.deposit || 0)
    if (totalPaid >= Number(order.total)) {
      await supabase.from('orders').update({ paid: true }).eq('id', payload.orderId)
    }
  }

  revalidatePath(`/clients/${payload.clientId}`)
  revalidatePath('/credit')
  revalidatePath('/dashboard')
}

// ── Record a global client payment (not tied to a specific order) ─────────────

export async function recordClientGlobalPayment(payload: {
  clientId: string
  amount: number
  method: string
  notes?: string
}) {
  const { supabase, pressingId } = await getCtx()

  // Insert payment without order_id
  const { error } = await supabase.from('payments').insert({
    pressing_id: pressingId,
    order_id: null,
    client_id: payload.clientId,
    amount: payload.amount,
    method: payload.method,
    notes: payload.notes || null,
  })
  if (error) throw new Error(error.message)

  // Apply global payment to oldest unpaid orders first
  const { data: unpaidOrders } = await supabase
    .from('orders')
    .select('id, total, deposit')
    .eq('pressing_id', pressingId)
    .eq('client_id', payload.clientId)
    .eq('paid', false)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: true })

  if (unpaidOrders && unpaidOrders.length > 0) {
    let remaining = payload.amount

    for (const order of unpaidOrders) {
      if (remaining <= 0) break

      const { data: pms } = await supabase
        .from('payments')
        .select('amount')
        .eq('order_id', order.id)
      const alreadyPaid = (pms || []).reduce((s, p) => s + Number(p.amount), 0) + Number(order.deposit || 0)
      const orderDue = Math.max(0, Number(order.total) - alreadyPaid)

      if (orderDue <= 0) {
        await supabase.from('orders').update({ paid: true }).eq('id', order.id)
        continue
      }

      if (remaining >= orderDue) {
        await supabase.from('orders').update({ paid: true }).eq('id', order.id)
        remaining -= orderDue
      }
    }
  }

  revalidatePath(`/clients/${payload.clientId}`)
  revalidatePath('/credit')
  revalidatePath('/dashboard')
}

// ── Get all clients with outstanding balance ──────────────────────────────────

export async function getClientsWithBalance() {
  const { supabase, pressingId } = await getCtx()

  // Fetch all unpaid non-cancelled orders with their payments
  const { data: orders } = await supabase
    .from('orders')
    .select('id, client_id, total, deposit, created_at, status, clients(id, name, phone, client_type)')
    .eq('pressing_id', pressingId)
    .eq('paid', false)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: true })

  if (!orders || orders.length === 0) return []

  const orderIds = orders.map(o => o.id)
  const { data: payments } = await supabase
    .from('payments')
    .select('order_id, amount')
    .in('order_id', orderIds)

  const paymentsByOrder = (payments || []).reduce<Record<string, number>>((acc, p) => {
    acc[p.order_id!] = (acc[p.order_id!] || 0) + Number(p.amount)
    return acc
  }, {})

  const now = new Date()

  // Group by client
  const clientMap = new Map<string, {
    clientId: string
    clientName: string
    clientPhone: string
    clientType: string
    orders: { id: string; total: number; due: number; daysOld: number; createdAt: string }[]
  }>()

  for (const order of orders) {
    const client = order.clients as any
    if (!client) continue
    const paid = Number(order.deposit || 0) + (paymentsByOrder[order.id] || 0)
    const due = Math.max(0, Number(order.total) - paid)
    if (due <= 0) continue

    const daysOld = Math.floor((now.getTime() - new Date(order.created_at).getTime()) / (24 * 3600 * 1000))

    if (!clientMap.has(client.id)) {
      clientMap.set(client.id, {
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone || '',
        clientType: client.client_type || 'individual',
        orders: [],
      })
    }
    clientMap.get(client.id)!.orders.push({ id: order.id, total: Number(order.total), due, daysOld, createdAt: order.created_at })
  }

  return [...clientMap.values()].map(c => ({
    ...c,
    totalDue: c.orders.reduce((s, o) => s + o.due, 0),
    orderCount: c.orders.length,
    oldestDays: Math.max(...c.orders.map(o => o.daysOld)),
    aging30: c.orders.filter(o => o.daysOld <= 30).reduce((s, o) => s + o.due, 0),
    aging60: c.orders.filter(o => o.daysOld > 30 && o.daysOld <= 60).reduce((s, o) => s + o.due, 0),
    aging90: c.orders.filter(o => o.daysOld > 60 && o.daysOld <= 90).reduce((s, o) => s + o.due, 0),
    agingOver90: c.orders.filter(o => o.daysOld > 90).reduce((s, o) => s + o.due, 0),
  })).sort((a, b) => b.totalDue - a.totalDue)
}

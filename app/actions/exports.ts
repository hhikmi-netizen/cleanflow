'use server'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// ── Helpers ────────────────────────────────────────────────────────────────

function esc(v: string | number | null | undefined): string {
  return `"${String(v ?? '').replace(/"/g, '""')}"`
}

function buildCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers, ...rows].map(r => r.map(esc).join(','))
  return '﻿' + lines.join('\r\n') // BOM pour Excel
}

/** Vérifie auth + rôle admin + pressing_id. Lance redirect si non autorisé. */
async function getAdminContext() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('pressing_id, role').eq('id', user.id).single()

  if (userData?.role !== 'admin') redirect('/forbidden')
  if (!userData?.pressing_id)    redirect('/onboarding')

  return { supabase, pid: userData.pressing_id as string }
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface ExportResult {
  ok:       boolean
  csv?:     string
  filename?: string
  error?:   string
  count?:   number
}

// ── Export clients ─────────────────────────────────────────────────────────

export async function exportClients(
  dateFrom?: string,
  dateTo?:   string,
): Promise<ExportResult> {
  const { supabase, pid } = await getAdminContext()

  let query = supabase
    .from('clients')
    .select('id, client_code, name, phone, email, address, city, client_type, ice, total_orders, total_spent, loyalty_points, created_at')
    .eq('pressing_id', pid)
    .order('created_at', { ascending: false })

  if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`)
  if (dateTo)   query = query.lte('created_at', `${dateTo}T23:59:59`)

  const { data, error } = await query
  if (error) return { ok: false, error: error.message }
  if (!data?.length) return { ok: false, error: 'Aucun client sur cette période' }

  const headers = ['Code', 'Nom', 'Téléphone', 'Email', 'Adresse', 'Ville', 'Type', 'ICE', 'Nb commandes', 'CA total (DH)', 'Points fidélité', 'Date inscription']
  const rows = data.map(c => [
    c.client_code || '',
    c.name,
    c.phone,
    c.email || '',
    c.address || '',
    (c as any).city || '',
    c.client_type === 'business' ? 'Professionnel' : 'Particulier',
    c.ice || '',
    c.total_orders ?? 0,
    Number(c.total_spent ?? 0).toFixed(2),
    (c as any).loyalty_points ?? 0,
    c.created_at?.slice(0, 10) || '',
  ])

  const today = new Date().toISOString().slice(0, 10)
  return {
    ok:       true,
    csv:      buildCSV(headers, rows),
    filename: `clients_${today}.csv`,
    count:    data.length,
  }
}

// ── Export commandes ───────────────────────────────────────────────────────

export async function exportOrders(
  dateFrom?: string,
  dateTo?:   string,
): Promise<ExportResult> {
  const { supabase, pid } = await getAdminContext()

  let query = supabase
    .from('orders')
    .select('order_number, created_at, status, paid, clients(name, phone), subtotal, discount_amount, tax, total, deposit, payment_method, notes, order_items(service_name, quantity, unit_price)')
    .eq('pressing_id', pid)
    .order('created_at', { ascending: false })

  if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`)
  if (dateTo)   query = query.lte('created_at', `${dateTo}T23:59:59`)

  const { data, error } = await query
  if (error) return { ok: false, error: error.message }
  if (!data?.length) return { ok: false, error: 'Aucune commande sur cette période' }

  const STATUS_FR: Record<string, string> = {
    pending:     'En attente',
    in_progress: 'En traitement',
    ready:       'Prêt',
    delivered:   'Livré',
    cancelled:   'Annulé',
  }
  const PAYMENT_FR: Record<string, string> = {
    cash:     'Espèces',
    card:     'Carte',
    transfer: 'Virement',
  }

  const headers = ['Numéro', 'Date', 'Statut', 'Payé', 'Client', 'Téléphone client', 'Articles', 'Sous-total (DH)', 'Remise (DH)', 'TVA (DH)', 'Total (DH)', 'Acompte (DH)', 'Mode paiement', 'Notes']
  const rows = (data as any[]).map(o => {
    const items = (o.order_items || [])
      .map((i: any) => `${i.quantity > 1 ? `${i.quantity}× ` : ''}${i.service_name}`)
      .join(' | ')
    return [
      o.order_number,
      o.created_at?.slice(0, 16).replace('T', ' ') || '',
      STATUS_FR[o.status] || o.status,
      o.paid ? 'Oui' : 'Non',
      o.clients?.name || '',
      o.clients?.phone || '',
      items,
      Number(o.subtotal ?? 0).toFixed(2),
      Number(o.discount_amount ?? 0).toFixed(2),
      Number(o.tax ?? 0).toFixed(2),
      Number(o.total ?? 0).toFixed(2),
      Number(o.deposit ?? 0).toFixed(2),
      PAYMENT_FR[o.payment_method] || o.payment_method || '',
      o.notes || '',
    ]
  })

  const today = new Date().toISOString().slice(0, 10)
  return {
    ok:       true,
    csv:      buildCSV(headers, rows),
    filename: `commandes_${today}.csv`,
    count:    data.length,
  }
}

// ── Export paiements ───────────────────────────────────────────────────────

export async function exportPayments(
  dateFrom?: string,
  dateTo?:   string,
): Promise<ExportResult> {
  const { supabase, pid } = await getAdminContext()

  let query = supabase
    .from('payments')
    .select('created_at, amount, method, note, orders(order_number, pressing_id, clients(name, phone))')
    .order('created_at', { ascending: false })

  if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`)
  if (dateTo)   query = query.lte('created_at', `${dateTo}T23:59:59`)

  const { data, error } = await query
  if (error) return { ok: false, error: error.message }

  // Filtre pressing_id côté application (via la jointure order)
  const filtered = (data || []).filter((p: any) => p.orders?.pressing_id === pid)
  if (!filtered.length) return { ok: false, error: 'Aucun paiement sur cette période' }

  const PAYMENT_FR: Record<string, string> = {
    cash:     'Espèces',
    card:     'Carte',
    transfer: 'Virement',
  }

  const headers = ['Date', 'N° Commande', 'Client', 'Téléphone', 'Montant (DH)', 'Mode', 'Note']
  const rows = filtered.map((p: any) => [
    p.created_at?.slice(0, 16).replace('T', ' ') || '',
    p.orders?.order_number || '',
    p.orders?.clients?.name || '',
    p.orders?.clients?.phone || '',
    Number(p.amount).toFixed(2),
    PAYMENT_FR[p.method] || p.method || '',
    p.note || '',
  ])

  const today = new Date().toISOString().slice(0, 10)
  return {
    ok:       true,
    csv:      buildCSV(headers, rows),
    filename: `paiements_${today}.csv`,
    count:    filtered.length,
  }
}

// ── Export caisse journalière ──────────────────────────────────────────────

export async function exportCaisse(
  dateFrom?: string,
  dateTo?:   string,
): Promise<ExportResult> {
  const { supabase, pid } = await getAdminContext()

  let query = supabase
    .from('daily_closings')
    .select('closing_date, cash, card, transfer, total, orders_count, notes, created_at')
    .eq('pressing_id', pid)
    .order('closing_date', { ascending: false })

  if (dateFrom) query = query.gte('closing_date', dateFrom)
  if (dateTo)   query = query.lte('closing_date', dateTo)

  const { data, error } = await query
  if (error) return { ok: false, error: error.message }
  if (!data?.length) return { ok: false, error: 'Aucune clôture sur cette période' }

  const headers = ['Date', 'Espèces (DH)', 'Carte (DH)', 'Virement (DH)', 'Total (DH)', 'Nb commandes', 'Notes']
  const rows = data.map(d => [
    d.closing_date,
    Number(d.cash ?? 0).toFixed(2),
    Number(d.card ?? 0).toFixed(2),
    Number(d.transfer ?? 0).toFixed(2),
    Number(d.total ?? 0).toFixed(2),
    d.orders_count ?? 0,
    d.notes || '',
  ])

  const today = new Date().toISOString().slice(0, 10)
  return {
    ok:       true,
    csv:      buildCSV(headers, rows),
    filename: `caisse_${today}.csv`,
    count:    data.length,
  }
}

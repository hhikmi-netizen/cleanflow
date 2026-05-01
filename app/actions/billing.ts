'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Types ──────────────────────────────────────────────────────────────────

export type BillingDocType    = 'FAC' | 'REL'
export type BillingDocStatus  = 'draft' | 'sent' | 'paid' | 'partial' | 'unpaid'
export type PaymentTerms      = 'immediate' | 'net15' | 'net30' | 'net45' | 'net60'

export interface GenerateBillingInput {
  clientId:     string
  docType:      BillingDocType
  periodStart:  string   // YYYY-MM-DD
  periodEnd:    string   // YYYY-MM-DD
  paymentTerms?: PaymentTerms
  notes?:        string
}

export interface BillingDocSummary {
  id:              string
  document_number: string
  doc_type:        string
  period_start:    string
  period_end:      string
  total:           number
  balance_due:     number
  status:          string
  created_at:      string
}

// ── Génération d'un document périodique ──────────────────────────────────

export async function generateBillingDocument(input: GenerateBillingInput) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non authentifié' }

  const { data: userData } = await supabase
    .from('users').select('pressing_id, role').eq('id', user.id).single()

  if (userData?.role !== 'admin') return { ok: false, error: 'Réservé aux administrateurs' }

  const pid = userData.pressing_id
  const {
    clientId, docType, periodStart, periodEnd,
    paymentTerms = 'immediate', notes,
  } = input

  // 1. Commandes de la période (hors annulées)
  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, created_at, total, deposit, subtotal, tax, order_items(service_name, quantity)')
    .eq('pressing_id', pid)
    .eq('client_id', clientId)
    .gte('created_at', `${periodStart}T00:00:00`)
    .lte('created_at', `${periodEnd}T23:59:59`)
    .neq('status', 'cancelled')
    .order('created_at')

  if (!orders || orders.length === 0) {
    return { ok: false, error: 'Aucune commande sur cette période' }
  }

  // 2. Paiements reçus par commande
  const orderIds = orders.map(o => o.id)
  const { data: allPayments } = await supabase
    .from('payments').select('order_id, amount').in('order_id', orderIds)

  const paymentsMap: Record<string, number> = {}
  ;(allPayments || []).forEach(p => {
    if (p.order_id) paymentsMap[p.order_id] = (paymentsMap[p.order_id] || 0) + Number(p.amount)
  })

  // 3. Calcul des totaux + lignes
  let subtotalTotal = 0
  let taxTotal = 0
  let amountPaidTotal = 0

  const items = orders.map((o: any) => {
    const paid = Number(o.deposit || 0) + (paymentsMap[o.id] || 0)
    const balance = Math.max(0, Number(o.total) - paid)
    const description = (o.order_items || [])
      .map((i: any) => `${i.quantity > 1 ? `${i.quantity}× ` : ''}${i.service_name}`)
      .join(', ')

    subtotalTotal  += Number(o.subtotal || o.total)
    taxTotal       += Number(o.tax || 0)
    amountPaidTotal += paid

    return {
      order_id:     o.id,
      order_number: o.order_number,
      order_date:   o.created_at.slice(0, 10),
      description,
      subtotal:     Number(o.total),
      amount_paid:  paid,
      balance,
    }
  })

  const total      = subtotalTotal + taxTotal
  const balanceDue = Math.max(0, total - amountPaidTotal)
  const status: BillingDocStatus =
    amountPaidTotal === 0 ? 'unpaid' :
    balanceDue === 0      ? 'paid' : 'partial'

  // 4. Numérotation atomique via la fonction PostgreSQL
  const yearMonth = periodEnd.slice(0, 7).replace('-', '')  // YYYYMM
  const { data: docNumber, error: seqErr } = await supabase
    .rpc('next_billing_number', {
      p_pressing_id: pid,
      p_doc_type:    docType,
      p_year_month:  yearMonth,
    })

  if (seqErr || !docNumber) {
    return { ok: false, error: seqErr?.message || 'Erreur numérotation' }
  }

  // 5. Insertion du document
  const { data: doc, error: docErr } = await supabase
    .from('billing_documents')
    .insert({
      pressing_id:     pid,
      client_id:       clientId,
      document_number: docNumber as string,
      doc_type:        docType,
      period_start:    periodStart,
      period_end:      periodEnd,
      subtotal:        subtotalTotal,
      tax:             taxTotal,
      total,
      amount_paid:     amountPaidTotal,
      balance_due:     balanceDue,
      status,
      payment_terms:   paymentTerms,
      notes,
    })
    .select('id')
    .single()

  if (docErr || !doc) return { ok: false, error: docErr?.message || 'Erreur création' }

  // 6. Insertion des lignes
  const { error: itemsErr } = await supabase
    .from('billing_document_items')
    .insert(items.map(i => ({ ...i, document_id: doc.id })))

  if (itemsErr) return { ok: false, error: itemsErr.message }

  revalidatePath(`/clients/${clientId}`)
  return { ok: true, docId: doc.id as string, documentNumber: docNumber as string }
}

// ── Liste des documents d'un client ──────────────────────────────────────

export async function getBillingDocuments(clientId: string): Promise<BillingDocSummary[]> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: userData } = await supabase
    .from('users').select('pressing_id').eq('id', user.id).single()

  const { data } = await supabase
    .from('billing_documents')
    .select('id, document_number, doc_type, period_start, period_end, total, balance_due, status, created_at')
    .eq('client_id', clientId)
    .eq('pressing_id', userData?.pressing_id || '')
    .order('created_at', { ascending: false })
    .limit(30)

  return (data || []).map(d => ({
    ...d,
    total:       Number(d.total),
    balance_due: Number(d.balance_due),
  }))
}

// ── Mise à jour du statut ─────────────────────────────────────────────────

export async function updateBillingDocStatus(
  docId: string,
  status: BillingDocStatus,
) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non authentifié' }

  const { data: userData } = await supabase
    .from('users').select('pressing_id, role').eq('id', user.id).single()
  if (userData?.role !== 'admin') return { ok: false, error: 'Non autorisé' }

  const { error } = await supabase
    .from('billing_documents')
    .update({ status })
    .eq('id', docId)
    .eq('pressing_id', userData.pressing_id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/clients')
  return { ok: true }
}

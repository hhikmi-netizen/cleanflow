'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { IncidentStatus, ResolutionAction } from '@/lib/types'

function getSupabase(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
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

export async function createIncident(data: {
  orderId?: string
  clientId?: string
  type: string
  description: string
}): Promise<string> {
  const cookieStore = await cookies()
  const supabase = getSupabase(cookieStore)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Non authentifié')

  const { data: userData } = await supabase
    .from('users').select('pressing_id').eq('id', user.id).single()
  if (!userData?.pressing_id) throw new Error('Pressing introuvable')

  const { data: incident, error } = await supabase.from('incidents').insert({
    pressing_id: userData.pressing_id,
    order_id: data.orderId || null,
    client_id: data.clientId || null,
    type: data.type,
    description: data.description,
    status: 'open',
  }).select().single()
  if (error) throw new Error(error.message)

  // Log initial
  await supabase.from('incident_history').insert({
    incident_id: incident.id,
    user_id: user.id,
    action: 'Incident créé',
    note: data.description,
  })

  revalidatePath('/incidents')
  return incident.id
}

export async function updateIncidentStatus(incidentId: string, status: IncidentStatus, note?: string): Promise<void> {
  const cookieStore = await cookies()
  const supabase = getSupabase(cookieStore)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Non authentifié')

  const { error } = await supabase.from('incidents').update({ status }).eq('id', incidentId)
  if (error) throw new Error(error.message)

  const { data: statusLabels } = { data: {
    open: 'Ouvert', in_progress: 'En cours',
    waiting_client: 'En attente client', resolved: 'Résolu', rejected: 'Refusé',
  }}
  await supabase.from('incident_history').insert({
    incident_id: incidentId,
    user_id: user.id,
    action: `Statut → ${(statusLabels as Record<string,string>)[status] || status}`,
    note: note || null,
  })

  revalidatePath(`/incidents/${incidentId}`)
  revalidatePath('/incidents')
}

export async function resolveIncident(incidentId: string, data: {
  resolution_action: ResolutionAction
  resolution_notes?: string
}): Promise<void> {
  const cookieStore = await cookies()
  const supabase = getSupabase(cookieStore)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Non authentifié')

  const { error } = await supabase.from('incidents').update({
    status: 'resolved',
    resolution_action: data.resolution_action,
    resolution_notes: data.resolution_notes || null,
  }).eq('id', incidentId)
  if (error) throw new Error(error.message)

  const actionLabels: Record<string, string> = {
    partial_refund: 'Remboursement partiel',
    full_refund:    'Remboursement total',
    gesture:        'Geste commercial',
    redo_service:   'Nouvelle prestation',
    none:           'Aucune action',
  }
  await supabase.from('incident_history').insert({
    incident_id: incidentId,
    user_id: user.id,
    action: `Résolu — ${actionLabels[data.resolution_action] || data.resolution_action}`,
    note: data.resolution_notes || null,
  })

  revalidatePath(`/incidents/${incidentId}`)
  revalidatePath('/incidents')
}

export async function addIncidentNote(incidentId: string, note: string): Promise<void> {
  const cookieStore = await cookies()
  const supabase = getSupabase(cookieStore)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Non authentifié')

  await supabase.from('incident_history').insert({
    incident_id: incidentId,
    user_id: user.id,
    action: 'Note ajoutée',
    note,
  })

  revalidatePath(`/incidents/${incidentId}`)
}

'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function getSupabase(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )
}

export async function getPressingStatus(): Promise<{
  userId: string
  pressingId: string | null
  pressingData: { name: string; phone: string; address: string; ice: string; tax_rate: number } | null
  userName: string | null
}> {
  const cookieStore = await cookies()
  const supabase = getSupabase(cookieStore)

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Non authentifié')

  const { data: userData } = await supabase
    .from('users')
    .select('pressing_id')
    .eq('id', user.id)
    .single()

  if (!userData?.pressing_id) {
    return {
      userId: user.id,
      pressingId: null,
      pressingData: null,
      userName: (user.user_metadata?.full_name as string) || null,
    }
  }

  const { data: pressing } = await supabase
    .from('pressings')
    .select('name, phone, address, ice, tax_rate')
    .eq('id', userData.pressing_id)
    .single()

  return {
    userId: user.id,
    pressingId: userData.pressing_id,
    pressingData: pressing,
    userName: (user.user_metadata?.full_name as string) || null,
  }
}

export async function setupPressing(data: {
  pressingName: string
  phone: string
  address: string
  ice: string
  taxRate: number
}): Promise<{ pressingId: string }> {
  const cookieStore = await cookies()
  const supabase = getSupabase(cookieStore)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Session expirée, veuillez vous reconnecter')

  // Check if user already has a pressing
  const { data: userData } = await supabase
    .from('users')
    .select('pressing_id')
    .eq('id', user.id)
    .single()

  if (userData?.pressing_id) {
    // Just update the pressing
    const { error } = await supabase
      .from('pressings')
      .update({ address: data.address || null, ice: data.ice || null, tax_rate: data.taxRate })
      .eq('id', userData.pressing_id)
    if (error) throw new Error(error.message)
    return { pressingId: userData.pressing_id }
  }

  // Create pressing
  const { data: pressing, error: pressingError } = await supabase
    .from('pressings')
    .insert({
      name: data.pressingName,
      phone: data.phone,
      email: user.email || '',
      address: data.address || null,
      ice: data.ice || null,
      tax_rate: data.taxRate,
    })
    .select()
    .single()
  if (pressingError) throw new Error(pressingError.message)

  // Upsert user row
  const { error: userError } = await supabase.from('users').upsert({
    id: user.id,
    pressing_id: pressing.id,
    role: 'admin',
    full_name: (user.user_metadata?.full_name as string) || data.pressingName,
    phone: data.phone,
  }, { onConflict: 'id' })
  if (userError) throw new Error(userError.message)

  // Create settings (ignore duplicate)
  const { error: settingsError } = await supabase
    .from('settings')
    .insert({ pressing_id: pressing.id })
  if (settingsError && !settingsError.message.includes('duplicate')) {
    throw new Error(settingsError.message)
  }

  return { pressingId: pressing.id }
}

export async function addServices(pressingId: string, serviceIndexes: number[]): Promise<void> {
  const DEFAULT_SERVICES = [
    { name: 'Chemise', category: 'Vêtements', price_individual: 15, price_business: 12, unit: 'pièce', active: true },
    { name: 'Pantalon', category: 'Vêtements', price_individual: 20, price_business: 16, unit: 'pièce', active: true },
    { name: 'Costume (veste + pantalon)', category: 'Vêtements', price_individual: 45, price_business: 38, unit: 'pièce', active: true },
    { name: 'Robe', category: 'Vêtements', price_individual: 35, price_business: 28, unit: 'pièce', active: true },
    { name: 'Manteau / Djellaba', category: 'Vêtements', price_individual: 50, price_business: 40, unit: 'pièce', active: true },
  ]

  const cookieStore = await cookies()
  const supabase = getSupabase(cookieStore)

  const services = serviceIndexes.map(i => ({ ...DEFAULT_SERVICES[i], pressing_id: pressingId }))
  const { error } = await supabase.from('services').insert(services)
  if (error) throw new Error(error.message)
}

export async function joinPressing(teamCode: string, fullName: string, phone: string): Promise<void> {
  const cookieStore = await cookies()
  const supabase = getSupabase(cookieStore)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Session expirée, veuillez vous reconnecter')

  // Verify the pressing exists
  const { data: pressing, error: pressingError } = await supabase
    .from('pressings')
    .select('id, name')
    .eq('id', teamCode.trim())
    .single()
  if (pressingError || !pressing) throw new Error('Code d\'équipe invalide ou pressing introuvable')

  // Check user isn't already in a pressing
  const { data: existing } = await supabase
    .from('users')
    .select('pressing_id')
    .eq('id', user.id)
    .single()
  if (existing?.pressing_id) throw new Error('Ce compte appartient déjà à un pressing')

  const { error: userError } = await supabase.from('users').upsert({
    id: user.id,
    pressing_id: pressing.id,
    role: 'employee',
    full_name: fullName || (user.user_metadata?.full_name as string) || 'Employé',
    phone: phone || null,
  }, { onConflict: 'id' })
  if (userError) throw new Error(userError.message)
}

export async function addClient(pressingId: string, name: string, phone: string): Promise<void> {
  const cookieStore = await cookies()
  const supabase = getSupabase(cookieStore)

  const { error } = await supabase.from('clients').insert({
    pressing_id: pressingId,
    name,
    phone,
    client_type: 'individual',
  })
  if (error && !error.message.includes('unique')) throw new Error(error.message)
}

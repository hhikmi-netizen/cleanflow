'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function getSupabase(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cs) {
          try { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { /* RSC cookie write no-op */ }
        },
      },
    }
  )
}

export async function seedDemoData(force = false): Promise<{ ok: boolean; message: string }> {
  const cookieStore = await cookies()
  const supabase = getSupabase(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Non authentifié' }

  const { data: userData } = await supabase.from('users').select('pressing_id, role').eq('id', user.id).single()
  if (!userData?.pressing_id) return { ok: false, message: 'Aucun pressing associé' }
  if (userData.role !== 'admin') return { ok: false, message: 'Droits insuffisants' }

  const pressingId = userData.pressing_id

  // Guard: don't overwrite real data unless forced
  if (!force) {
    const { count } = await supabase.from('clients').select('id', { count: 'exact', head: true }).eq('pressing_id', pressingId)
    if ((count || 0) > 3) return { ok: false, message: 'Des données existent déjà. Utilisez force=true pour écraser.' }
  }

  // ── 1. SERVICES ─────────────────────────────────────────────────────────
  const SERVICES = [
    { name: 'Chemise repassage', category: 'Vêtements', price_individual: 15, price_business: 12, unit: 'pièce', active: true },
    { name: 'Chemise nettoyage', category: 'Vêtements', price_individual: 28, price_business: 22, unit: 'pièce', active: true },
    { name: 'Pantalon', category: 'Vêtements', price_individual: 25, price_business: 20, unit: 'pièce', active: true },
    { name: 'Costume complet', category: 'Vêtements', price_individual: 85, price_business: 70, unit: 'pièce', active: true },
    { name: 'Veste / Blazer', category: 'Vêtements', price_individual: 55, price_business: 45, unit: 'pièce', active: true },
    { name: 'Robe de soirée', category: 'Vêtements', price_individual: 90, price_business: 75, unit: 'pièce', active: true },
    { name: 'Manteau / Pardessus', category: 'Vêtements', price_individual: 80, price_business: 65, unit: 'pièce', active: true },
    { name: 'Djellaba homme', category: 'Marocain', price_individual: 65, price_business: 55, unit: 'pièce', active: true },
    { name: 'Djellaba femme', category: 'Marocain', price_individual: 75, price_business: 60, unit: 'pièce', active: true },
    { name: 'Caftan / Takchita', category: 'Marocain', price_individual: 150, price_business: 120, unit: 'pièce', active: true },
    { name: 'Burnous', category: 'Marocain', price_individual: 100, price_business: 85, unit: 'pièce', active: true },
    { name: 'Couette simple', category: 'Linge maison', price_individual: 120, price_business: 95, unit: 'pièce', active: true },
    { name: 'Couette double', category: 'Linge maison', price_individual: 150, price_business: 120, unit: 'pièce', active: true },
    { name: 'Tapis (par m²)', category: 'Linge maison', price_individual: 55, price_business: 45, unit: 'm²', active: true },
    { name: 'Rideau (par mètre)', category: 'Linge maison', price_individual: 35, price_business: 28, unit: 'ml', active: true },
    { name: 'Parure de lit', category: 'Linge maison', price_individual: 65, price_business: 50, unit: 'pièce', active: true },
    { name: 'Linge au kilo', category: 'Kilo', price_individual: 20, price_business: 16, unit: 'kg', active: true },
  ]

  // Delete existing services and re-insert (demo pressing)
  await supabase.from('services').delete().eq('pressing_id', pressingId)
  const { data: services, error: svcErr } = await supabase
    .from('services')
    .insert(SERVICES.map(s => ({ ...s, pressing_id: pressingId })))
    .select()
  if (svcErr || !services) return { ok: false, message: 'Erreur services: ' + svcErr?.message }

  const svc = (name: string) => services.find(s => s.name === name)!

  // ── 2. CLIENTS ──────────────────────────────────────────────────────────
  await supabase.from('clients').delete().eq('pressing_id', pressingId)

  const CLIENTS_DATA = [
    // Particuliers
    { name: 'Youssef Benali', phone: '0661234567', email: 'y.benali@gmail.com', address: '12 Rue Ibn Battouta, Maarif, Casablanca', client_type: 'individual', loyalty_balance: 85 },
    { name: 'Fatima Zohra Tazi', phone: '0712345678', email: 'fz.tazi@outlook.com', address: '7 Avenue Hassan II, Casablanca', client_type: 'individual', loyalty_balance: 120 },
    { name: 'Mohammed Idrissi', phone: '0662345678', email: null, address: '34 Rue Moulay Youssef, Ain Chock, Casablanca', client_type: 'individual', loyalty_balance: 30 },
    { name: 'Khadija Amrani', phone: '0713456789', email: 'k.amrani@gmail.com', address: '5 Bd Mohammed V, Casablanca', client_type: 'individual', loyalty_balance: 200 },
    { name: 'Hassan Ouali', phone: '0664567890', email: null, address: 'Hay Hassani, Casablanca', client_type: 'individual', loyalty_balance: 0 },
    // Professionnels
    { name: 'Hôtel Kenzi Tower', phone: '0522456789', email: 'direction@kenzitower.ma', address: 'Avenue des FAR, Casablanca', client_type: 'business', ice: '001234567890123', credit_limit: 5000, loyalty_balance: 0 },
    { name: 'Restaurant La Sqala', phone: '0522567890', email: 'contact@lasqala.ma', address: 'Boulevard des Almohades, Casablanca', client_type: 'business', ice: '002345678901234', credit_limit: 2000, loyalty_balance: 0 },
    { name: 'Résidence Les Orangers', phone: '0522678901', email: 'syndic@orangers.ma', address: 'Quartier Palmier, Casablanca', client_type: 'business', ice: '003456789012345', credit_limit: 3000, loyalty_balance: 0 },
  ]

  const { data: clients, error: cliErr } = await supabase
    .from('clients')
    .insert(CLIENTS_DATA.map(c => ({ ...c, pressing_id: pressingId })))
    .select()
  if (cliErr || !clients) return { ok: false, message: 'Erreur clients: ' + cliErr?.message }

  const cli = (name: string) => clients.find(c => c.name === name)!

  // ── 3. ORDERS ────────────────────────────────────────────────────────────
  await supabase.from('order_items').delete().in(
    'order_id',
    (await supabase.from('orders').select('id').eq('pressing_id', pressingId)).data?.map(o => o.id) || []
  )
  await supabase.from('orders').delete().eq('pressing_id', pressingId)

  const now = new Date()
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString()

  const ORDERS = [
    // En attente (déposés aujourd'hui)
    {
      client_id: cli('Youssef Benali').id, status: 'pending', paid: false,
      total: 55, subtotal: 55, deposit: 0, tax: 0, deposit_mode: 'on_site', delivery_mode: 'on_site',
      payment_method: 'cash', payment_terms: 'immediate', created_at: daysAgo(0),
      items: [
        { service: 'Chemise repassage', qty: 2, price: 15 },
        { service: 'Pantalon', qty: 1, price: 25 },
      ]
    },
    {
      client_id: cli('Fatima Zohra Tazi').id, status: 'pending', paid: false,
      total: 150, subtotal: 150, deposit: 50, tax: 0, deposit_mode: 'on_site', delivery_mode: 'on_site',
      payment_method: 'cash', payment_terms: 'immediate', created_at: daysAgo(0),
      items: [
        { service: 'Caftan / Takchita', qty: 1, price: 150 },
      ]
    },
    // En cours
    {
      client_id: cli('Mohammed Idrissi').id, status: 'in_progress', paid: false,
      total: 85, subtotal: 85, deposit: 30, tax: 0, deposit_mode: 'on_site', delivery_mode: 'on_site',
      payment_method: 'cash', payment_terms: 'immediate', created_at: daysAgo(1),
      items: [
        { service: 'Costume complet', qty: 1, price: 85 },
      ]
    },
    {
      client_id: cli('Khadija Amrani').id, status: 'in_progress', paid: false,
      total: 185, subtotal: 200, deposit: 100, tax: 0, deposit_mode: 'on_site', delivery_mode: 'on_site',
      payment_method: 'card', payment_terms: 'immediate',
      discount_type: 'fixed', discount_value: 15, discount_amount: 15,
      created_at: daysAgo(2),
      items: [
        { service: 'Djellaba femme', qty: 1, price: 75 },
        { service: 'Djellaba homme', qty: 1, price: 65 },
        { service: 'Burnous', qty: 1, price: 100 },
      ]
    },
    {
      client_id: cli('Hôtel Kenzi Tower').id, status: 'in_progress', paid: false,
      total: 300, subtotal: 300, deposit: 0, tax: 0, deposit_mode: 'on_site', delivery_mode: 'delivery',
      payment_method: 'transfer', payment_terms: 'net30', created_at: daysAgo(3),
      items: [
        { service: 'Chemise repassage', qty: 15, price: 12 },
        { service: 'Pantalon', qty: 6, price: 20 },
      ]
    },
    // Prêtes (à récupérer)
    {
      client_id: cli('Hassan Ouali').id, status: 'ready', paid: false,
      total: 150, subtotal: 150, deposit: 0, tax: 0, deposit_mode: 'on_site', delivery_mode: 'on_site',
      payment_method: 'cash', payment_terms: 'immediate', created_at: daysAgo(3),
      items: [
        { service: 'Tapis (par m²)', qty: 2, price: 55 },
        { service: 'Couette double', qty: 1, price: 150 },
      ]
    },
    {
      client_id: cli('Youssef Benali').id, status: 'ready', paid: false,
      total: 65, subtotal: 65, deposit: 20, tax: 0, deposit_mode: 'on_site', delivery_mode: 'on_site',
      payment_method: 'cash', payment_terms: 'immediate', created_at: daysAgo(4),
      items: [
        { service: 'Djellaba homme', qty: 1, price: 65 },
      ]
    },
    // Livrée payée
    {
      client_id: cli('Fatima Zohra Tazi').id, status: 'delivered', paid: true,
      total: 90, subtotal: 90, deposit: 90, tax: 0, deposit_mode: 'on_site', delivery_mode: 'on_site',
      payment_method: 'cash', payment_terms: 'immediate', created_at: daysAgo(5),
      items: [
        { service: 'Robe de soirée', qty: 1, price: 90 },
      ]
    },
    {
      client_id: cli('Restaurant La Sqala').id, status: 'delivered', paid: true,
      total: 320, subtotal: 320, deposit: 320, tax: 0, deposit_mode: 'on_site', delivery_mode: 'delivery',
      payment_method: 'transfer', payment_terms: 'net15', created_at: daysAgo(7),
      items: [
        { service: 'Chemise repassage', qty: 20, price: 12 },
        { service: 'Pantalon', qty: 4, price: 20 },
      ]
    },
    // Impayée B2B (overdue net30 — passée il y a 35 jours)
    {
      client_id: cli('Résidence Les Orangers').id, status: 'delivered', paid: false,
      total: 450, subtotal: 450, deposit: 0, tax: 0, deposit_mode: 'on_site', delivery_mode: 'delivery',
      payment_method: 'transfer', payment_terms: 'net30', created_at: daysAgo(35),
      items: [
        { service: 'Rideau (par mètre)', qty: 8, price: 28 },
        { service: 'Parure de lit', qty: 5, price: 50 },
        { service: 'Couette simple', qty: 1, price: 95 },
      ]
    },
    // Commande livraison en cours
    {
      client_id: cli('Khadija Amrani').id, status: 'ready', paid: false,
      total: 175, subtotal: 175, deposit: 50, tax: 0, deposit_mode: 'pickup', delivery_mode: 'delivery',
      payment_method: 'cash', payment_terms: 'immediate', created_at: daysAgo(2),
      delivery_status: 'pending',
      items: [
        { service: 'Couette double', qty: 1, price: 150 },
        { service: 'Parure de lit', qty: 1, price: 50 },
      ]
    },
    // Linge kilo
    {
      client_id: cli('Mohammed Idrissi').id, status: 'delivered', paid: true,
      total: 60, subtotal: 60, deposit: 60, tax: 0, deposit_mode: 'on_site', delivery_mode: 'on_site',
      payment_method: 'cash', payment_terms: 'immediate', created_at: daysAgo(10),
      items: [
        { service: 'Linge au kilo', qty: 3, price: 20 },
      ]
    },
  ]

  const insertedOrders: { id: string; items: typeof ORDERS[0]['items'] }[] = []
  for (const o of ORDERS) {
    const { items, ...orderData } = o
    const { data: order, error: oErr } = await supabase
      .from('orders')
      .insert({ ...orderData, pressing_id: pressingId, order_number: '' })
      .select()
      .single()
    if (oErr || !order) continue
    insertedOrders.push({ id: order.id, items })
  }

  // Insert order items
  for (const o of insertedOrders) {
    const orderItems = o.items
      .map(i => {
        const s = svc(i.service)
        if (!s) return null
        return {
          order_id: o.id,
          service_id: s.id,
          service_name: i.service,
          quantity: i.qty,
          unit_price: i.price,
          subtotal: i.price * i.qty,
        }
      })
      .filter(Boolean)
    if (orderItems.length > 0) {
      await supabase.from('order_items').insert(orderItems)
    }
  }

  // ── 4. INCIDENTS ────────────────────────────────────────────────────────
  await supabase.from('incidents').delete().eq('pressing_id', pressingId)
  const incidentOrders = (await supabase.from('orders').select('id').eq('pressing_id', pressingId).limit(3)).data || []

  if (incidentOrders.length >= 2) {
    await supabase.from('incidents').insert([
      {
        pressing_id: pressingId,
        client_id: cli('Khadija Amrani').id,
        order_id: incidentOrders[0]?.id,
        type: 'damage',
        status: 'open',
        description: 'Tache résiduelle sur le burnous après nettoyage. Le client signale que la tache (café) est toujours visible sur le col.',
      },
      {
        pressing_id: pressingId,
        client_id: cli('Mohammed Idrissi').id,
        order_id: incidentOrders[1]?.id,
        type: 'delay',
        status: 'in_progress',
        description: 'Commande prête depuis 5 jours, client n\'a pas pu passer. À contacter pour convenir d\'une livraison.',
      },
      {
        pressing_id: pressingId,
        client_id: cli('Hôtel Kenzi Tower').id,
        type: 'quality',
        status: 'resolved',
        description: 'Chemises repassées avec des plis sur le col. Retraitement effectué gratuitement.',
        resolution: 'Retraitement complet des 6 chemises incriminées. Client satisfait.',
      },
    ])
  }

  // ── 5. SUBSCRIPTIONS ────────────────────────────────────────────────────
  // Get or create a shirts subscription product
  await supabase.from('customer_subscriptions').delete().eq('pressing_id', pressingId)
  const { data: existingSubs } = await supabase.from('subscriptions').select('*').eq('pressing_id', pressingId)

  let subShirts = existingSubs?.find(s => s.sub_type === 'shirts')
  let subPrepaid = existingSubs?.find(s => s.sub_type === 'prepaid')

  if (!subShirts) {
    const { data } = await supabase.from('subscriptions').insert({
      pressing_id: pressingId,
      name: 'Forfait 20 chemises/mois',
      sub_type: 'shirts',
      quota_quantity: 20,
      price: 250,
      duration_days: 30,
      active: true,
    }).select().single()
    subShirts = data
  }
  if (!subPrepaid) {
    const { data } = await supabase.from('subscriptions').insert({
      pressing_id: pressingId,
      name: 'Crédit prépayé 500 DH',
      sub_type: 'prepaid',
      credits: 500,
      price: 500,
      duration_days: 180,
      active: true,
    }).select().single()
    subPrepaid = data
  }

  const expiry30 = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0]
  const expiry5 = new Date(now.getTime() + 5 * 86400000).toISOString().split('T')[0]

  if (subShirts) {
    await supabase.from('customer_subscriptions').insert([
      {
        pressing_id: pressingId,
        client_id: cli('Hôtel Kenzi Tower').id,
        subscription_id: subShirts.id,
        status: 'active',
        quota_used: 14,
        kilo_used: 0,
        balance: 0,
        started_at: daysAgo(15),
        expires_at: expiry30,
      },
    ])
  }
  if (subPrepaid) {
    await supabase.from('customer_subscriptions').insert([
      {
        pressing_id: pressingId,
        client_id: cli('Fatima Zohra Tazi').id,
        subscription_id: subPrepaid.id,
        status: 'active',
        quota_used: 0,
        kilo_used: 0,
        balance: 85,   // presque épuisé — alerte quota
        started_at: daysAgo(60),
        expires_at: expiry5,  // expire dans 5 jours — alerte expiration
      },
    ])
  }

  // ── 6. UPDATE PRESSING INFO ──────────────────────────────────────────────
  await supabase.from('pressings').update({
    name: 'Pressing Al Amal',
    phone: '0661234567',
    address: '45 Rue Sebou, Maarif, Casablanca',
    ice: '012345678901234',
    tax_rate: 0,
  }).eq('id', pressingId)

  await supabase.from('settings').upsert({
    pressing_id: pressingId,
    whatsapp_enabled: true,
    whatsapp_phone: '0661234567',
    wa_notif_created: true,
    wa_notif_delivery: true,
    wa_notif_delivered: true,
    loyalty_enabled: true,
    loyalty_points_per_dh: 1,
    loyalty_redeem_threshold: 100,
    invoice_footer: 'Merci de votre confiance ! Pressing Al Amal — 0661234567',
  }, { onConflict: 'pressing_id' })

  return { ok: true, message: `Données démo chargées : ${services.length} services, ${clients.length} clients, ${ORDERS.length} commandes` }
}

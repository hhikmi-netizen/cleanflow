/**
 * Moteur de résolution des règles de prix.
 * Pur (sans I/O) — appelable côté client comme côté serveur.
 *
 * Ordre de priorité :
 *   1. Priorité explicite de la règle (DESC)
 *   2. Règle spécifique à un service > règle globale (service_id IS NULL)
 *
 * Sémantique rule_type :
 *   individual        → ne s'applique qu'aux particuliers
 *   business          → ne s'applique qu'aux professionnels
 *   express           → ne s'applique qu'en mode express (isExpress=true)
 *   delivery_included → ne s'applique qu'en mode livraison domicile
 *   pickup_included   → ne s'applique qu'en mode collecte domicile
 *   subscription / promo / kilo / lot → appliqués selon disponibilité (pas de filtre type)
 *
 * Sémantique price_type :
 *   fixed            → remplace le prix de base
 *   surcharge_fixed  → ajoute un montant fixe au prix de base
 *   surcharge_percent→ ajoute un % au prix de base (ex: express +20%)
 *   per_kilo / per_lot → remplace le prix de base (facturation spéciale)
 */

export interface ApplicablePriceRule {
  id: string
  name: string
  service_id: string | null
  rule_type: string
  price_type: string
  price: number
  min_quantity: number
  priority: number
  valid_from?: string | null
  valid_until?: string | null
  zone_name?: string | null
  days_of_week?: number[] | null
  time_from?: string | null
  time_until?: string | null
}

export interface PriceContext {
  clientType: 'individual' | 'business'
  isExpress?: boolean
  depositMode?: 'on_site' | 'pickup'
  deliveryMode?: 'on_site' | 'delivery'
  zone?: string
  quantity?: number
  now?: Date
}

export interface ResolvedPrice {
  price: number
  ruleName: string | null
  ruleType: string | null
  ruleId: string | null
}

export const RULE_TYPE_LABELS: Record<string, string> = {
  individual: 'Tarif particulier',
  business: 'Tarif pro',
  express: 'Express',
  delivery_included: 'Livraison incluse',
  pickup_included: 'Collecte incluse',
  subscription: 'Forfait',
  promo: 'Promo',
  kilo: 'Au kilo',
  lot: 'Au lot',
}

export const RULE_TYPE_COLORS: Record<string, string> = {
  business: 'bg-purple-100 text-purple-700',
  individual: 'bg-gray-100 text-gray-600',
  express: 'bg-amber-100 text-amber-700',
  promo: 'bg-green-100 text-green-700',
  delivery_included: 'bg-blue-100 text-blue-700',
  pickup_included: 'bg-blue-100 text-blue-700',
  subscription: 'bg-indigo-100 text-indigo-700',
  kilo: 'bg-cyan-100 text-cyan-700',
  lot: 'bg-cyan-100 text-cyan-700',
}

export function resolvePrice(
  serviceId: string,
  basePrice: number,
  rules: ApplicablePriceRule[],
  ctx: PriceContext,
): ResolvedPrice {
  const now = ctx.now ?? new Date()
  const today = now.toISOString().split('T')[0]
  // JS getDay(): 0=Sun → map to ISO 1=Mon…7=Sun
  const jsDay = now.getDay()
  const isoDay = jsDay === 0 ? 7 : jsDay
  const currentTime = now.toTimeString().slice(0, 5) // "HH:MM"
  const qty = ctx.quantity ?? 1

  const candidates = rules.filter(r => {
    // Must target this service or be a global rule
    if (r.service_id && r.service_id !== serviceId) return false

    // Minimum quantity
    if (r.min_quantity > 1 && qty < r.min_quantity) return false

    // Date validity
    if (r.valid_from && today < r.valid_from) return false
    if (r.valid_until && today > r.valid_until) return false

    // Client-type gates
    if (r.rule_type === 'individual' && ctx.clientType !== 'individual') return false
    if (r.rule_type === 'business' && ctx.clientType !== 'business') return false

    // Express gate
    if (r.rule_type === 'express' && !ctx.isExpress) return false

    // Mode gates
    if (r.rule_type === 'delivery_included' && ctx.deliveryMode !== 'delivery') return false
    if (r.rule_type === 'pickup_included' && ctx.depositMode !== 'pickup') return false

    // Zone gate: if rule requires a zone, context must match
    if (r.zone_name) {
      if (!ctx.zone) return false
      if (ctx.zone.toLowerCase().trim() !== r.zone_name.toLowerCase().trim()) return false
    }

    // Day-of-week gate
    if (r.days_of_week && r.days_of_week.length > 0) {
      if (!r.days_of_week.includes(isoDay)) return false
    }

    // Time range gate
    if (r.time_from && currentTime < r.time_from) return false
    if (r.time_until && currentTime > r.time_until) return false

    return true
  })

  if (candidates.length === 0) {
    return { price: basePrice, ruleName: null, ruleType: null, ruleId: null }
  }

  // Sort: highest priority first; break ties by preferring service-specific over global
  candidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    if (a.service_id && !b.service_id) return -1
    if (!a.service_id && b.service_id) return 1
    return 0
  })

  const best = candidates[0]

  let price: number
  switch (best.price_type) {
    case 'fixed':
      price = best.price
      break
    case 'surcharge_fixed':
      price = basePrice + best.price
      break
    case 'surcharge_percent':
      price = basePrice * (1 + best.price / 100)
      break
    case 'per_kilo':
    case 'per_lot':
      price = best.price
      break
    default:
      price = best.price
  }

  return {
    price: Math.round(price * 100) / 100,
    ruleName: best.name,
    ruleType: best.rule_type,
    ruleId: best.id,
  }
}

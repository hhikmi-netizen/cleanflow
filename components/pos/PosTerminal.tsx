'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Search, X, Plus, Minus, Trash2, Check, Banknote, CreditCard,
  ArrowRight, Wallet, User, UserPlus, Phone, ChevronDown, ChevronUp,
  Printer, MessageCircle, RotateCcw, ShoppingCart, Tag, Percent,
} from 'lucide-react'
import { formatCurrency, buildWhatsAppUrl, getWhatsAppTemplates } from '@/lib/utils'
import { resolvePrice, type ApplicablePriceRule, type PriceContext } from '@/lib/priceEngine'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PosService {
  id: string
  name: string
  category: string | null
  base_price: number
  price_business: number
}

interface CartItem {
  serviceId: string
  serviceName: string
  quantity: number
  unitPrice: number
  category: string | null
}

interface PosClient {
  id: string
  name: string
  phone: string
  client_type: 'individual' | 'business'
  credit_balance: number
}

type PaymentMode = 'cash' | 'card' | 'transfer' | 'credit'
type Screen = 'pos' | 'done'
type MobileTab = 'catalog' | 'cart'

interface Props {
  services: PosService[]
  pressingId: string
  pressingName: string
  pressingPhone?: string
  priceRules: ApplicablePriceRule[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PAYMENT_CONFIG: Record<PaymentMode, { label: string; icon: React.ElementType; color: string }> = {
  cash:     { label: 'Espèces',     icon: Banknote,    color: 'border-emerald-400 bg-emerald-50 text-emerald-700' },
  card:     { label: 'Carte',       icon: CreditCard,  color: 'border-blue-400 bg-blue-50 text-blue-700' },
  transfer: { label: 'Virement',    icon: ArrowRight,  color: 'border-indigo-400 bg-indigo-50 text-indigo-700' },
  credit:   { label: 'Crédit client', icon: Wallet,    color: 'border-purple-400 bg-purple-50 text-purple-700' },
}

const DISCOUNT_PRESETS = [5, 10, 15, 20]

const CATEGORY_ORDER = [
  'Chemises', 'Pantalons', 'Vestes', 'Costumes', 'Robes', 'Linge de maison',
  'Cuir', 'Couettes', 'Divers',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupByCategory(services: PosService[]): [string, PosService[]][] {
  const map = new Map<string, PosService[]>()
  for (const s of services) {
    const cat = s.category || 'Autres'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(s)
  }
  const entries = [...map.entries()]
  entries.sort(([a], [b]) => {
    const ia = CATEGORY_ORDER.indexOf(a)
    const ib = CATEGORY_ORDER.indexOf(b)
    if (ia === -1 && ib === -1) return a.localeCompare(b)
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
  return entries
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PosTerminal({ services, pressingId, pressingName, pressingPhone, priceRules }: Props) {
  const supabase = createClient()

  // Screen
  const [screen, setScreen] = useState<Screen>('pos')
  const [mobileTab, setMobileTab] = useState<MobileTab>('catalog')

  // Client
  const [client, setClient] = useState<PosClient | null>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<PosClient[]>([])
  const [clientSearching, setClientSearching] = useState(false)
  const [showClientSearch, setShowClientSearch] = useState(false)
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [creatingClient, setCreatingClient] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // Cart
  const [cart, setCart] = useState<CartItem[]>([])

  // Payment
  const [discountMode, setDiscountMode] = useState<'fixed' | 'percent'>('fixed')
  const [discountValue, setDiscountValue] = useState(0)
  const [deposit, setDeposit] = useState(0)
  const [depositTouched, setDepositTouched] = useState(false)
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash')

  // Submit
  const [loading, setLoading] = useState(false)
  const [createdOrder, setCreatedOrder] = useState<{ id: string; number: string; total: number; remaining: number } | null>(null)

  // ── Derived ────────────────────────────────────────────────────────────────

  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  const discountAmt = discountMode === 'percent'
    ? Math.round(subtotal * (discountValue / 100) * 100) / 100
    : Math.min(discountValue, subtotal)
  const total = Math.max(0, subtotal - discountAmt)
  const remaining = Math.max(0, total - deposit)
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)
  const creditBalance = client?.credit_balance ?? 0

  // Auto-set deposit to total when total changes (unless user manually changed it)
  useEffect(() => {
    if (!depositTouched) setDeposit(total)
  }, [total, depositTouched])

  // ── Resolve price with rules ───────────────────────────────────────────────

  const resolveServicePrice = useCallback((svc: PosService): number => {
    if (priceRules.length === 0) return svc.base_price
    const ctx: PriceContext = {
      clientType: client?.client_type ?? 'individual',
      isExpress: false,
      depositMode: 'on_site',
      deliveryMode: 'on_site',
    }
    const resolved = resolvePrice(svc.id, svc.base_price, priceRules, ctx)
    return resolved.price
  }, [client, priceRules])

  // ── Client search ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!clientSearch.trim() || clientSearch.length < 2) { setClientResults([]); return }
    const timer = setTimeout(async () => {
      setClientSearching(true)
      const digits = clientSearch.replace(/\D/g, '')
      let orClause = `name.ilike.%${clientSearch}%`
      if (digits.length >= 6) {
        orClause = `phone.ilike.%${clientSearch}%,name.ilike.%${clientSearch}%`
        if (digits.startsWith('0') && digits.length === 10) {
          orClause += `,phone.ilike.%${'212' + digits.slice(1)}%`
        } else if (digits.startsWith('212') && digits.length === 12) {
          orClause += `,phone.ilike.%${'0' + digits.slice(3)}%`
        }
      }
      const { data } = await supabase
        .from('clients')
        .select('id, name, phone, client_type, credit_balance')
        .eq('pressing_id', pressingId)
        .or(orClause)
        .limit(6)
      setClientResults((data || []) as PosClient[])
      setClientSearching(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [clientSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectClient = (c: PosClient) => {
    setClient(c)
    setClientSearch('')
    setClientResults([])
    setShowClientSearch(false)
    setShowQuickCreate(false)
    // Re-resolve prices when client type changes
    setCart(prev => prev.map(item => {
      const svc = services.find(s => s.id === item.serviceId)
      if (!svc) return item
      const ctx: PriceContext = { clientType: c.client_type, isExpress: false, depositMode: 'on_site', deliveryMode: 'on_site' }
      const resolved = resolvePrice(svc.id, svc.base_price, priceRules, ctx)
      return { ...item, unitPrice: resolved.price }
    }))
  }

  const handleQuickCreate = async () => {
    if (!newClientName.trim()) { toast.error('Nom requis'); return }
    setCreatingClient(true)
    try {
      const { data: newC, error } = await supabase
        .from('clients')
        .insert({
          pressing_id: pressingId,
          name: newClientName.trim(),
          phone: newClientPhone.trim() || null,
          client_type: 'individual',
          credit_balance: 0,
        })
        .select('id, name, phone, client_type, credit_balance')
        .single()
      if (error) throw error
      selectClient(newC as PosClient)
      setNewClientName('')
      setNewClientPhone('')
      toast.success('Client créé')
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Erreur création client')
    } finally {
      setCreatingClient(false)
    }
  }

  // ── Cart ───────────────────────────────────────────────────────────────────

  const addToCart = (svc: PosService) => {
    const price = resolveServicePrice(svc)
    setCart(prev => {
      const existing = prev.find(i => i.serviceId === svc.id)
      if (existing) return prev.map(i => i.serviceId === svc.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { serviceId: svc.id, serviceName: svc.name, quantity: 1, unitPrice: price, category: svc.category }]
    })
    if (mobileTab === 'catalog') {
      // brief visual feedback — stay on catalog so user can keep adding
    }
  }

  const decreaseCart = (serviceId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.serviceId === serviceId)
      if (!existing) return prev
      if (existing.quantity === 1) return prev.filter(i => i.serviceId !== serviceId)
      return prev.map(i => i.serviceId === serviceId ? { ...i, quantity: i.quantity - 1 } : i)
    })
  }

  const removeLine = (serviceId: string) => setCart(prev => prev.filter(i => i.serviceId !== serviceId))

  const clearCart = () => {
    setCart([])
    setDiscountValue(0)
    setDeposit(0)
    setDepositTouched(false)
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (cart.length === 0) { toast.error('Panier vide'); return }
    if (paymentMode === 'credit') {
      if (!client) { toast.error('Sélectionnez un client pour utiliser le crédit'); return }
      if (creditBalance < deposit) { toast.error('Crédit insuffisant'); return }
    }
    setLoading(true)
    try {
      // Create order
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          pressing_id: pressingId,
          client_id: client?.id || null,
          order_number: '',
          subtotal,
          tax: 0,
          total,
          payment_method: paymentMode === 'credit' ? 'credit' : paymentMode,
          payment_terms: remaining > 0 ? 'deferred' : 'immediate',
          deposit,
          deposit_mode: 'on_site',
          delivery_mode: 'on_site',
          status: 'pending',
          paid: remaining <= 0,
          discount_type: discountValue > 0 ? discountMode : null,
          discount_value: discountValue > 0 ? discountValue : null,
          discount_amount: discountAmt > 0 ? discountAmt : null,
        })
        .select()
        .single()
      if (error) throw error

      // Create order items
      await supabase.from('order_items').insert(
        cart.map(i => ({
          order_id: order.id,
          service_id: i.serviceId,
          service_name: i.serviceName,
          quantity: i.quantity,
          unit_price: i.unitPrice,
          subtotal: i.unitPrice * i.quantity,
        }))
      )

      // Deduct credit if credit payment
      if (paymentMode === 'credit' && client && deposit > 0) {
        await supabase
          .from('clients')
          .update({ credit_balance: Math.max(0, creditBalance - deposit) })
          .eq('id', client.id)
        // Also record in payments table
        await supabase.from('payments').insert({
          pressing_id: pressingId,
          order_id: order.id,
          amount: deposit,
          method: 'credit',
          notes: 'Crédit client',
        })
      } else if (deposit > 0) {
        // Record deposit as payment
        await supabase.from('payments').insert({
          pressing_id: pressingId,
          order_id: order.id,
          amount: deposit,
          method: paymentMode,
        })
      }

      setCreatedOrder({ id: order.id, number: order.order_number, total, remaining })
      setScreen('done')
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Erreur lors de la création')
    } finally {
      setLoading(false)
    }
  }

  const resetPos = () => {
    setScreen('pos')
    setClient(null)
    setCart([])
    setDiscountValue(0)
    setDeposit(0)
    setDepositTouched(false)
    setPaymentMode('cash')
    setCreatedOrder(null)
    setMobileTab('catalog')
  }

  // ── Success screen ─────────────────────────────────────────────────────────

  if (screen === 'done' && createdOrder) {
    const waTemplates = client
      ? getWhatsAppTemplates({
          clientName: client.name,
          orderNumber: createdOrder.number,
          pressingName,
          pressingPhone,
          total: createdOrder.total,
          remaining: createdOrder.remaining,
        })
      : []
    const waUrl = client ? buildWhatsAppUrl(client.phone, waTemplates[0]?.message ?? '') : null

    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-6 text-center max-w-sm mx-auto">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center animate-scale-in">
          <Check size={36} className="text-emerald-600" />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wide">Commande enregistrée</p>
          <p className="text-4xl font-black text-gray-900 mt-1">{formatCurrency(createdOrder.total)}</p>
          {createdOrder.remaining > 0 && (
            <p className="text-base text-orange-600 font-semibold mt-1">
              Reste à payer : {formatCurrency(createdOrder.remaining)}
            </p>
          )}
          <p className="text-sm font-mono text-gray-400 mt-1">{createdOrder.number}</p>
          {client && (
            <p className="text-sm text-gray-500 mt-0.5">{client.name}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full">
          <a
            href={`/orders/${createdOrder.id}/invoice`}
            target="_blank"
            className="flex items-center justify-center gap-2 w-full h-12 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <Printer size={16} />
            Imprimer le ticket
          </a>

          {waUrl && client?.phone && (
            <a
              href={waUrl}
              target="_blank"
              className="flex items-center justify-center gap-2 w-full h-12 border-2 border-green-200 rounded-xl text-sm font-semibold text-green-700 hover:border-green-300 hover:bg-green-50 transition-colors"
            >
              <MessageCircle size={16} />
              WhatsApp {client.name}
            </a>
          )}

          <button
            onClick={resetPos}
            className="flex items-center justify-center gap-2 w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-base font-bold transition-colors mt-1"
          >
            <RotateCcw size={16} />
            Nouvelle vente
          </button>
        </div>
      </div>
    )
  }

  // ── POS screen ─────────────────────────────────────────────────────────────

  const grouped = groupByCategory(services)

  return (
    <div className="flex flex-col h-full min-h-0 -m-4 md:-m-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Caisse rapide</h1>
          <p className="text-xs text-gray-400">Vente au comptoir</p>
        </div>

        {/* Client selector */}
        <div className="flex-1 max-w-xs ml-4">
          {client ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
              <User size={14} className="text-blue-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-blue-900 truncate">{client.name}</p>
                {client.credit_balance > 0 && (
                  <p className="text-xs text-blue-500">Crédit : {formatCurrency(client.credit_balance)}</p>
                )}
              </div>
              <button onClick={() => setClient(null)} className="text-blue-300 hover:text-blue-600 shrink-0">
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setShowClientSearch(true); setTimeout(() => searchRef.current?.focus(), 50) }}
              className="flex items-center gap-2 px-3 py-2 w-full text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
            >
              <User size={14} />
              <span className="flex-1 text-left">Chercher un client</span>
              <Search size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Client search overlay ───────────────────────────────────────────── */}
      {showClientSearch && !client && (
        <div className="absolute inset-0 z-50 bg-white flex flex-col" style={{ top: 0 }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
            <button onClick={() => { setShowClientSearch(false); setShowQuickCreate(false); setClientSearch('') }}
              className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-700">
              <X size={20} />
            </button>
            <div className="flex-1 relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchRef}
                value={clientSearch}
                onChange={e => { setClientSearch(e.target.value); setShowQuickCreate(false) }}
                placeholder="Nom ou téléphone..."
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {clientSearching && (
              <p className="text-sm text-gray-400 text-center py-6">Recherche...</p>
            )}
            {!clientSearching && clientResults.map(c => (
              <button key={c.id} onClick={() => selectClient(c)}
                className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors text-left">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-600 font-bold text-sm">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.phone}</p>
                </div>
                {c.credit_balance > 0 && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full shrink-0">
                    {formatCurrency(c.credit_balance)}
                  </span>
                )}
              </button>
            ))}

            {/* Quick create */}
            {clientSearch.length >= 2 && !clientSearching && !showQuickCreate && (
              <button
                onClick={() => { setShowQuickCreate(true); setNewClientName(clientSearch) }}
                className="flex items-center gap-2 w-full px-3 py-3 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left mt-2"
              >
                <UserPlus size={18} className="text-blue-500 shrink-0" />
                <span className="text-sm font-medium text-blue-600">Créer "{clientSearch}"</span>
              </button>
            )}

            {showQuickCreate && (
              <div className="mt-2 p-4 border border-blue-200 rounded-xl bg-blue-50 space-y-3">
                <p className="text-sm font-semibold text-blue-900">Nouveau client</p>
                <input
                  value={newClientName}
                  onChange={e => setNewClientName(e.target.value)}
                  placeholder="Nom complet *"
                  className="w-full h-10 px-3 rounded-lg border border-blue-200 bg-white text-sm focus:outline-none focus:border-blue-400"
                />
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={newClientPhone}
                    onChange={e => setNewClientPhone(e.target.value)}
                    placeholder="Téléphone (optionnel)"
                    className="w-full h-10 pl-8 pr-3 rounded-lg border border-blue-200 bg-white text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowQuickCreate(false)}
                    className="flex-1 h-10 rounded-lg border border-blue-200 text-sm text-blue-600 font-medium hover:bg-blue-100">
                    Annuler
                  </button>
                  <button onClick={handleQuickCreate} disabled={creatingClient || !newClientName.trim()}
                    className="flex-1 h-10 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1">
                    {creatingClient
                      ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <><Check size={14} /> Créer</>
                    }
                  </button>
                </div>
              </div>
            )}

            {/* Anonymous sale */}
            <button
              onClick={() => { setShowClientSearch(false); setShowQuickCreate(false) }}
              className="flex items-center gap-2 w-full px-3 py-3 mt-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={14} />
              Vente anonyme (sans client)
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile tabs ────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mx-4 mt-3 mb-2 lg:hidden bg-gray-100 rounded-xl p-1 shrink-0">
        <button onClick={() => setMobileTab('catalog')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${mobileTab === 'catalog' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
          Catalogue
        </button>
        <button onClick={() => setMobileTab('cart')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all relative ${mobileTab === 'cart' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
          Panier
          {cartCount > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 bg-blue-600 text-white text-xs rounded-full font-bold">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Main area ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 gap-0 lg:gap-4 px-4 pb-4 overflow-hidden">

        {/* ── Service tiles ──────────────────────────────────────────────── */}
        <div className={`flex-1 flex flex-col min-h-0 overflow-y-auto ${mobileTab === 'cart' ? 'hidden lg:flex' : 'flex'}`}>
          {grouped.map(([category, svcs]) => (
            <div key={category} className="mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 sticky top-0 bg-gray-50/90 py-1 z-10">
                {category}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                {svcs.map(svc => {
                  const inCart = cart.find(i => i.serviceId === svc.id)
                  const price = resolveServicePrice(svc)
                  return (
                    <button
                      key={svc.id}
                      onClick={() => addToCart(svc)}
                      className={`relative flex flex-col items-start justify-between p-3 rounded-xl border-2 text-left transition-all active:scale-95 min-h-[5rem] ${
                        inCart
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-900 leading-tight">{svc.name}</p>
                      <p className="text-sm font-bold text-blue-600 mt-1">{formatCurrency(price)}</p>
                      {inCart && (
                        <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                          {inCart.quantity}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          {services.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-gray-300 gap-2">
              <ShoppingCart size={32} />
              <p className="text-sm">Aucun service actif</p>
            </div>
          )}
        </div>

        {/* ── Cart + payment panel ────────────────────────────────────────── */}
        <div className={`flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden shrink-0 ${
          mobileTab === 'catalog' ? 'hidden lg:flex lg:w-80 xl:w-88' : 'flex w-full lg:w-80 xl:w-88'
        }`} style={{ width: mobileTab === 'cart' ? '100%' : undefined }}>

          {/* Cart header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart size={15} className="text-gray-400" />
              <span className="font-semibold text-gray-900 text-sm">Panier</span>
              {cartCount > 0 && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{cartCount} art.</span>
              )}
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                Vider
              </button>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1 min-h-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-28 gap-2 text-gray-300">
                <ShoppingCart size={28} />
                <p className="text-sm">Ajoutez des articles</p>
              </div>
            ) : cart.map(item => (
              <div key={item.serviceId} className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-50 group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.serviceName}</p>
                  <p className="text-xs text-gray-400">{formatCurrency(item.unitPrice)} × {item.quantity}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => decreaseCart(item.serviceId)}
                    className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 active:scale-95 flex items-center justify-center">
                    <Minus size={12} className="text-gray-600" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold text-gray-900">{item.quantity}</span>
                  <button onClick={() => addToCart(services.find(s => s.id === item.serviceId)!)}
                    className="w-8 h-8 rounded-lg bg-gray-900 hover:bg-gray-700 active:scale-95 flex items-center justify-center">
                    <Plus size={12} className="text-white" />
                  </button>
                </div>
                <p className="text-sm font-bold text-gray-900 w-14 text-right shrink-0">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </p>
                <button onClick={() => removeLine(item.serviceId)}
                  className="w-7 h-7 flex items-center justify-center text-gray-200 hover:text-red-500 transition-colors lg:opacity-0 lg:group-hover:opacity-100 opacity-100 shrink-0">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Payment section */}
          <div className="p-4 border-t border-gray-100 space-y-3 shrink-0">

            {/* Discount */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Tag size={12} className="text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Remise</span>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Mode toggle */}
                <button
                  onClick={() => setDiscountMode(m => m === 'fixed' ? 'percent' : 'fixed')}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 shrink-0"
                  title="Basculer fixe / %"
                >
                  {discountMode === 'percent' ? <Percent size={14} /> : <span className="text-xs font-bold">DH</span>}
                </button>
                {/* Quick presets */}
                <div className="flex gap-1">
                  {DISCOUNT_PRESETS.map(p => (
                    <button key={p}
                      onClick={() => { setDiscountMode('percent'); setDiscountValue(discountValue === p ? 0 : p) }}
                      className={`h-9 px-2 rounded-lg text-xs font-bold border transition-all ${
                        discountMode === 'percent' && discountValue === p
                          ? 'border-blue-400 bg-blue-100 text-blue-700'
                          : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                      }`}>
                      {p}%
                    </button>
                  ))}
                </div>
                {/* Custom amount */}
                <div className="flex items-center gap-1 ml-auto">
                  <button onClick={() => setDiscountValue(v => Math.max(0, v - (discountMode === 'percent' ? 5 : 5)))}
                    className="w-7 h-7 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                    <Minus size={11} className="text-gray-600" />
                  </button>
                  <input
                    type="number" min="0"
                    value={discountValue || ''}
                    onChange={e => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0"
                    className="w-12 h-7 text-center text-xs font-bold border border-gray-200 rounded-md focus:outline-none focus:border-blue-400"
                  />
                  <button onClick={() => setDiscountValue(v => v + (discountMode === 'percent' ? 5 : 5))}
                    className="w-7 h-7 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                    <Plus size={11} className="text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-1 pt-1 border-t border-gray-50">
              {discountAmt > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Sous-total</span>
                    <span className="text-gray-600">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Remise</span>
                    <span className="font-medium">− {formatCurrency(discountAmt)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-baseline">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="text-2xl font-black text-gray-900">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Deposit */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 shrink-0 w-20">Encaissé</span>
              <div className="flex items-center gap-1 flex-1">
                <button onClick={() => { setDeposit(0); setDepositTouched(true) }}
                  className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center shrink-0">
                  <Minus size={11} className="text-gray-600" />
                </button>
                <input
                  type="number" min="0"
                  value={deposit || ''}
                  onChange={e => { setDeposit(Math.max(0, parseFloat(e.target.value) || 0)); setDepositTouched(true) }}
                  className="flex-1 h-8 text-center text-sm font-bold border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
                />
                <button onClick={() => { setDeposit(total); setDepositTouched(true) }}
                  className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center shrink-0 text-xs font-bold text-gray-600">
                  Max
                </button>
              </div>
            </div>

            {remaining > 0 && (
              <div className="flex justify-between text-sm bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                <span className="text-orange-700 font-medium">Reste à payer</span>
                <span className="font-bold text-orange-700">{formatCurrency(remaining)}</span>
              </div>
            )}

            {/* Payment modes */}
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.entries(PAYMENT_CONFIG) as [PaymentMode, typeof PAYMENT_CONFIG[PaymentMode]][]).map(([mode, cfg]) => {
                const Icon = cfg.icon
                const disabled = mode === 'credit' && (!client || creditBalance <= 0)
                return (
                  <button key={mode} onClick={() => !disabled && setPaymentMode(mode)}
                    disabled={disabled}
                    title={mode === 'credit' && !client ? 'Sélectionnez un client' : undefined}
                    className={`flex flex-col items-center gap-1 py-2 rounded-xl border-2 text-xs font-medium transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
                      paymentMode === mode ? cfg.color : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                    }`}>
                    <Icon size={15} />
                    <span className="leading-tight text-center" style={{ fontSize: '10px' }}>
                      {mode === 'credit' && creditBalance > 0
                        ? formatCurrency(creditBalance)
                        : cfg.label}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* CTA */}
            <button
              onClick={handleSubmit}
              disabled={cart.length === 0 || loading}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-2xl font-bold text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-md shadow-blue-100"
            >
              {loading
                ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Check size={18} /> Encaisser {cart.length > 0 ? formatCurrency(deposit > 0 ? deposit : total) : ''}</>
              }
            </button>

            {/* Mobile: back to catalog */}
            <button onClick={() => setMobileTab('catalog')}
              className="lg:hidden w-full text-sm text-gray-400 hover:text-gray-600 py-1 transition-colors text-center">
              ← Catalogue
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

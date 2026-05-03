'use client'

import { useState, useMemo, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import {
  ShoppingCart, Plus, Minus, Trash2, X, Banknote, CreditCard,
  ArrowRightLeft, Printer, MessageCircle, RotateCcw, Search,
  Shirt, Droplets, Wind, Sparkles, Flame, Package, Clock,
  ArrowLeft, Check, User, Delete, ScanLine, Zap, Scissors,
  House, Scale, Bed
} from 'lucide-react'

/* ─── Types ─── */
interface PosService {
  id: string
  name: string
  category: string
  price: number
}

interface PosClientInfo {
  id: string
  name: string
  phone: string | null
  type: string
}

interface CartLine {
  serviceId: string
  name: string
  price: number
  quantity: number
  category: string
  express: boolean
}

interface Props {
  services: PosService[]
  clients: PosClientInfo[]
  pressingId: string
  pressingName: string
  pressingPhone: string
}

/* ─── Design tokens (matching Claude Design) ─── */
const CF = {
  blue: '#2563eb',
  blueBright: '#3b82f6',
  blueLight: '#60a5fa',
  blueSoft: '#eff6ff',
  blueGlow: 'rgba(37, 99, 235, 0.25)',
  bgBase: '#f5f7fb',
  surface1: '#ffffff',
  surface3: '#f1f5f9',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textTertiary: '#64748b',
  textMuted: '#94a3b8',
  border1: '#e2e8f0',
  gradPrimary: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
  gradPrimarySoft: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
  gradSuccess: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
  shadowSm: '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)',
  shadowCard: '0 1px 3px rgba(15,23,42,0.05), 0 4px 16px rgba(15,23,42,0.04)',
  shadowCardHover: '0 8px 24px rgba(37,99,235,0.12), 0 2px 6px rgba(15,23,42,0.06)',
  shadowGlow: '0 8px 24px rgba(37,99,235,0.25)',
  shadowGlowStrong: '0 12px 32px rgba(37,99,235,0.35), 0 4px 12px rgba(37,99,235,0.2)',
}

/* ─── Category config with gradients ─── */
const CATEGORY_CONFIG: Record<string, { gradient: string; glow: string; icon: typeof Shirt }> = {
  'Lavage':          { gradient: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)', glow: 'rgba(6, 182, 212, 0.4)',   icon: Droplets },
  'Repassage':       { gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', glow: 'rgba(245, 158, 11, 0.4)',  icon: Flame },
  'Nettoyage a sec': { gradient: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)', glow: 'rgba(37, 99, 235, 0.4)',   icon: Wind },
  'Detachage':       { gradient: 'linear-gradient(135deg, #14b8a6 0%, #2dd4bf 100%)', glow: 'rgba(20, 184, 166, 0.4)',  icon: Sparkles },
  'Pressing':        { gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)', glow: 'rgba(139, 92, 246, 0.4)',  icon: Shirt },
  'Vetements':       { gradient: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)', glow: 'rgba(37, 99, 235, 0.4)',   icon: Shirt },
  'Marocain':        { gradient: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)', glow: 'rgba(236, 72, 153, 0.4)',  icon: Sparkles },
  'Linge':           { gradient: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)', glow: 'rgba(99, 102, 241, 0.4)',  icon: House },
  'Kilo':            { gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)', glow: 'rgba(16, 185, 129, 0.4)',  icon: Scale },
  'Retouches':       { gradient: 'linear-gradient(135deg, #14b8a6 0%, #2dd4bf 100%)', glow: 'rgba(20, 184, 166, 0.4)',  icon: Scissors },
  'Grands articles': { gradient: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)', glow: 'rgba(99, 102, 241, 0.4)',  icon: Bed },
}

function getCatConfig(cat: string) {
  return CATEGORY_CONFIG[cat] || { gradient: CF.gradPrimary, glow: CF.blueGlow, icon: Package }
}

/* ─── CSS for animations (injected once) ─── */
const STYLE_TAG = `
@keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes scaleIn { from { transform: scale(0.7); } to { transform: scale(1); } }
@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 0 0 rgba(37,99,235,0.25); } 50% { box-shadow: 0 0 0 8px rgba(37,99,235,0); } }
.cf-btn { cursor: pointer; border: none; font-family: inherit; position: relative; overflow: hidden; }
.cf-btn:active { transform: scale(0.96) !important; }
.cf-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.cf-scale-in { animation: scaleIn 0.2s ease-out; }
.cf-float { animation: float 3s ease-in-out infinite; }
`

/* ─── Main component ─── */
export default function PosClient({ services, clients, pressingId, pressingName, pressingPhone }: Props) {
  const router = useRouter()
  const [cart, setCart] = useState<CartLine[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [clientId, setClientId] = useState<string>('')
  const [clientSearch, setClientSearch] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [givenAmount, setGivenAmount] = useState('')
  const [discount, setDiscount] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [showSuccess, setShowSuccess] = useState(false)
  const [createdOrder, setCreatedOrder] = useState<{ id: string; order_number: string } | null>(null)
  const [now, setNow] = useState(new Date())
  const [orderNumber] = useState(() => Math.floor(1000 + Math.random() * 9000))

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  /* Inject CSS animations once */
  useEffect(() => {
    if (typeof document !== 'undefined' && !document.getElementById('cf-pos-styles')) {
      const s = document.createElement('style')
      s.id = 'cf-pos-styles'
      s.textContent = STYLE_TAG
      document.head.appendChild(s)
    }
  }, [])

  const categories = useMemo(() => {
    return Array.from(new Set(services.map(s => s.category)))
  }, [services])

  const filteredServices = useMemo(() => {
    let list = services
    if (selectedCategory) list = list.filter(s => s.category === selectedCategory)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(s => s.name.toLowerCase().includes(q))
    }
    return list
  }, [services, selectedCategory, searchQuery])

  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients.slice(0, 10)
    const q = clientSearch.toLowerCase()
    return clients.filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))).slice(0, 10)
  }, [clients, clientSearch])

  const selectedClient = useMemo(() => clients.find(c => c.id === clientId) || null, [clients, clientId])

  /* ─── Cart logic ─── */
  const addToCart = (service: PosService) => {
    setCart(prev => {
      const existing = prev.find(l => l.serviceId === service.id)
      if (existing) return prev.map(l => l.serviceId === service.id ? { ...l, quantity: l.quantity + 1 } : l)
      return [...prev, { serviceId: service.id, name: service.name, price: service.price, quantity: 1, category: service.category, express: false }]
    })
  }

  const updateQty = (serviceId: string, delta: number) => {
    setCart(prev => prev.map(l => {
      if (l.serviceId !== serviceId) return l
      const newQty = l.quantity + delta
      return newQty > 0 ? { ...l, quantity: newQty } : l
    }).filter(l => l.quantity > 0))
  }

  const removeLine = (serviceId: string) => setCart(prev => prev.filter(l => l.serviceId !== serviceId))

  const toggleExpress = (serviceId: string) => {
    setCart(prev => prev.map(l => l.serviceId === serviceId ? { ...l, express: !l.express } : l))
  }

  const getLineTotal = (line: CartLine) => {
    const base = line.price * line.quantity
    return line.express ? base * 1.3 : base
  }

  const subtotal = cart.reduce((sum, l) => sum + getLineTotal(l), 0)
  const total = Math.max(0, subtotal - discount)
  const given = parseFloat(givenAmount) || 0
  const change = Math.max(0, given - total)
  const itemCount = cart.reduce((s, l) => s + l.quantity, 0)

  const handleNumpad = (key: string) => {
    if (key === 'C') setGivenAmount('')
    else if (key === 'DEL') setGivenAmount(prev => prev.slice(0, -1))
    else setGivenAmount(prev => prev + key)
  }

  const handleCreateOrder = () => {
    if (cart.length === 0) { toast.error('Panier vide'); return }
    if (!clientId) { toast.error('Sélectionnez un client'); return }

    startTransition(async () => {
      try {
        const supabase = createClient()
        const orderNum = 'CF-' + Date.now().toString(36).toUpperCase()
        const trackingToken = crypto.randomUUID()

        const { data: order, error: orderErr } = await supabase.from('orders').insert({
          pressing_id: pressingId,
          client_id: clientId,
          order_number: orderNum,
          tracking_token: trackingToken,
          status: 'delivered',
          subtotal,
          tax: 0,
          total,
          deposit: 0,
          paid: true,
          payment_method: paymentMethod,
          delivery_mode: 'pickup',
          item_count: itemCount,
          notes: 'Commande caisse POS',
          delivered_at: new Date().toISOString(),
        }).select('id, order_number').single()

        if (orderErr || !order) throw new Error(orderErr?.message || 'Erreur création commande')

        const items = cart.map(l => ({
          order_id: order.id,
          pressing_id: pressingId,
          service_id: l.serviceId,
          service_name: l.name + (l.express ? ' (Express)' : ''),
          quantity: l.quantity,
          unit_price: l.express ? l.price * 1.3 : l.price,
          subtotal: getLineTotal(l),
          item_status: 'delivered',
        }))

        const { error: itemsErr } = await supabase.from('order_items').insert(items)
        if (itemsErr) throw new Error(itemsErr.message)

        if (total > 0) {
          await supabase.from('payments').insert({
            pressing_id: pressingId,
            order_id: order.id,
            amount: total,
            method: paymentMethod,
            notes: 'Paiement caisse POS',
          })
        }

        setCreatedOrder(order)
        setShowSuccess(true)
        toast.success('Commande créée !')
      } catch (err: any) {
        toast.error(err.message || 'Erreur')
      }
    })
  }

  const resetPos = () => {
    setCart([])
    setClientId('')
    setClientSearch('')
    setPaymentMethod('cash')
    setGivenAmount('')
    setDiscount(0)
    setShowSuccess(false)
    setCreatedOrder(null)
    setSelectedCategory(null)
  }

  const whatsappMsg = createdOrder
    ? `Bonjour${selectedClient ? ' ' + selectedClient.name : ''}, votre commande ${createdOrder.order_number} (${formatCurrency(total)}) est prête. Merci ! - ${pressingName}`
    : ''
  const whatsappUrl = selectedClient?.phone
    ? `https://wa.me/${selectedClient.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(whatsappMsg)}`
    : ''

  const getCartCount = (serviceId: string) => cart.find(l => l.serviceId === serviceId)?.quantity || 0

  /* ═══════════════════════════════════════════ */
  /*                    RENDER                   */
  /* ═══════════════════════════════════════════ */
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: CF.bgBase, overflow: 'hidden', fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" }}>

      {/* ═══ HEADER ═══ */}
      <div style={{
        height: '80px',
        background: CF.surface1,
        borderBottom: `1px solid ${CF.border1}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        zIndex: 100,
        boxShadow: CF.shadowSm,
      }}>
        {/* Left: back + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.push('/orders')} className="cf-btn" style={{ width: '44px', height: '44px', borderRadius: '14px', background: CF.surface3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft style={{ width: 20, height: 20, color: CF.textSecondary }} />
          </button>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: CF.textPrimary, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              CleanFlow
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: CF.textTertiary, fontWeight: 500, marginTop: '2px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', display: 'inline-block' }} />
              <span>POS · Comptoir 1</span>
            </div>
          </div>
        </div>

        {/* Center: order + time pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 20px', background: CF.surface3,
          border: `1px solid ${CF.border1}`, borderRadius: '100px',
        }}>
          <ScanLine style={{ width: 16, height: 16, color: CF.textTertiary }} />
          <span style={{ fontSize: '14px', fontWeight: 700, color: CF.textSecondary, fontVariantNumeric: 'tabular-nums' }}>#{orderNumber}</span>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: CF.textMuted, display: 'inline-block' }} />
          <span style={{ fontSize: '14px', fontWeight: 700, color: CF.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
            {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Right: client + scanner */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Client button */}
          {selectedClient ? (
            <button onClick={() => { setClientId(''); setClientSearch('') }} className="cf-btn" style={{
              padding: '8px 20px 8px 8px', background: CF.blueSoft,
              border: `2px solid ${CF.blue}`, borderRadius: '100px',
              display: 'flex', alignItems: 'center', gap: '12px', boxShadow: CF.shadowSm,
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: CF.gradPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: 800, color: 'white',
              }}>
                {selectedClient.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: 800, lineHeight: 1.2, color: CF.textPrimary }}>{selectedClient.name}</div>
                <div style={{ fontSize: '12px', color: CF.textTertiary, fontWeight: 500 }}>{selectedClient.phone || ''}</div>
              </div>
            </button>
          ) : (
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Chercher client..."
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  style={{
                    padding: '12px 16px 12px 40px', background: CF.surface1,
                    border: `2px solid ${CF.border1}`, borderRadius: '100px',
                    fontSize: '14px', fontWeight: 600, width: '220px', outline: 'none',
                    fontFamily: 'inherit',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = CF.blue }}
                  onBlur={e => { if (!clientSearch) e.currentTarget.style.borderColor = CF.border1 }}
                />
                <User style={{ width: 18, height: 18, color: CF.textTertiary, position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
              {clientSearch && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px',
                  background: 'white', border: `1px solid ${CF.border1}`, borderRadius: '16px',
                  boxShadow: '0 16px 48px rgba(15,23,42,0.12)', zIndex: 50, maxHeight: '240px', overflowY: 'auto',
                }}>
                  {filteredClients.map(c => (
                    <button key={c.id} onClick={() => { setClientId(c.id); setClientSearch('') }} className="cf-btn"
                      style={{ width: '100%', textAlign: 'left', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'transparent', borderBottom: `1px solid ${CF.border1}` }}
                      onMouseEnter={e => { e.currentTarget.style.background = CF.blueSoft }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: CF.gradPrimarySoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User style={{ width: 16, height: 16, color: CF.blue }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: CF.textPrimary }}>{c.name}</div>
                        {c.phone && <div style={{ fontSize: '12px', color: CF.textTertiary }}>{c.phone}</div>}
                      </div>
                    </button>
                  ))}
                  {filteredClients.length === 0 && <p style={{ padding: '16px', fontSize: '13px', color: CF.textMuted, textAlign: 'center' }}>Aucun client trouvé</p>}
                </div>
              )}
            </div>
          )}

          {/* Scanner button */}
          <button onClick={() => router.push('/orders/scan')} className="cf-btn" style={{
            padding: '14px 24px', background: CF.gradPrimary, borderRadius: '100px',
            fontSize: '14px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: CF.shadowGlow,
          }}>
            <ScanLine style={{ width: 18, height: 18 }} />
            <span>Scanner</span>
          </button>
        </div>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ─── LEFT: Categories + Products (65%) ─── */}
        <div style={{ width: '65%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Category grid */}
          <div style={{ padding: '20px 24px 16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: CF.textTertiary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
              Catégories
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(categories.length, 8)}, 1fr)`, gap: '10px' }}>
              {categories.map(cat => {
                const config = getCatConfig(cat)
                const isSelected = selectedCategory === cat
                const CatIcon = config.icon
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(isSelected ? null : cat)}
                    className="cf-btn"
                    style={{
                      padding: '16px 8px',
                      background: isSelected ? config.gradient : CF.surface1,
                      border: isSelected ? '2px solid transparent' : `2px solid ${CF.border1}`,
                      borderRadius: '20px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                      boxShadow: isSelected ? `0 12px 28px ${config.glow}, 0 4px 8px rgba(0,0,0,0.06)` : CF.shadowSm,
                      transform: isSelected ? 'translateY(-3px)' : 'translateY(0)',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    <div style={{
                      width: '46px', height: '46px', borderRadius: '14px',
                      background: isSelected ? 'rgba(255,255,255,0.25)' : config.gradient,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white',
                      boxShadow: isSelected ? 'inset 0 1px 0 rgba(255,255,255,0.3)' : `0 4px 12px ${config.glow}`,
                    }}>
                      <CatIcon style={{ width: 22, height: 22 }} />
                    </div>
                    <span style={{
                      fontSize: '12px', fontWeight: 700,
                      color: isSelected ? 'white' : CF.textPrimary,
                      textAlign: 'center', lineHeight: 1.2,
                    }}>
                      {cat.length > 12 ? cat.slice(0, 10) + '…' : cat}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Search bar */}
          <div style={{ padding: '0 24px 12px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Rechercher un article..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', padding: '14px 16px 14px 44px',
                  background: CF.surface1, border: `2px solid ${CF.border1}`,
                  borderRadius: '16px', fontSize: '15px', fontWeight: 500,
                  outline: 'none', fontFamily: 'inherit',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = CF.blue; e.currentTarget.style.boxShadow = `0 0 0 3px ${CF.blueGlow}` }}
                onBlur={e => { e.currentTarget.style.borderColor = CF.border1; e.currentTarget.style.boxShadow = 'none' }}
              />
              <Search style={{ width: 20, height: 20, color: CF.textTertiary, position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          {/* Item grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 24px 24px' }}>
            {filteredServices.length > 0 ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: CF.textTertiary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Articles{selectedCategory ? ` · ${selectedCategory}` : ''}
                  </span>
                  <span style={{ fontSize: '12px', color: CF.textMuted, fontWeight: 600 }}>
                    {filteredServices.length} disponibles
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
                  {filteredServices.map(service => {
                    const config = getCatConfig(service.category)
                    const CatIcon = config.icon
                    const count = getCartCount(service.id)
                    return (
                      <button
                        key={service.id}
                        onClick={() => addToCart(service)}
                        className="cf-btn"
                        style={{
                          padding: '20px',
                          background: CF.surface1,
                          border: `2px solid ${count > 0 ? CF.blue : CF.border1}`,
                          borderRadius: '22px',
                          display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                          gap: '14px', minHeight: '180px', textAlign: 'left',
                          boxShadow: count > 0 ? CF.shadowCardHover : CF.shadowCard,
                          transition: 'all 0.2s ease',
                          position: 'relative',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = CF.blueSoft
                          e.currentTarget.style.borderColor = CF.blue
                          e.currentTarget.style.transform = 'translateY(-4px)'
                          e.currentTarget.style.boxShadow = CF.shadowCardHover
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = CF.surface1
                          e.currentTarget.style.borderColor = count > 0 ? CF.blue : CF.border1
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = count > 0 ? CF.shadowCardHover : CF.shadowCard
                        }}
                      >
                        {/* Quantity badge */}
                        {count > 0 && (
                          <div className="cf-scale-in" style={{
                            position: 'absolute', top: '12px', right: '12px',
                            minWidth: '28px', height: '28px', padding: '0 10px',
                            background: CF.gradPrimary, color: 'white',
                            fontSize: '13px', fontWeight: 800, borderRadius: '100px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: `0 4px 12px ${CF.blueGlow}`,
                          }}>
                            {count}
                          </div>
                        )}
                        {/* Icon */}
                        <div style={{
                          width: '52px', height: '52px', borderRadius: '16px',
                          background: CF.gradPrimarySoft, border: '1px solid #dbeafe',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: CF.blue,
                        }}>
                          <CatIcon style={{ width: 26, height: 26 }} />
                        </div>
                        {/* Name + Price */}
                        <div style={{ width: '100%' }}>
                          <div style={{ fontSize: '15px', fontWeight: 700, color: CF.textPrimary, marginBottom: '4px', letterSpacing: '-0.01em' }}>
                            {service.name}
                          </div>
                          <div style={{ fontSize: '22px', fontWeight: 800, color: CF.blue, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                            {formatCurrency(service.price)}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '60px 40px' }}>
                <div className="cf-float" style={{
                  width: '120px', height: '120px', borderRadius: '32px',
                  background: CF.gradPrimarySoft, border: '2px solid #dbeafe',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: CF.blue,
                }}>
                  <Sparkles style={{ width: 56, height: 56 }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: CF.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
                    {selectedCategory ? 'Aucun article' : 'Choisissez une catégorie'}
                  </p>
                  <p style={{ color: CF.textTertiary, fontSize: '14px', fontWeight: 500 }}>
                    {selectedCategory ? 'Aucun service dans cette catégorie' : 'Pour commencer une nouvelle commande'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── RIGHT: Cart (35%) ─── */}
        <div style={{
          width: '35%', display: 'flex', flexDirection: 'column',
          background: CF.surface1, borderLeft: `1px solid ${CF.border1}`,
          boxShadow: '-4px 0 24px rgba(15,23,42,0.04)',
        }}>
          {/* Cart header */}
          <div style={{
            padding: '18px 20px', borderBottom: `1px solid ${CF.border1}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: CF.surface3,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShoppingCart style={{ width: 20, height: 20, color: CF.textSecondary }} />
              <span style={{ fontSize: '16px', fontWeight: 800, color: CF.textPrimary }}>Panier</span>
              {itemCount > 0 && (
                <span style={{
                  minWidth: '24px', height: '24px', padding: '0 8px',
                  background: CF.gradPrimary, color: 'white',
                  fontSize: '12px', fontWeight: 800, borderRadius: '100px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {itemCount}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="cf-btn" style={{
                padding: '6px 14px', background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: '100px', fontSize: '12px', fontWeight: 700, color: '#dc2626',
              }}>
                Vider
              </button>
            )}
          </div>

          {/* Cart items */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
            {cart.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: CF.textMuted }}>
                <ShoppingCart style={{ width: 56, height: 56, opacity: 0.2, marginBottom: '12px' }} />
                <p style={{ fontSize: '14px', fontWeight: 600 }}>Panier vide</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {cart.map(line => {
                  const config = getCatConfig(line.category)
                  const CatIcon = config.icon
                  return (
                    <div key={line.serviceId} className="cf-slide-up" style={{
                      padding: '16px', background: CF.surface1,
                      border: `2px solid ${CF.border1}`, borderRadius: '18px',
                      display: 'flex', flexDirection: 'column', gap: '12px',
                      boxShadow: CF.shadowSm,
                    }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{
                          width: '42px', height: '42px', borderRadius: '12px',
                          background: CF.gradPrimarySoft, border: '1px solid #dbeafe',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: CF.blue, flexShrink: 0,
                        }}>
                          <CatIcon style={{ width: 20, height: 20 }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: CF.textPrimary }}>{line.name}</div>
                          <div style={{ fontSize: '12px', color: CF.textTertiary, fontWeight: 500, marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                            {formatCurrency(line.express ? line.price * 1.3 : line.price)} × {line.quantity} = <span style={{ color: CF.textPrimary, fontWeight: 700 }}>{formatCurrency(getLineTotal(line))}</span>
                          </div>
                        </div>
                        <button onClick={() => removeLine(line.serviceId)} className="cf-btn" style={{
                          width: '32px', height: '32px', borderRadius: '10px',
                          background: '#fef2f2', border: '1px solid #fecaca',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Trash2 style={{ width: 14, height: 14, color: '#ef4444' }} />
                        </button>
                      </div>

                      {/* Express toggle + quantity */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {/* Express toggle */}
                        <button onClick={() => toggleExpress(line.serviceId)} className="cf-btn" style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          padding: '6px 14px', borderRadius: '100px',
                          background: line.express ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' : CF.surface3,
                          border: line.express ? '2px solid transparent' : `2px solid ${CF.border1}`,
                          boxShadow: line.express ? '0 4px 12px rgba(245,158,11,0.3)' : 'none',
                          transition: 'all 0.2s ease',
                        }}>
                          <Zap style={{ width: 14, height: 14, color: line.express ? 'white' : CF.textMuted }} />
                          <span style={{ fontSize: '12px', fontWeight: 700, color: line.express ? 'white' : CF.textTertiary }}>
                            Express {line.express ? '+30%' : ''}
                          </span>
                        </button>
                        {/* Quantity controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button onClick={() => updateQty(line.serviceId, -1)} className="cf-btn" style={{
                            width: '34px', height: '34px', borderRadius: '10px',
                            background: CF.surface1, border: `2px solid ${CF.border1}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Minus style={{ width: 14, height: 14, color: CF.textSecondary }} />
                          </button>
                          <span style={{ width: '32px', textAlign: 'center', fontSize: '16px', fontWeight: 800, color: CF.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                            {line.quantity}
                          </span>
                          <button onClick={() => updateQty(line.serviceId, 1)} className="cf-btn" style={{
                            width: '34px', height: '34px', borderRadius: '10px',
                            background: CF.gradPrimary, border: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: `0 4px 12px ${CF.blueGlow}`,
                          }}>
                            <Plus style={{ width: 14, height: 14, color: 'white' }} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ─── Totals + Payment ─── */}
          {cart.length > 0 && (
            <div style={{ borderTop: `1px solid ${CF.border1}`, padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Totals */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: CF.textTertiary }}>Sous-total</span>
                  <span style={{ fontWeight: 600, color: CF.textSecondary }}>{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#dc2626' }}>
                    <span>Remise</span>
                    <span style={{ fontWeight: 600 }}>-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: '20px', fontWeight: 800, paddingTop: '8px',
                  borderTop: `1px solid ${CF.border1}`, marginTop: '4px',
                  color: CF.textPrimary,
                }}>
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Payment method */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {([
                  { value: 'cash', label: 'Espèces', Icon: Banknote },
                  { value: 'card', label: 'Carte', Icon: CreditCard },
                  { value: 'transfer', label: 'Virement', Icon: ArrowRightLeft },
                ] as const).map(({ value, label, Icon }) => (
                  <button key={value} onClick={() => setPaymentMethod(value)} className="cf-btn" style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                    padding: '10px 8px', borderRadius: '14px',
                    background: paymentMethod === value ? CF.blueSoft : CF.surface1,
                    border: `2px solid ${paymentMethod === value ? CF.blue : CF.border1}`,
                    fontSize: '12px', fontWeight: 700,
                    color: paymentMethod === value ? CF.blue : CF.textTertiary,
                    transition: 'all 0.15s ease',
                  }}>
                    <Icon style={{ width: 20, height: 20 }} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Numpad for cash */}
              {paymentMethod === 'cash' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: CF.textTertiary, fontWeight: 600 }}>Donné</span>
                    <span style={{ fontSize: '20px', fontWeight: 800, color: CF.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                      {givenAmount ? formatCurrency(parseFloat(givenAmount)) : '—'}
                    </span>
                  </div>
                  {given >= total && given > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '8px 12px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>Rendu</span>
                      <span style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a' }}>{formatCurrency(change)}</span>
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                    {['7','8','9','DEL','4','5','6','C','1','2','3','.','0','00','50','100'].map(key => (
                      <button key={key} onClick={() => {
                        if (['50','100'].includes(key)) setGivenAmount(key)
                        else handleNumpad(key)
                      }} className="cf-btn" style={{
                        padding: '12px 4px', borderRadius: '14px',
                        fontSize: '14px', fontWeight: 800,
                        background: key === 'DEL' ? '#fffbeb' : key === 'C' ? '#fef2f2' : ['50','100'].includes(key) ? CF.blueSoft : CF.surface1,
                        border: `1.5px solid ${key === 'DEL' ? '#fcd34d' : key === 'C' ? '#fecaca' : ['50','100'].includes(key) ? '#bfdbfe' : CF.border1}`,
                        color: key === 'DEL' ? '#d97706' : key === 'C' ? '#dc2626' : ['50','100'].includes(key) ? CF.blue : CF.textPrimary,
                        transition: 'all 0.1s ease',
                      }}>
                        {key === 'DEL' ? '⌫' : key}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ENCAISSER */}
              <button onClick={handleCreateOrder} disabled={isPending || !clientId} className="cf-btn" style={{
                width: '100%', padding: '18px',
                background: CF.gradSuccess,
                borderRadius: '18px', color: 'white',
                fontSize: '18px', fontWeight: 800, letterSpacing: '0.02em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: '0 12px 32px rgba(16,185,129,0.35), 0 4px 12px rgba(16,185,129,0.2)',
                opacity: (!clientId || isPending) ? 0.5 : 1,
                transition: 'all 0.2s ease',
              }}>
                {isPending ? (
                  <><RotateCcw style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }} /> Encaissement...</>
                ) : (
                  <><Check style={{ width: 20, height: 20 }} /> ENCAISSER {formatCurrency(total)}</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══ SUCCESS OVERLAY ═══ */}
      {showSuccess && createdOrder && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}>
          <div className="cf-slide-up" style={{
            background: 'white', borderRadius: '28px', padding: '40px',
            maxWidth: '420px', width: '100%', textAlign: 'center',
            boxShadow: '0 24px 48px rgba(15,23,42,0.2)',
            display: 'flex', flexDirection: 'column', gap: '24px',
          }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: CF.gradSuccess, display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto', boxShadow: '0 12px 32px rgba(16,185,129,0.3)',
            }}>
              <Check style={{ width: 40, height: 40, color: 'white' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: CF.textPrimary }}>Commande créée !</h2>
              <p style={{ fontSize: '14px', color: CF.textTertiary, marginTop: '4px' }}>N° {createdOrder.order_number}</p>
              <p style={{ fontSize: '24px', fontWeight: 800, color: CF.blue, marginTop: '8px' }}>{formatCurrency(total)}</p>
              {paymentMethod === 'cash' && change > 0 && (
                <p style={{ fontSize: '16px', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>Rendu : {formatCurrency(change)}</p>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => window.print()} className="cf-btn" style={{
                width: '100%', padding: '14px', borderRadius: '14px',
                border: `2px solid ${CF.border1}`, background: CF.surface1,
                fontSize: '15px', fontWeight: 700, color: CF.textPrimary,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              }}>
                <Printer style={{ width: 20, height: 20 }} /> Imprimer ticket
              </button>
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="cf-btn" style={{
                  width: '100%', padding: '14px', borderRadius: '14px',
                  background: '#25d366', color: 'white',
                  fontSize: '15px', fontWeight: 700, textDecoration: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                }}>
                  <MessageCircle style={{ width: 20, height: 20 }} /> Envoyer WhatsApp
                </a>
              )}
              <button onClick={resetPos} className="cf-btn" style={{
                width: '100%', padding: '14px', borderRadius: '14px',
                background: CF.gradPrimary, color: 'white',
                fontSize: '15px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: CF.shadowGlow,
              }}>
                <RotateCcw style={{ width: 20, height: 20 }} /> Nouvelle commande
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Search, ChevronRight, X, Banknote, CreditCard,
  Printer, MessageCircle, Check, Minus, Plus, Trash2, ArrowLeft, Users,
} from 'lucide-react'
import { formatCurrency, buildWhatsAppUrl, getWhatsAppTemplates } from '@/lib/utils'
import ArticleCatalog, { type CatalogService, type CartItem } from '@/components/orders/ArticleCatalog'
import { Input } from '@/components/ui/input'

interface Client { id: string; name: string; phone: string; client_type: string }
interface Props {
  services: CatalogService[]
  pressingId: string
  pressingName: string
  pressingPhone?: string
}

type Step = 'client' | 'items' | 'payment' | 'done'
type PaymentMethod = 'cash' | 'card' | 'transfer'

const PAYMENT_ICONS: Record<PaymentMethod, React.ElementType> = {
  cash: Banknote,
  card: CreditCard,
  transfer: CreditCard,
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Espèces',
  card: 'Carte',
  transfer: 'Virement',
}

export default function QuickOrderForm({ services, pressingId, pressingName, pressingPhone }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('client')
  const [client, setClient] = useState<Client | null>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<Client[]>([])
  const [searching, setSearching] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [loading, setLoading] = useState(false)
  const [createdOrder, setCreatedOrder] = useState<{ id: string; number: string; total: number } | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Client search
  useEffect(() => {
    if (!clientSearch.trim() || clientSearch.length < 2) { setClientResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      const q = clientSearch.replace(/\D/g, '')
      const { data } = await supabase
        .from('clients')
        .select('id, name, phone, client_type')
        .eq('pressing_id', pressingId)
        .or(q.length >= 6
          ? `phone.ilike.%${clientSearch}%,name.ilike.%${clientSearch}%`
          : `name.ilike.%${clientSearch}%,phone.ilike.%${clientSearch}%`
        )
        .limit(6)
      setClientResults(data || [])
      setSearching(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [clientSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  const addToCart = (service: CatalogService) => {
    setCart(prev => {
      const existing = prev.find(i => i.serviceId === service.id)
      if (existing) return prev.map(i => i.serviceId === service.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { serviceId: service.id, serviceName: service.name, quantity: 1, unitPrice: service.base_price }]
    })
  }

  const removeFromCart = (serviceId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.serviceId === serviceId)
      if (!existing) return prev
      if (existing.quantity === 1) return prev.filter(i => i.serviceId !== serviceId)
      return prev.map(i => i.serviceId === serviceId ? { ...i, quantity: i.quantity - 1 } : i)
    })
  }

  const removeLineFromCart = (serviceId: string) => {
    setCart(prev => prev.filter(i => i.serviceId !== serviceId))
  }

  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  const discountAmt = Math.min(discount, subtotal)
  const total = Math.max(0, subtotal - discountAmt)
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  const handleSubmit = async () => {
    if (!client || cart.length === 0) return
    setLoading(true)
    try {
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          pressing_id: pressingId,
          client_id: client.id,
          order_number: '',
          subtotal,
          tax: 0,
          total,
          payment_method: paymentMethod,
          payment_terms: 'immediate',
          deposit: total,
          deposit_mode: 'on_site',
          delivery_mode: 'on_site',
          status: 'pending',
          paid: true,
          discount_type: discount > 0 ? 'fixed' : null,
          discount_value: discount > 0 ? discount : null,
          discount_amount: discount > 0 ? discountAmt : null,
        })
        .select()
        .single()

      if (error) throw error

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

      setCreatedOrder({ id: order.id, number: order.order_number, total })
      setStep('done')
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Erreur lors de la création')
    } finally {
      setLoading(false)
    }
  }

  const waUrl = createdOrder && client
    ? (() => {
        const tpls = getWhatsAppTemplates({
          clientName: client.name,
          orderNumber: createdOrder.number,
          pressingName,
          pressingPhone,
          total: createdOrder.total,
        })
        const tpl = tpls.find(t => t.id === 'created')
        return tpl ? buildWhatsAppUrl(client.phone, tpl.message) : null
      })()
    : null

  // ── STEP: CLIENT ──────────────────────────────────────────────────────────
  if (step === 'client') {
    return (
      <div className="flex flex-col h-full max-w-lg mx-auto">
        <div className="flex-1 flex flex-col justify-center gap-6 px-2">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Client</h2>
            <p className="text-sm text-gray-400">Recherchez par nom ou téléphone</p>
          </div>

          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              ref={searchRef}
              autoFocus
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              placeholder="Nom ou numéro..."
              className="pl-11 h-14 text-base rounded-2xl border-gray-200 focus:border-blue-400 shadow-sm"
            />
            {clientSearch && (
              <button onClick={() => { setClientSearch(''); setClientResults([]) }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                <X size={16} />
              </button>
            )}
          </div>

          {/* Results */}
          {clientResults.length > 0 && (
            <div className="space-y-2">
              {clientResults.map(c => (
                <button key={c.id} onClick={() => { setClient(c); setStep('items') }}
                  className="w-full flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl hover:border-blue-200 hover:bg-blue-50 transition-all group text-left">
                  <div className="w-11 h-11 rounded-xl bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center shrink-0">
                    <Users size={20} className="text-gray-500 group-hover:text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{c.name}</p>
                    <p className="text-sm text-gray-400">{c.phone}</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-400" />
                </button>
              ))}
            </div>
          )}

          {clientSearch.length >= 2 && clientResults.length === 0 && !searching && (
            <p className="text-center text-sm text-gray-400 py-4">Aucun client trouvé</p>
          )}
        </div>

        {/* Skip */}
        <div className="pt-4 border-t border-gray-100">
          <button onClick={() => setStep('items')}
            className="w-full h-12 rounded-2xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-colors">
            Continuer sans client
          </button>
        </div>
      </div>
    )
  }

  // ── STEP: DONE ────────────────────────────────────────────────────────────
  if (step === 'done' && createdOrder) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-6 max-w-sm mx-auto px-4">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
          <Check size={36} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">Commande créée</p>
          <p className="text-4xl font-black text-emerald-600 mt-2">{formatCurrency(createdOrder.total)}</p>
          <p className="text-sm text-gray-400 mt-1 font-mono">{createdOrder.number}</p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <a href={`/orders/${createdOrder.id}/invoice`} target="_blank"
            className="w-full h-13 flex items-center justify-center gap-2 bg-gray-900 text-white rounded-2xl font-semibold hover:bg-gray-700 transition-colors py-3.5">
            <Printer size={18} /> Imprimer le ticket
          </a>
          {waUrl && (
            <a href={waUrl} target="_blank" rel="noopener noreferrer"
              className="w-full h-13 flex items-center justify-center gap-2 bg-[#25D366] text-white rounded-2xl font-semibold hover:bg-[#1fbc5a] transition-colors py-3.5">
              <MessageCircle size={18} /> Envoyer WhatsApp
            </a>
          )}
          <button onClick={() => {
            setStep('client'); setClient(null); setClientSearch(''); setCart([]); setDiscount(0); setCreatedOrder(null)
          }}
            className="w-full h-13 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-2xl font-semibold hover:bg-blue-700 transition-colors py-3.5">
            <Plus size={18} /> Nouvelle commande
          </button>
          <button onClick={() => router.push('/orders')}
            className="text-sm text-gray-400 hover:text-gray-600 py-2">
            Voir toutes les commandes
          </button>
        </div>
      </div>
    )
  }

  // ── STEP: ITEMS + PAYMENT (split layout) ──────────────────────────────────
  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full min-h-0">

      {/* Left — catalog */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Client header */}
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => setStep('client')}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700">
            <ArrowLeft size={18} />
          </button>
          {client ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <Users size={14} className="text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{client.name}</p>
                <p className="text-xs text-gray-400">{client.phone}</p>
              </div>
              <button onClick={() => setClient(null)} className="ml-auto text-gray-300 hover:text-gray-500">
                <X size={14} />
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Sans client</p>
          )}
        </div>

        {/* Catalog */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ArticleCatalog
            services={services}
            cart={cart}
            onAdd={addToCart}
            onRemove={removeFromCart}
            compact
          />
        </div>
      </div>

      {/* Right — cart + payment */}
      <div className="lg:w-72 xl:w-80 flex flex-col bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden shrink-0">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-900">Panier</p>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {cartCount} article{cartCount > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-0">
          {cart.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-gray-300 text-sm">
              Sélectionnez des articles
            </div>
          ) : cart.map(item => (
            <div key={item.serviceId} className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-50 group">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{item.serviceName}</p>
                <p className="text-xs text-gray-400">{formatCurrency(item.unitPrice)} × {item.quantity}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => removeFromCart(item.serviceId)}
                  className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                  <Minus size={12} className="text-gray-600" />
                </button>
                <span className="w-6 text-center text-sm font-semibold text-gray-900">{item.quantity}</span>
                <button onClick={() => addToCart({ id: item.serviceId, name: item.serviceName, base_price: item.unitPrice })}
                  className="w-7 h-7 rounded-lg bg-gray-900 hover:bg-gray-700 flex items-center justify-center transition-colors">
                  <Plus size={12} className="text-white" />
                </button>
              </div>
              <p className="text-sm font-bold text-gray-900 w-14 text-right shrink-0">
                {formatCurrency(item.unitPrice * item.quantity)}
              </p>
              <button onClick={() => removeLineFromCart(item.serviceId)}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all ml-0.5">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        {/* Totals + payment + CTA */}
        <div className="p-4 border-t border-gray-100 space-y-3">
          {/* Discount */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 shrink-0">Remise</span>
            <div className="flex items-center gap-1 flex-1">
              <button onClick={() => setDiscount(d => Math.max(0, d - 5))}
                className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                <Minus size={11} className="text-gray-600" />
              </button>
              <input
                type="number"
                min="0"
                value={discount || ''}
                onChange={e => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="0"
                className="flex-1 h-7 text-center text-sm font-semibold border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
              />
              <button onClick={() => setDiscount(d => d + 5)}
                className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                <Plus size={11} className="text-gray-600" />
              </button>
              <span className="text-xs text-gray-400">DH</span>
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-1 pt-1 border-t border-gray-50">
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Sous-total</span>
                <span className="text-gray-700 font-medium">{formatCurrency(subtotal)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Remise</span>
                <span className="font-medium">− {formatCurrency(discountAmt)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="text-2xl font-black text-gray-900">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div className="grid grid-cols-3 gap-1.5">
            {(['cash', 'card', 'transfer'] as PaymentMethod[]).map(m => {
              const Icon = PAYMENT_ICONS[m]
              return (
                <button key={m} onClick={() => setPaymentMethod(m)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-xl border-2 text-xs font-medium transition-all ${
                    paymentMethod === m
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                  }`}>
                  <Icon size={16} />
                  {PAYMENT_LABELS[m]}
                </button>
              )
            })}
          </div>

          {/* Encaisser */}
          <button
            onClick={step === 'items' ? () => setStep('payment') : handleSubmit}
            disabled={cart.length === 0 || loading}
            className="w-full h-13 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-200 py-3.5"
          >
            {loading
              ? <span className="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              : <><Check size={18} /> Encaisser {formatCurrency(total)}</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

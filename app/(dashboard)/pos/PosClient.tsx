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
  ArrowLeft, Check, User, Delete, ScanLine
} from 'lucide-react'

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
}

interface Props {
  services: PosService[]
  clients: PosClientInfo[]
  pressingId: string
  pressingName: string
  pressingPhone: string
}

const CATEGORY_ICONS: Record<string, typeof Shirt> = {
  'Lavage': Droplets,
  'Repassage': Flame,
  'Nettoyage a sec': Wind,
  'Detachage': Sparkles,
  'Pressing': Shirt,
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; activeBg: string; glow: string }> = {
  'Tous':            { bg: 'bg-indigo-50',  border: 'border-indigo-400', text: 'text-indigo-700',  activeBg: 'bg-indigo-600', glow: 'shadow-indigo-200' },
  'Lavage':          { bg: 'bg-sky-50',     border: 'border-sky-400',    text: 'text-sky-700',     activeBg: 'bg-sky-600',    glow: 'shadow-sky-200' },
  'Repassage':       { bg: 'bg-orange-50',  border: 'border-orange-400', text: 'text-orange-700',  activeBg: 'bg-orange-500', glow: 'shadow-orange-200' },
  'Nettoyage a sec': { bg: 'bg-teal-50',    border: 'border-teal-400',   text: 'text-teal-700',    activeBg: 'bg-teal-600',   glow: 'shadow-teal-200' },
  'Detachage':       { bg: 'bg-purple-50',  border: 'border-purple-400', text: 'text-purple-700',  activeBg: 'bg-purple-600', glow: 'shadow-purple-200' },
  'Pressing':        { bg: 'bg-rose-50',    border: 'border-rose-400',   text: 'text-rose-700',    activeBg: 'bg-rose-600',   glow: 'shadow-rose-200' },
}

function getCategoryColor(cat: string) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS['Tous']
}

function getCategoryIcon(cat: string) {
  return CATEGORY_ICONS[cat] || Package
}

export default function PosClient({ services, clients, pressingId, pressingName, pressingPhone }: Props) {
  const router = useRouter()
  const [cart, setCart] = useState<CartLine[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous')
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

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const categories = useMemo(() => {
    const cats = Array.from(new Set(services.map(s => s.category)))
    return ['Tous', ...cats]
  }, [services])

  const filteredServices = useMemo(() => {
    let list = services
    if (selectedCategory !== 'Tous') list = list.filter(s => s.category === selectedCategory)
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

  // Cart handlers
  const addToCart = (service: PosService) => {
    setCart(prev => {
      const existing = prev.find(l => l.serviceId === service.id)
      if (existing) return prev.map(l => l.serviceId === service.id ? { ...l, quantity: l.quantity + 1 } : l)
      return [...prev, { serviceId: service.id, name: service.name, price: service.price, quantity: 1 }]
    })
  }

  const updateQty = (serviceId: string, delta: number) => {
    setCart(prev => prev.map(l => {
      if (l.serviceId !== serviceId) return l
      const newQty = l.quantity + delta
      return newQty > 0 ? { ...l, quantity: newQty } : l
    }).filter(l => l.quantity > 0))
  }

  const removeLine = (serviceId: string) => {
    setCart(prev => prev.filter(l => l.serviceId !== serviceId))
  }

  const subtotal = cart.reduce((sum, l) => sum + l.price * l.quantity, 0)
  const total = Math.max(0, subtotal - discount)
  const given = parseFloat(givenAmount) || 0
  const change = Math.max(0, given - total)

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
        const orderNumber = 'CF-' + Date.now().toString(36).toUpperCase()
        const trackingToken = crypto.randomUUID()
        const itemCount = cart.reduce((s, l) => s + l.quantity, 0)

        const { data: order, error: orderErr } = await supabase.from('orders').insert({
          pressing_id: pressingId,
          client_id: clientId,
          order_number: orderNumber,
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
          service_name: l.name,
          quantity: l.quantity,
          unit_price: l.price,
          subtotal: l.price * l.quantity,
          item_status: 'delivered',
        }))

        const { error: itemsErr } = await supabase.from('order_items').insert(items)
        if (itemsErr) throw new Error(itemsErr.message)

        if (total > 0) {
          const { error: payErr } = await supabase.from('payments').insert({
            pressing_id: pressingId,
            order_id: order.id,
            amount: total,
            method: paymentMethod,
            notes: 'Paiement caisse POS',
          })
          if (payErr) throw new Error(payErr.message)
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
  }

  const whatsappMsg = createdOrder
    ? `Bonjour${selectedClient ? ' ' + selectedClient.name : ''}, votre commande ${createdOrder.order_number} (${formatCurrency(total)}) est prête. Merci ! - ${pressingName}`
    : ''
  const whatsappUrl = selectedClient?.phone
    ? `https://wa.me/${selectedClient.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(whatsappMsg)}`
    : ''

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Top bar */}
      <div className="bg-white border-b px-6 py-3 flex items-center gap-4 shrink-0 shadow-sm">
        <button onClick={() => router.push('/orders')} className="p-3 rounded-xl hover:bg-gray-100 active:scale-95 transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-extrabold tracking-tight">Caisse POS</h1>
        <button
              onClick={() => router.push('/orders/scan')}
              className="ml-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold hover:bg-indigo-100 active:scale-95 transition-all"
            >
              <ScanLine className="w-5 h-5" />
              Scanner
            </button>
            <div className="flex-1" />
        {/* Client picker */}
        <div className="relative">
          {selectedClient ? (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 shadow-sm">
              <User className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-bold text-blue-800">{selectedClient.name}</span>
              <button onClick={() => { setClientId(''); setClientSearch('') }} className="text-blue-400 hover:text-blue-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                placeholder="Chercher client..."
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                className="pl-9 pr-4 py-2.5 border-2 rounded-xl text-sm w-60 focus:outline-none focus:ring-2 focus:border-blue-400 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
              {clientSearch && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                  {filteredClients.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setClientId(c.id); setClientSearch('') }}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b last:border-0"
                    >
                      <span className="font-medium">{c.name}</span>
                      {c.phone && <span className="text-gray-400 ml-2">{c.phone}</span>}
                    </button>
                  ))}
                  {filteredClients.length === 0 && <p className="p-3 text-sm text-gray-400">Aucun client</p>}
                </div>
              )}
            </div>
          )}
        </div>
        {/* Clock */}
        <div className="flex items-center gap-1.5 text-gray-500 text-sm font-mono">
          <Clock className="w-4 h-4" />
          {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Product grid (70%) */}
        <div className="w-[70%] flex flex-col border-r">
          {/* Category tabs */}
          <div className="bg-white border-b px-4 py-3 flex gap-3 overflow-x-auto shrink-0">
            {categories.map(cat => {
              const Icon = cat === 'Tous' ? Package : getCategoryIcon(cat)
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all duration-200 active:scale-95 ${
                    selectedCategory === cat
                      ? `${getCategoryColor(cat).activeBg} text-white shadow-lg ${getCategoryColor(cat).glow}`
                      : `${getCategoryColor(cat).bg} ${getCategoryColor(cat).text} hover:shadow-md border border-transparent hover:${getCategoryColor(cat).border}`
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {cat}
                </button>
              )
            })}
          </div>

          {/* Search */}
          <div className="px-3 py-2 bg-white border-b shrink-0">
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher un article..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredServices.map(service => {
                const Icon = getCategoryIcon(service.category)
                const inCart = cart.find(l => l.serviceId === service.id)
                return (
                  <button
                    key={service.id}
                    onClick={() => addToCart(service)}
                    className={`relative flex flex-col items-center justify-center p-5 rounded-3xl border-2 transition-all duration-200 active:scale-[0.92] min-h-[130px] cursor-pointer select-none ${
                      inCart
                        ? `${getCategoryColor(service.category).border} ${getCategoryColor(service.category).bg} shadow-lg ${getCategoryColor(service.category).glow} ring-2 ring-offset-1 ${getCategoryColor(service.category).border.replace('border-','ring-')}`
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-lg hover:-translate-y-0.5'
                    }`}
                  >
                    {inCart && (
                      <span className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-full text-xs font-bold flex items-center justify-center">
                        {inCart.quantity}
                      </span>
                    )}
                    <Icon className={`w-10 h-10 mb-3 transition-colors ${inCart ? getCategoryColor(service.category).text : 'text-gray-400'}`} />
                    <span className="text-sm font-bold text-center leading-tight tracking-wide">{service.name}</span>
                    <span className={`text-sm font-extrabold mt-1 tracking-wide ${inCart ? getCategoryColor(service.category).text : 'text-gray-700'}`}>
                      {formatCurrency(service.price)}
                    </span>
                  </button>
                )
              })}
            </div>
            {filteredServices.length === 0 && (
              <div className="flex items-center justify-center h-40 text-gray-400">Aucun article</div>
            )}
          </div>
        </div>

        {/* RIGHT: Cart + Payment (30%) */}
        <div className="w-[30%] flex flex-col bg-white">
          {/* Cart header */}
          <div className="px-5 py-4 border-b flex items-center justify-between shrink-0 bg-gray-50">
            <h2 className="font-extrabold text-lg flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Panier ({cart.reduce((s, l) => s + l.quantity, 0)})
            </h2>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-red-500 text-xs hover:underline">Vider</button>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300">
                <ShoppingCart className="w-16 h-16 mb-3 opacity-30" />
                <p className="text-sm">Panier vide</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map(line => (
                  <div key={line.serviceId} className="bg-gray-50 rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-medium flex-1 pr-2">{line.name}</span>
                      <button onClick={() => removeLine(line.serviceId)} className="text-red-400 hover:text-red-600 shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQty(line.serviceId, -1)}
                          className="w-10 h-10 rounded-xl bg-white border-2 flex items-center justify-center hover:bg-gray-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-10 text-center text-base font-extrabold">{line.quantity}</span>
                        <button
                          onClick={() => updateQty(line.serviceId, 1)}
                          className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center hover:bg-gray-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="font-bold text-sm">{formatCurrency(line.price * line.quantity)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals + Payment */}
          {cart.length > 0 && (
            <div className="border-t px-4 py-3 space-y-3 shrink-0">
              {/* Totals */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Sous-total</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Remise</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-1 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Payment method */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'cash', label: 'Espèces', icon: Banknote },
                  { value: 'card', label: 'Carte', icon: CreditCard },
                  { value: 'transfer', label: 'Virement', icon: ArrowRightLeft },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setPaymentMethod(value)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 text-xs font-medium transition ${
                      paymentMethod === value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Numpad for cash */}
              {paymentMethod === 'cash' && (
                <div>
                  <div className="flex justify-between items-center mb-2 text-sm">
                    <span className="text-gray-500">Donné</span>
                    <span className="font-extrabold text-xl">{givenAmount ? formatCurrency(parseFloat(givenAmount)) : '—'}</span>
                  </div>
                  {given >= total && given > 0 && (
                    <div className="flex justify-between items-center mb-2 text-sm">
                      <span className="text-green-600 font-medium">Rendu</span>
                      <span className="font-extrabold text-xl text-green-600">{formatCurrency(change)}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-4 gap-2">
                    {['7','8','9','DEL','4','5','6','C','1','2','3','.','0','00'].map(key => (
                      <button
                        key={key}
                        onClick={() => handleNumpad(key)}
                        className={`py-4 rounded-2xl text-base font-extrabold transition-all duration-150 active:scale-90 shadow-sm hover:shadow-md ${
                          key === 'DEL' ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300' :
                          key === 'C' ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300' :
                          'bg-white text-gray-900 hover:bg-gray-100 border border-gray-200'
                        } ${key === '0' ? 'col-span-1' : ''} ${key === '00' ? 'col-span-1' : ''}`}
                      >
                        {key === 'DEL' ? <Delete className="w-4 h-4 mx-auto" /> : key}
                      </button>
                    ))}
                    {/* Quick amounts */}
                    {[50, 100, 200].map(amt => (
                      <button
                        key={amt}
                        onClick={() => setGivenAmount(String(amt))}
                        className="py-3 rounded-2xl text-sm font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 active:scale-95 transition"
                      >
                        {amt}
                      </button>
                    ))}
                    <button
                      onClick={() => setGivenAmount(String(total))}
                      className="py-3 rounded-2xl text-sm font-bold bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 active:scale-95 transition"
                    >
                      Exact
                    </button>
                  </div>
                </div>
              )}

              {/* Encaisser button */}
              <button
                onClick={handleCreateOrder}
                disabled={isPending || cart.length === 0 || !clientId}
                className="w-full py-5 rounded-2xl text-white font-extrabold text-lg bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 shadow-lg shadow-green-200 active:scale-[0.97] transition-all duration-200-700 active:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-lg"
              >
                {isPending ? (
                  <><RotateCcw className="w-5 h-5 animate-spin" /> Encaissement...</>
                ) : (
                  <><Check className="w-5 h-5" /> ENCAISSER {formatCurrency(total)}</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Success overlay */}
      {showSuccess && createdOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-10 max-w-md w-full text-center space-y-6 shadow-2xl">
            <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-100">
              <Check className="w-12 h-12 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-green-800">Commande créée !</h2>
              <p className="text-gray-500 mt-1">N° {createdOrder.order_number}</p>
              <p className="text-xl font-bold mt-2">{formatCurrency(total)}</p>
              {paymentMethod === 'cash' && change > 0 && (
                <p className="text-green-600 font-medium">Rendu monnaie : {formatCurrency(change)}</p>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={() => window.print()}
                className="w-full py-3 rounded-xl border-2 border-gray-200 font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition"
              >
                <Printer className="w-5 h-5" />
                Imprimer ticket
              </button>

              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-xl bg-green-500 text-white font-medium flex items-center justify-center gap-2 hover:bg-green-600 transition"
                >
                  <MessageCircle className="w-5 h-5" />
                  Envoyer WhatsApp
                </a>
              )}

              <button
                onClick={resetPos}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition"
              >
                <RotateCcw className="w-5 h-5" />
                Nouvelle commande
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Search, Phone, User, Plus, Minus, Trash2,
  Loader2, CheckCircle, Zap, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface Client { id: string; name: string; phone: string; client_code?: string; client_type: string }
interface Service { id: string; name: string; category: string; price_individual: number; price_business: number }
interface CartItem { service_id: string; service_name: string; quantity: number; unit_price: number; textile_type?: string; notes?: string }

const TEXTILE_TYPES = ['Chemise', 'Pantalon', 'Costume', 'Robe', 'Veste', 'Manteau', 'Linge', 'Autre']

function normalizePhone(s: string) { return s.replace(/[\s\-\.]/g, '') }

interface Props {
  services: Service[]
  pressingId: string
  pressingName: string
}

export default function ExpressDeposit({ services, pressingId, pressingName }: Props) {
  const [step, setStep] = useState<'client' | 'items' | 'confirm'>('client')

  // Client search
  const [phoneInput, setPhoneInput] = useState('')
  const [searching, setSearching] = useState(false)
  const [foundClient, setFoundClient] = useState<Client | null>(null)
  const [noClientFound, setNoClientFound] = useState(false)
  const [quickName, setQuickName] = useState('')
  const [creating, setCreating] = useState(false)

  // Items
  const [cart, setCart] = useState<CartItem[]>([])
  const [serviceSearch, setServiceSearch] = useState('')
  const [showSvcDrop, setShowSvcDrop] = useState(false)
  const svcRef = useRef<HTMLDivElement>(null)

  // Order
  const [payLater, setPayLater] = useState(true)
  const [deposit, setDeposit] = useState(0)
  const [expressNotes, setExpressNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  // Close service dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (svcRef.current && !svcRef.current.contains(e.target as Node)) setShowSvcDrop(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const searchClient = async () => {
    if (phoneInput.trim().length < 3) { toast.error('Entrez au moins 3 caractères'); return }
    setSearching(true)
    setNoClientFound(false)
    setFoundClient(null)
    const q = normalizePhone(phoneInput.trim())
    const { data } = await supabase
      .from('clients')
      .select('id, name, phone, client_code, client_type')
      .eq('pressing_id', pressingId)
      .or(`phone.ilike.%${q}%,name.ilike.%${phoneInput.trim()}%,client_code.ilike.%${phoneInput.trim().toUpperCase()}%`)
      .limit(1)
      .single()
    setSearching(false)
    if (data) { setFoundClient(data); setNoClientFound(false) }
    else { setFoundClient(null); setNoClientFound(true) }
  }

  const createClient_ = async () => {
    if (!quickName.trim() || !phoneInput.trim()) { toast.error('Nom et téléphone requis'); return }
    setCreating(true)
    const { data, error } = await supabase
      .from('clients')
      .insert({ pressing_id: pressingId, name: quickName.trim(), phone: phoneInput.trim(), client_type: 'individual' })
      .select('id, name, phone, client_code, client_type').single()
    setCreating(false)
    if (error) { toast.error(error.message); return }
    setFoundClient(data)
    setNoClientFound(false)
    toast.success('Client créé')
  }

  const addToCart = (svc: Service) => {
    const price = foundClient?.client_type === 'business' ? svc.price_business : svc.price_individual
    setCart(prev => {
      const existing = prev.find(i => i.service_id === svc.id)
      if (existing) return prev.map(i => i.service_id === svc.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { service_id: svc.id, service_name: svc.name, quantity: 1, unit_price: price }]
    })
    setServiceSearch('')
    setShowSvcDrop(false)
  }

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev
      .map(i => i.service_id === id ? { ...i, quantity: i.quantity + delta } : i)
      .filter(i => i.quantity > 0)
    )
  }

  const filteredSvc = services.filter(s =>
    s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
    s.category.toLowerCase().includes(serviceSearch.toLowerCase())
  )

  const subtotal = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const remaining = payLater ? subtotal - deposit : 0

  const handleSubmit = async () => {
    if (!foundClient || cart.length === 0) return
    setSubmitting(true)
    try {
      const { data: order, error: oErr } = await supabase
        .from('orders')
        .insert({
          pressing_id: pressingId,
          client_id: foundClient.id,
          order_number: '',
          subtotal,
          tax: 0,
          total: subtotal,
          payment_method: 'cash',
          deposit: payLater ? deposit : subtotal,
          paid: !payLater,
          status: 'pending',
          is_express: true,
          express_notes: expressNotes || null,
          notes: expressNotes || null,
        })
        .select().single()
      if (oErr) throw oErr

      const { error: iErr } = await supabase
        .from('order_items')
        .insert(cart.map(i => ({
          order_id: order.id,
          service_id: i.service_id,
          service_name: i.service_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          subtotal: i.unit_price * i.quantity,
          notes: i.notes || null,
          textile_type: i.textile_type || null,
        })))
      if (iErr) throw iErr

      toast.success(`Commande express ${order.order_number} créée !`)
      router.push(`/orders/${order.id}`)
    } catch (e: unknown) {
      toast.error((e as Error).message)
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(['client', 'items', 'confirm'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step === s ? 'bg-blue-600 text-white' :
              (['client', 'items', 'confirm'].indexOf(step) > i) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>{(['client', 'items', 'confirm'].indexOf(step) > i) ? '✓' : i + 1}</div>
            <span className={step === s ? 'font-medium text-gray-900' : 'text-gray-400'}>
              {s === 'client' ? 'Client' : s === 'items' ? 'Articles' : 'Confirmation'}
            </span>
            {i < 2 && <span className="text-gray-300">→</span>}
          </div>
        ))}
      </div>

      {/* ── STEP 1: Client ── */}
      {step === 'client' && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-blue-600 font-semibold">
            <Zap size={18} /> Dépôt express — Identification client
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Téléphone, nom ou code client</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={phoneInput}
                  onChange={e => { setPhoneInput(e.target.value); setNoClientFound(false); setFoundClient(null) }}
                  onKeyDown={e => e.key === 'Enter' && searchClient()}
                  placeholder="0661234567 ou Nom…"
                  className="w-full h-11 pl-9 pr-3 rounded-lg border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                  autoFocus
                />
              </div>
              <Button onClick={searchClient} disabled={searching} className="h-11 px-4">
                {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              </Button>
            </div>
          </div>

          {/* Found client */}
          {foundClient && (
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg">
                  {foundClient.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{foundClient.name}</p>
                  <p className="text-sm text-gray-500">{foundClient.phone}
                    {foundClient.client_code && <span className="ml-2 font-mono text-xs text-green-700">{foundClient.client_code}</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={20} className="text-green-500" />
                <button onClick={() => { setFoundClient(null); setPhoneInput('') }}
                  className="p-1 hover:bg-green-100 rounded"><X size={14} /></button>
              </div>
            </div>
          )}

          {/* Not found → quick create */}
          {noClientFound && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-3">
              <p className="text-sm font-medium text-orange-800 flex items-center gap-2">
                <User size={14} /> Client introuvable — Créer rapidement ?
              </p>
              <input
                value={quickName}
                onChange={e => setQuickName(e.target.value)}
                placeholder="Prénom Nom *"
                className="w-full h-9 px-3 rounded-lg border border-orange-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
              />
              <Button size="sm" onClick={createClient_} disabled={creating} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                {creating ? <Loader2 size={13} className="animate-spin mr-1" /> : <Plus size={13} className="mr-1" />}
                Créer {quickName || phoneInput}
              </Button>
            </div>
          )}

          <Button
            onClick={() => setStep('items')}
            disabled={!foundClient}
            className="w-full h-11 text-base"
          >
            Continuer → Articles
          </Button>
        </Card>
      )}

      {/* ── STEP 2: Items ── */}
      {step === 'items' && (
        <Card className="p-5 space-y-4">
          {/* Client recap */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                {foundClient?.name[0].toUpperCase()}
              </div>
              <span className="font-medium text-gray-900">{foundClient?.name}</span>
            </div>
            <button onClick={() => setStep('client')} className="text-xs text-gray-400 hover:text-blue-500">Changer</button>
          </div>

          {/* Service search */}
          <div ref={svcRef} className="relative">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={serviceSearch}
                onChange={e => { setServiceSearch(e.target.value); setShowSvcDrop(true) }}
                onFocus={() => setShowSvcDrop(true)}
                placeholder="Ajouter un article (chemise, pantalon…)"
                className="w-full h-10 pl-8 pr-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                autoFocus
              />
            </div>
            {showSvcDrop && filteredSvc.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                {filteredSvc.map(s => {
                  const price = foundClient?.client_type === 'business' ? s.price_business : s.price_individual
                  return (
                    <button key={s.id} type="button"
                      onMouseDown={e => { e.preventDefault(); addToCart(s) }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex justify-between items-center border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{formatCurrency(price)}</span>
                        <Plus size={14} className="text-blue-600" />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Cart */}
          {cart.length > 0 ? (
            <div className="space-y-2">
              {cart.map(item => (
                <div key={item.service_id} className="p-3 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.service_name}</p>
                      <p className="text-xs text-gray-400">{formatCurrency(item.unit_price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.service_id, -1)}
                        className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                      <button onClick={() => updateQty(item.service_id, 1)}
                        className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                        <Plus size={12} />
                      </button>
                    </div>
                    <span className="text-sm font-bold w-16 text-right">{formatCurrency(item.unit_price * item.quantity)}</span>
                    <button onClick={() => setCart(c => c.filter(i => i.service_id !== item.service_id))}
                      className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {/* Textile type quick select */}
                  <div className="flex flex-wrap gap-1">
                    {TEXTILE_TYPES.map(t => (
                      <button key={t} type="button"
                        onClick={() => setCart(c => c.map(i => i.service_id === item.service_id ? { ...i, textile_type: t } : i))}
                        className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                          item.textile_type === t ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 text-sm py-6 border border-dashed border-gray-200 rounded-lg">
              Recherchez un article ci-dessus
            </p>
          )}

          {cart.length > 0 && (
            <div className="flex items-center justify-between font-bold text-lg border-t pt-3">
              <span>Total</span>
              <span className="text-blue-700">{formatCurrency(subtotal)}</span>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('client')} className="flex-1">← Retour</Button>
            <Button onClick={() => setStep('confirm')} disabled={cart.length === 0} className="flex-2">
              Continuer → Validation
            </Button>
          </div>
        </Card>
      )}

      {/* ── STEP 3: Confirm ── */}
      {step === 'confirm' && (
        <Card className="p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">Confirmation du dépôt express</h3>

          {/* Summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <User size={14} /> {foundClient?.name} · {foundClient?.phone}
            </div>
            {cart.map(i => (
              <div key={i.service_id} className="flex justify-between text-sm text-gray-600">
                <span>{i.service_name} ×{i.quantity}{i.textile_type && ` (${i.textile_type})`}</span>
                <span>{formatCurrency(i.unit_price * i.quantity)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold border-t pt-2 text-gray-900">
              <span>Total</span><span>{formatCurrency(subtotal)}</span>
            </div>
          </div>

          {/* Payment */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Paiement</label>
            <div className="flex gap-2">
              <button onClick={() => setPayLater(true)}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${payLater ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                Payer plus tard
              </button>
              <button onClick={() => { setPayLater(false); setDeposit(subtotal) }}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${!payLater ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'}`}>
                Payer maintenant
              </button>
            </div>
            {payLater && (
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 whitespace-nowrap">Acompte (DH)</label>
                <input type="number" min="0" step="0.01" max={subtotal}
                  value={deposit || ''}
                  onChange={e => setDeposit(parseFloat(e.target.value) || 0)}
                  className="flex-1 h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="0" />
                {deposit > 0 && (
                  <span className="text-sm text-orange-600 font-medium whitespace-nowrap">
                    Reste {formatCurrency(subtotal - deposit)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm text-gray-600 block mb-1">Notes express</label>
            <input value={expressNotes} onChange={e => setExpressNotes(e.target.value)}
              placeholder="Instructions, urgence, remarques…"
              className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('items')} className="flex-1">← Retour</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-green-600 hover:bg-green-700 text-white h-11">
              {submitting
                ? <Loader2 size={16} className="animate-spin mr-2" />
                : <Zap size={16} className="mr-2" />
              }
              {submitting ? 'Création…' : 'Créer le ticket'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

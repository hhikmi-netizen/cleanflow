'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, Search, UserPlus, X, Star, RefreshCw, MapPin, Clock, Tag, AlertTriangle, Printer, FileText } from 'lucide-react'
import { Client, Service } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import AddressAutocomplete, { PlaceData } from '@/components/shared/AddressAutocomplete'
import { adjustLoyaltyPoints } from '@/app/actions/loyalty'
import { useSubscriptionOnOrder } from '@/app/actions/pricing'
import { resolvePrice, ApplicablePriceRule, RULE_TYPE_LABELS, RULE_TYPE_COLORS, PriceContext } from '@/lib/priceEngine'

interface OrderItem {
  service_id: string
  service_name: string
  quantity: number
  unit_price: number
  subtotal: number
  notes: string
  appliedRule?: string | null
  appliedRuleType?: string | null
}

interface CreateOrderFormProps {
  clients: Client[]
  services: Service[]
  pressingId: string
  taxRate: number
  pressingName: string
  preselectedClientId?: string
}

// Normalize phone for search (strip spaces, dashes, dots)
function normalizePhone(s: string) {
  return s.replace(/[\s\-.]/g, '')
}

export default function CreateOrderForm({ clients: initialClients, services, pressingId, taxRate, pressingName, preselectedClientId }: CreateOrderFormProps) {
  const [clients, setClients] = useState<Client[]>(initialClients)
  const preselected = preselectedClientId ? initialClients.find(c => c.id === preselectedClientId) : undefined
  const [clientId, setClientId] = useState(preselected?.id || '')
  const [clientSearch, setClientSearch] = useState(preselected?.name || '')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [items, setItems] = useState<OrderItem[]>([])
  const [serviceSearch, setServiceSearch] = useState('')
  const [showServiceDropdown, setShowServiceDropdown] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentTerms, setPaymentTerms] = useState('immediate')
  const [deposit, setDeposit] = useState(0)
  const [depositDate, setDepositDate] = useState('')
  const [depositMode, setDepositMode] = useState<'on_site' | 'pickup'>('on_site')
  const [deliveryMode, setDeliveryMode] = useState<'on_site' | 'delivery'>('on_site')
  const [pickupDate, setPickupDate] = useState('')
  const [pickupAddress, setPickupAddress] = useState('')
  const [pickupLatitude, setPickupLatitude] = useState<number | null>(null)
  const [pickupLongitude, setPickupLongitude] = useState<number | null>(null)
  const [pickupSlotTime, setPickupSlotTime] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryLatitude, setDeliveryLatitude] = useState<number | null>(null)
  const [deliveryLongitude, setDeliveryLongitude] = useState<number | null>(null)
  const [deliverySlotDate, setDeliverySlotDate] = useState('')
  const [deliverySlotTime, setDeliverySlotTime] = useState('')
  const [notes, setNotes] = useState('')
  const [applyTax, setApplyTax] = useState(false)
  const [loading, setLoading] = useState(false)
  const [createdOrder, setCreatedOrder] = useState<{ id: string; orderNumber: string; trackingToken: string; items: any[]; clientName: string } | null>(null)

  // Discount
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none')
  const [discountValue, setDiscountValue] = useState(0)
  const [discountLabel, setDiscountLabel] = useState('')
  const [availableDiscounts, setAvailableDiscounts] = useState<{ id: string; name: string; discount_type: string; value: number }[]>([])

  // Loyalty
  const [clientLoyaltyPoints, setClientLoyaltyPoints] = useState(0)
  const [pointsValueDh, setPointsValueDh] = useState(0.1)
  const [redemptionMin, setRedemptionMin] = useState(50)
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false)
  const [redeemPoints, setRedeemPoints] = useState(false)
  const [pointsToRedeem, setPointsToRedeem] = useState(0)

  // Subscriptions (MODULE B)
  const [clientActiveSubs, setClientActiveSubs] = useState<any[]>([])
  const [selectedSubId, setSelectedSubId] = useState('')
  const [useSubBalance, setUseSubBalance] = useState(false)
  const [subBalanceAmount, setSubBalanceAmount] = useState(0)

  // Price engine
  const [priceRules, setPriceRules] = useState<ApplicablePriceRule[]>([])

  // B2B credit limit
  const [clientCreditLimit, setClientCreditLimit] = useState<number | null>(null)
  const [clientOutstandingBalance, setClientOutstandingBalance] = useState(0)

  // Quick client creation
  const [showNewClientForm, setShowNewClientForm] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [newClientType, setNewClientType] = useState<'individual' | 'business'>('individual')
  const [creatingClient, setCreatingClient] = useState(false)

  const clientDropdownRef = useRef<HTMLDivElement>(null)
  const serviceDropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // Load discount rules + price rules once
  useEffect(() => {
    supabase.from('discount_rules').select('id, name, discount_type, value').eq('active', true)
      .then(({ data }) => { if (data) setAvailableDiscounts(data) })
    supabase.from('price_rules').select('*').eq('pressing_id', pressingId).eq('active', true)
      .then(({ data }) => { if (data) setPriceRules(data as ApplicablePriceRule[]) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load subscriptions when client changes
  useEffect(() => {
    if (!clientId) { setClientActiveSubs([]); setSelectedSubId(''); setUseSubBalance(false); setSubBalanceAmount(0); return }
    const today = new Date().toISOString().split('T')[0]
    supabase
      .from('customer_subscriptions')
      .select('id, status, balance, quota_used, kilo_used, expires_at, subscriptions(id, name, sub_type, quota_quantity, quota_kilo, credits)')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .or(`expires_at.gte.${today},expires_at.is.null`)
      .then(({ data }) => {
        setClientActiveSubs(data || [])
        if (data && data.length === 1) setSelectedSubId(data[0].id)
        else setSelectedSubId('')
        setUseSubBalance(false); setSubBalanceAmount(0)
      })
  }, [clientId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load loyalty data when client changes
  useEffect(() => {
    if (!clientId) { setClientLoyaltyPoints(0); setRedeemPoints(false); setPointsToRedeem(0); return }
    Promise.all([
      supabase.from('clients').select('loyalty_points').eq('id', clientId).single(),
      supabase.from('settings').select('loyalty_enabled, points_value_dh, points_redemption_min').eq('pressing_id', pressingId).single(),
    ]).then(([clientRes, settingsRes]) => {
      setClientLoyaltyPoints((clientRes.data as any)?.loyalty_points || 0)
      if (settingsRes.data) {
        setLoyaltyEnabled(settingsRes.data.loyalty_enabled ?? true)
        setPointsValueDh(Number(settingsRes.data.points_value_dh) || 0.1)
        setRedemptionMin(settingsRes.data.points_redemption_min || 50)
      }
    })
    setRedeemPoints(false)
    setPointsToRedeem(0)
  }, [clientId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load credit limit + outstanding balance when business client changes
  useEffect(() => {
    const currentClient = clients.find(c => c.id === clientId)
    if (!clientId || currentClient?.client_type !== 'business') {
      setClientCreditLimit(null); setClientOutstandingBalance(0); return
    }
    Promise.all([
      supabase.from('clients').select('credit_limit').eq('id', clientId).single(),
      supabase.from('orders')
        .select('total, deposit')
        .eq('client_id', clientId)
        .eq('paid', false)
        .neq('status', 'cancelled'),
      supabase.from('payments').select('amount, orders!inner(client_id)').eq('orders.client_id', clientId),
    ]).then(([clientRes, ordersRes, paymentsRes]) => {
      const limit = clientRes.data?.credit_limit ? Number(clientRes.data.credit_limit) : null
      setClientCreditLimit(limit)
      const unpaidOrders = ordersRes.data || []
      const paymentsTotal = (paymentsRes.data || []).reduce((s: number, p: any) => s + Number(p.amount), 0)
      const outstanding = unpaidOrders.reduce((s, o) => s + Math.max(0, Number(o.total) - Number(o.deposit || 0)), 0) - paymentsTotal
      setClientOutstandingBalance(Math.max(0, outstanding))
    })
  }, [clientId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setShowClientDropdown(false)
      }
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(e.target as Node)) {
        setShowServiceDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectedClient = clients.find(c => c.id === clientId)

  // Build context for the price engine (recomputed each render from current state)
  const priceContext: PriceContext = {
    clientType: selectedClient?.client_type === 'business' ? 'business' : 'individual',
    depositMode,
    deliveryMode,
    isExpress: false,
  }

  // Recompute item prices whenever client type or deposit/delivery mode changes
  useEffect(() => {
    if (items.length === 0 || priceRules.length === 0) return
    const ctx: PriceContext = {
      clientType: selectedClient?.client_type === 'business' ? 'business' : 'individual',
      depositMode,
      deliveryMode,
      isExpress: false,
    }
    let changed = false
    const recomputed = items.map(item => {
      const svc = services.find(s => s.id === item.service_id)
      if (!svc) return item
      const base = ctx.clientType === 'business' ? svc.price_business : svc.price_individual
      const r = resolvePrice(item.service_id, base, priceRules, { ...ctx, quantity: item.quantity })
      if (r.price !== item.unit_price || r.ruleName !== item.appliedRule) changed = true
      return { ...item, unit_price: r.price, subtotal: item.quantity * r.price, appliedRule: r.ruleName, appliedRuleType: r.ruleType }
    })
    if (changed) {
      setItems(recomputed)
      toast.info('Prix recalculés', { duration: 2000 })
    }
  }, [clientId, depositMode, deliveryMode]) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredClients = clients.filter(c => {
    if (!clientSearch) return true
    const q = clientSearch.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      normalizePhone(c.phone).includes(normalizePhone(clientSearch)) ||
      (c.email || '').toLowerCase().includes(q)
    )
  })

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
    (s.category || '').toLowerCase().includes(serviceSearch.toLowerCase())
  )

  const selectClient = (client: Client) => {
    setClientId(client.id)
    setClientSearch(client.name)
    setShowClientDropdown(false)
    setShowNewClientForm(false)
  }

  const clearClient = () => {
    setClientId('')
    setClientSearch('')
    setShowNewClientForm(false)
  }

  const createQuickClient = async () => {
    if (!newClientName.trim() || !newClientPhone.trim()) {
      toast.error('Nom et téléphone requis')
      return
    }
    setCreatingClient(true)
    try {
      const { data: client, error } = await supabase
        .from('clients')
        .insert({
          pressing_id: pressingId,
          name: newClientName.trim(),
          phone: newClientPhone.trim(),
          client_type: newClientType,
        })
        .select()
        .single()
      if (error) throw error
      setClients(prev => [...prev, client])
      selectClient(client)
      setNewClientName('')
      setNewClientPhone('')
      setNewClientType('individual')
      setShowNewClientForm(false)
      toast.success(`Client ${client.name} créé`)
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Erreur création client'
      toast.error(msg.includes('unique') ? 'Ce numéro de téléphone est déjà utilisé' : msg)
    } finally {
      setCreatingClient(false)
    }
  }

  const addItem = (service: Service) => {
    const basePrice = selectedClient?.client_type === 'business'
      ? service.price_business
      : service.price_individual

    const existing = items.find(i => i.service_id === service.id)
    if (existing) {
      const newQty = existing.quantity + 1
      const r = resolvePrice(service.id, basePrice, priceRules, { ...priceContext, quantity: newQty })
      setItems(items.map(i =>
        i.service_id === service.id
          ? { ...i, quantity: newQty, unit_price: r.price, subtotal: newQty * r.price, appliedRule: r.ruleName, appliedRuleType: r.ruleType }
          : i
      ))
    } else {
      const r = resolvePrice(service.id, basePrice, priceRules, priceContext)
      setItems([...items, {
        service_id: service.id,
        service_name: service.name,
        quantity: 1,
        unit_price: r.price,
        subtotal: r.price,
        notes: '',
        appliedRule: r.ruleName,
        appliedRuleType: r.ruleType,
      }])
    }
    setServiceSearch('')
    setShowServiceDropdown(false)
  }

  const updateQuantity = (serviceId: string, qty: number) => {
    if (qty <= 0) {
      setItems(items.filter(i => i.service_id !== serviceId))
    } else {
      setItems(items.map(i =>
        i.service_id === serviceId
          ? { ...i, quantity: qty, subtotal: qty * i.unit_price }
          : i
      ))
    }
  }

  const removeItem = (serviceId: string) => {
    setItems(items.filter(i => i.service_id !== serviceId))
  }

  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0)
  const loyaltyDiscountAmount = redeemPoints && pointsToRedeem > 0
    ? Math.min(pointsToRedeem * pointsValueDh, subtotal)
    : 0
  const selectedSub = clientActiveSubs.find(cs => cs.id === selectedSubId)
  const subDiscount = useSubBalance && selectedSub?.subscriptions?.sub_type === 'prepaid'
    ? Math.min(subBalanceAmount, subtotal)
    : 0

  const effectiveDiscountType = (loyaltyDiscountAmount > 0 || subDiscount > 0) ? 'fixed' : discountType
  const effectiveDiscountValue = loyaltyDiscountAmount > 0
    ? loyaltyDiscountAmount
    : subDiscount > 0
      ? subDiscount
      : discountValue
  const effectiveDiscountLabel = loyaltyDiscountAmount > 0
    ? `Fidélité (${pointsToRedeem} pts)`
    : subDiscount > 0
      ? `Forfait prépayé — ${selectedSub?.subscriptions?.name}`
      : discountLabel
  const discountAmount = loyaltyDiscountAmount > 0
    ? loyaltyDiscountAmount
    : subDiscount > 0
      ? subDiscount
      : discountType === 'percentage'
        ? subtotal * (discountValue / 100)
        : discountType === 'fixed'
          ? Math.min(discountValue, subtotal)
          : 0
  const discountedSubtotal = subtotal - discountAmount
  const tax = applyTax ? discountedSubtotal * (taxRate / 100) : 0
  const total = discountedSubtotal + tax

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId) { toast.error('Sélectionnez un client'); return }
    if (items.length === 0) { toast.error('Ajoutez au moins un article'); return }

    if (clientCreditLimit !== null && clientOutstandingBalance + total > clientCreditLimit) {
      toast.error(`Plafond crédit dépassé — disponible : ${formatCurrency(Math.max(0, clientCreditLimit - clientOutstandingBalance))}`)
      return
    }

    if (selectedSubId && selectedSub) {
      const sub = selectedSub.subscriptions
      if (sub?.sub_type === 'shirts' && sub.quota_quantity) {
        const totalQty = items.reduce((s, i) => s + i.quantity, 0)
        const remaining = sub.quota_quantity - (selectedSub.quota_used || 0)
        if (totalQty > remaining) {
          toast.error(`Quota insuffisant — ${remaining} pièce${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''} sur ce forfait`)
          return
        }
      }
      if (sub?.sub_type === 'prepaid' && useSubBalance && subBalanceAmount > Number(selectedSub.balance)) {
        toast.error(`Solde insuffisant — ${formatCurrency(Number(selectedSub.balance))} disponible`)
        return
      }
    }

    setLoading(true)
    try {
      const pickupSlot = depositMode === 'pickup' && depositDate
        ? `${depositDate}${pickupSlotTime ? ' ' + pickupSlotTime : ''}`
        : null
      const delivSlot = deliveryMode === 'delivery' && deliverySlotDate
        ? `${deliverySlotDate}${deliverySlotTime ? ' ' + deliverySlotTime : ''}`
        : null

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          pressing_id: pressingId,
          client_id: clientId,
          order_number: '',
          subtotal,
          tax,
          total,
          payment_method: paymentMethod,
          payment_terms: paymentTerms,
          deposit: deposit || 0,
          deposit_date: depositDate || null,
          deposit_mode: depositMode,
          delivery_mode: deliveryMode,
          pickup_date: pickupDate || null,
          pickup_address: depositMode === 'pickup' ? (pickupAddress || null) : null,
          pickup_latitude: depositMode === 'pickup' ? (pickupLatitude ?? null) : null,
          pickup_longitude: depositMode === 'pickup' ? (pickupLongitude ?? null) : null,
          delivery_address: deliveryMode === 'delivery' ? (deliveryAddress || null) : null,
          delivery_latitude: deliveryMode === 'delivery' ? (deliveryLatitude ?? null) : null,
          delivery_longitude: deliveryMode === 'delivery' ? (deliveryLongitude ?? null) : null,
          pickup_slot: pickupSlot,
          delivery_slot: delivSlot,
          delivery_status: (depositMode === 'pickup' || deliveryMode === 'delivery') ? 'pending' : null,
          notes: notes || null,
          status: 'pending',
          paid: false,
          discount_type: effectiveDiscountType !== 'none' ? effectiveDiscountType : null,
          discount_value: effectiveDiscountValue || null,
          discount_amount: discountAmount || null,
          discount_label: effectiveDiscountLabel || null,
        })
        .select()
        .single()

      if (orderError) throw orderError

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(items.map(item => ({ ...item, order_id: order.id })))

      if (itemsError) throw itemsError

      // Deduct loyalty points if redeemed
      if (redeemPoints && pointsToRedeem > 0 && clientId) {
        await adjustLoyaltyPoints(clientId, -pointsToRedeem, `Échange — commande ${order.order_number}`)
      }

      // Use subscription if selected
      if (selectedSubId) {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        await useSubscriptionOnOrder({
          customerSubId: selectedSubId,
          orderId: order.id,
          itemCount: items.reduce((s, i) => s + i.quantity, 0),
          amountUsed: subDiscount > 0 ? subDiscount : 0,
        })
      }

      const selectedClient = clients.find(c => c.id === clientId)
      setCreatedOrder({
        id: order.id,
        orderNumber: order.order_number,
        trackingToken: order.tracking_token || "",
        items: items,
        clientName: selectedClient?.name || ""
      })
      toast.success(`Commande ${order.order_number} créée !`)
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Erreur lors de la création'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">

      {/* ── 1. CLIENT ── */}
      <Card className="p-5 overflow-visible">
        <h3 className="font-semibold text-gray-900 mb-4">1. Client</h3>

        {selectedClient ? (
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex-1">
              <p className="font-medium text-blue-900">{selectedClient.name}</p>
              <p className="text-sm text-blue-600">
                {selectedClient.phone}
                {selectedClient.client_type === 'business' && ' · Professionnel'}
              </p>
            </div>
            <button type="button" onClick={clearClient} className="text-blue-400 hover:text-blue-600 p-1">
              <X size={16} />
            </button>
          </div>
        ) : (
          <div ref={clientDropdownRef} className="relative">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                className="pl-9 h-11"
                placeholder="Rechercher par nom ou téléphone..."
                value={clientSearch}
                onChange={e => {
                  setClientSearch(e.target.value)
                  setShowClientDropdown(true)
                }}
                onFocus={() => setShowClientDropdown(true)}
                autoComplete="off"
              />
            </div>

            {showClientDropdown && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                {filteredClients.length > 0 ? (
                  <>
                    {filteredClients.slice(0, 8).map(client => (
                      <button
                        key={client.id}
                        type="button"
                        onMouseDown={e => { e.preventDefault(); selectClient(client) }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{client.name}</p>
                          <p className="text-xs text-gray-400">{client.phone}</p>
                        </div>
                        {client.client_type === 'business' && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Pro</span>
                        )}
                      </button>
                    ))}
                    <button
                      type="button"
                      onMouseDown={e => { e.preventDefault(); setShowNewClientForm(true); setShowClientDropdown(false) }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-blue-600 border-t border-gray-100"
                    >
                      <UserPlus size={14} />
                      <span className="text-sm">Créer un nouveau client</span>
                    </button>
                  </>
                ) : (
                  <div className="px-4 py-3">
                    <p className="text-sm text-gray-500 mb-2">Aucun client trouvé pour &ldquo;{clientSearch}&rdquo;</p>
                    <button
                      type="button"
                      onMouseDown={e => {
                        e.preventDefault()
                        setNewClientName(clientSearch)
                        setShowNewClientForm(true)
                        setShowClientDropdown(false)
                      }}
                      className="flex items-center gap-2 text-blue-600 text-sm font-medium hover:underline"
                    >
                      <UserPlus size={14} />
                      Créer &ldquo;{clientSearch}&rdquo; comme nouveau client
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* B2B credit limit banner */}
        {clientCreditLimit !== null && (
          (() => {
            const projectedBalance = clientOutstandingBalance + total
            const remaining = clientCreditLimit - clientOutstandingBalance
            const isOver = projectedBalance > clientCreditLimit
            return (
              <div className={`mt-3 px-3 py-2.5 rounded-lg border text-sm flex items-start gap-2 ${isOver ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                <AlertTriangle size={14} className={`mt-0.5 shrink-0 ${isOver ? 'text-red-500' : 'text-amber-500'}`} />
                <div>
                  <p className="font-medium">
                    {isOver ? 'Plafond crédit dépassé' : 'Plafond crédit'}
                  </p>
                  <p className="text-xs mt-0.5 opacity-80">
                    Encours actuel : {formatCurrency(clientOutstandingBalance)} · Plafond : {formatCurrency(clientCreditLimit)} · Disponible : {formatCurrency(Math.max(0, remaining))}
                    {isOver && ` · Dépassement : ${formatCurrency(projectedBalance - clientCreditLimit)}`}
                  </p>
                </div>
              </div>
            )
          })()
        )}

        {/* Formulaire création rapide client */}
        {showNewClientForm && (
          <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-gray-800">Nouveau client</p>
              <button type="button" onClick={() => setShowNewClientForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nom *</Label>
                <Input
                  value={newClientName}
                  onChange={e => setNewClientName(e.target.value)}
                  placeholder="Mohammed Alami"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Téléphone *</Label>
                <Input
                  value={newClientPhone}
                  onChange={e => setNewClientPhone(e.target.value)}
                  placeholder="06 12 34 56 78"
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" name="newClientType" checked={newClientType === 'individual'}
                  onChange={() => setNewClientType('individual')} className="text-blue-600" />
                Particulier
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" name="newClientType" checked={newClientType === 'business'}
                  onChange={() => setNewClientType('business')} className="text-blue-600" />
                Professionnel
              </label>
            </div>
            <Button type="button" size="sm" onClick={createQuickClient} disabled={creatingClient} className="w-full h-9">
              {creatingClient ? <Loader2 className="h-3 w-3 animate-spin" /> : <><UserPlus size={14} className="mr-1" /> Créer et sélectionner</>}
            </Button>
          </div>
        )}
      </Card>

      {/* ── 2. ARTICLES ── */}
      <Card className="p-5 overflow-visible">
        <h3 className="font-semibold text-gray-900 mb-4">2. Articles</h3>
        <div ref={serviceDropdownRef} className="relative">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              className="pl-9 h-11"
              placeholder="Rechercher un service..."
              value={serviceSearch}
              onChange={e => { setServiceSearch(e.target.value); setShowServiceDropdown(true) }}
              onFocus={() => setShowServiceDropdown(true)}
              autoComplete="off"
            />
          </div>
          {showServiceDropdown && serviceSearch && filteredServices.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredServices.map(service => {
                const base = priceContext.clientType === 'business' ? service.price_business : service.price_individual
                const r = resolvePrice(service.id, base, priceRules, priceContext)
                return (
                  <button
                    key={service.id}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); addItem(service) }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{service.name}</p>
                      <p className="text-xs text-gray-400">{service.category}</p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      {r.ruleType && (
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${RULE_TYPE_COLORS[r.ruleType] ?? 'bg-gray-100 text-gray-500'}`}>
                          <Tag size={9} className="inline mr-0.5" />
                          {RULE_TYPE_LABELS[r.ruleType] ?? r.ruleType}
                        </span>
                      )}
                      <span className={`text-sm font-semibold ${r.ruleName ? 'text-blue-700' : 'text-gray-900'}`}>
                        {formatCurrency(r.price)}
                      </span>
                      <Plus size={14} className="text-blue-600" />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="mt-4 space-y-2">
            {items.map(item => (
              <div key={item.service_id} className="p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.service_name}</p>
                      {item.appliedRule && item.appliedRuleType && (
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${RULE_TYPE_COLORS[item.appliedRuleType] ?? 'bg-gray-100 text-gray-500'}`}>
                          <Tag size={9} className="inline mr-0.5" />
                          {item.appliedRule}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{formatCurrency(item.unit_price)} / unité</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={() => updateQuantity(item.service_id, item.quantity - 1)}
                      className="w-7 h-7 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 flex items-center justify-center font-bold">−</button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(item.service_id, item.quantity + 1)}
                      className="w-7 h-7 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 flex items-center justify-center font-bold">+</button>
                  </div>
                  <span className="text-sm font-bold w-20 text-right shrink-0">{formatCurrency(item.subtotal)}</span>
                  <button type="button" onClick={() => removeItem(item.service_id)} className="text-red-400 hover:text-red-600 p-1 shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
                <input
                  type="text"
                  value={item.notes}
                  onChange={e => setItems(items.map(i =>
                    i.service_id === item.service_id ? { ...i, notes: e.target.value } : i
                  ))}
                  placeholder="Note sur cet article (couleur, taille, instruction...)"
                  className="w-full text-xs px-2 py-1.5 rounded border border-gray-200 bg-white text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            ))}
          </div>
        )}

        {items.length === 0 && (
          <p className="mt-3 text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
            Recherchez un service ci-dessus pour l&apos;ajouter
          </p>
        )}
      </Card>

      {/* ── 3. DÉTAILS ── */}
      <Card className="p-5">
        <h3 className="font-semibold text-gray-900 mb-4">3. Détails</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Mode de dépôt</Label>
            <select
              value={depositMode}
              onChange={e => setDepositMode(e.target.value as 'on_site' | 'pickup')}
              className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="on_site">Sur place</option>
              <option value="pickup">Collecte domicile</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Mode de retrait</Label>
            <select
              value={deliveryMode}
              onChange={e => setDeliveryMode(e.target.value as 'on_site' | 'delivery')}
              className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="on_site">Sur place</option>
              <option value="delivery">Livraison domicile</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Date de dépôt</Label>
            <Input type="date" value={depositDate} onChange={e => setDepositDate(e.target.value)} className="h-10" />
          </div>
          <div className="space-y-2">
            <Label>Date de retrait prévue</Label>
            <Input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} className="h-10" />
          </div>

          {/* Collecte : adresse + créneau */}
          {depositMode === 'pickup' && (
            <>
              <div className="sm:col-span-2 space-y-2">
                <Label className="flex items-center gap-1.5"><MapPin size={13} className="text-purple-500" />Adresse de collecte</Label>
                <AddressAutocomplete
                  value={pickupAddress}
                  onChange={(val, place?: PlaceData) => {
                    setPickupAddress(val)
                    if (place) { setPickupLatitude(place.latitude); setPickupLongitude(place.longitude) }
                  }}
                  placeholder={selectedClient?.address || 'Adresse de collecte…'}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Clock size={13} className="text-purple-500" />Créneau collecte</Label>
                <Input type="time" value={pickupSlotTime} onChange={e => setPickupSlotTime(e.target.value)} className="h-10" />
              </div>
            </>
          )}

          {/* Livraison : adresse + créneau */}
          {deliveryMode === 'delivery' && (
            <>
              <div className="sm:col-span-2 space-y-2">
                <Label className="flex items-center gap-1.5"><MapPin size={13} className="text-blue-500" />Adresse de livraison</Label>
                <AddressAutocomplete
                  value={deliveryAddress}
                  onChange={(val, place?: PlaceData) => {
                    setDeliveryAddress(val)
                    if (place) { setDeliveryLatitude(place.latitude); setDeliveryLongitude(place.longitude) }
                  }}
                  placeholder={selectedClient?.address || 'Adresse de livraison…'}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Clock size={13} className="text-blue-500" />Date livraison</Label>
                <Input type="date" value={deliverySlotDate} onChange={e => setDeliverySlotDate(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-2">
                <Label>Créneau horaire</Label>
                <Input type="time" value={deliverySlotTime} onChange={e => setDeliverySlotTime(e.target.value)} className="h-10" />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label>Mode de paiement</Label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="cash">Espèces</option>
              <option value="card">Carte bancaire</option>
              <option value="transfer">Virement</option>
            </select>
          </div>
          {selectedClient?.client_type === 'business' && (
            <div className="space-y-2">
              <Label>Conditions de paiement</Label>
              <select
                value={paymentTerms}
                onChange={e => setPaymentTerms(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="immediate">Paiement immédiat</option>
                <option value="net15">Net 15 jours</option>
                <option value="net30">Net 30 jours</option>
                <option value="net45">Net 45 jours</option>
                <option value="net60">Net 60 jours</option>
              </select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Acompte versé (DH)</Label>
            <Input
              type="number"
              min="0"
              max={total}
              step="0.01"
              value={deposit || ''}
              onChange={e => setDeposit(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label>TVA</Label>
            <label className="flex items-center gap-2 h-10 cursor-pointer">
              <input
                type="checkbox"
                checked={applyTax}
                onChange={e => setApplyTax(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600"
              />
              <span className="text-sm text-gray-700">Appliquer TVA {taxRate}%</span>
            </label>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Label>Notes internes</Label>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Instructions spéciales, couleur, taille, urgence..."
            rows={2}
          />
        </div>
      </Card>

      {/* ── ABONNEMENT (MODULE B) ── */}
      {clientActiveSubs.length > 0 && (
        <Card className="p-5 border-purple-200 bg-purple-50">
          <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
            <RefreshCw size={15} className="text-purple-600" /> Abonnement client
          </h3>
          <div className="space-y-3">
            {clientActiveSubs.length > 1 && (
              <div>
                <label className="text-xs text-purple-700 mb-1 block">Forfait à appliquer</label>
                <select value={selectedSubId} onChange={e => { setSelectedSubId(e.target.value); setUseSubBalance(false); setSubBalanceAmount(0) }}
                  className="w-full h-9 px-3 rounded-md border border-purple-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                  <option value="">— Ne pas appliquer —</option>
                  {clientActiveSubs.map((cs: any) => (
                    <option key={cs.id} value={cs.id}>{cs.subscriptions?.name}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedSub && (
              <div className="rounded-lg bg-white border border-purple-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-purple-900">{selectedSub.subscriptions?.name}</p>
                  {selectedSub.expires_at && (
                    <span className="text-xs text-purple-500">Expire le {new Date(selectedSub.expires_at).toLocaleDateString('fr-FR')}</span>
                  )}
                </div>

                {/* Prepaid : déduction solde */}
                {selectedSub.subscriptions?.sub_type === 'prepaid' && (
                  <div className={`p-2 rounded-lg border transition-colors ${useSubBalance ? 'border-purple-400 bg-purple-50' : 'border-gray-200'}`}>
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <p className="text-sm font-medium text-gray-800">Utiliser le solde prépayé</p>
                        <p className="text-xs text-gray-500">Solde disponible : {formatCurrency(selectedSub.balance)}</p>
                      </div>
                      <input type="checkbox" checked={useSubBalance}
                        onChange={e => {
                          setUseSubBalance(e.target.checked)
                          if (e.target.checked) setSubBalanceAmount(Math.min(Number(selectedSub.balance), subtotal))
                          else setSubBalanceAmount(0)
                        }}
                        className="w-4 h-4 text-purple-600" />
                    </label>
                    {useSubBalance && (
                      <div className="mt-2 flex items-center gap-2">
                        <label className="text-xs text-gray-500 shrink-0">Montant à utiliser :</label>
                        <input type="number" min="0" step="0.01"
                          max={Math.min(Number(selectedSub.balance), subtotal)}
                          value={subBalanceAmount || ''}
                          onChange={e => setSubBalanceAmount(Math.min(parseFloat(e.target.value) || 0, Number(selectedSub.balance)))}
                          className="w-24 h-8 px-2 text-sm border border-purple-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-400" />
                        <span className="text-xs text-green-700 font-medium">= − {formatCurrency(Math.min(subBalanceAmount, subtotal))} DH</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Shirts : quota restant */}
                {selectedSub.subscriptions?.sub_type === 'shirts' && selectedSub.subscriptions?.quota_quantity && (
                  <p className="text-xs text-purple-700">
                    Quota : {selectedSub.subscriptions.quota_quantity - (selectedSub.quota_used || 0)} pièces restantes
                    sur {selectedSub.subscriptions.quota_quantity}
                  </p>
                )}

                {/* Kilo : quota restant */}
                {selectedSub.subscriptions?.sub_type === 'kilo' && selectedSub.subscriptions?.quota_kilo && (
                  <p className="text-xs text-purple-700">
                    Quota : {(Number(selectedSub.subscriptions.quota_kilo) - Number(selectedSub.kilo_used || 0)).toFixed(2)} kg restants
                    sur {selectedSub.subscriptions.quota_kilo} kg
                  </p>
                )}

                {/* Monthly / Enterprise */}
                {['monthly', 'enterprise'].includes(selectedSub.subscriptions?.sub_type) && (
                  <p className="text-xs text-purple-600">✓ Commande rattachée à ce forfait pour le suivi d&apos;usage</p>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── REMISE ── */}
      <Card className="p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Remise</h3>
        <div className="space-y-3">
          {/* Loyalty redemption */}
          {loyaltyEnabled && clientId && clientLoyaltyPoints >= redemptionMin && (
            <div className={`p-3 rounded-xl border transition-colors ${
              redeemPoints ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-gray-50'
            }`}>
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Star size={14} className={redeemPoints ? 'text-yellow-500 fill-yellow-400' : 'text-gray-400'} />
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      Utiliser les points fidélité
                    </p>
                    <p className="text-xs text-gray-500">
                      {clientLoyaltyPoints} pts disponibles · valeur {(clientLoyaltyPoints * pointsValueDh).toFixed(2)} DH
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={redeemPoints}
                  onChange={e => {
                    setRedeemPoints(e.target.checked)
                    if (e.target.checked) setPointsToRedeem(Math.min(clientLoyaltyPoints, Math.floor(subtotal / pointsValueDh)))
                    else setPointsToRedeem(0)
                  }}
                  className="w-4 h-4 rounded text-yellow-500"
                />
              </label>
              {redeemPoints && (
                <div className="mt-2 flex items-center gap-2">
                  <label className="text-xs text-gray-500 shrink-0">Points à utiliser :</label>
                  <input
                    type="number"
                    min={redemptionMin}
                    max={Math.min(clientLoyaltyPoints, Math.ceil(subtotal / pointsValueDh))}
                    step="1"
                    value={pointsToRedeem || ''}
                    onChange={e => setPointsToRedeem(Math.min(parseInt(e.target.value) || 0, clientLoyaltyPoints))}
                    className="w-24 h-8 px-2 text-sm border border-yellow-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-yellow-400"
                  />
                  <span className="text-xs text-green-700 font-medium">
                    = − {(pointsToRedeem * pointsValueDh).toFixed(2)} DH
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Quick-apply from saved discounts */}
          {availableDiscounts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {availableDiscounts.map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setDiscountType(d.discount_type === 'percentage' ? 'percentage' : 'fixed')
                    setDiscountValue(Number(d.value))
                    setDiscountLabel(d.name)
                  }}
                  className="text-xs px-2.5 py-1 rounded-full border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
                >
                  {d.name} ({d.discount_type === 'percentage' ? `${d.value}%` : `${d.value} DH`})
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {(['none', 'percentage', 'fixed'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { setDiscountType(t); if (t === 'none') setDiscountValue(0) }}
                className={`py-2 rounded-lg border text-xs font-medium transition-colors ${
                  discountType === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {t === 'none' ? 'Aucune' : t === 'percentage' ? 'En %' : 'Montant fixe'}
              </button>
            ))}
          </div>

          {discountType !== 'none' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  {discountType === 'percentage' ? 'Pourcentage (%)' : 'Montant (DH)'}
                </label>
                <input
                  type="number"
                  min="0"
                  max={discountType === 'percentage' ? 100 : undefined}
                  step="0.01"
                  value={discountValue || ''}
                  onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 px-3 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder={discountType === 'percentage' ? '10' : '50'}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Libellé (optionnel)</label>
                <input
                  type="text"
                  value={discountLabel}
                  onChange={e => setDiscountLabel(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Remise fidélité…"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ── RÉCAPITULATIF ── */}
      <Card className="p-5 bg-blue-50 border-blue-100">
        <h3 className="font-semibold text-gray-900 mb-3">Récapitulatif</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Sous-total ({items.length} article{items.length > 1 ? 's' : ''})</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-green-600 font-medium">
              <span>{discountLabel || (discountType === 'percentage' ? `Remise ${discountValue}%` : 'Remise')}</span>
              <span>− {formatCurrency(discountAmount)}</span>
            </div>
          )}
          {applyTax && (
            <div className="flex justify-between text-gray-600">
              <span>TVA ({taxRate}%)</span>
              <span>{formatCurrency(tax)}</span>
            </div>
          )}
          {deposit > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Acompte</span>
              <span>− {formatCurrency(deposit)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg text-gray-900 border-t border-blue-200 pt-2 mt-2">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
          {deposit > 0 && (
            <div className="flex justify-between text-orange-600 font-medium">
              <span>Reste à payer</span>
              <span>{formatCurrency(Math.max(0, total - deposit))}</span>
            </div>
          )}
        </div>
      </Card>

      <Button
        type="submit"
        size="lg"
        className="w-full h-12 text-base"
        disabled={loading || !clientId || items.length === 0}
      >
        {loading
          ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Création en cours...</>
          : `Créer la commande · ${formatCurrency(total)}`
        }
      </Button>
      {createdOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Commande créée !</h3>
              <p className="text-gray-500 mt-1">N° {createdOrder.orderNumber} — {createdOrder.items.length} article(s)</p>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => window.open(`/orders/${createdOrder.id}/ticket`, '_blank')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                <FileText className="w-5 h-5" />
                Imprimer ticket client
              </button>
              <button
                type="button"
                onClick={() => {
                  const pw = window.open('', '_blank')
                  if (!pw) return
                  const labels = createdOrder.items.map((item: any, i: number) => `
                    <div class="label">
                      <div class="code">${item.code || 'ART-' + (i+1)}</div>
                      <div class="type">${item.serviceName || item.serviceId || ''}</div>
                      ${createdOrder.clientName ? '<div class="client">' + createdOrder.clientName + '</div>' : ''}
                    </div>
                  `).join('')
                  pw.document.write(`<!DOCTYPE html><html><head><style>
                    @page { size: 50mm 30mm; margin: 0; }
                    body { margin: 0; font-family: Arial, sans-serif; }
                    .label { width: 50mm; height: 30mm; padding: 2mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; page-break-after: always; }
                    .code { font-size: 14pt; font-weight: 900; }
                    .type { font-size: 9pt; color: #555; margin-top: 1mm; }
                    .client { font-size: 8pt; color: #777; margin-top: 1mm; }
                  </style></head><body>${labels}</body></html>`)
                  pw.document.close()
                  pw.print()
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition font-medium"
              >
                <Printer className="w-5 h-5" />
                Imprimer étiquettes
              </button>
              <button
                type="button"
                onClick={() => router.push(`/orders/${createdOrder.id}`)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Voir la commande
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}

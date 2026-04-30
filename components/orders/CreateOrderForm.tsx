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
import { Loader2, Plus, Trash2, Search, UserPlus, X } from 'lucide-react'
import { Client, Service } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

interface OrderItem {
  service_id: string
  service_name: string
  quantity: number
  unit_price: number
  subtotal: number
  notes: string
}

interface CreateOrderFormProps {
  clients: Client[]
  services: Service[]
  pressingId: string
  taxRate: number
}

// Normalize phone for search (strip spaces, dashes, dots)
function normalizePhone(s: string) {
  return s.replace(/[\s\-\.]/g, '')
}

export default function CreateOrderForm({ clients: initialClients, services, pressingId, taxRate }: CreateOrderFormProps) {
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [clientId, setClientId] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [items, setItems] = useState<OrderItem[]>([])
  const [serviceSearch, setServiceSearch] = useState('')
  const [showServiceDropdown, setShowServiceDropdown] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [deposit, setDeposit] = useState(0)
  const [depositDate, setDepositDate] = useState('')
  const [depositMode, setDepositMode] = useState<'on_site' | 'pickup'>('on_site')
  const [deliveryMode, setDeliveryMode] = useState<'on_site' | 'delivery'>('on_site')
  const [pickupDate, setPickupDate] = useState('')
  const [notes, setNotes] = useState('')
  const [applyTax, setApplyTax] = useState(false)
  const [loading, setLoading] = useState(false)

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
    s.category.toLowerCase().includes(serviceSearch.toLowerCase())
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
    const price = selectedClient?.client_type === 'business'
      ? service.price_business
      : service.price_individual

    const existing = items.find(i => i.service_id === service.id)
    if (existing) {
      setItems(items.map(i =>
        i.service_id === service.id
          ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unit_price }
          : i
      ))
    } else {
      setItems([...items, {
        service_id: service.id,
        service_name: service.name,
        quantity: 1,
        unit_price: price,
        subtotal: price,
        notes: '',
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
  const tax = applyTax ? subtotal * (taxRate / 100) : 0
  const total = subtotal + tax

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId) { toast.error('Sélectionnez un client'); return }
    if (items.length === 0) { toast.error('Ajoutez au moins un article'); return }

    setLoading(true)
    try {
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
          deposit: deposit || 0,
          deposit_date: depositDate || null,
          deposit_mode: depositMode,
          delivery_mode: deliveryMode,
          pickup_date: pickupDate || null,
          notes: notes || null,
          status: 'pending',
          paid: false,
        })
        .select()
        .single()

      if (orderError) throw orderError

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(items.map(item => ({ ...item, order_id: order.id })))

      if (itemsError) throw itemsError

      toast.success(`Commande ${order.order_number} créée !`)
      router.push(`/orders/${order.id}`)
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
      <Card className="p-5">
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
      <Card className="p-5">
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
              {filteredServices.map(service => (
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
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(selectedClient?.client_type === 'business' ? service.price_business : service.price_individual)}
                    </span>
                    <Plus size={14} className="text-blue-600" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="mt-4 space-y-2">
            {items.map(item => (
              <div key={item.service_id} className="p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.service_name}</p>
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
          <div className="space-y-2">
            <Label>Acompte versé (DH)</Label>
            <Input
              type="number"
              min="0"
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

      {/* ── RÉCAPITULATIF ── */}
      <Card className="p-5 bg-blue-50 border-blue-100">
        <h3 className="font-semibold text-gray-900 mb-3">Récapitulatif</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Sous-total ({items.length} article{items.length > 1 ? 's' : ''})</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
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
    </form>
  )
}

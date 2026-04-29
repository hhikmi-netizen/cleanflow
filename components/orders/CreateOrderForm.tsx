'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, Search } from 'lucide-react'
import { Client, Service } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

interface OrderItem {
  service_id: string
  service_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

interface CreateOrderFormProps {
  clients: Client[]
  services: Service[]
  pressingId: string
  taxRate: number
}

export default function CreateOrderForm({ clients, services, pressingId, taxRate }: CreateOrderFormProps) {
  const [clientId, setClientId] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [items, setItems] = useState<OrderItem[]>([])
  const [serviceSearch, setServiceSearch] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [deposit, setDeposit] = useState(0)
  const [pickupDate, setPickupDate] = useState('')
  const [notes, setNotes] = useState('')
  const [applyTax, setApplyTax] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const selectedClient = clients.find(c => c.id === clientId)
  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.phone.includes(clientSearch)
  )
  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
    s.category.toLowerCase().includes(serviceSearch.toLowerCase())
  )

  const selectClient = (client: Client) => {
    setClientId(client.id)
    setClientSearch(client.name)
    setShowClientDropdown(false)
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
      }])
    }
    setServiceSearch('')
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
      const msg = err instanceof Error ? err.message : 'Erreur lors de la création'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      {/* Client */}
      <Card className="p-5">
        <h3 className="font-semibold text-gray-900 mb-4">1. Client</h3>
        <div className="relative">
          <Label htmlFor="client">Rechercher un client</Label>
          <div className="relative mt-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              id="client"
              className="pl-9 h-11"
              placeholder="Nom ou téléphone..."
              value={clientSearch}
              onChange={e => { setClientSearch(e.target.value); setShowClientDropdown(true); setClientId('') }}
              onFocus={() => setShowClientDropdown(true)}
              autoComplete="off"
            />
          </div>
          {showClientDropdown && filteredClients.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredClients.map(client => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => selectClient(client)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                >
                  <p className="text-sm font-medium text-gray-900">{client.name}</p>
                  <p className="text-xs text-gray-400">{client.phone}</p>
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedClient && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
            <p className="font-medium text-blue-900">{selectedClient.name}</p>
            <p className="text-blue-600">{selectedClient.phone} · {selectedClient.client_type === 'business' ? 'Professionnel' : 'Particulier'}</p>
          </div>
        )}
      </Card>

      {/* Articles */}
      <Card className="p-5">
        <h3 className="font-semibold text-gray-900 mb-4">2. Articles</h3>
        <div className="relative">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              className="pl-9 h-11"
              placeholder="Rechercher un service..."
              value={serviceSearch}
              onChange={e => setServiceSearch(e.target.value)}
              autoComplete="off"
            />
          </div>
          {serviceSearch && filteredServices.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredServices.map(service => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => addItem(service)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 flex justify-between items-center"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{service.name}</p>
                    <p className="text-xs text-gray-400">{service.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(selectedClient?.client_type === 'business' ? service.price_business : service.price_individual)}
                    </p>
                    <Plus size={14} className="text-blue-600 ml-auto" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="mt-4 space-y-2">
            {items.map(item => (
              <div key={item.service_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.service_name}</p>
                  <p className="text-xs text-gray-400">{formatCurrency(item.unit_price)} / unité</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => updateQuantity(item.service_id, item.quantity - 1)}
                    className="w-7 h-7 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 flex items-center justify-center text-lg leading-none">−</button>
                  <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                  <button type="button" onClick={() => updateQuantity(item.service_id, item.quantity + 1)}
                    className="w-7 h-7 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 flex items-center justify-center text-lg leading-none">+</button>
                </div>
                <span className="text-sm font-bold w-20 text-right">{formatCurrency(item.subtotal)}</span>
                <button type="button" onClick={() => removeItem(item.service_id)} className="text-red-400 hover:text-red-600 p-1">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Détails */}
      <Card className="p-5">
        <h3 className="font-semibold text-gray-900 mb-4">3. Détails</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            placeholder="Instructions spéciales, couleur, taille..."
            rows={2}
          />
        </div>
      </Card>

      {/* Récapitulatif */}
      <Card className="p-5 bg-blue-50 border-blue-100">
        <h3 className="font-semibold text-gray-900 mb-3">Récapitulatif</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Sous-total</span>
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
            <div className="flex justify-between text-blue-600 font-medium">
              <span>Reste à payer</span>
              <span>{formatCurrency(Math.max(0, total - deposit))}</span>
            </div>
          )}
        </div>
      </Card>

      <Button type="submit" size="lg" className="w-full h-12 text-base" disabled={loading || !clientId || items.length === 0}>
        {loading
          ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Création en cours...</>
          : `Créer la commande · ${formatCurrency(total)}`
        }
      </Button>
    </form>
  )
}

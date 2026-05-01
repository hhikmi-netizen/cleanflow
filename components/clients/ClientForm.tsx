'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Client } from '@/lib/types'
import AddressAutocomplete, { PlaceData } from '@/components/shared/AddressAutocomplete'

interface ClientFormProps {
  pressingId: string
  client?: Client
  onSuccess?: (client: Client) => void
}

export default function ClientForm({ pressingId, client, onSuccess }: ClientFormProps) {
  const [name, setName] = useState(client?.name || '')
  const [phone, setPhone] = useState(client?.phone || '')
  const [email, setEmail] = useState(client?.email || '')
  const [address, setAddress] = useState(client?.address || '')
  const [city, setCity] = useState(client?.city || '')
  const [district, setDistrict] = useState(client?.district || '')
  const [latitude, setLatitude] = useState<number | null>(client?.latitude ?? null)
  const [longitude, setLongitude] = useState<number | null>(client?.longitude ?? null)
  const [googlePlaceId, setGooglePlaceId] = useState<string | null>(client?.google_place_id ?? null)
  const [clientType, setClientType] = useState<'individual' | 'business'>(client?.client_type || 'individual')
  const [ice, setIce] = useState(client?.ice || '')
  const [creditLimit, setCreditLimit] = useState(client?.credit_limit ? String(client.credit_limit) : '')
  const [notes, setNotes] = useState(client?.notes || '')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const payload = {
      pressing_id: pressingId,
      name, phone, email: email || null,
      address: address || null,
      city: city || null,
      district: district || null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      google_place_id: googlePlaceId ?? null,
      client_type: clientType,
      ice: ice || null,
      credit_limit: creditLimit ? parseFloat(creditLimit) : null,
      notes: notes || null,
    }

    try {
      if (client) {
        const { data, error } = await supabase
          .from('clients')
          .update(payload)
          .eq('id', client.id)
          .select()
          .single()
        if (error) throw error
        toast.success('Client mis à jour')
        if (onSuccess) onSuccess(data)
        else router.push(`/clients/${client.id}`)
      } else {
        const { data, error } = await supabase
          .from('clients')
          .insert(payload)
          .select()
          .single()
        if (error) throw error
        toast.success('Client créé !')
        if (onSuccess) onSuccess(data)
        else router.push(`/clients/${data.id}`)
      }
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error
        ? (err.message.includes('unique') ? 'Ce numéro de téléphone est déjà utilisé' : err.message)
        : 'Erreur inconnue'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nom complet *</Label>
          <Input id="name" value={name} onChange={e => setName(e.target.value)} required className="h-11" placeholder="Mohammed Alami" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone *</Label>
          <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} required className="h-11" placeholder="06 12 34 56 78" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-11" placeholder="client@exemple.ma" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="clientType">Type de client</Label>
          <select
            id="clientType"
            value={clientType}
            onChange={e => setClientType(e.target.value as 'individual' | 'business')}
            className="w-full h-11 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="individual">Particulier</option>
            <option value="business">Professionnel</option>
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="address">Adresse</Label>
          <AddressAutocomplete
            id="address"
            value={address}
            onChange={(val, place?: PlaceData) => {
              setAddress(val)
              if (place) {
                setCity(place.city)
                setDistrict(place.district)
                setLatitude(place.latitude)
                setLongitude(place.longitude)
                setGooglePlaceId(place.google_place_id)
              }
            }}
            placeholder="123 Rue Mohammed V, Casablanca"
            className="h-11"
          />
        </div>
        {clientType === 'business' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="ice">ICE (N° entreprise)</Label>
              <Input id="ice" value={ice} onChange={e => setIce(e.target.value)} className="h-11" placeholder="000000000000000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditLimit">Plafond crédit (DH)</Label>
              <Input id="creditLimit" type="number" min="0" step="0.01" value={creditLimit}
                onChange={e => setCreditLimit(e.target.value)} className="h-11" placeholder="5000.00" />
            </div>
          </>
        )}
        <div className={`space-y-2 ${clientType === 'business' ? '' : 'sm:col-span-2'}`}>
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Préférences, allergies, instructions..." rows={2} />
        </div>
      </div>
      <Button type="submit" className="w-full h-11" disabled={loading}>
        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {client ? 'Mise à jour...' : 'Création...'}</> : client ? 'Mettre à jour' : 'Créer le client'}
      </Button>
    </form>
  )
}

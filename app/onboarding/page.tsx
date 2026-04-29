'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Check, ChevronRight } from 'lucide-react'

const DEFAULT_SERVICES = [
  { name: 'Chemise', category: 'Vêtements', price_individual: 15, price_business: 12, unit: 'pièce', active: true },
  { name: 'Pantalon', category: 'Vêtements', price_individual: 20, price_business: 16, unit: 'pièce', active: true },
  { name: 'Costume (veste + pantalon)', category: 'Vêtements', price_individual: 45, price_business: 38, unit: 'pièce', active: true },
  { name: 'Robe', category: 'Vêtements', price_individual: 35, price_business: 28, unit: 'pièce', active: true },
  { name: 'Manteau / Djellaba', category: 'Vêtements', price_individual: 50, price_business: 40, unit: 'pièce', active: true },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [pressingId, setPressingId] = useState<string | null>(null)

  // Step 1
  const [address, setAddress] = useState('')
  const [ice, setIce] = useState('')
  const [taxRate, setTaxRate] = useState('0')

  // Step 2
  const [selectedServices, setSelectedServices] = useState<number[]>([0, 1, 2])

  // Step 3
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')

  const router = useRouter()
  const supabase = createClient()

  const getPressingId = async () => {
    if (pressingId) return pressingId
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase.from('users').select('pressing_id').eq('id', user.id).single()
    setPressingId(data?.pressing_id || null)
    return data?.pressing_id || null
  }

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const pid = await getPressingId()
    if (!pid) { toast.error('Erreur de session'); setLoading(false); return }

    const { error } = await supabase.from('pressings').update({
      address: address || null,
      ice: ice || null,
      tax_rate: parseFloat(taxRate) || 0,
    }).eq('id', pid)

    if (error) { toast.error(error.message); setLoading(false); return }
    setLoading(false)
    setStep(2)
  }

  const handleStep2 = async (skip = false) => {
    if (skip) { setStep(3); return }
    setLoading(true)
    const pid = await getPressingId()
    if (!pid) { toast.error('Erreur'); setLoading(false); return }

    const services = selectedServices.map(i => ({ ...DEFAULT_SERVICES[i], pressing_id: pid }))
    const { error } = await supabase.from('services').insert(services)

    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success(`${services.length} services ajoutés !`)
    setLoading(false)
    setStep(3)
  }

  const handleStep3 = async (skip = false) => {
    if (skip) { router.push('/'); return }
    if (!clientName || !clientPhone) { toast.error('Nom et téléphone requis'); return }
    setLoading(true)
    const pid = await getPressingId()

    const { error } = await supabase.from('clients').insert({
      pressing_id: pid,
      name: clientName,
      phone: clientPhone,
      client_type: 'individual',
    })

    if (error && !error.message.includes('unique')) { toast.error(error.message); setLoading(false); return }
    toast.success('Client ajouté !')
    setLoading(false)
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                i < step ? 'bg-green-500 text-white' :
                i === step ? 'bg-blue-600 text-white' :
                'bg-white text-gray-400 border border-gray-200'
              }`}>
                {i < step ? <Check size={14} /> : i}
              </div>
              {i < 3 && <div className={`w-12 h-1 rounded ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Infos pressing */}
        {step === 1 && (
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Configuration du pressing</h2>
            <p className="text-sm text-gray-500 mb-6">Complétez les informations de votre pressing</p>
            <form onSubmit={handleStep1} className="space-y-4">
              <div className="space-y-2">
                <Label>Adresse</Label>
                <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Rue, ville, code postal" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>ICE (Identifiant fiscal)</Label>
                <Input value={ice} onChange={e => setIce(e.target.value)} placeholder="000000000000000" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Taux TVA (%)</Label>
                <Input type="number" min="0" max="100" value={taxRate} onChange={e => setTaxRate(e.target.value)} className="h-11" placeholder="20" />
                <p className="text-xs text-gray-400">Entrez 0 si vous n&apos;appliquez pas de TVA</p>
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continuer <ChevronRight size={16} className="ml-1" /></>}
              </Button>
            </form>
          </Card>
        )}

        {/* Step 2: Services */}
        {step === 2 && (
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Services proposés</h2>
            <p className="text-sm text-gray-500 mb-6">Sélectionnez les services à ajouter (modifiable ensuite)</p>
            <div className="space-y-2 mb-6">
              {DEFAULT_SERVICES.map((service, i) => (
                <label key={i} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedServices.includes(i)}
                    onChange={e => setSelectedServices(e.target.checked
                      ? [...selectedServices, i]
                      : selectedServices.filter(s => s !== i)
                    )}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{service.name}</p>
                    <p className="text-xs text-gray-400">{service.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{service.price_individual} DH</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <Button onClick={() => handleStep2()} className="flex-1 h-11" disabled={loading || selectedServices.length === 0}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ajouter ces services'}
              </Button>
              <Button variant="outline" onClick={() => handleStep2(true)} className="h-11">Passer</Button>
            </div>
          </Card>
        )}

        {/* Step 3: Premier client */}
        {step === 3 && (
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Votre premier client</h2>
            <p className="text-sm text-gray-500 mb-6">Ajoutez un client pour commencer à créer des commandes</p>
            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <Label>Nom du client</Label>
                <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Mohammed Alami" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="06 12 34 56 78" className="h-11" />
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => handleStep3()} className="flex-1 h-11" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ajouter et terminer'}
              </Button>
              <Button variant="outline" onClick={() => handleStep3(true)} className="h-11">Terminer</Button>
            </div>
          </Card>
        )}

        <p className="text-center text-xs text-gray-400 mt-4">Étape {step} sur 3 — Vous pourrez tout modifier dans les paramètres</p>
      </div>
    </div>
  )
}

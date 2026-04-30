'use client'

import { useState, useEffect } from 'react'
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
  const [initializing, setInitializing] = useState(true)
  const [pressingId, setPressingId] = useState<string | null>(null)
  const [needsSetup, setNeedsSetup] = useState(false) // true = pas encore de pressing

  // Step 1 fields
  const [pressingName, setPressingName] = useState('')
  const [phone, setPhone] = useState('')
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

  // Initialisation : vérifie si le pressing existe déjà
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: userData } = await supabase
        .from('users')
        .select('pressing_id')
        .eq('id', user.id)
        .single()

      if (userData?.pressing_id) {
        // Pressing existant : charger les données pour pré-remplir
        setPressingId(userData.pressing_id)
        setNeedsSetup(false)
        const { data: pressing } = await supabase
          .from('pressings')
          .select('name, phone, address, ice, tax_rate')
          .eq('id', userData.pressing_id)
          .single()
        if (pressing) {
          setPressingName(pressing.name || '')
          setPhone(pressing.phone || '')
          setAddress(pressing.address || '')
          setIce(pressing.ice || '')
          setTaxRate(String(pressing.tax_rate ?? '0'))
        }
      } else {
        // Pas de pressing : on va le créer à l'étape 1
        setNeedsSetup(true)
        // Pré-remplir depuis les metadata Google si disponible
        if (user.user_metadata?.full_name) {
          setPressingName(user.user_metadata.full_name as string)
        }
      }
      setInitializing(false)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Session expirée, veuillez vous reconnecter')
      router.push('/login')
      setLoading(false)
      return
    }

    try {
      if (needsSetup) {
        // Créer le pressing
        const { data: pressing, error: pressingError } = await supabase
          .from('pressings')
          .insert({ name: pressingName, phone, email: user.email || '', address: address || null, ice: ice || null, tax_rate: parseFloat(taxRate) || 0 })
          .select()
          .single()
        if (pressingError) throw pressingError

        // Upsert le profil utilisateur (au cas où il existe déjà sans pressing_id)
        const { error: userError } = await supabase.from('users').upsert({
          id: user.id,
          pressing_id: pressing.id,
          role: 'admin',
          full_name: (user.user_metadata?.full_name as string) || pressingName,
          phone,
        }, { onConflict: 'id' })
        if (userError) throw userError

        // Créer les settings
        await supabase.from('settings').insert({ pressing_id: pressing.id })

        setPressingId(pressing.id)
        setNeedsSetup(false)
      } else {
        // Mettre à jour le pressing existant
        const { error } = await supabase
          .from('pressings')
          .update({ address: address || null, ice: ice || null, tax_rate: parseFloat(taxRate) || 0 })
          .eq('id', pressingId!)
        if (error) throw error
      }

      setStep(2)
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Erreur lors de la configuration'
      toast.error(msg)
      console.error('[onboarding step1]', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStep2 = async (skip = false) => {
    if (skip) { setStep(3); return }
    setLoading(true)
    try {
      const pid = pressingId
      if (!pid) throw new Error('Pressing non trouvé')
      const services = selectedServices.map(i => ({ ...DEFAULT_SERVICES[i], pressing_id: pid }))
      const { error } = await supabase.from('services').insert(services)
      if (error) throw error
      toast.success(`${services.length} services ajoutés !`)
      setStep(3)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const handleStep3 = async (skip = false) => {
    if (skip) { router.push('/dashboard'); return }
    if (!clientName || !clientPhone) { toast.error('Nom et téléphone requis'); return }
    setLoading(true)
    try {
      const pid = pressingId
      if (!pid) throw new Error('Pressing non trouvé')
      const { error } = await supabase.from('clients').insert({
        pressing_id: pid, name: clientName, phone: clientPhone, client_type: 'individual',
      })
      if (error && !error.message.includes('unique')) throw error
      toast.success('Client ajouté !')
      router.push('/dashboard')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
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

        {/* Step 1 */}
        {step === 1 && (
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {needsSetup ? 'Créer votre pressing' : 'Configuration du pressing'}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {needsSetup ? 'Renseignez les informations de base' : 'Complétez les informations de votre pressing'}
            </p>
            <form onSubmit={handleStep1} className="space-y-4">
              {needsSetup && (
                <>
                  <div className="space-y-2">
                    <Label>Nom du pressing *</Label>
                    <Input value={pressingName} onChange={e => setPressingName(e.target.value)}
                      placeholder="Pressing Al Amal" required className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Téléphone *</Label>
                    <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      placeholder="06 12 34 56 78" required className="h-11" />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label>Adresse</Label>
                <Input value={address} onChange={e => setAddress(e.target.value)}
                  placeholder="Rue, ville, code postal" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>ICE (Identifiant fiscal)</Label>
                <Input value={ice} onChange={e => setIce(e.target.value)}
                  placeholder="000000000000000" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Taux TVA (%)</Label>
                <Input type="number" min="0" max="100" value={taxRate}
                  onChange={e => setTaxRate(e.target.value)} className="h-11" placeholder="0" />
                <p className="text-xs text-gray-400">Entrez 0 si vous n&apos;appliquez pas de TVA</p>
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continuer <ChevronRight size={16} className="ml-1" /></>}
              </Button>
            </form>
          </Card>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Services proposés</h2>
            <p className="text-sm text-gray-500 mb-6">Sélectionnez les services à ajouter (modifiable ensuite)</p>
            <div className="space-y-2 mb-6">
              {DEFAULT_SERVICES.map((service, i) => (
                <label key={i} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 cursor-pointer transition-colors">
                  <input type="checkbox" checked={selectedServices.includes(i)}
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
                  <p className="text-xs text-gray-400">{service.price_individual} DH</p>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <Button onClick={() => handleStep2()} className="flex-1 h-11"
                disabled={loading || selectedServices.length === 0}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ajouter ces services'}
              </Button>
              <Button variant="outline" onClick={() => handleStep2(true)} className="h-11">Passer</Button>
            </div>
          </Card>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Votre premier client</h2>
            <p className="text-sm text-gray-500 mb-6">Ajoutez un client pour commencer à créer des commandes</p>
            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <Label>Nom du client</Label>
                <Input value={clientName} onChange={e => setClientName(e.target.value)}
                  placeholder="Mohammed Alami" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                  placeholder="06 12 34 56 78" className="h-11" />
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

        <p className="text-center text-xs text-gray-400 mt-4">
          Étape {step} sur 3 — Vous pourrez tout modifier dans les paramètres
        </p>
      </div>
    </div>
  )
}

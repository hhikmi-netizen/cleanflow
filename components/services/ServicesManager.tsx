'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Package, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'
import { Service } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { useRouter } from 'next/navigation'

const DEFAULT_SERVICES = [
  { name: 'Chemise', category: 'Vêtements', price_individual: 15, price_business: 12 },
  { name: 'Pantalon', category: 'Vêtements', price_individual: 20, price_business: 16 },
  { name: 'Costume (veste + pantalon)', category: 'Vêtements', price_individual: 45, price_business: 38 },
  { name: 'Robe', category: 'Vêtements', price_individual: 35, price_business: 28 },
  { name: 'Manteau / Djellaba', category: 'Vêtements', price_individual: 50, price_business: 40 },
  { name: 'Couverture', category: 'Linge de maison', price_individual: 60, price_business: 50 },
  { name: 'Rideau (le mètre)', category: 'Linge de maison', price_individual: 12, price_business: 10 },
]

const CATEGORIES = ['Vêtements', 'Linge de maison', 'Cuir & Daim', 'Autre']

interface ServicesManagerProps {
  services: Service[]
  pressingId: string
  isAdmin: boolean
}

export default function ServicesManager({ services: initialServices, pressingId, isAdmin }: ServicesManagerProps) {
  const [services, setServices] = useState<Service[]>(initialServices)
  const [showForm, setShowForm] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'Vêtements', price_individual: '', price_business: '', unit: 'pièce' })
  const router = useRouter()
  const supabase = createClient()

  const openCreate = () => {
    setEditingService(null)
    setForm({ name: '', category: 'Vêtements', price_individual: '', price_business: '', unit: 'pièce' })
    setShowForm(true)
  }

  const openEdit = (service: Service) => {
    setEditingService(service)
    setForm({
      name: service.name,
      category: service.category,
      price_individual: String(service.price_individual),
      price_business: String(service.price_business),
      unit: service.unit,
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const payload = {
      pressing_id: pressingId,
      name: form.name,
      category: form.category,
      price_individual: parseFloat(form.price_individual),
      price_business: parseFloat(form.price_business),
      unit: form.unit,
    }

    try {
      if (editingService) {
        const { data, error } = await supabase.from('services').update(payload).eq('id', editingService.id).select().single()
        if (error) throw error
        setServices(services.map(s => s.id === editingService.id ? data : s))
        toast.success('Service mis à jour')
      } else {
        const { data, error } = await supabase.from('services').insert(payload).select().single()
        if (error) throw error
        setServices([...services, data])
        toast.success('Service créé !')
      }
      setShowForm(false)
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (service: Service) => {
    const { data, error } = await supabase
      .from('services')
      .update({ active: !service.active })
      .eq('id', service.id)
      .select()
      .single()
    if (!error) {
      setServices(services.map(s => s.id === service.id ? data : s))
      toast.success(data.active ? 'Service activé' : 'Service désactivé')
    }
  }

  const deleteService = async (id: string) => {
    if (!confirm('Supprimer ce service ?')) return
    const { error } = await supabase.from('services').delete().eq('id', id)
    if (!error) {
      setServices(services.filter(s => s.id !== id))
      toast.success('Service supprimé')
    }
  }

  const addDefaultServices = async () => {
    setLoading(true)
    try {
      const payload = DEFAULT_SERVICES.map(s => ({ ...s, pressing_id: pressingId, unit: 'pièce', active: true }))
      const { data, error } = await supabase.from('services').insert(payload).select()
      if (error) throw error
      setServices([...services, ...(data || [])])
      toast.success(`${data?.length} services ajoutés !`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const grouped = services.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = []
    acc[s.category].push(s)
    return acc
  }, {} as Record<string, Service[]>)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        {isAdmin && (
          <>
            <Button onClick={openCreate}>
              <Plus size={16} className="mr-2" /> Nouveau service
            </Button>
            {services.length === 0 && (
              <Button variant="outline" onClick={addDefaultServices} disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                Importer les services par défaut
              </Button>
            )}
          </>
        )}
      </div>

      {showForm && (
        <Card className="p-5 border-blue-200 bg-blue-50/30">
          <h3 className="font-semibold text-gray-900 mb-4">{editingService ? 'Modifier le service' : 'Nouveau service'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom du service *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Ex: Chemise, Pantalon..." className="h-10" />
              </div>
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Prix particulier (DH) *</Label>
                <Input type="number" min="0" step="0.5" value={form.price_individual} onChange={e => setForm({ ...form, price_individual: e.target.value })} required placeholder="15.00" className="h-10" />
              </div>
              <div className="space-y-2">
                <Label>Prix professionnel (DH) *</Label>
                <Input type="number" min="0" step="0.5" value={form.price_business} onChange={e => setForm({ ...form, price_business: e.target.value })} required placeholder="12.00" className="h-10" />
              </div>
              <div className="space-y-2">
                <Label>Unité</Label>
                <Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="pièce, mètre..." className="h-10" />
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                {editingService ? 'Mettre à jour' : 'Créer'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            </div>
          </form>
        </Card>
      )}

      {services.length === 0 ? (
        <div className="text-center py-16">
          <Package size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucun service configuré</p>
          <p className="text-sm text-gray-400 mt-1">Ajoutez des services ou importez les services par défaut</p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, catServices]) => (
          <div key={category}>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">{category}</h3>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {catServices.map(service => (
                <div key={service.id} className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 ${!service.active ? 'opacity-50' : ''}`}>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{service.name}</p>
                    <p className="text-xs text-gray-400">{service.unit}</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-gray-400">Particulier</p>
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(service.price_individual)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Pro</p>
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(service.price_business)}</p>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 ml-2">
                      <button onClick={() => toggleActive(service)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors">
                        {service.active ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} />}
                      </button>
                      <button onClick={() => openEdit(service)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => deleteService(service.id)} className="p-1.5 rounded hover:bg-red-50 text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

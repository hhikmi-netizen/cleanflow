'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, MessageCircle } from 'lucide-react'
import { Pressing, Settings } from '@/lib/types'
import { useRouter } from 'next/navigation'

interface SettingsFormProps {
  pressing: Pressing | null
  settings: Settings | null
  isAdmin: boolean
}

export default function SettingsForm({ pressing, settings, isAdmin }: SettingsFormProps) {
  const [pressingData, setPressingData] = useState({
    name: pressing?.name || '',
    phone: pressing?.phone || '',
    email: pressing?.email || '',
    address: pressing?.address || '',
    ice: pressing?.ice || '',
    tax_rate: pressing?.tax_rate || 0,
    currency: pressing?.currency || 'DH',
  })
  const [settingsData, setSettingsData] = useState({
    whatsapp_enabled: settings?.whatsapp_enabled || false,
    whatsapp_phone: settings?.whatsapp_phone || '',
    auto_notify_ready: settings?.auto_notify_ready || true,
    invoice_footer: settings?.invoice_footer || 'Merci de votre confiance !',
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAdmin) return
    setLoading(true)

    try {
      const { error: pressingError } = await supabase
        .from('pressings')
        .update(pressingData)
        .eq('id', pressing!.id)
      if (pressingError) throw pressingError

      if (settings) {
        const { error: settingsError } = await supabase
          .from('settings')
          .update(settingsData)
          .eq('pressing_id', pressing!.id)
        if (settingsError) throw settingsError
      }

      toast.success('Paramètres sauvegardés !')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setLoading(false)
    }
  }

  if (!isAdmin) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-500">Seuls les administrateurs peuvent modifier les paramètres.</p>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Infos pressing */}
      <Card className="p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Informations du pressing</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nom du pressing *</Label>
            <Input value={pressingData.name} onChange={e => setPressingData({ ...pressingData, name: e.target.value })} required className="h-10" />
          </div>
          <div className="space-y-2">
            <Label>Téléphone *</Label>
            <Input type="tel" value={pressingData.phone} onChange={e => setPressingData({ ...pressingData, phone: e.target.value })} required className="h-10" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={pressingData.email} onChange={e => setPressingData({ ...pressingData, email: e.target.value })} className="h-10" />
          </div>
          <div className="space-y-2">
            <Label>ICE</Label>
            <Input value={pressingData.ice} onChange={e => setPressingData({ ...pressingData, ice: e.target.value })} placeholder="000000000000000" className="h-10" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Adresse</Label>
            <Input value={pressingData.address} onChange={e => setPressingData({ ...pressingData, address: e.target.value })} placeholder="Adresse complète" className="h-10" />
          </div>
          <div className="space-y-2">
            <Label>TVA (%)</Label>
            <Input
              type="number" min="0" max="100" step="0.01"
              value={pressingData.tax_rate}
              onChange={e => setPressingData({ ...pressingData, tax_rate: parseFloat(e.target.value) || 0 })}
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label>Devise</Label>
            <Input value={pressingData.currency} onChange={e => setPressingData({ ...pressingData, currency: e.target.value })} className="h-10" placeholder="DH" />
          </div>
        </div>
      </Card>

      {/* Notifications */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle size={18} className="text-green-600" />
          <h3 className="font-semibold text-gray-900">Notifications WhatsApp</h3>
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full ml-1">Bientôt disponible</span>
        </div>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settingsData.whatsapp_enabled}
              onChange={e => setSettingsData({ ...settingsData, whatsapp_enabled: e.target.checked })}
              className="w-4 h-4 rounded text-green-600"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Activer les notifications WhatsApp</p>
              <p className="text-xs text-gray-400">Notifier automatiquement les clients quand leur commande est prête</p>
            </div>
          </label>
          {settingsData.whatsapp_enabled && (
            <div className="space-y-2">
              <Label>Numéro WhatsApp Business</Label>
              <Input
                type="tel"
                value={settingsData.whatsapp_phone}
                onChange={e => setSettingsData({ ...settingsData, whatsapp_phone: e.target.value })}
                placeholder="+212 6XX XXX XXX"
                className="h-10"
              />
            </div>
          )}
          <div className="p-3 bg-green-50 rounded-lg text-sm text-green-700">
            <p className="font-medium mb-1">Comment ça marche :</p>
            <p>Un bouton WhatsApp est disponible sur chaque fiche commande pour envoyer un message rapide au client. L&apos;intégration automatique (Twilio) sera disponible prochainement.</p>
          </div>
        </div>
      </Card>

      {/* Factures */}
      <Card className="p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Personnalisation des tickets</h3>
        <div className="space-y-2">
          <Label>Pied de page des tickets</Label>
          <Textarea
            value={settingsData.invoice_footer}
            onChange={e => setSettingsData({ ...settingsData, invoice_footer: e.target.value })}
            placeholder="Merci de votre confiance !"
            rows={2}
          />
          <p className="text-xs text-gray-400">Ce texte apparaît en bas de chaque bon de commande imprimé</p>
        </div>
      </Card>

      <Button type="submit" className="w-full h-11" disabled={loading}>
        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sauvegarde...</> : 'Sauvegarder les paramètres'}
      </Button>
    </form>
  )
}

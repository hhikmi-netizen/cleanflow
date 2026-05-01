'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, MessageCircle, Star, FlaskConical } from 'lucide-react'
import { Pressing, Settings } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { seedDemoData } from '@/app/actions/seed-demo'

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
    auto_notify_ready: settings?.auto_notify_ready ?? true,
    wa_notif_created: settings?.wa_notif_created ?? false,
    wa_notif_delivery: settings?.wa_notif_delivery ?? true,
    wa_notif_delivered: settings?.wa_notif_delivered ?? true,
    invoice_footer: settings?.invoice_footer || 'Merci de votre confiance !',
    loyalty_enabled: settings?.loyalty_enabled ?? true,
    points_per_dh: settings?.points_per_dh ?? 1,
    points_value_dh: settings?.points_value_dh ?? 0.10,
    points_redemption_min: settings?.points_redemption_min ?? 50,
  })
  const [loading, setLoading] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [showSeedConfirm, setShowSeedConfirm] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSeedDemo = async (force = false) => {
    setSeeding(true)
    try {
      const result = await seedDemoData(force)
      if (!result.ok && result.message.includes('existent déjà')) {
        setShowSeedConfirm(true)
        return
      }
      if (!result.ok) {
        toast.error(result.message)
      } else {
        toast.success(result.message)
        setShowSeedConfirm(false)
        router.refresh()
      }
    } finally {
      setSeeding(false)
    }
  }

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
              <p className="text-xs text-gray-400">Affiche des boutons de notification sur les fiches commande et le board livraisons</p>
            </div>
          </label>

          {/* Numéro WA Business — toujours visible, utilisé dans toute l'app */}
          <div className="space-y-2">
            <Label>Numéro WhatsApp Business du pressing</Label>
            <Input
              type="tel"
              value={settingsData.whatsapp_phone}
              onChange={e => setSettingsData({ ...settingsData, whatsapp_phone: e.target.value })}
              placeholder="+212 6XX XXX XXX"
              className="h-10"
            />
            <p className="text-xs text-gray-400">
              Utilisé pour les boutons &ldquo;Contacter le pressing&rdquo; sur la page de suivi client.
              Peut différer du téléphone général (ex : numéro WhatsApp Business dédié).
            </p>
          </div>

          {settingsData.whatsapp_enabled && (
            <div className="space-y-4 pl-0">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Événements à notifier</p>
                <div className="space-y-2.5">
                  {([
                    { key: 'wa_notif_created',   label: 'Commande enregistrée',    emoji: '📋', desc: 'Dès qu\'une commande est créée' },
                    { key: 'auto_notify_ready',  label: 'Commande prête',           emoji: '✅', desc: 'Quand le statut passe à "Prêt"' },
                    { key: 'wa_notif_delivery',  label: 'Livraison en route',        emoji: '🚚', desc: 'Quand le livreur part (statut En route)' },
                    { key: 'wa_notif_delivered', label: 'Livraison effectuée',       emoji: '📦', desc: 'Quand la commande est livrée' },
                  ] as { key: keyof typeof settingsData; label: string; emoji: string; desc: string }[]).map(({ key, label, emoji, desc }) => (
                    <label key={key} className="flex items-start gap-3 cursor-pointer p-2.5 rounded-lg hover:bg-gray-50 border border-gray-100">
                      <input
                        type="checkbox"
                        checked={!!settingsData[key]}
                        onChange={e => setSettingsData({ ...settingsData, [key]: e.target.checked })}
                        className="w-4 h-4 rounded text-green-600 mt-0.5"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{emoji} {label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-green-50 rounded-lg text-xs text-green-700 space-y-1">
                <p className="font-medium">Mode manuel (lien WhatsApp)</p>
                <p>Un bouton &quot;Notifier via WhatsApp&quot; apparaît aux bons moments. Un clic ouvre WhatsApp avec le message pré-rédigé — vous n&apos;avez qu&apos;à envoyer.</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Fidélité */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Star size={18} className="text-yellow-500" />
          <h3 className="font-semibold text-gray-900">Programme fidélité</h3>
        </div>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settingsData.loyalty_enabled}
              onChange={e => setSettingsData({ ...settingsData, loyalty_enabled: e.target.checked })}
              className="w-4 h-4 rounded text-yellow-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Activer la carte fidélité</p>
              <p className="text-xs text-gray-400">Les clients accumulent des points à chaque commande livrée</p>
            </div>
          </label>
          {settingsData.loyalty_enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="space-y-2">
                <Label>Points par DH dépensé</Label>
                <Input
                  type="number" min="0.1" step="0.1"
                  value={settingsData.points_per_dh}
                  onChange={e => setSettingsData({ ...settingsData, points_per_dh: parseFloat(e.target.value) || 1 })}
                  className="h-10"
                />
                <p className="text-xs text-gray-400">Ex : 1 = 1 pt / DH</p>
              </div>
              <div className="space-y-2">
                <Label>Valeur d&apos;un point (DH)</Label>
                <Input
                  type="number" min="0.01" step="0.01"
                  value={settingsData.points_value_dh}
                  onChange={e => setSettingsData({ ...settingsData, points_value_dh: parseFloat(e.target.value) || 0.1 })}
                  className="h-10"
                />
                <p className="text-xs text-gray-400">Ex : 0.10 = 100 pts → 10 DH</p>
              </div>
              <div className="space-y-2">
                <Label>Minimum pour utiliser</Label>
                <Input
                  type="number" min="1" step="1"
                  value={settingsData.points_redemption_min}
                  onChange={e => setSettingsData({ ...settingsData, points_redemption_min: parseInt(e.target.value) || 50 })}
                  className="h-10"
                />
                <p className="text-xs text-gray-400">Points requis pour échanger</p>
              </div>
            </div>
          )}
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

      {/* Données démo */}
      <Card className="p-5 border-dashed border-amber-200 bg-amber-50">
        <div className="flex items-start gap-3">
          <FlaskConical size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-amber-900 text-sm">Données de démonstration</h3>
            <p className="text-xs text-amber-700 mt-1">
              Charge 8 clients, 17 services et 12 commandes marocaines réalistes pour une démo pressing en 10 minutes.
            </p>
            {showSeedConfirm ? (
              <div className="mt-3 p-3 bg-white rounded-lg border border-amber-200 space-y-2">
                <p className="text-xs font-medium text-red-700">Des données existent déjà. Écraser ?</p>
                <p className="text-xs text-gray-500">Tous les clients, commandes et services actuels seront supprimés.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSeedDemo(true)}
                    disabled={seeding}
                    className="flex-1 h-9 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {seeding ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Oui, écraser'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSeedConfirm(false)}
                    className="flex-1 h-9 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleSeedDemo(false)}
                disabled={seeding}
                className="mt-3 h-9 px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {seeding ? <><Loader2 size={14} className="animate-spin" /> Chargement...</> : 'Charger les données démo'}
              </button>
            )}
          </div>
        </div>
      </Card>
    </form>
  )
}

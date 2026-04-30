export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Card } from '@/components/ui/card'
import IncidentDetail from '@/components/incidents/IncidentDetail'
import {
  formatDateTime,
  getIncidentTypeLabel,
  getIncidentStatusLabel,
  getIncidentStatusColor,
  getResolutionLabel,
} from '@/lib/utils'

export default async function IncidentDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('pressing_id, role').eq('id', user.id).single()
  if (!userData?.pressing_id) redirect('/onboarding')

  const { data: incident } = await supabase
    .from('incidents')
    .select('*, orders(id, order_number), clients(id, name, phone)')
    .eq('id', params.id)
    .eq('pressing_id', userData.pressing_id)
    .single()

  if (!incident) notFound()

  const { data: history } = await supabase
    .from('incident_history')
    .select('*')
    .eq('incident_id', params.id)
    .order('created_at', { ascending: true })

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/incidents" className="text-gray-400 hover:text-gray-600">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Incident #{params.id.slice(0, 8).toUpperCase()}</h1>
            <p className="text-xs text-gray-400">{formatDateTime(incident.created_at)}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getIncidentStatusColor(incident.status)}`}>
          {getIncidentStatusLabel(incident.status)}
        </span>
      </div>

      {/* Résumé */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Type</p>
            <p className="font-medium text-gray-900">{getIncidentTypeLabel(incident.type)}</p>
          </div>
          {incident.orders && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Commande</p>
              <Link href={`/orders/${incident.orders.id}`} className="font-medium text-blue-600 hover:underline font-mono text-sm">
                {incident.orders.order_number}
              </Link>
            </div>
          )}
          {incident.clients && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Client</p>
              <Link href={`/clients/${incident.clients.id}`} className="font-medium text-blue-600 hover:underline">
                {incident.clients.name}
              </Link>
            </div>
          )}
          {incident.resolution_action && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Résolution</p>
              <p className="font-medium text-green-700">{getResolutionLabel(incident.resolution_action)}</p>
            </div>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Description</p>
          <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded">{incident.description}</p>
        </div>
        {incident.resolution_notes && (
          <div>
            <p className="text-xs text-gray-400 mb-1">Notes de résolution</p>
            <p className="text-sm text-gray-700 bg-green-50 px-3 py-2 rounded">{incident.resolution_notes}</p>
          </div>
        )}
      </Card>

      {/* Actions + Journal */}
      <IncidentDetail
        incidentId={params.id}
        currentStatus={incident.status}
        history={history || []}
      />
    </div>
  )
}

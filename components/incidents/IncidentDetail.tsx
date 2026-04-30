'use client'

import { useState, useTransition } from 'react'
import { updateIncidentStatus, resolveIncident, addIncidentNote } from '@/app/actions/incidents'
import { IncidentHistory, IncidentStatus, ResolutionAction } from '@/lib/types'
import { formatDateTime, getIncidentStatusLabel } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, MessageSquare, CheckCircle, XCircle, Clock } from 'lucide-react'

const RESOLUTION_ACTIONS: { value: ResolutionAction; label: string }[] = [
  { value: 'partial_refund', label: 'Remboursement partiel' },
  { value: 'full_refund',    label: 'Remboursement total' },
  { value: 'gesture',        label: 'Geste commercial' },
  { value: 'redo_service',   label: 'Nouvelle prestation' },
  { value: 'none',           label: 'Aucune action' },
]

const STATUS_TRANSITIONS: { from: IncidentStatus[]; to: IncidentStatus; label: string; color: string }[] = [
  { from: ['open'],                       to: 'in_progress',    label: 'Prendre en charge', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
  { from: ['in_progress'],               to: 'waiting_client', label: 'En attente client',  color: 'bg-yellow-500 hover:bg-yellow-600 text-white' },
  { from: ['waiting_client'],            to: 'in_progress',    label: 'Reprendre',           color: 'bg-blue-600 hover:bg-blue-700 text-white' },
  { from: ['open', 'in_progress', 'waiting_client'], to: 'rejected', label: 'Refuser',   color: 'bg-gray-600 hover:bg-gray-700 text-white' },
]

interface IncidentDetailProps {
  incidentId: string
  currentStatus: IncidentStatus
  history: IncidentHistory[]
}

export default function IncidentDetail({ incidentId, currentStatus, history }: IncidentDetailProps) {
  const [showResolve, setShowResolve] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [resolutionAction, setResolutionAction] = useState<ResolutionAction>('none')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [noteText, setNoteText] = useState('')
  const [isPending, startTransition] = useTransition()

  const canAct = currentStatus !== 'resolved' && currentStatus !== 'rejected'
  const transitions = STATUS_TRANSITIONS.filter(t => t.from.includes(currentStatus))

  const handleStatusChange = (newStatus: IncidentStatus) => {
    startTransition(async () => {
      try {
        await updateIncidentStatus(incidentId, newStatus, statusNote || undefined)
        toast.success(`Statut → ${getIncidentStatusLabel(newStatus)}`)
        setStatusNote('')
      } catch (err: unknown) { toast.error((err as Error)?.message || 'Erreur') }
    })
  }

  const handleResolve = () => {
    startTransition(async () => {
      try {
        await resolveIncident(incidentId, { resolution_action: resolutionAction, resolution_notes: resolutionNotes })
        toast.success('Incident résolu')
        setShowResolve(false)
      } catch (err: unknown) { toast.error((err as Error)?.message || 'Erreur') }
    })
  }

  const handleAddNote = () => {
    if (!noteText.trim()) return
    startTransition(async () => {
      try {
        await addIncidentNote(incidentId, noteText.trim())
        toast.success('Note ajoutée')
        setNoteText('')
        setShowNote(false)
      } catch (err: unknown) { toast.error((err as Error)?.message || 'Erreur') }
    })
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      {canAct && (
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Actions</h3>

          <div className="flex flex-wrap gap-2">
            {transitions.map(t => (
              <Button
                key={t.to}
                size="sm"
                onClick={() => handleStatusChange(t.to)}
                disabled={isPending}
                className={`h-9 ${t.color}`}
              >
                {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : t.label}
              </Button>
            ))}

            {canAct && (
              <Button
                size="sm"
                onClick={() => setShowResolve(true)}
                disabled={isPending}
                className="h-9 bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle size={14} className="mr-1" />
                Résoudre
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowNote(!showNote)}
              className="h-9"
            >
              <MessageSquare size={14} className="mr-1" />
              Note
            </Button>
          </div>

          {/* Note rapide sur changement de statut */}
          {transitions.length > 0 && (
            <input
              type="text"
              value={statusNote}
              onChange={e => setStatusNote(e.target.value)}
              placeholder="Note optionnelle sur le changement de statut…"
              className="w-full text-sm px-3 py-2 rounded-md border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          )}

          {/* Formulaire résolution */}
          {showResolve && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-3">
              <p className="text-sm font-semibold text-green-800">Résoudre l&apos;incident</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {RESOLUTION_ACTIONS.map(a => (
                  <label key={a.value} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-sm transition-colors ${
                    resolutionAction === a.value
                      ? 'border-green-500 bg-green-50 text-green-800 font-medium'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}>
                    <input type="radio" name="resolution" value={a.value}
                      checked={resolutionAction === a.value}
                      onChange={() => setResolutionAction(a.value)}
                      className="sr-only"
                    />
                    {a.label}
                  </label>
                ))}
              </div>
              <Textarea
                value={resolutionNotes}
                onChange={e => setResolutionNotes(e.target.value)}
                placeholder="Détails de la résolution…"
                rows={2}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleResolve} disabled={isPending} className="bg-green-600 hover:bg-green-700 text-white h-8 flex-1">
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirmer la résolution'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowResolve(false)} className="h-8">Annuler</Button>
              </div>
            </div>
          )}

          {/* Formulaire note */}
          {showNote && (
            <div className="space-y-2">
              <Textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Ajouter une note interne…"
                rows={2}
                className="text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddNote} disabled={isPending || !noteText.trim()} className="h-8 flex-1">
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Ajouter'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowNote(false)} className="h-8">Annuler</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Journal */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Journal</h3>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Aucune entrée</p>
        ) : (
          <div className="space-y-3">
            {history.map((entry, i) => (
              <div key={entry.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    i === history.length - 1 ? 'bg-blue-500' : 'bg-gray-300'
                  }`} />
                  {i < history.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                </div>
                <div className="flex-1 pb-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-gray-800">{entry.action}</p>
                    <span className="text-xs text-gray-400 shrink-0">{formatDateTime(entry.created_at)}</span>
                  </div>
                  {entry.note && (
                    <p className="text-xs text-gray-500 mt-0.5 bg-gray-50 px-2 py-1 rounded">{entry.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

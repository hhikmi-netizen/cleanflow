import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'DH'): string {
  return `${Number(amount).toFixed(2)} ${currency}`
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd/MM/yyyy', { locale: fr })
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'dd/MM/yyyy à HH:mm', { locale: fr })
}

export function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'En attente',
    in_progress: 'En traitement',
    ready: 'Prêt à récupérer',
    delivered: 'Livré',
    cancelled: 'Annulé',
  }
  return labels[status] || status
}

export function getOrderStatusColor(status: string): string {
  return getStatusColor(status)
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'En attente',
    in_progress: 'En cours',
    ready: 'Prêt',
    delivered: 'Livré',
    cancelled: 'Annulé',
  }
  return labels[status] || status
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    ready: 'bg-green-100 text-green-800',
    delivered: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export function getPaymentLabel(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Espèces',
    card: 'Carte',
    transfer: 'Virement',
  }
  return labels[method] || method
}

export function buildGoogleMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const cleaned = phone.replace(/\D/g, '')
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`
}

export function getIncidentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    damage:     'Détérioration',
    loss:       'Perte d\'article',
    delay:      'Retard',
    quality:    'Qualité insuffisante',
    wrong_item: 'Erreur d\'article',
    other:      'Autre',
  }
  return labels[type] || type
}

export function getIncidentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    open:           'Ouvert',
    in_progress:    'En cours',
    waiting_client: 'En attente client',
    resolved:       'Résolu',
    rejected:       'Refusé',
  }
  return labels[status] || status
}

export function getIncidentStatusColor(status: string): string {
  const colors: Record<string, string> = {
    open:           'bg-red-100 text-red-800',
    in_progress:    'bg-blue-100 text-blue-800',
    waiting_client: 'bg-yellow-100 text-yellow-800',
    resolved:       'bg-green-100 text-green-800',
    rejected:       'bg-gray-100 text-gray-600',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export function getResolutionLabel(action: string): string {
  const labels: Record<string, string> = {
    partial_refund: 'Remboursement partiel',
    full_refund:    'Remboursement total',
    gesture:        'Geste commercial',
    redo_service:   'Nouvelle prestation',
    none:           'Aucune action',
  }
  return labels[action] || action
}

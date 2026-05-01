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
  let cleaned = phone.replace(/\D/g, '')
  // Normalize Moroccan local format (0XXXXXXXXX → 212XXXXXXXXX)
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '212' + cleaned.slice(1)
  }
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

// ── Item status ───────────────────────────────────────────────────────────

export function getItemStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    received:    'Reçu',
    in_cleaning: 'En nettoyage',
    done:        'Traité',
    ready:       'Prêt',
    issue:       'Problème',
  }
  return labels[status] || status
}

export function getItemStatusColor(status: string): string {
  const colors: Record<string, string> = {
    received:    'bg-gray-100 text-gray-700',
    in_cleaning: 'bg-blue-100 text-blue-700',
    done:        'bg-indigo-100 text-indigo-700',
    ready:       'bg-green-100 text-green-800',
    issue:       'bg-red-100 text-red-700',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

// ── WhatsApp notification templates ──────────────────────────────────────

interface WaTemplateParams {
  clientName: string
  orderNumber: string
  pressingName: string
  pressingPhone?: string      // numéro WA Business du pressing (affiché dans les messages)
  pressingAddress?: string    // adresse du pressing (pour les messages de retrait)
  total?: number
  remaining?: number
  trackingUrl?: string
  pickupDate?: string
}

export function getWhatsAppTemplates(params: WaTemplateParams) {
  const {
    clientName, orderNumber, pressingName, pressingPhone, pressingAddress,
    total, remaining, trackingUrl, pickupDate,
  } = params

  const trackLine = trackingUrl ? `\n🔗 Suivi : ${trackingUrl}` : ''
  const remainLine = remaining && remaining > 0 ? `\n💳 Reste à payer : *${remaining.toFixed(2)} DH*` : ''
  const pickupLine = pickupDate ? `\n📅 Retrait prévu : ${pickupDate}` : ''

  // Bloc "Retrouvez-nous" inclus dans les messages de retrait
  const locationBlock = [
    pressingAddress ? `📍 ${pressingAddress}` : '',
    pressingPhone   ? `📞 ${pressingPhone}` : '',
  ].filter(Boolean).join('\n')
  const locationLine = locationBlock ? `\n\n${locationBlock}` : ''

  return [
    {
      id: 'created',
      label: 'Commande créée',
      emoji: '📋',
      message:
        `Bonjour ${clientName} 👋\n\n` +
        `Votre commande *${orderNumber}* a bien été enregistrée chez *${pressingName}*.\n` +
        `${total ? `💰 Montant total : *${total.toFixed(2)} DH*` : ''}${remainLine}${pickupLine}${trackLine}\n\n` +
        `Merci de votre confiance ! 🙏`,
    },
    {
      id: 'in_progress',
      label: 'En traitement',
      emoji: '🔄',
      message:
        `Bonjour ${clientName},\n\n` +
        `Vos articles (commande *${orderNumber}*) sont en cours de traitement chez *${pressingName}*.\n` +
        `Nous vous prévenons dès qu'ils sont prêts.${trackLine}`,
    },
    {
      id: 'ready',
      label: 'Commande prête',
      emoji: '✅',
      message:
        `Bonjour ${clientName} 🎉\n\n` +
        `Votre commande *${orderNumber}* est *prête* !\n` +
        `Venez la récupérer chez *${pressingName}*.${remainLine}${pickupLine}${locationLine}${trackLine}\n\n` +
        `À bientôt ! 👋`,
    },
    {
      id: 'reminder',
      label: 'Rappel retrait',
      emoji: '⏰',
      message:
        `Bonjour ${clientName},\n\n` +
        `Rappel : votre commande *${orderNumber}* vous attend chez *${pressingName}*.${remainLine}${locationLine}\n\n` +
        `N'hésitez pas à nous contacter si vous avez besoin de reprogrammer.`,
    },
    {
      id: 'delivery',
      label: 'Livraison en route',
      emoji: '🚚',
      message:
        `Bonjour ${clientName},\n\n` +
        `Votre commande *${orderNumber}* est en route ! Notre livreur arrive bientôt chez vous.${remainLine}\n\n` +
        `Cordialement, *${pressingName}*`,
    },
    {
      id: 'delivered',
      label: 'Commande livrée',
      emoji: '📦',
      message:
        `Bonjour ${clientName},\n\n` +
        `Votre commande *${orderNumber}* a bien été livrée. Merci de votre confiance !\n\n` +
        `À très bientôt chez *${pressingName}* 🙏`,
    },
  ]
}

export function buildWhatsAppNotification(clientPhone: string, template: { message: string }) {
  return buildWhatsAppUrl(clientPhone, template.message)
}

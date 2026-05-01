import { buildWhatsAppUrl } from '@/lib/utils'

// ── Channel type ───────────────────────────────────────────────────────────
// Extend this union when WATI is integrated: 'wame' | 'wati'
export type WaChannel = 'wame'

export interface ReminderSendResult {
  channel: WaChannel
  // wa.me: URL to open in browser (user clicks manually)
  // wati: empty string (message sent via API)
  url: string
}

// ── wa.me channel (current) ────────────────────────────────────────────────
export function buildReminderUrl(phone: string, message: string): ReminderSendResult {
  return {
    channel: 'wame',
    url: buildWhatsAppUrl(phone, message),
  }
}

// ── WATI channel (future) ──────────────────────────────────────────────────
// Uncomment and configure when WATI credentials are available.
//
// export async function sendViaWATI(
//   phone: string,
//   templateName: string,
//   params: Record<string, string>,
// ): Promise<ReminderSendResult> {
//   const res = await fetch(
//     `https://live-server-${process.env.WATI_SERVER_ID}.wati.io/api/v1/sendTemplateMessage`,
//     {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         Authorization: `Bearer ${process.env.WATI_API_KEY}`,
//       },
//       body: JSON.stringify({
//         whatsappNumber: phone,
//         templateName,
//         broadcast_name: templateName,
//         parameters: Object.entries(params).map(([name, value]) => ({ name, value })),
//       }),
//     },
//   )
//   if (!res.ok) throw new Error(`WATI error: ${await res.text()}`)
//   return { channel: 'wati', url: '' }
// }

// ── Message builders ───────────────────────────────────────────────────────

export interface ReadyReminderParams {
  clientName: string
  orderNumber: string
  pressingName: string
  pressingAddress?: string
  pressingPhone?: string
  daysPending: number
}

export interface UnpaidReminderParams {
  clientName: string
  orderNumber: string
  pressingName: string
  pressingAddress?: string
  pressingPhone?: string
  remaining: number
}

export function buildReadyReminderMessage(p: ReadyReminderParams): string {
  const since = p.daysPending === 1 ? '1 jour' : `${p.daysPending} jours`
  const addressLine = p.pressingAddress ? `📍 ${p.pressingAddress}\n` : ''
  const phoneLine = p.pressingPhone ? `📞 ${p.pressingPhone}\n` : ''
  return (
    `Bonjour ${p.clientName} 👋\n\n` +
    `Votre commande *${p.orderNumber}* chez *${p.pressingName}* est prête ` +
    `et vous attend depuis ${since}.\n\n` +
    `${addressLine}${phoneLine}\n` +
    `Merci de votre confiance 🙏`
  )
}

export function buildUnpaidReminderMessage(p: UnpaidReminderParams): string {
  const addressLine = p.pressingAddress ? `📍 ${p.pressingAddress}\n` : ''
  const phoneLine = p.pressingPhone ? `📞 ${p.pressingPhone}\n` : ''
  return (
    `Bonjour ${p.clientName} 👋\n\n` +
    `Nous vous rappelons que votre commande *${p.orderNumber}* chez *${p.pressingName}* ` +
    `a un solde restant de *${p.remaining.toFixed(2)} DH*.\n\n` +
    `Pour effectuer votre règlement :\n` +
    `${addressLine}${phoneLine}\n` +
    `Merci de votre compréhension 🙏`
  )
}

'use client'

import QRCode from 'react-qr-code'
import { useState } from 'react'
import { QrCode, Printer, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'

interface OrderTicketProps {
  orderNumber: string
  trackingToken: string
  clientName?: string
  clientPhone?: string
  items: { service_name: string; quantity: number; unit_price: number; article_code?: string }[]
  total: number
  deposit: number
  pressingName: string
  pressingPhone?: string
  pressingAddress?: string
  createdAt: string
}

export default function OrderTicket({
  orderNumber, trackingToken, clientName, clientPhone,
  items, total, deposit, pressingName, pressingPhone, pressingAddress, createdAt,
}: OrderTicketProps) {
  const [showModal, setShowModal] = useState(false)
  const trackingUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/track/${trackingToken}`

  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowModal(true)}
        className="h-8 gap-1.5"
      >
        <QrCode size={14} />
        Ticket / QR
      </Button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 print:bg-transparent print:inset-auto print:p-0">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm print:shadow-none print:rounded-none" id="ticket-print">
            {/* Modal header - hidden on print */}
            <div className="flex items-center justify-between p-4 border-b print:hidden">
              <span className="font-semibold text-gray-900">Ticket de dépôt</span>
              <div className="flex gap-2">
                <Button size="sm" onClick={handlePrint} className="h-8 gap-1.5">
                  <Printer size={13} />
                  Imprimer
                </Button>
                <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Ticket content */}
            <div className="p-5 space-y-4">
              {/* Pressing header */}
              <div className="text-center border-b pb-3">
                <p className="font-bold text-lg text-gray-900">{pressingName}</p>
                {pressingPhone && <p className="text-xs text-gray-500">{pressingPhone}</p>}
                {pressingAddress && <p className="text-xs text-gray-500">{pressingAddress}</p>}
              </div>

              {/* Order info */}
              <div className="text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">N° Commande</p>
                <p className="text-2xl font-bold font-mono text-gray-900">{orderNumber}</p>
                <p className="text-xs text-gray-400 mt-1">{formatDate(createdAt)}</p>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center gap-2">
                <QRCode value={trackingUrl} size={128} />
                <p className="text-xs text-gray-400">Scanner pour suivre votre commande</p>
              </div>

              {/* Client */}
              {(clientName || clientPhone) && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  {clientName && <p className="font-medium text-gray-900">{clientName}</p>}
                  {clientPhone && <p className="text-gray-500">{clientPhone}</p>}
                </div>
              )}

              {/* Items */}
              <div className="border-t pt-3 space-y-1.5">
                {items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <div>
                      <span className="text-gray-800">{item.service_name}</span>
                      {item.quantity > 1 && <span className="text-gray-400 ml-1">×{item.quantity}</span>}
                      {item.article_code && (
                        <span className="ml-2 font-mono text-xs text-blue-600">[{item.article_code}]</span>
                      )}
                    </div>
                    <span className="text-gray-700">{formatCurrency(item.unit_price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t pt-3 space-y-1 text-sm">
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                {deposit > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Acompte versé</span>
                    <span>- {formatCurrency(deposit)}</span>
                  </div>
                )}
                {deposit > 0 && (
                  <div className="flex justify-between font-semibold text-orange-600">
                    <span>Reste à payer</span>
                    <span>{formatCurrency(total - deposit)}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="text-center text-xs text-gray-400 border-t pt-3">
                <p>Conservez ce ticket pour récupérer vos articles</p>
                <p className="font-mono text-gray-300 mt-1 break-all">{trackingToken}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          body > * { display: none !important; }
          #ticket-print { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>
    </>
  )
}

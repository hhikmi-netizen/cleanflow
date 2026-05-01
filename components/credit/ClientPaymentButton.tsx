'use client'

import { useState } from 'react'
import { Banknote } from 'lucide-react'
import PaymentModal from '@/components/credit/PaymentModal'

interface Props {
  clientId: string
  clientName: string
  orders: { id: string; total: number; due: number; daysOld: number; createdAt: string }[]
  totalDue: number
}

export default function ClientPaymentButton({ clientId, clientName, orders, totalDue }: Props) {
  const [open, setOpen] = useState(false)

  if (totalDue <= 0 || orders.length === 0) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-colors"
      >
        <Banknote size={15} />
        Encaisser {totalDue > 0 ? `(${Math.round(totalDue)} DH)` : ''}
      </button>
      {open && (
        <PaymentModal
          clientId={clientId}
          clientName={clientName}
          orders={orders}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

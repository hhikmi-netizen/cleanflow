'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Loader2, FileText, Receipt } from 'lucide-react'
import { OrderStatus } from '@/lib/types'
import Link from 'next/link'

interface OrderActionsProps {
  orderId: string
  currentStatus: OrderStatus
  paid: boolean
}

const statusFlow: Record<OrderStatus, { label: string; next: OrderStatus; color: string } | null> = {
  pending: { label: 'Démarrer le traitement', next: 'in_progress', color: 'bg-blue-600 hover:bg-blue-700' },
  in_progress: { label: 'Marquer comme Prêt', next: 'ready', color: 'bg-green-600 hover:bg-green-700' },
  ready: { label: 'Marquer comme Livré', next: 'delivered', color: 'bg-gray-700 hover:bg-gray-800' },
  delivered: null,
  cancelled: null,
}

export default function OrderActions({ orderId, currentStatus, paid }: OrderActionsProps) {
  const [loading, setLoading] = useState(false)
  const [paidLoading, setPaidLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const nextAction = statusFlow[currentStatus]

  const updateStatus = async (newStatus: OrderStatus) => {
    setLoading(true)
    const update: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'delivered') update.delivered_at = new Date().toISOString()

    const { error } = await supabase.from('orders').update(update).eq('id', orderId)

    if (error) {
      toast.error('Erreur lors de la mise à jour')
    } else {
      toast.success(`Statut mis à jour`)
      router.refresh()
    }
    setLoading(false)
  }

  const togglePaid = async () => {
    setPaidLoading(true)
    const { error } = await supabase.from('orders').update({ paid: !paid }).eq('id', orderId)
    if (error) {
      toast.error('Erreur lors de la mise à jour')
    } else {
      toast.success(paid ? 'Marqué comme non payé' : 'Marqué comme payé')
      router.refresh()
    }
    setPaidLoading(false)
  }

  const printReceipt = () => {
    window.print()
  }

  return (
    <div className="flex flex-wrap gap-3">
      {nextAction && (
        <Button
          onClick={() => updateStatus(nextAction.next)}
          disabled={loading}
          className={`flex-1 h-11 text-white ${nextAction.color}`}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : nextAction.label}
        </Button>
      )}

      <Button
        variant="outline"
        onClick={togglePaid}
        disabled={paidLoading}
        className={`h-11 ${paid ? 'border-green-500 text-green-600' : 'border-orange-400 text-orange-600'}`}
      >
        {paidLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : paid ? '✓ Payé' : 'Marquer payé'}
      </Button>

      <Link href={`/orders/${orderId}/invoice`}>
        <Button variant="outline" className="h-11">
          <Receipt size={16} className="mr-2" />
          Bon
        </Button>
      </Link>

      <Button variant="outline" onClick={printReceipt} className="h-11">
        <FileText size={16} className="mr-2" />
        Imprimer
      </Button>
    </div>
  )
}

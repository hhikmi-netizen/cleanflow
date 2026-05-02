'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ScanLine } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import QrScannerModal from './QrScannerModal'
import { toast } from 'sonner'

export default function ScannerButton() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const handleScan = useCallback(async (token: string) => {
    try {
      const supabase = createClient()
      const { data: order, error } = await supabase
        .from('orders')
        .select('id, order_number')
        .eq('tracking_token', token)
        .single()

      if (error || !order) {
        toast.error('Commande introuvable pour ce QR code')
        setOpen(false)
        return
      }

      toast.success(`Commande ${order.order_number} ouverte`)
      setOpen(false)
      router.push(`/orders/${order.id}`)
    } catch {
      toast.error('Erreur lors de la recherche')
      setOpen(false)
    }
  }, [router])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm"
        title="Scanner un QR commande"
      >
        <ScanLine className="h-4 w-4" />
        <span className="hidden sm:inline">Scanner</span>
      </button>
      <QrScannerModal
        open={open}
        onClose={() => setOpen(false)}
        onScan={handleScan}
      />
    </>
  )
}

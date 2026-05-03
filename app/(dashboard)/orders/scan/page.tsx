'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const QrScannerModal = dynamic(() => import('@/components/scanner/QrScannerModal'), { ssr: false })

export default function ScanPage() {
  const router = useRouter()
  const [open, setOpen] = useState(true)

  const handleScan = (data: string) => {
    // Extract order token/id from QR data
    // QR might contain full URL like /orders/pickup/xxx or just the token
    const match = data.match(/pickup\/([a-zA-Z0-9-]+)/)
    if (match) {
      router.push(`/orders/pickup/${match[1]}`)
    } else {
      // Try using the raw data as order id
      router.push(`/orders/pickup/${data}`)
    }
  }

  const handleClose = () => {
    setOpen(false)
    router.back()
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <QrScannerModal open={open} onClose={handleClose} onScan={handleScan} />
      {!open && (
        <p style={{ color: '#64748b', fontSize: '14px' }}>Scanner fermé. Retour en cours...</p>
      )}
    </div>
  )
}

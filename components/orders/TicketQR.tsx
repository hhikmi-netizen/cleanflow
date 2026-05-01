'use client'

import QRCode from 'react-qr-code'
import { useEffect, useState } from 'react'

export default function TicketQR({ trackingToken }: { trackingToken: string }) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    setUrl(`${window.location.origin}/track/${trackingToken}`)
  }, [trackingToken])

  return (
    <div className="flex flex-col items-center gap-1.5">
      <QRCode value={url || `token:${trackingToken}`} size={96} level="M" />
      <p className="text-[9px] text-gray-400 text-center leading-tight">
        Scanner pour suivre votre commande
      </p>
    </div>
  )
}

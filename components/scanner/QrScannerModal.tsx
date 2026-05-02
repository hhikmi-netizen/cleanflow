'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, ScanLine, CheckCircle2, AlertCircle } from 'lucide-react'

type ScanStatus = 'scanning' | 'success' | 'error'

interface QrScannerModalProps {
  open: boolean
  onClose: () => void
  onScan: (token: string) => void
}

export default function QrScannerModal({ open, onClose, onScan }: QrScannerModalProps) {
  const scannerRef = useRef<HTMLDivElement>(null)
  const html5QrRef = useRef<any>(null)
  const [status, setStatus] = useState<ScanStatus>('scanning')
  const [message, setMessage] = useState('')
  const [cameraError, setCameraError] = useState('')

  const extractToken = useCallback((text: string): string | null => {
    const urlMatch = text.match(/\/track\/([a-f0-9-]+)/i)
    if (urlMatch) return urlMatch[1]
    const uuidMatch = text.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i)
    if (uuidMatch) return uuidMatch[0]
    const tokenMatch = text.match(/^token:(.+)$/i)
    if (tokenMatch) return tokenMatch[1]
    return null
  }, [])

  useEffect(() => {
    if (!open) return

    let scanner: any = null

    const initScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (!scannerRef.current) return
        const scannerId = 'qr-scanner-region'
        scannerRef.current.id = scannerId
        scanner = new Html5Qrcode(scannerId)
        html5QrRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
          (decodedText: string) => {
            const token = extractToken(decodedText)
            if (token) {
              setStatus('success')
              setMessage('Commande trouvee !')
              setTimeout(() => {
                scanner?.stop().catch(() => {})
                onScan(token)
              }, 600)
            } else {
              setStatus('error')
              setMessage('QR non reconnu')
              setTimeout(() => { setStatus('scanning'); setMessage('') }, 2000)
            }
          },
          () => {}
        )
      } catch (err: any) {
        console.error('Scanner init error:', err)
        setCameraError(
          err?.message?.includes('Permission')
            ? 'Acces camera refuse. Autorisez la camera dans les parametres.'
            : "Impossible d'acceder a la camera."
        )
      }
    }

    initScanner()

    return () => {
      if (html5QrRef.current) {
        html5QrRef.current.stop().catch(() => {})
        html5QrRef.current.clear().catch(() => {})
        html5QrRef.current = null
      }
    }
  }, [open, extractToken, onScan])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-sm mx-4 bg-white rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Scanner QR commande</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-200 transition" aria-label="Fermer">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="relative bg-black">
          {cameraError ? (
            <div className="flex flex-col items-center justify-center h-72 px-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mb-3" />
              <p className="text-white text-sm">{cameraError}</p>
            </div>
          ) : (
            <div ref={scannerRef} className="w-full" />
          )}
          {status === 'success' && (
            <div className="absolute inset-0 flex items-center justify-center bg-green-500/80">
              <div className="text-center text-white">
                <CheckCircle2 className="h-16 w-16 mx-auto mb-2" />
                <p className="font-semibold text-lg">{message}</p>
              </div>
            </div>
          )}
          {status === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-500/80">
              <div className="text-center text-white">
                <AlertCircle className="h-16 w-16 mx-auto mb-2" />
                <p className="font-semibold text-lg">{message}</p>
              </div>
            </div>
          )}
        </div>
        <div className="px-4 py-3 bg-gray-50 text-center">
          <p className="text-xs text-gray-500">Pointez la camera vers le QR code du ticket</p>
        </div>
      </div>
    </div>
  )
}

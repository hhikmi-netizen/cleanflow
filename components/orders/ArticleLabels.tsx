'use client'

import { useState, useRef } from 'react'
import QRCode from 'react-qr-code'
import { Tag, X, Printer } from 'lucide-react'

interface ArticleItem {
  id: string
  service_name: string
  quantity: number
  article_code?: string
  textile_type?: string
  color?: string
  brand?: string
  notes?: string
}

interface Props {
  items: ArticleItem[]
  orderNumber: string
  pressingName: string
  trackingToken?: string
}

export default function ArticleLabels({ items, orderNumber, pressingName, trackingToken }: Props) {
  const [open, setOpen] = useState(false)

  const labelsWithCode = items.filter(i => i.article_code)
  if (labelsWithCode.length === 0) return null

  const trackBase = typeof window !== 'undefined' ? `${window.location.origin}/track/` : '/track/'
  const trackUrl = trackingToken ? `${trackBase}${trackingToken}` : ''

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=800,height=600')
    if (!w) return
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Étiquettes — ${orderNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; background: white; }
  .grid { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px; }
  .label {
    width: 200px; border: 1px solid #ccc; border-radius: 6px;
    padding: 8px; page-break-inside: avoid; background: white;
  }
  .pressing { font-size: 8px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
  .order { font-size: 9px; font-family: monospace; color: #3b82f6; margin-top: 1px; }
  .code { font-size: 11px; font-family: monospace; font-weight: bold; color: #1e3a8a;
          background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 3px;
          padding: 2px 5px; display: inline-block; margin: 4px 0; }
  .service { font-size: 11px; font-weight: bold; color: #111; margin-top: 2px; }
  .meta { font-size: 9px; color: #555; margin-top: 2px; }
  .qr { margin-top: 6px; text-align: center; }
  @media print { body { margin: 0; } .grid { gap: 6px; padding: 4px; } }
</style></head><body>
<div class="grid">
${labelsWithCode.map(item => `
  <div class="label">
    <div class="pressing">${pressingName}</div>
    <div class="order">${orderNumber}</div>
    <div class="code">${item.article_code}</div>
    <div class="service">${item.service_name}</div>
    <div class="meta">
      ${item.textile_type ? `Type : ${item.textile_type}` : ''}
      ${item.color ? ` · ${item.color}` : ''}
      ${item.brand ? ` · ${item.brand}` : ''}
    </div>
    ${trackUrl ? `<div class="qr"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="70" height="70">
      <!-- QR placeholder replaced at print time -->
    </svg></div>` : ''}
  </div>`).join('')}
</div>
<script>window.onload = function() { window.print(); }<\/script>
</body></html>`
    w.document.write(html)
    w.document.close()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors border border-indigo-200"
      >
        <Tag size={13} />
        Étiquettes articles ({labelsWithCode.length})
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Tag size={16} className="text-indigo-600" />
                Étiquettes articles — {orderNumber}
              </h3>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              <div className="flex flex-wrap gap-3">
                {labelsWithCode.map(item => (
                  <div key={item.id}
                    className="w-48 border border-gray-200 rounded-xl p-3 bg-white shadow-sm"
                  >
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider">{pressingName}</p>
                    <p className="text-[10px] font-mono text-blue-600 mt-0.5">{orderNumber}</p>
                    <div className="my-2 font-mono text-xs font-bold text-blue-900 bg-blue-50 border border-blue-200 rounded px-2 py-0.5 inline-block">
                      {item.article_code}
                    </div>
                    <p className="text-xs font-semibold text-gray-900 truncate">{item.service_name}</p>
                    {(item.textile_type || item.color || item.brand) && (
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                        {[item.textile_type, item.color, item.brand].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {trackUrl && (
                      <div className="mt-2 flex justify-center">
                        <QRCode value={trackUrl} size={60} />
                      </div>
                    )}
                    {item.notes && (
                      <p className="text-[9px] text-amber-700 mt-1 truncate">{item.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Printer size={14} />
                Imprimer
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body > *:not(#labels-print) { display: none !important; }
        }
      `}</style>
    </>
  )
}

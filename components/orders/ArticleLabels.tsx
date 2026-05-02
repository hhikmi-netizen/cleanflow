'use client'

import { useState } from 'react'
import QRCode from 'react-qr-code'
import { Tag, X, Printer } from 'lucide-react'

interface ArticleItem {
  id: string
  service_name: string
  quantity: number
  article_code?: string
  notes?: string
}

interface Props {
  items: ArticleItem[]
  orderNumber: string
  pressingName: string
  trackingToken?: string
  clientName?: string
}

export default function ArticleLabels({ items, orderNumber, pressingName, trackingToken, clientName }: Props) {
  const [open, setOpen] = useState(false)
  const [showClientName, setShowClientName] = useState(true)

  if (items.length === 0) return null

  const trackBase = typeof window !== 'undefined' ? `${window.location.origin}/track/` : '/track/'
  const trackUrl = trackingToken ? `${trackBase}${trackingToken}` : ''

  const expandedLabels: { item: ArticleItem; index: number }[] = []
  items.forEach(item => {
    for (let i = 0; i < item.quantity; i++) {
      expandedLabels.push({ item, index: i + 1 })
    }
  })

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=800,height=600')
    if (!w) return

    const labelsHtml = expandedLabels.map(({ item, index }) => {
      const code = item.article_code || orderNumber
      const label = `${code}${item.quantity > 1 ? '-' + index : ''}`
      const qrValue = trackUrl || code
      const clientLine = showClientName && clientName
        ? `<div class="client">${clientName}</div>`
        : ''
      const qtyLine = item.quantity > 1
        ? `<span class="qty">${index}/${item.quantity}</span>`
        : ''

      return `<div class="label">
        <div class="left">
          <div class="code">${label}</div>
          <div class="service">${item.service_name} ${qtyLine}</div>
          ${clientLine}
          <div class="pressing">${pressingName}</div>
        </div>
        <div class="qr">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrValue)}" width="68" height="68" />
        </div>
      </div>`
    }).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Etiquettes ${orderNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; background: #fff; }
  .page { padding: 2mm; }
  .label {
    width: 50mm; height: 30mm;
    border: 0.3pt solid #ccc;
    padding: 2mm 2.5mm;
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    page-break-inside: avoid;
    overflow: hidden;
    vertical-align: top;
    margin: 0.5mm;
  }
  .left { flex: 1; min-width: 0; overflow: hidden; }
  .code {
    font-size: 14pt; font-weight: 900;
    font-family: 'Arial Black', Arial, sans-serif;
    color: #000; line-height: 1.1;
    letter-spacing: 0.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .service {
    font-size: 9pt; font-weight: 700;
    color: #111; margin-top: 1mm;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .qty { font-weight: 400; color: #555; font-size: 8pt; }
  .client {
    font-size: 7pt; color: #333;
    margin-top: 0.5mm;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pressing {
    font-size: 6pt; color: #888;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 0.5mm;
  }
  .qr { flex-shrink: 0; margin-left: 2mm; }
  .qr img { display: block; }
  @media print {
    @page { margin: 0; size: auto; }
    body { margin: 0; }
    .page { padding: 0; }
    .label { border: none; margin: 0; }
  }
</style>
</head><body>
<div class="page">${labelsHtml}</div>
<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 300);
  };
<\/script>
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
        Etiquettes ({expandedLabels.length})
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Tag size={16} className="text-indigo-600" />
                Etiquettes 50x30 - {orderNumber}
                <span className="text-sm font-normal text-gray-400">
                  ({expandedLabels.length} etiquette{expandedLabels.length > 1 ? 's' : ''})
                </span>
              </h3>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            {clientName && (
              <div className="px-4 pt-3 flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showClientName}
                    onChange={e => setShowClientName(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Afficher nom client sur les etiquettes
                </label>
              </div>
            )}

            <div className="overflow-y-auto flex-1 p-4">
              <div className="flex flex-wrap gap-3">
                {expandedLabels.map(({ item, index }, i) => {
                  const code = item.article_code || orderNumber
                  const label = `${code}${item.quantity > 1 ? '-' + index : ''}`
                  const qrValue = trackUrl || code
                  return (
                    <div
                      key={`${item.id}-${index}`}
                      className="bg-white border-2 border-gray-300 rounded-lg p-2.5 shadow-sm"
                      style={{ width: '200px', minHeight: '110px' }}
                    >
                      <div className="flex items-start justify-between h-full">
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <p className="text-lg font-black text-black leading-tight tracking-wide truncate">
                              {label}
                            </p>
                            <p className="text-sm font-bold text-gray-900 mt-1 truncate">
                              {item.service_name}
                              {item.quantity > 1 && (
                                <span className="text-xs font-normal text-gray-400 ml-1">
                                  {index}/{item.quantity}
                                </span>
                              )}
                            </p>
                            {showClientName && clientName && (
                              <p className="text-xs text-gray-500 mt-0.5 truncate">{clientName}</p>
                            )}
                          </div>
                          <p className="text-[9px] text-gray-400 uppercase tracking-wider mt-1">{pressingName}</p>
                        </div>
                        <div className="ml-2 shrink-0">
                          <QRCode value={qrValue} size={56} />
                        </div>
                      </div>
                    </div>
                  )
                })}
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
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Printer size={16} />
                Imprimer etiquettes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

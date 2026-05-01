'use client'

import { Download } from 'lucide-react'

interface RevenueDay { label: string; revenue: number; orders: number }
interface TopService  { name: string; revenue: number; count: number }
interface TopClient   { name: string; total_orders: number; total_spent: number }

interface Props {
  revenueData: RevenueDay[]
  topServices: TopService[]
  topClients: TopClient[]
}

function buildCSV(rows: (string | number)[][], headers: string[]): string {
  return [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

function download(content: string, filename: string) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function StatsExportButton({ revenueData, topServices, topClients }: Props) {
  const handleExport = () => {
    const today = new Date().toISOString().split('T')[0]

    // Sheet 1 : CA journalier
    const revRows = revenueData.map(d => [d.label, d.revenue.toFixed(2), d.orders])
    const revCSV  = buildCSV(revRows, ['Date', 'CA (DH)', 'Commandes'])

    // Sheet 2 : top services
    const svcRows = topServices.map(s => [s.name, s.revenue.toFixed(2), s.count])
    const svcCSV  = buildCSV(svcRows, ['Service', 'CA (DH)', 'Quantité'])

    // Sheet 3 : top clients
    const cliRows = topClients.map(c => [c.name, c.total_orders, Number(c.total_spent).toFixed(2)])
    const cliCSV  = buildCSV(cliRows, ['Client', 'Commandes', 'CA total (DH)'])

    // Combine into one file with section headers
    const combined = [
      '=== CA JOURNALIER — 30 DERNIERS JOURS ===',
      revCSV,
      '',
      '=== TOP SERVICES ===',
      svcCSV,
      '',
      '=== TOP CLIENTS ===',
      cliCSV,
    ].join('\n')

    download(combined, `stats_cleanflow_${today}.csv`)
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors"
      title="Exporter les statistiques en CSV"
    >
      <Download size={15} />
      <span className="hidden sm:inline">Export CSV</span>
    </button>
  )
}

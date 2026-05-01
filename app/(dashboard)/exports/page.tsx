export const dynamic = 'force-dynamic'

import { requireAdmin } from '@/lib/auth/guards'
import ExportPanel from '@/components/exports/ExportPanel'
import { Download, ShieldCheck } from 'lucide-react'

export default async function ExportsPage() {
  await requireAdmin()

  return (
    <div className="max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Download size={20} className="text-gray-600" />
            Exports CSV
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Téléchargez vos données dans Excel ou tout tableur.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-100 rounded-lg shrink-0">
          <ShieldCheck size={13} className="text-green-600" />
          <span className="text-xs font-medium text-green-700">Données isolées</span>
        </div>
      </div>

      <ExportPanel />
    </div>
  )
}

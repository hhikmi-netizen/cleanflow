'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getStatusLabel } from '@/lib/utils'

interface Props {
  data: { status: string; count: number }[]
}

const COLORS: Record<string, string> = {
  pending:     '#f59e0b',
  in_progress: '#3b82f6',
  ready:       '#10b981',
  delivered:   '#6b7280',
  cancelled:   '#ef4444',
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-sm">
      <p className="font-medium text-gray-700">{getStatusLabel(d.name)}</p>
      <p className="text-gray-500">{d.value} commande{d.value !== 1 ? 's' : ''}</p>
    </div>
  )
}

export default function StatusDonut({ data }: Props) {
  const total = data.reduce((s, d) => s + d.count, 0)
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="status"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell key={entry.status} fill={COLORS[entry.status] || '#94a3b8'} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Centre label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold text-gray-900">{total}</span>
        <span className="text-xs text-gray-400">commandes</span>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
        {data.map(d => (
          <div key={d.status} className="flex items-center gap-1 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: COLORS[d.status] || '#94a3b8' }} />
            {getStatusLabel(d.status)} ({d.count})
          </div>
        ))}
      </div>
    </div>
  )
}

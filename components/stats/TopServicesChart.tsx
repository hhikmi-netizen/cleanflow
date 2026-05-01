'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface Props {
  data: { name: string; revenue: number; count: number }[]
  currency?: string
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-sm">
      <p className="font-medium text-gray-700 mb-1">{d?.name}</p>
      <p className="text-indigo-600">{Number(d?.revenue).toFixed(2)} DH</p>
      <p className="text-gray-400 text-xs">{d?.count} article{d?.count !== 1 ? 's' : ''}</p>
    </div>
  )
}

export default function TopServicesChart({ data, currency }: Props) {
  const truncated = data.map(d => ({
    ...d,
    shortName: d.name.length > 14 ? d.name.slice(0, 13) + '…' : d.name,
  }))
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={truncated} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="shortName"
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          width={95}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
        <Bar dataKey="revenue" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  )
}

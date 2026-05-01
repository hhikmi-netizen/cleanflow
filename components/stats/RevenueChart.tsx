'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

interface DayRevenue {
  label: string
  revenue: number
  orders: number
}

interface Props {
  data: DayRevenue[]
  currency?: string
}

function CustomTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-blue-600">{Number(payload[0]?.value).toFixed(2)} {currency || 'DH'}</p>
      <p className="text-gray-400 text-xs">{payload[0]?.payload?.orders} commande{payload[0]?.payload?.orders !== 1 ? 's' : ''}</p>
    </div>
  )
}

export default function RevenueChart({ data, currency }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `${v}`}
        />
        <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ fill: '#f1f5f9' }} />
        <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}

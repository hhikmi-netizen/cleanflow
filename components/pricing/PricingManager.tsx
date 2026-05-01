'use client'

import { useState } from 'react'
import { PriceRule, Subscription, CustomerSubscription, DiscountRule } from '@/lib/types'

type ClientMin = { id: string; name: string; phone: string }
type ServiceMin = { id: string; name: string; category?: string }
import PriceRulesTab from './PriceRulesTab'
import SubscriptionsTab from './SubscriptionsTab'
import DiscountsTab from './DiscountsTab'
import { Tag, CreditCard, Percent } from 'lucide-react'

interface Props {
  priceRules: PriceRule[]
  subscriptions: Subscription[]
  customerSubs: CustomerSubscription[]
  discounts: DiscountRule[]
  clients: ClientMin[]
  services: ServiceMin[]
}

const TABS = [
  { id: 'rules',         label: 'Règles de prix',   icon: Tag },
  { id: 'subscriptions', label: 'Abonnements',       icon: CreditCard },
  { id: 'discounts',     label: 'Remises',           icon: Percent },
] as const

type TabId = typeof TABS[number]['id']

export default function PricingManager({ priceRules, subscriptions, customerSubs, discounts, clients, services }: Props) {
  const [tab, setTab] = useState<TabId>('rules')

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={15} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Summary badges */}
      <div className="flex gap-3 text-xs text-gray-500">
        <span className="bg-gray-100 px-2 py-1 rounded">{priceRules.length} règles</span>
        <span className="bg-gray-100 px-2 py-1 rounded">{subscriptions.length} forfaits · {customerSubs.length} abonnés</span>
        <span className="bg-gray-100 px-2 py-1 rounded">{discounts.filter(d => d.active).length} remises actives</span>
      </div>

      {tab === 'rules' && <PriceRulesTab rules={priceRules} services={services} />}
      {tab === 'subscriptions' && <SubscriptionsTab subscriptions={subscriptions} customerSubs={customerSubs} clients={clients} />}
      {tab === 'discounts' && <DiscountsTab discounts={discounts} clients={clients} services={services} />}
    </div>
  )
}

export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import PrintButton from '@/components/orders/PrintButton'
import BatchInvoiceSelector from '@/components/clients/BatchInvoiceSelector'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function BatchInvoicePage({ params }: { params: { id: string } }) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('pressing_id').eq('id', user.id).single()

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', params.id)
    .eq('pressing_id', userData?.pressing_id || '')
    .single()

  if (!client) notFound()

  const { data: pressing } = await supabase
    .from('pressings')
    .select('name, phone, email, address, ice, currency, tax_rate')
    .eq('id', userData!.pressing_id)
    .single()

  const { data: settings } = await supabase
    .from('settings')
    .select('invoice_footer')
    .eq('pressing_id', userData!.pressing_id)
    .single()

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, invoice_number, status, total, deposit, paid, created_at, payment_terms, subtotal, tax, order_items(*)')
    .eq('client_id', client.id)
    .eq('pressing_id', userData!.pressing_id)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })

  const orderIds = (orders || []).map(o => o.id)
  const { data: payments } = orderIds.length > 0
    ? await supabase.from('payments').select('order_id, amount').in('order_id', orderIds)
    : { data: [] }

  const paymentsByOrder = (payments || []).reduce<Record<string, number>>((acc, p) => {
    acc[p.order_id] = (acc[p.order_id] || 0) + Number(p.amount)
    return acc
  }, {})

  const enrichedOrders = (orders || []).map(o => {
    const paid = Number(o.deposit || 0) + (paymentsByOrder[o.id] || 0)
    return { ...o, paidAmount: paid, remaining: Math.max(0, Number(o.total) - paid) }
  })

  return (
    <>
      <div className="print:hidden flex items-center gap-4 mb-6 px-4">
        <Link href={`/clients/${client.id}`} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm">
          <ChevronLeft size={16} /> Retour
        </Link>
        <PrintButton />
      </div>

      <BatchInvoiceSelector
        client={client}
        orders={enrichedOrders}
        pressing={pressing}
        invoiceFooter={settings?.invoice_footer}
      />
    </>
  )
}

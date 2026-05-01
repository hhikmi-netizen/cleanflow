'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { RefreshCw, Loader2 } from 'lucide-react'
import { renewSubscription } from '@/app/actions/pricing'

interface Props {
  customerSubId: string
  clientId: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm'
}

export default function RenewButton({ customerSubId, clientId: _clientId, variant = 'outline', size = 'sm' }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleRenew = () => {
    startTransition(async () => {
      try {
        await renewSubscription(customerSubId)
        toast.success('Forfait renouvelé — quota et solde réinitialisés')
        router.refresh()
      } catch (e: unknown) {
        toast.error((e as Error).message)
      }
    })
  }

  return (
    <Button variant={variant} size={size} onClick={handleRenew} disabled={isPending}>
      {isPending
        ? <><Loader2 size={13} className="animate-spin mr-1.5" /> Renouvellement…</>
        : <><RefreshCw size={13} className="mr-1.5" /> Renouveler le forfait</>
      }
    </Button>
  )
}

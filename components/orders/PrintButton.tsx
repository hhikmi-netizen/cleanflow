'use client'

import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

export default function PrintButton() {
  return (
    <Button onClick={() => window.print()} className="gap-2">
      <Printer size={16} />
      Imprimer / PDF
    </Button>
  )
}

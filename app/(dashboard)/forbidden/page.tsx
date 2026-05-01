import Link from 'next/link'
import { ShieldAlert, ChevronLeft } from 'lucide-react'

export default function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-5">
        <ShieldAlert size={32} className="text-amber-500" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès réservé</h1>
      <p className="text-gray-500 max-w-sm mb-6">
        Cette section est réservée aux administrateurs. Contactez votre responsable si vous pensez avoir besoin d'y accéder.
      </p>
      <Link
        href="/orders"
        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        <ChevronLeft size={16} />
        Retour aux commandes
      </Link>
    </div>
  )
}

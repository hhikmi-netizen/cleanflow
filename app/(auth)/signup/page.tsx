'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [phone, setPhone] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Créer l'utilisateur auth
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
      if (authError) throw authError
      if (!authData.user) throw new Error('Erreur lors de la création du compte')

      // 2. Créer le pressing
      const { data: pressing, error: pressingError } = await supabase
        .from('pressings')
        .insert({ name: businessName, phone, email })
        .select()
        .single()
      if (pressingError) throw pressingError

      // 3. Créer le profil utilisateur
      const { error: userError } = await supabase.from('users').insert({
        id: authData.user.id,
        pressing_id: pressing.id,
        role: 'admin',
        full_name: fullName || businessName,
        phone,
      })
      if (userError) throw userError

      // 4. Créer les paramètres par défaut
      await supabase.from('settings').insert({ pressing_id: pressing.id })

      toast.success('Compte créé ! Bienvenue sur CleanFlow.')
      router.push('/onboarding')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center pb-2">
        <div className="text-4xl font-bold text-blue-600 mb-2">CleanFlow</div>
        <CardTitle className="text-xl text-gray-600 font-normal">Créer votre pressing</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">Nom du pressing *</Label>
            <Input
              id="businessName"
              placeholder="Pressing Al Amal"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Votre nom *</Label>
            <Input
              id="fullName"
              placeholder="Mohammed Alami"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="06 12 34 56 78"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="vous@pressing.ma"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe *</Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimum 6 caractères"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-11"
            />
          </div>
          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Création...</> : "S'inscrire gratuitement"}
          </Button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          Déjà inscrit ?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            Se connecter
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}

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
import { Loader2, Mail } from 'lucide-react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [phone, setPhone] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('Erreur lors de la création du compte')

      // Pas de session = confirmation email requise
      if (!authData.session) {
        setConfirmationSent(true)
        setLoading(false)
        return
      }

      await createPressingData(authData.user.id)
      toast.success('Compte créé ! Bienvenue sur CleanFlow.')
      router.push('/onboarding')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const createPressingData = async (userId: string) => {
    const { data: pressing, error: pressingError } = await supabase
      .from('pressings')
      .insert({ name: businessName, phone, email })
      .select()
      .single()
    if (pressingError) throw pressingError

    const { error: userError } = await supabase.from('users').insert({
      id: userId,
      pressing_id: pressing.id,
      role: 'admin',
      full_name: fullName || businessName,
      phone,
    })
    if (userError) throw userError

    await supabase.from('settings').insert({ pressing_id: pressing.id })
  }

  const handleGoogleSignup = async () => {
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      toast.error(error.message)
      setGoogleLoading(false)
    }
  }

  if (confirmationSent) {
    return (
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-8 pb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Vérifiez votre email</h2>
          <p className="text-gray-500 text-sm mb-6">
            Un lien de confirmation a été envoyé à <strong>{email}</strong>.<br />
            Cliquez sur le lien pour activer votre compte.
          </p>
          <p className="text-xs text-gray-400">
            Vous pouvez fermer cette page après avoir cliqué sur le lien.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center pb-2">
        <div className="text-4xl font-bold text-blue-600 mb-2">CleanFlow</div>
        <CardTitle className="text-xl text-gray-600 font-normal">Créer votre pressing</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Google */}
        <Button
          type="button"
          variant="outline"
          className="w-full h-11 mb-4 flex items-center gap-3"
          onClick={handleGoogleSignup}
          disabled={googleLoading}
        >
          {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          S&apos;inscrire avec Google
        </Button>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs text-gray-400 uppercase">
            <span className="bg-white px-2">ou avec email</span>
          </div>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">Nom du pressing *</Label>
            <Input id="businessName" placeholder="Pressing Al Amal" value={businessName}
              onChange={(e) => setBusinessName(e.target.value)} required className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Votre nom *</Label>
            <Input id="fullName" placeholder="Mohammed Alami" value={fullName}
              onChange={(e) => setFullName(e.target.value)} required className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone *</Label>
            <Input id="phone" type="tel" placeholder="06 12 34 56 78" value={phone}
              onChange={(e) => setPhone(e.target.value)} required className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" placeholder="vous@pressing.ma" value={email}
              onChange={(e) => setEmail(e.target.value)} required className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe *</Label>
            <Input id="password" type="password" placeholder="Minimum 6 caractères" value={password}
              onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-11" />
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

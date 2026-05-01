'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Shield, User, Loader2, Copy, Check, ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface TeamUser {
  id: string
  full_name: string
  phone?: string
  role: 'admin' | 'employee'
  created_at: string
}

interface Props {
  members: TeamUser[]
  currentUserId: string
  pressingId: string
  pressingName: string
}

export default function TeamManager({ members, currentUserId, pressingId, pressingName }: Props) {
  const [users, setUsers]     = useState(members)
  const [saving, setSaving]   = useState<string | null>(null)
  const [copied, setCopied]   = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const changeRole = async (userId: string, newRole: 'admin' | 'employee') => {
    if (userId === currentUserId) { toast.error('Vous ne pouvez pas modifier votre propre rôle'); return }
    setSaving(userId)
    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId)
    if (error) { toast.error(error.message) }
    else {
      setUsers(u => u.map(m => m.id === userId ? { ...m, role: newRole } : m))
      toast.success(`Rôle mis à jour : ${newRole === 'admin' ? 'Administrateur' : 'Employé'}`)
      router.refresh()
    }
    setSaving(null)
  }

  const copyInviteCode = () => {
    navigator.clipboard.writeText(pressingId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const adminCount = users.filter(u => u.role === 'admin').length

  return (
    <div className="space-y-5">
      {/* Team members list */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Membres de l&apos;équipe ({users.length})
        </h3>
        <div className="space-y-2">
          {users.map(member => {
            const isSelf = member.id === currentUserId
            const isLastAdmin = member.role === 'admin' && adminCount === 1
            return (
              <div key={member.id}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                    member.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {member.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-gray-900">{member.full_name}</p>
                      {isSelf && <span className="text-xs text-gray-400">(vous)</span>}
                    </div>
                    {member.phone && <p className="text-xs text-gray-400">{member.phone}</p>}
                    <p className="text-xs text-gray-400">
                      Depuis le {new Date(member.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {saving === member.id && <Loader2 size={14} className="animate-spin text-gray-400" />}
                  {isSelf || isLastAdmin ? (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${
                      member.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {member.role === 'admin' ? <Shield size={11} /> : <User size={11} />}
                      {member.role === 'admin' ? 'Admin' : 'Employé'}
                    </span>
                  ) : (
                    <div className="relative">
                      <select
                        value={member.role}
                        onChange={e => changeRole(member.id, e.target.value as 'admin' | 'employee')}
                        disabled={!!saving}
                        className={`text-xs pl-2.5 pr-7 py-1 rounded-full border font-medium appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                          member.role === 'admin'
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-gray-50 border-gray-200 text-gray-600'
                        }`}
                      >
                        <option value="admin">Admin</option>
                        <option value="employee">Employé</option>
                      </select>
                      <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Invite section */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">
          Inviter un employé
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Partagez ce code à votre employé. Il devra l&apos;entrer lors de l&apos;inscription pour rejoindre <span className="font-medium text-gray-600">{pressingName}</span>.
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 font-mono text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-700 break-all">
            {pressingId}
          </div>
          <button
            onClick={copyInviteCode}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
              copied
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {copied ? <><Check size={13} /> Copié</> : <><Copy size={13} /> Copier</>}
          </button>
        </div>
        <div className="mt-3 p-3 bg-blue-50 rounded-xl text-xs text-blue-700 space-y-1">
          <p className="font-medium">Procédure d&apos;invitation :</p>
          <ol className="list-decimal list-inside space-y-0.5 text-blue-600">
            <li>L&apos;employé crée un compte sur la page d&apos;inscription</li>
            <li>Il entre ce code dans le champ « Code d&apos;équipe »</li>
            <li>Il rejoint automatiquement votre pressing comme Employé</li>
          </ol>
        </div>
      </Card>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Mail, Lock, ArrowRight, Zap } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import Spinner from '../UI/Spinner'
import { APP_AUDIENCE_SHORT } from '../../constants/branding'
import {
  acceptStoredTeamInvite,
  consumeTeamInviteSwitch,
  fetchTeamInvitePreview,
  markTeamInviteSwitch,
  parseInviteTokenFromSearch,
  signOutForTeamInviteLogin,
  storeTeamInviteToken,
  teamInviteErrorMessage,
} from '../../utils/teamInvite'

// ===================================================
// COMPONENTE — LoginForm
// Autenticazione via Supabase Auth (email + password)
// ===================================================
export default function LoginForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const inviteToken = parseInviteTokenFromSearch(searchParams)
  const [invitePreview, setInvitePreview] = useState(null)
  const [accountSwitch] = useState(() => consumeTeamInviteSwitch())

  useEffect(() => {
    if (inviteToken) storeTeamInviteToken(inviteToken)
  }, [inviteToken])

  useEffect(() => {
    if (!inviteToken) return
    fetchTeamInvitePreview(inviteToken).then((res) => {
      setInvitePreview(res?.ok ? res : null)
      if (res?.ok && res.email) setEmail(res.email)
    })
  }, [inviteToken])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleLogin(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      // Messaggi d'errore comprensibili in italiano
      if (error.message.includes('Invalid login credentials')) {
        setError('Email o password non corretti. Riprova.')
      } else if (error.message.includes('Email not confirmed')) {
        setError('Account non verificato. Controlla la tua email e clicca il link di conferma.')
      } else {
        setError(error.message)
      }
      setLoading(false)
    } else {
      const inviteRes = await acceptStoredTeamInvite()
      if (inviteRes?.ok && !inviteRes.skipped) {
        navigate('/dashboard', { replace: true })
        return
      }
      if (inviteRes?.error === 'email_mismatch' && !inviteRes.skipped) {
        markTeamInviteSwitch(inviteRes.expected_email || invitePreview?.email, email)
        await signOutForTeamInviteLogin(inviteToken, navigate)
        return
      }
      if (inviteRes?.error && !inviteRes.skipped) {
        setError(teamInviteErrorMessage(inviteRes.error, inviteRes.expected_email))
        setLoading(false)
        return
      }
      navigate('/dashboard', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4">

      {/* Sfondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      {/* Card login */}
      <div className="relative w-full max-w-sm animate-slide-up">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 bg-cyan-500 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-slate-950" fill="currentColor" />
          </div>
          <span className="text-slate-100 text-xl font-display font-bold tracking-tight">
            Lead<span className="text-cyan-400">OS</span>
          </span>
        </div>

        {/* Intestazione */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-display font-bold text-slate-100 mb-1">
            Bentornato
          </h1>
          <p className="text-slate-400 text-sm">Accedi al tuo account per continuare</p>
          <p className="text-slate-500 text-xs mt-1.5">{APP_AUDIENCE_SHORT}</p>
          {inviteToken && (
            <p className="text-violet-400/90 text-xs mt-2">Dopo l&apos;accesso entrerai nel team invitato.</p>
          )}
        </div>

        {inviteToken && invitePreview?.email && (
          <div className="mb-4 rounded-lg border border-violet-900/80 bg-violet-950/40 px-4 py-3 text-sm">
            {accountSwitch?.previousEmail ? (
              <p className="text-violet-200/95 leading-relaxed">
                Eri connesso come <strong>{accountSwitch.previousEmail}</strong>.
                Accedi con <strong>{invitePreview.email}</strong> per accettare l&apos;invito.
              </p>
            ) : (
              <p className="text-violet-200/95 leading-relaxed">
                Invito per <strong>{invitePreview.email}</strong>. Usa questa email per accedere.
              </p>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="card p-6 space-y-4">

          {/* Campo email */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@esempio.com"
                required
                readOnly={Boolean(invitePreview?.email)}
                autoComplete="email"
                className={`input-base pl-10 ${invitePreview?.email ? 'opacity-90' : ''}`}
              />
            </div>
          </div>

          {/* Campo password */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="input-base pl-10"
              />
            </div>
          </div>

          {/* Messaggio errore */}
          {error && (
            <div className="bg-red-950 border border-red-900 rounded-lg px-3 py-2.5">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Bottone submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center min-h-[44px] mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Spinner size="sm" />
            ) : (
              <>
                Accedi
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Link registrazione */}
        <p className="text-center text-slate-500 text-sm mt-4">
          Non hai un account?{' '}
          <Link
            to={inviteToken ? `/register?token=${encodeURIComponent(inviteToken)}` : '/register'}
            className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
          >
            Registrati
          </Link>
        </p>

        <nav className="flex flex-wrap justify-center gap-3 mt-6 text-[11px] text-slate-600">
          <Link to="/privacy" className="hover:text-cyan-400">Privacy</Link>
          <Link to="/termini" className="hover:text-cyan-400">Termini</Link>
          <Link to="/cookie" className="hover:text-cyan-400">Cookie</Link>
          <Link to="/note-legali" className="hover:text-cyan-400">Note legali</Link>
        </nav>
      </div>
    </div>
  )
}

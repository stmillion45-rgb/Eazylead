import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Mail, Lock, ArrowRight, Zap, CheckCircle } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import Spinner from '../UI/Spinner'
import { APP_AUDIENCE_SHORT, APP_TAGLINE } from '../../constants/branding'
import {
  consumeTeamInviteSwitch,
  fetchTeamInvitePreview,
  parseInviteTokenFromSearch,
  storeTeamInviteToken,
} from '../../utils/teamInvite'

// ===================================================
// COMPONENTE — RegisterForm
// Registrazione nuovo account via Supabase Auth
// ===================================================
export default function RegisterForm() {
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
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)

  async function handleRegister(e) {
    e.preventDefault()
    setError(null)

    if (!acceptTerms || !acceptPrivacy) {
      setError('Devi accettare Termini di servizio e Informativa privacy per registrarti.')
      return
    }

    // Validazione password lato client
    if (password.length < 8) {
      setError('La password deve essere di almeno 8 caratteri.')
      return
    }

    if (password !== confirmPassword) {
      setError('Le password non coincidono.')
      return
    }

    setLoading(true)

    const now = new Date().toISOString()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          terms_accepted_at: now,
          privacy_accepted_at: now,
        },
      },
    })

    if (error) {
      if (error.message.includes('already registered')) {
        setError('Questa email è già registrata. Vai al login.')
      } else {
        setError(error.message)
      }
      setLoading(false)
    } else {
      // Supabase invia email di verifica automaticamente
      setSuccess(true)
      setLoading(false)
    }
  }

  // Schermata di conferma dopo registrazione avvenuta
  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm animate-slide-up text-center">
          <div className="w-16 h-16 bg-emerald-950 border border-emerald-900 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-display font-bold text-slate-100 mb-2">
            Controlla la tua email
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            Abbiamo inviato un link di verifica a <span className="text-slate-200 font-medium">{email}</span>.
            Clicca il link per attivare il tuo account.
          </p>
          <Link
            to={inviteToken ? `/login?token=${encodeURIComponent(inviteToken)}` : '/login'}
            className="btn-secondary justify-center"
          >
            Dopo la verifica email, accedi qui
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4">

      {/* Sfondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

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
            Crea il tuo account
          </h1>
          <p className="text-slate-400 text-sm">{APP_TAGLINE}</p>
          <p className="text-slate-500 text-xs mt-1.5 max-w-xs mx-auto leading-relaxed">
            {APP_AUDIENCE_SHORT} Inizia gratis, senza carta di credito.
          </p>
          {inviteToken && (
            <p className="text-violet-400/90 text-xs mt-2">
              Usa l&apos;email dell&apos;invito team. Dopo la verifica, accedi con lo stesso link.
            </p>
          )}
        </div>

        {inviteToken && invitePreview?.email && (
          <div className="mb-4 rounded-lg border border-violet-900/80 bg-violet-950/40 px-4 py-3 text-sm">
            {accountSwitch?.previousEmail ? (
              <p className="text-violet-200/95 leading-relaxed">
                Eri connesso come <strong>{accountSwitch.previousEmail}</strong>.
                Crea l&apos;account con <strong>{invitePreview.email}</strong>.
              </p>
            ) : (
              <p className="text-violet-200/95 leading-relaxed">
                Invito per <strong>{invitePreview.email}</strong>. Registrati con questa email.
              </p>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleRegister} className="card p-6 space-y-4">

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

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
              Password <span className="text-slate-600 normal-case">(min. 8 caratteri)</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                className="input-base pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
              Conferma Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                className="input-base pl-10"
              />
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-500">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 rounded border-slate-600"
              />
              <span>
                Accetto i{' '}
                <Link to="/termini" target="_blank" className="text-cyan-400 hover:underline">
                  Termini di servizio
                </Link>
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptPrivacy}
                onChange={(e) => setAcceptPrivacy(e.target.checked)}
                className="mt-0.5 rounded border-slate-600"
              />
              <span>
                Ho letto l&apos;
                <Link to="/privacy" target="_blank" className="text-cyan-400 hover:underline">
                  Informativa privacy
                </Link>
              </span>
            </label>
          </div>

          {error && (
            <div className="bg-red-950 border border-red-900 rounded-lg px-3 py-2.5">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center min-h-[44px] mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Spinner size="sm" />
            ) : (
              <>
                Registrati
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-slate-500 text-sm mt-4">
          Hai già un account?{' '}
          <Link
            to={inviteToken ? `/login?token=${encodeURIComponent(inviteToken)}` : '/login'}
            className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
          >
            Accedi
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

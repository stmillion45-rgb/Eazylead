import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Users, Zap, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuth } from '../../App'
import Spinner from '../UI/Spinner'
import {
  acceptTeamInvite,
  fetchTeamInvitePreview,
  inviteEmailsMatch,
  markTeamInviteSwitch,
  parseInviteTokenFromSearch,
  signOutForTeamInviteLogin,
  storeTeamInviteToken,
  teamInviteErrorMessage,
} from '../../utils/teamInvite'

export default function JoinTeamView() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [token, setToken] = useState('')
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState(null)
  const [done, setDone] = useState(false)
  const [switchingAccount, setSwitchingAccount] = useState(false)

  const wrongAccount = Boolean(
    user
    && preview?.ok
    && preview.email
    && !inviteEmailsMatch(preview.email, user.email),
  )

  useEffect(() => {
    const t = parseInviteTokenFromSearch(searchParams)
    if (!t) {
      setPreview({ ok: false, error: 'invalid_token' })
      setPreviewLoading(false)
      return
    }
    setToken(t)
    storeTeamInviteToken(t)

    let cancelled = false
    async function load() {
      setPreviewLoading(true)
      const res = await fetchTeamInvitePreview(t)
      if (!cancelled) {
        setPreview(res)
        setPreviewLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [searchParams])

  useEffect(() => {
    if (authLoading || previewLoading || !user || !token || !preview?.ok || done || wrongAccount) return

    let cancelled = false
    async function autoAccept() {
      setAccepting(true)
      setAcceptError(null)
      const res = await acceptTeamInvite(token)
      if (cancelled) return
      setAccepting(false)
      if (res?.ok) {
        setDone(true)
        setTimeout(() => navigate('/dashboard', { replace: true }), 1200)
      } else if (res?.error === 'email_mismatch') {
        markTeamInviteSwitch(res.expected_email || preview.email, user.email)
        setSwitchingAccount(true)
        await signOutForTeamInviteLogin(token, navigate)
      } else if (!res?.skipped) {
        setAcceptError(teamInviteErrorMessage(res?.error, res?.expected_email))
      }
    }
    autoAccept()
    return () => { cancelled = true }
  }, [authLoading, previewLoading, user, token, preview, done, navigate, wrongAccount])

  useEffect(() => {
    if (authLoading || previewLoading || !wrongAccount || !token || !preview?.ok) return

    let cancelled = false
    async function redirectToCorrectLogin() {
      setSwitchingAccount(true)
      markTeamInviteSwitch(preview.email, user.email)
      if (!cancelled) {
        await signOutForTeamInviteLogin(token, navigate)
      }
    }
    redirectToCorrectLogin()
    return () => { cancelled = true }
  }, [authLoading, previewLoading, wrongAccount, token, preview, user, navigate])

  async function handleManualAccept() {
    if (!user || !token) return
    setAccepting(true)
    setAcceptError(null)
    const res = await acceptTeamInvite(token)
    setAccepting(false)
    if (res?.ok) {
      setDone(true)
      navigate('/dashboard', { replace: true })
    } else if (res?.error === 'email_mismatch') {
      markTeamInviteSwitch(res.expected_email || preview?.email, user.email)
      setSwitchingAccount(true)
      await signOutForTeamInviteLogin(token, navigate)
    } else {
      setAcceptError(teamInviteErrorMessage(res?.error, res?.expected_email))
    }
  }

  const loginHref = token
    ? `/login?token=${encodeURIComponent(token)}`
    : '/login'
  const registerHref = token
    ? `/register?token=${encodeURIComponent(token)}`
    : '/register'

  if (switchingAccount || (wrongAccount && user)) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 px-4">
        <Spinner size="md" />
        <p className="text-slate-400 text-sm text-center max-w-sm">
          Stai usando un altro account. Ti portiamo al login con{' '}
          <strong className="text-slate-200">{preview?.email}</strong>…
        </p>
      </div>
    )
  }

  if (previewLoading || (user && accepting && !acceptError && !done)) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
        <Spinner size="md" />
        <p className="text-slate-500 text-sm">Verifica invito…</p>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <h1 className="text-slate-100 font-display font-bold text-xl mb-2">Sei nel team</h1>
          <p className="text-slate-400 text-sm">Reindirizzamento alla dashboard…</p>
        </div>
      </div>
    )
  }

  if (!preview?.ok) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-slate-100 font-display font-bold text-xl mb-2">Invito non valido</h1>
          <p className="text-slate-400 text-sm mb-6">
            {teamInviteErrorMessage(preview?.error)}
          </p>
          <Link to="/login" className="btn-secondary inline-flex min-h-[44px]">
            Vai al login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-slide-up">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 bg-cyan-500 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-slate-950" fill="currentColor" />
          </div>
          <span className="text-slate-100 text-xl font-display font-bold tracking-tight">
            Lead<span className="text-cyan-400">OS</span>
          </span>
        </div>

        <div className="card p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-950 border border-violet-800 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-slate-100 font-display font-bold text-lg">Invito al team</h1>
              <p className="text-slate-400 text-sm mt-1">
                <strong className="text-slate-300">{preview.owner_name}</strong> ti ha invitato a collaborare
                su LeadOS.
              </p>
            </div>
          </div>

          <div className="bg-slate-950 rounded-lg border border-slate-800 px-4 py-3 text-sm">
            <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Email invito</p>
            <p className="text-slate-200 font-medium">{preview.email}</p>
            <p className="text-slate-600 text-xs mt-2">
              Registrati o accedi con questa email, poi accetta l&apos;invito.
            </p>
          </div>

          {acceptError && (
            <div className="bg-red-950 border border-red-900 rounded-lg px-3 py-2.5">
              <p className="text-red-300 text-sm">{acceptError}</p>
            </div>
          )}

          {user ? (
            <button
              type="button"
              onClick={handleManualAccept}
              disabled={accepting}
              className="btn-primary w-full justify-center min-h-[44px] disabled:opacity-50"
            >
              {accepting ? <Spinner size="sm" /> : (
                <>Accetta invito e continua <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                to={registerHref}
                className="btn-primary w-full justify-center min-h-[44px]"
              >
                Crea account con questa email
              </Link>
              <Link
                to={loginHref}
                className="btn-secondary w-full justify-center min-h-[44px]"
              >
                Ho già un account — Accedi
              </Link>
            </div>
          )}

          {user && (
            <p className="text-slate-600 text-xs text-center">
              Account attuale: <span className="text-slate-400">{user.email}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, createContext, useContext, useRef } from 'react'
import { LayoutDashboard, Users, FileText, Settings, CreditCard, LogOut, Menu, X, FileSignature, UserCog } from 'lucide-react'
import { supabase } from './supabaseClient'
import { ToastProvider, useToast } from './components/UI/Toast'
import DashboardView from './components/Dashboard/DashboardView'
import LeadView      from './components/Lead/LeadView'
import RicevuteView     from './components/Ricevute/RicevuteView'
import PreventiviView   from './components/Preventivi/PreventiviView'
import ImpostazioniView from './components/Settings/ImpostazioniView'
import BillingView      from './components/Billing/BillingView'
import PricingSection   from './components/Billing/PricingSection'
import SubscriptionBanner from './components/Billing/SubscriptionBanner'
import OnboardingWizard from './components/Onboarding/OnboardingWizard'
import ProductTour from './components/Onboarding/ProductTour'
import { TOUR_START_EVENT } from './utils/productTour'
import { useProfile }   from './hooks/useProfile'
import { LeoProvider } from './components/Leo/LeoContext'
import LeoPanel, { LeoFab } from './components/Leo/LeoPanel'
import { WorkspaceProvider, useWorkspace } from './hooks/useWorkspace'
import { usePlan } from './hooks/usePlan'
import { acceptStoredTeamInvite, teamInviteErrorMessage } from './utils/teamInvite'
import TeamView from './components/Team/TeamView'
import JoinTeamView from './components/Team/JoinTeamView'
import LoginForm     from './components/Auth/LoginForm'
import RegisterForm  from './components/Auth/RegisterForm'
import PublicRoute from './components/Auth/PublicRoute'
import { LegacyTeamRedirect } from './components/Auth/LegacyTeamRedirect'
import PrivacyPage from './components/Legal/PrivacyPage'
import TermsPage from './components/Legal/TermsPage'
import CookiePage from './components/Legal/CookiePage'
import ImprintPage from './components/Legal/ImprintPage'
import CookieBanner from './components/Legal/CookieBanner'
import LegalFooter from './components/Legal/LegalFooter'
import Spinner       from './components/UI/Spinner'

// ─────────────────────────────────────────────
// AUTH CONTEXT
// ─────────────────────────────────────────────
export const AuthContext = createContext(null)
export function useAuth() { return useContext(AuthContext) }

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Spinner />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

// ─────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────
const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/lead',      icon: Users,           label: 'Lead'       },
  { to: '/preventivi', icon: FileSignature,  label: 'Preventivi' },
  { to: '/ricevute',     icon: FileText,        label: 'Ricevute'     },
  { to: '/impostazioni', icon: Settings,        label: 'Impostazioni' },
  { to: '/team',         icon: UserCog,         label: 'Team'         },
  { to: '/billing',      icon: CreditCard,      label: 'Piano'        },
]

function Sidebar({ open, onClose, user, onLogout, isTeamMember, canManageTeam }) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-slate-950/70 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside className={`
        fixed top-0 left-0 h-full z-40 w-56
        bg-[#0d1117] border-r border-slate-800
        flex flex-col
        transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-14 border-b border-slate-800 shrink-0">
          <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
          <span className="font-display font-bold text-[15px] tracking-wider text-slate-100">
            LEAD<span className="text-cyan-400">OS</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-5 px-3 space-y-0.5 overflow-y-auto" data-tour="sidebar-nav">
          <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest px-3 mb-3">
            Principale
          </p>
          {NAV.filter(({ to }) => {
            if (isTeamMember && to === '/billing') return false
            if (to === '/team' && !canManageTeam) return false
            return true
          }).map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-150
                ${isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/70 border border-transparent'
                }
              `}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer utente */}
        <div className="border-t border-slate-800 p-3 shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-7 h-7 rounded-full bg-cyan-500/15 border border-cyan-500/25
                            flex items-center justify-center shrink-0">
              <span className="text-cyan-400 text-xs font-bold uppercase">
                {user?.email?.[0] ?? 'U'}
              </span>
            </div>
            <p className="text-slate-400 text-xs truncate flex-1 min-w-0">{user?.email}</p>
            <button
              onClick={onLogout}
              className="text-slate-600 hover:text-red-400 transition-colors shrink-0"
              title="Esci"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
          <LegalFooter className="px-2 pt-2 pb-1" />
        </div>
      </aside>
    </>
  )
}

// ─────────────────────────────────────────────
// APP LAYOUT (shell autenticata)
// ─────────────────────────────────────────────
function AppLayoutInner() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isTeamMember, ownerLabel, refresh: refreshWorkspace } = useWorkspace()
  const { canManageTeam } = usePlan()
  const { profile, loading: profileLoading, refresh: refreshProfile } = useProfile()
  const { addToast } = useToast()
  const [onboardingDismissed, setOnboardingDismissed] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const tourAutoStarted = useRef(false)

  const showOnboarding = !profileLoading && !isTeamMember
    && profile?.onboarding_completed !== true && !onboardingDismissed

  useEffect(() => {
    if (!user) return
    acceptStoredTeamInvite().then((r) => {
      if (r?.ok && !r.skipped) {
        addToast({ message: 'Accesso al team completato', variant: 'success' })
        refreshWorkspace()
        refreshProfile()
      } else if (r?.error && !r.skipped) {
        addToast({
          message: teamInviteErrorMessage(r.error),
          variant: 'error',
        })
      }
    })
  }, [user])

  useEffect(() => {
    function handleTourStart() {
      setShowTour(true)
    }
    window.addEventListener(TOUR_START_EVENT, handleTourStart)
    return () => window.removeEventListener(TOUR_START_EVENT, handleTourStart)
  }, [])

  useEffect(() => {
    if (profileLoading || showOnboarding || showTour) return
    if (profile?.product_tour_completed) return
    if (profile?.onboarding_completed !== true) return
    if (tourAutoStarted.current) return
    tourAutoStarted.current = true
    const t = setTimeout(() => setShowTour(true), 1200)
    return () => clearTimeout(t)
  }, [profileLoading, profile?.product_tour_completed, profile?.onboarding_completed, showOnboarding, showTour])

  function handleOnboardingDone() {
    setOnboardingDismissed(true)
    refreshProfile().then(() => {
      tourAutoStarted.current = true
      setShowTour(true)
    })
  }

  function handleTourComplete() {
    setShowTour(false)
    refreshProfile()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (!user) return <Spinner overlay />

  const titles = {
    '/dashboard': 'Panoramica',
    '/lead':      'Gestione Lead',
    '/preventivi': 'Preventivi',
    '/ricevute':     'Storico Ricevute',
    '/impostazioni': 'Impostazioni',
    '/team':         'Team',
    '/billing':      'Piano e fatturazione',
  }

  const views = {
    '/dashboard':    <DashboardView />,
    '/lead':         <LeadView />,
    '/preventivi':   <PreventiviView />,
    '/ricevute':     <RicevuteView />,
    '/impostazioni': <ImpostazioniView />,
    '/team':         <TeamView />,
    '/billing':      <BillingView />,
  }

  return (
    <LeoProvider>
      <div className="flex h-screen bg-slate-950 overflow-hidden font-body">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          user={user}
          onLogout={handleLogout}
          isTeamMember={isTeamMember}
          canManageTeam={canManageTeam}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-14 border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm
                             flex items-center px-4 sm:px-6 gap-4 shrink-0">
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="lg:hidden text-slate-500 hover:text-slate-200 transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-display font-bold text-slate-100 text-base">
                {titles[location.pathname] ?? 'LeadOS'}
              </h1>
              {isTeamMember && (
                <p className="text-violet-400/90 text-[11px] truncate">
                  Team · {ownerLabel || 'workspace condiviso'}
                </p>
              )}
            </div>
          </header>

        <main className="flex-1 overflow-y-auto">
          <SubscriptionBanner />
          {views[location.pathname] ?? <DashboardView />}
        </main>
        </div>

        {showOnboarding && (
          <OnboardingWizard onDone={handleOnboardingDone} />
        )}

        {showTour && !showOnboarding && (
          <ProductTour onComplete={handleTourComplete} />
        )}

        <LeoPanel />
        <LeoFab />
      </div>
    </LeoProvider>
  )
}

function AppLayout() {
  const { user } = useAuth()
  if (!user) return <Spinner overlay />
  return (
    <WorkspaceProvider>
      <AppLayoutInner />
    </WorkspaceProvider>
  )
}

// ─────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────
function PricingPage() {
  return (
    <div className="min-h-screen bg-stone-950 font-body">
      <PricingSection />
    </div>
  )
}

export default function App() {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/"          element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
            <Route path="/join-team" element={<JoinTeamView />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/termini" element={<TermsPage />} />
            <Route path="/cookie" element={<CookiePage />} />
            <Route path="/note-legali" element={<ImprintPage />} />
            <Route path="/login"     element={<PublicRoute><LoginForm /></PublicRoute>} />
            <Route
              path="/register"
              element={(
                <PublicRoute>
                  <LegacyTeamRedirect>
                    <RegisterForm />
                  </LegacyTeamRedirect>
                </PublicRoute>
              )}
            />
            <Route path="/dashboard" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
            <Route path="/lead"      element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
            <Route path="/preventivi" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
            <Route path="/ricevute"     element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
            <Route path="/impostazioni" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
            <Route path="/billing"      element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
            <Route path="/team"         element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
            <Route path="*"          element={<Navigate to="/login" replace />} />
          </Routes>
          <CookieBanner />
        </BrowserRouter>
      </ToastProvider>
    </AuthContext.Provider>
  )
}

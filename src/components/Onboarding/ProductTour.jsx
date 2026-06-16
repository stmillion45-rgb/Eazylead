import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../App'
import { TOUR_STEPS } from './tourSteps'

const NAV_DELAY_MS = 400
const MEASURE_DELAY_MS = 150
const SELECTOR_RETRY_MS = 100
const SELECTOR_MAX_RETRIES = 25

function TooltipCard({ step, index, total, onPrev, onNext, onSkip, rect, tryDone }) {
  const isCenter = step.placement === 'center' || !step.selector || !rect || step.fallbackCenter === true

  let style = {}
  if (!isCenter && rect) {
    const pad = 12
    const cardW = Math.min(320, window.innerWidth - 32)
    let top = rect.bottom + pad
    let left = rect.left

    if (step.placement === 'top') {
      top = rect.top - pad - 180
    } else if (step.placement === 'right') {
      top = rect.top
      left = rect.right + pad
    } else if (step.placement === 'left') {
      top = rect.top
      left = rect.left - cardW - pad
    }

    left = Math.max(16, Math.min(left, window.innerWidth - cardW - 16))
    top = Math.max(16, Math.min(top, window.innerHeight - 200))

    style = { position: 'fixed', top, left, width: cardW, zIndex: 72 }
  }

  const card = (
    <div className="bg-slate-900 border border-cyan-800/50 rounded-2xl shadow-2xl p-5 animate-slide-up">
      <p className="text-cyan-400 text-[10px] font-bold uppercase tracking-widest mb-1">
        Passo {index + 1} di {total}
      </p>
      <h3 className="text-slate-100 font-display font-semibold text-lg mb-2">{step.title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed mb-3">{step.body}</p>
      {step.try && !tryDone && (
        <p className="text-slate-500 text-xs leading-relaxed mb-3 border-l-2 border-slate-700 pl-3">
          {step.try.prompt}
        </p>
      )}
      {step.try && tryDone && (
        <p className="text-slate-400 text-xs mb-3 border-l-2 border-emerald-800/80 pl-3">
          {step.try.done}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onSkip} className="text-slate-500 text-xs hover:text-slate-300">
          Salta tour
        </button>
        <div className="flex gap-2">
          {index > 0 && (
            <button type="button" onClick={onPrev} className="btn-secondary text-xs min-h-[36px] px-3">
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <button type="button" onClick={onNext} className="btn-primary text-xs min-h-[36px] px-4 gap-1">
            {index === total - 1 ? 'Fine' : 'Avanti'}
            {index < total - 1 && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )

  if (isCenter) {
    return (
      <div className="fixed inset-0 z-[71] flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md">{card}</div>
      </div>
    )
  }

  return <div style={style} className="pointer-events-auto">{card}</div>
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default function ProductTour({ onComplete }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState(null)
  const [ready, setReady] = useState(false)
  const [tryDone, setTryDone] = useState(false)

  const step = TOUR_STEPS[index]
  const total = TOUR_STEPS.length

  useEffect(() => {
    setTryDone(false)
  }, [index])

  useEffect(() => {
    if (!ready || !step.try?.match) return

    function onInteract(e) {
      if (e.target.closest(step.try.match)) {
        setTryDone(true)
      }
    }

    document.addEventListener('pointerdown', onInteract, true)
    return () => document.removeEventListener('pointerdown', onInteract, true)
  }, [index, step.try, ready])

  useEffect(() => {
    if (step.route && location.pathname !== step.route) {
      navigate(step.route)
    }
  }, [index, step.id, step.route, location.pathname, navigate])

  useEffect(() => {
    let cancelled = false

    async function measure() {
      setReady(false)
      setRect(null)

      if (step.route) {
        let waited = 0
        while (location.pathname !== step.route && waited < 3000 && !cancelled) {
          await wait(100)
          waited += 100
        }
        if (cancelled) return
        if (location.pathname !== step.route) {
          setRect(null)
          setReady(true)
          return
        }
        await wait(NAV_DELAY_MS)
      } else {
        await wait(MEASURE_DELAY_MS)
      }

      if (cancelled) return

      let el = null
      if (step.selector && !step.fallbackCenter) {
        for (let i = 0; i < SELECTOR_MAX_RETRIES && !cancelled; i++) {
          el = document.querySelector(step.selector)
          if (el) break
          await wait(SELECTOR_RETRY_MS)
        }
      } else if (step.selector) {
        el = document.querySelector(step.selector)
        if (!el) {
          for (let i = 0; i < SELECTOR_MAX_RETRIES && !cancelled; i++) {
            el = document.querySelector(step.selector)
            if (el) break
            await wait(SELECTOR_RETRY_MS)
          }
        }
      }

      if (cancelled) return

      if (!el) {
        setRect(null)
        setReady(true)
        return
      }

      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      await wait(MEASURE_DELAY_MS)
      if (cancelled) return

      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) {
        setRect(null)
        setReady(true)
        return
      }

      setRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
        right: r.right,
        bottom: r.bottom,
      })
      setReady(true)
    }

    measure()
    return () => { cancelled = true }
  }, [index, step.id, step.selector, step.route, step.fallbackCenter, location.pathname])

  async function finish(skipped = false) {
    if (user) {
      await supabase.from('profiles').upsert({
        id: user.id,
        product_tour_completed: true,
      })
    }
    onComplete(skipped)
  }

  function goNext() {
    if (index >= total - 1) finish(false)
    else setIndex(i => i + 1)
  }

  function goPrev() {
    if (index > 0) setIndex(i => i - 1)
  }

  const pad = 8
  const spotlight = ready && rect && step.selector && !step.fallbackCenter ? (
    <div
      className="fixed z-[70] rounded-xl ring-2 ring-cyan-400 pointer-events-none transition-all duration-300"
      style={{
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
        boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.82)',
      }}
    />
  ) : ready ? (
    <div className="fixed inset-0 z-[70] bg-slate-950/85 pointer-events-none" />
  ) : null

  return (
    <div className="fixed inset-0 z-[69]" role="dialog" aria-modal="true" aria-label="Tour guidato LeadOS">
      <button
        type="button"
        className="fixed top-4 right-4 z-[73] p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700"
        onClick={() => finish(true)}
        aria-label="Chiudi tour"
      >
        <X className="w-5 h-5" />
      </button>

      {!ready && (
        <div className="fixed inset-0 z-[71] flex items-center justify-center pointer-events-none">
          <p className="text-slate-400 text-sm">Caricamento passo…</p>
        </div>
      )}

      {spotlight}

      {ready && (
        <TooltipCard
          step={step}
          index={index}
          total={total}
          rect={rect}
          tryDone={tryDone}
          onPrev={goPrev}
          onNext={goNext}
          onSkip={() => finish(true)}
        />
      )}
    </div>
  )
}

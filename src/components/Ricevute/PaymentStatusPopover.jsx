import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Check, Calendar } from 'lucide-react'
import {
  resolvePaymentStatus,
  PAYMENT_LABELS,
  PAYMENT_BADGE,
} from '../../utils/receiptPayment'

const MENU_W = 224
const MENU_GAP = 6

function computeMenuPosition(anchor) {
  const rect = anchor.getBoundingClientRect()
  const menuH = 200
  const vw = window.innerWidth
  const vh = window.innerHeight

  let top = rect.bottom + MENU_GAP
  let left = rect.left

  if (top + menuH > vh - 8) {
    top = rect.top - menuH - MENU_GAP
  }

  left = Math.max(8, Math.min(left, vw - MENU_W - 8))
  top = Math.max(8, Math.min(top, vh - menuH - 8))

  return { top, left }
}

export default function PaymentStatusPopover({ ricevuta, onUpdate, disabled }) {
  const [open, setOpen] = useState(false)
  const [dueInput, setDueInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef(null)
  const menuRef = useRef(null)

  const status = resolvePaymentStatus(ricevuta)

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return

    function place() {
      if (btnRef.current) setMenuPos(computeMenuPosition(btnRef.current))
    }

    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    setDueInput(ricevuta.due_date ? ricevuta.due_date.slice(0, 10) : '')
    function onDocClick(e) {
      if (btnRef.current?.contains(e.target)) return
      if (menuRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open, ricevuta.due_date])

  async function markPaid() {
    setSaving(true)
    await onUpdate(ricevuta.id, {
      payment_status: 'pagata',
      payment_date: new Date().toISOString(),
    })
    setSaving(false)
    setOpen(false)
  }

  async function saveDueDate() {
    setSaving(true)
    await onUpdate(ricevuta.id, {
      due_date: dueInput ? new Date(dueInput).toISOString() : null,
      payment_status: ricevuta.payment_status === 'pagata' ? 'pagata' : 'non_pagata',
    })
    setSaving(false)
    setOpen(false)
  }

  const menu = open ? (
    <div
      ref={menuRef}
      role="dialog"
      aria-label="Stato pagamento"
      className="fixed z-[80] w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 space-y-3 animate-fade-in"
      style={{ top: menuPos.top, left: menuPos.left }}
    >
      {status !== 'pagata' && (
        <button
          type="button"
          onClick={markPaid}
          disabled={saving}
          className="w-full flex items-center gap-2 text-left text-sm text-emerald-300 hover:bg-emerald-950/40 rounded-lg px-2 py-2 disabled:opacity-50"
        >
          <Check className="w-4 h-4 shrink-0" />
          Segna come pagata
        </button>
      )}
      <div>
        <label className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5 uppercase tracking-wider">
          <Calendar className="w-3 h-3" />
          Scadenza pagamento
        </label>
        <input
          type="date"
          value={dueInput}
          onChange={e => setDueInput(e.target.value)}
          className="input-base text-xs py-1.5"
        />
        <button
          type="button"
          onClick={saveDueDate}
          disabled={saving}
          className="mt-2 w-full btn-secondary text-xs py-1.5 min-h-0 justify-center disabled:opacity-50"
        >
          Salva scadenza
        </button>
      </div>
    </div>
  ) : null

  return (
    <div className="relative inline-block">
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border transition-colors
          ${PAYMENT_BADGE[status]} disabled:opacity-40`}
      >
        {PAYMENT_LABELS[status]}
      </button>

      {menu && createPortal(menu, document.body)}
    </div>
  )
}

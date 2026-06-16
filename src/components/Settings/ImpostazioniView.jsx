import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Save, Upload, Palette, Map, Users } from 'lucide-react'
import { useToast } from '../UI/Toast'
import { useProfile } from '../../hooks/useProfile'
import { useAuth } from '../../App'
import { useWorkspace } from '../../hooks/useWorkspace'
import { usePlan } from '../../hooks/usePlan'
import { uploadLogoFile } from '../../utils/uploadLogo'
import { LOGO_SHAPES, logoPreviewClass } from '../../utils/logoShape'
import { REGIME_OPTIONS } from '../../utils/receiptValidation'
import { PDF_THEMES } from '../../utils/pdfThemes'
import { startProductTour } from '../../utils/productTour'
import Spinner from '../UI/Spinner'
import PrivacyAccountSection from './PrivacyAccountSection'

function Field({ label, value, onChange, placeholder, type = 'text', hint, disabled = false }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="input-base disabled:opacity-60"
      />
      {hint && <p className="text-slate-600 text-xs mt-1">{hint}</p>}
    </div>
  )
}

export default function ImpostazioniView({ embedded = false }) {
  const { user } = useAuth()
  const { workspaceId, isTeamMember, ownerLabel } = useWorkspace()
  const { canManageTeam } = usePlan()
  const { profile, loading, saveProfile, canEditProfile } = useProfile()
  const { addToast } = useToast()
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    nome_azienda:   '',
    piva:           '',
    codice_fiscale: '',
    indirizzo:      '',
    regime_fiscale: 'ordinario',
    pdf_theme:      'classic',
    logo_url:       '',
    logo_shape:     'square',
    iban:           '',
    default_aliquota_iva: 22,
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (profile) {
      setForm({
        nome_azienda:   profile.nome_azienda || '',
        piva:           profile.piva || '',
        codice_fiscale: profile.codice_fiscale || '',
        indirizzo:      profile.indirizzo || '',
        regime_fiscale: profile.regime_fiscale || 'ordinario',
        pdf_theme:      profile.pdf_theme || 'classic',
        logo_url:       profile.logo_url || '',
        logo_shape:     profile.logo_shape || 'square',
        iban:           profile.iban || '',
        default_aliquota_iva: profile.default_aliquota_iva ?? 22,
      })
    }
  }, [profile])

  const themePreview = useMemo(
    () => PDF_THEMES[form.pdf_theme] || PDF_THEMES.classic,
    [form.pdf_theme],
  )

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await saveProfile(form)
    if (error) {
      addToast({ message: `Errore salvataggio: ${error.message}`, variant: 'error' })
    } else {
      addToast({ message: 'Dati salvati', variant: 'success' })
    }
    setSaving(false)
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user) return

    setUploading(true)
    const { error, publicUrl } = await uploadLogoFile(workspaceId, file)
    if (error) {
      addToast({ message: error.message, variant: 'error' })
      setUploading(false)
      return
    }

    const nextForm = { ...form, logo_url: publicUrl }
    setForm(nextForm)

    const { error: saveError } = await saveProfile(nextForm)
    if (saveError) {
      addToast({ message: `Logo caricato ma errore salvataggio: ${saveError.message}`, variant: 'error' })
    } else {
      addToast({ message: 'Logo caricato e salvato', variant: 'success' })
    }
    setUploading(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="md" />
      </div>
    )
  }

  return (
    <div className={embedded ? '' : 'p-4 sm:p-6 max-w-xl animate-fade-in'}>
      {isTeamMember && !embedded && (
        <div className="mb-4 p-3 rounded-xl border border-violet-900/50 bg-violet-950/30 text-violet-200 text-sm">
          Workspace condiviso{ownerLabel ? `: ${ownerLabel}` : ''}. Solo il titolare può modificare i dati azienda.
        </div>
      )}

      {canManageTeam && !embedded && (
        <Link
          to="/team"
          className="inline-flex items-center gap-2 mb-4 text-sm text-cyan-400 hover:text-cyan-300"
        >
          <Users className="w-4 h-4" />
          Gestione team (Agency)
        </Link>
      )}

      {!embedded && (
        <div className="flex items-center gap-3 mb-6" data-tour="impostazioni-header">
          <div className="w-10 h-10 bg-cyan-950 border border-cyan-900 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-slate-100 font-display font-bold text-lg">Profilo azienda</h2>
            <p className="text-slate-500 text-sm">
              Dati obbligatori per ricevute fiscali valide (PDF ed email).
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`${embedded ? '' : 'card'} p-6 space-y-5 ${embedded ? 'p-0' : ''}`}>
        <Field
          label="Nome azienda *"
          value={form.nome_azienda}
          onChange={v => set('nome_azienda', v)}
          placeholder="Es. Verde Giardini, Studio Rossi S.r.l."
          disabled={!canEditProfile}
        />
        <Field
          label="Partita IVA *"
          value={form.piva}
          onChange={v => set('piva', v)}
          placeholder="Es. IT12345678901"
          hint="11 cifre, con o senza prefisso IT"
          disabled={!canEditProfile}
        />
        <Field
          label="Codice fiscale"
          value={form.codice_fiscale}
          onChange={v => set('codice_fiscale', v)}
          placeholder="Es. RSSMRA80A01H501Z"
          hint="Utile per ditte individuali, artigiani e professionisti"
          disabled={!canEditProfile}
        />
        <Field
          label="Indirizzo sede *"
          value={form.indirizzo}
          onChange={v => set('indirizzo', v)}
          placeholder="Via Roma 1, 20100 Milano"
          disabled={!canEditProfile}
        />
        <Field
          label="IBAN (pagamenti)"
          value={form.iban}
          onChange={v => set('iban', v)}
          placeholder="IT60 X054 2811 1010 0000 0123 456"
          hint="Compare sulla ricevuta PDF per facilitare i bonifici"
          disabled={!canEditProfile}
        />

        <div data-tour="impostazioni-iva">
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
            Aliquota IVA predefinita
          </label>
          <select
            value={form.default_aliquota_iva}
            onChange={e => set('default_aliquota_iva', Number(e.target.value))}
            disabled={!canEditProfile}
            className="input-base disabled:opacity-60"
          >
            {[22, 10, 5, 4, 0].map(v => (
              <option key={v} value={v} className="bg-slate-900">{v}%</option>
            ))}
          </select>
          <p className="text-slate-600 text-xs mt-1">
            Usata di default in invio ricevute e nuovi preventivi.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
            Regime fiscale
          </label>
          <select
            value={form.regime_fiscale}
            onChange={e => set('regime_fiscale', e.target.value)}
            disabled={!canEditProfile}
            className="input-base disabled:opacity-60"
          >
            {REGIME_OPTIONS.map(r => (
              <option key={r.id} value={r.id} className="bg-slate-900">{r.label}</option>
            ))}
          </select>
          <p className="text-slate-600 text-xs mt-1">
            Determina le diciture legali e l&apos;IVA predefinita sulle ricevute.
            LeadOS genera ricevute/preventivi in PDF: non sostituisce la fatturazione elettronica né un commercialista.
          </p>
        </div>

        <div className="border-t border-slate-800 pt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-slate-500" />
            <p className="text-slate-300 text-sm font-medium">Design PDF</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PDF_THEMES).map(([id, t]) => (
              <button
                key={id}
                type="button"
                onClick={() => canEditProfile && set('pdf_theme', id)}
                disabled={!canEditProfile}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border min-h-[40px] transition-colors disabled:opacity-50 ${
                  form.pdf_theme === id
                    ? 'border-cyan-600 bg-cyan-950/40 text-cyan-300'
                    : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                }`}
              >
                <span className={`w-4 h-4 rounded-full ring-2 ${t.swatch}`} />
                {t.label}
              </button>
            ))}
          </div>
          <div
            className="h-10 rounded-lg flex items-center px-3 text-xs text-white font-medium"
            style={{ backgroundColor: `rgb(${themePreview.header.join(',')})` }}
          >
            <span style={{ color: `rgb(${themePreview.accent.join(',')})` }}>Anteprima colori PDF</span>
          </div>
        </div>

        <Field
          label="Logo (URL)"
          value={form.logo_url}
          onChange={v => set('logo_url', v)}
          placeholder="https://… oppure carica un file sotto"
          type="url"
          disabled={!canEditProfile}
        />
        {canEditProfile && (
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleLogoUpload}
          />
          <button
            type="button"
            disabled={uploading || saving}
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary min-h-[44px] disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Caricamento…' : 'Carica logo da file'}
          </button>
        </div>
        )}
        {form.logo_url.trim() && (
          <>
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Forma logo</p>
              <div className="flex flex-wrap gap-2">
                {LOGO_SHAPES.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => canEditProfile && set('logo_shape', id)}
                    disabled={!canEditProfile}
                    className={`px-3 py-2 rounded-lg text-xs font-medium min-h-[36px] border transition-colors disabled:opacity-50 ${
                      form.logo_shape === id
                        ? 'bg-violet-950 text-violet-300 border-violet-700'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700">
              <img
                src={form.logo_url.trim()}
                alt="Anteprima logo"
                className={logoPreviewClass(form.logo_shape)}
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            </div>
          </>
        )}

        {canEditProfile && (
        <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto min-h-[44px] disabled:opacity-50">
          <Save className="w-4 h-4" />
          {saving ? 'Salvataggio…' : 'Salva dati'}
        </button>
        )}

        {!embedded && (
          <button
            type="button"
            onClick={() => {
              startProductTour()
              addToast({ message: 'Tour guidato avviato', variant: 'info' })
            }}
            className="btn-secondary w-full sm:w-auto min-h-[44px] gap-2"
          >
            <Map className="w-4 h-4" />
            Rivedi tour guidato
          </button>
        )}
      </form>

      {!embedded && <PrivacyAccountSection />}
    </div>
  )
}

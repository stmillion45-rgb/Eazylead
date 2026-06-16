/**
 * ConsentSection.tsx
 * Eazylead™ — Sezione "Consensi e Privacy" per il form di registrazione
 *
 * Uso:
 *   import ConsentSection from "@/components/ConsentSection";
 *
 *   <ConsentSection
 *     onSubmit={(values) => handleRegistration(values)}
 *   />
 *
 * Oppure, se vuoi gestire lo stato dal form padre:
 *   <ConsentSection
 *     termsAccepted={termsAccepted}
 *     privacyAccepted={privacyAccepted}
 *     marketingAccepted={marketingAccepted}
 *     onTermsChange={setTermsAccepted}
 *     onPrivacyChange={setPrivacyAccepted}
 *     onMarketingChange={setMarketingAccepted}
 *     onSubmit={handleSubmit}
 *     isLoading={isSubmitting}
 *   />
 */

"use client";

import React, { useState } from "react";
import { CheckSquare, Square, Loader2, UserPlus, ShieldCheck } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConsentValues {
  terms: boolean;
  privacy: boolean;
  marketing: boolean;
}

/** Modalità "self-contained": gestisce il proprio stato interno */
interface StandaloneProps {
  onSubmit?: (values: ConsentValues) => void;
  isLoading?: boolean;
  // NON passare i valori controllati → usa stato interno
  termsAccepted?: undefined;
  privacyAccepted?: undefined;
  marketingAccepted?: undefined;
  onTermsChange?: undefined;
  onPrivacyChange?: undefined;
  onMarketingChange?: undefined;
}

/** Modalità "controllata": lo stato vive nel form padre */
interface ControlledProps {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  marketingAccepted: boolean;
  onTermsChange: (v: boolean) => void;
  onPrivacyChange: (v: boolean) => void;
  onMarketingChange: (v: boolean) => void;
  onSubmit?: (values: ConsentValues) => void;
  isLoading?: boolean;
}

type ConsentSectionProps = StandaloneProps | ControlledProps;

// ─── Custom Checkbox ──────────────────────────────────────────────────────────

interface CustomCheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  required?: boolean;
  badge?: "Obbligatorio" | "Facoltativo";
}

function CustomCheckbox({
  id,
  checked,
  onChange,
  label,
  required = false,
  badge,
}: CustomCheckboxProps) {
  return (
    <div className="flex items-start gap-3 group">
      {/* Hidden native checkbox for a11y */}
      <input
        type="checkbox"
        id={id}
        checked={checked}
        required={required}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />

      {/* Custom visual checkbox */}
      <label
        htmlFor={id}
        className="
          mt-0.5 shrink-0
          w-5 h-5
          rounded-md
          border border-zinc-600
          flex items-center justify-center
          cursor-pointer
          transition-all duration-150
          peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-zinc-950
          group-hover:border-emerald-500
          peer-checked:bg-emerald-600 peer-checked:border-emerald-600
          bg-zinc-900
        "
        aria-hidden="true"
      >
        {checked && (
          <svg
            viewBox="0 0 12 10"
            fill="none"
            className="w-3 h-3 text-white"
            aria-hidden="true"
          >
            <path
              d="M1 5l3.5 3.5L11 1"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </label>

      {/* Label + badge */}
      <div className="flex-1 min-w-0">
        <label
          htmlFor={id}
          className="
            text-sm text-zinc-300 leading-relaxed cursor-pointer
            hover:text-zinc-200 transition-colors duration-150
          "
        >
          {label}
        </label>
        {badge && (
          <span
            className={`
              ml-0 mt-1 inline-block
              text-[10px] font-semibold uppercase tracking-wide
              px-1.5 py-0.5 rounded
              ${
                badge === "Obbligatorio"
                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                  : "bg-zinc-800 text-zinc-500 border border-zinc-700"
              }
            `}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ConsentSection(props: ConsentSectionProps) {
  // Stato interno (standalone) — usato solo se le prop controllate non sono definite
  const [internalTerms, setInternalTerms] = useState(false);
  const [internalPrivacy, setInternalPrivacy] = useState(false);
  const [internalMarketing, setInternalMarketing] = useState(false);

  const isControlled = props.termsAccepted !== undefined;

  const termsAccepted    = isControlled ? props.termsAccepted!    : internalTerms;
  const privacyAccepted  = isControlled ? props.privacyAccepted!  : internalPrivacy;
  const marketingAccepted = isControlled ? props.marketingAccepted! : internalMarketing;

  const setTerms    = isControlled ? props.onTermsChange!    : setInternalTerms;
  const setPrivacy  = isControlled ? props.onPrivacyChange!  : setInternalPrivacy;
  const setMarketing = isControlled ? props.onMarketingChange! : setInternalMarketing;

  const canSubmit = termsAccepted && privacyAccepted;
  const isLoading = props.isLoading ?? false;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || isLoading) return;
    props.onSubmit?.({ terms: termsAccepted, privacy: privacyAccepted, marketing: marketingAccepted });
  }

  return (
    <section
      aria-labelledby="consent-heading"
      className="w-full"
    >
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck size={16} className="text-emerald-500 shrink-0" aria-hidden="true" />
        <h2
          id="consent-heading"
          className="text-xs font-semibold text-zinc-400 uppercase tracking-widest"
        >
          Consensi e Privacy
        </h2>
      </div>

      <div
        className="
          rounded-xl border border-zinc-800 bg-zinc-900/60
          px-5 py-5
          space-y-4
        "
      >
        {/* ── Checkbox 1: Termini ── */}
        <CustomCheckbox
          id="consent-terms"
          checked={termsAccepted}
          onChange={setTerms}
          required
          badge="Obbligatorio"
          label={
            <>
              Accetto i{" "}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 hover:underline transition-colors duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                Termini e Condizioni del Servizio
              </a>
              .
            </>
          }
        />

        {/* Divider */}
        <div className="border-t border-zinc-800" />

        {/* ── Checkbox 2: Privacy Policy (con link Iubenda) ── */}
        <CustomCheckbox
          id="consent-privacy"
          checked={privacyAccepted}
          onChange={setPrivacy}
          required
          badge="Obbligatorio"
          label={
            <>
              Dichiaro di aver letto e accettato la{" "}
              <a
                href="https://www.iubenda.com/privacy-policy/58775264"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 hover:underline transition-colors duration-150 iubenda-white iubenda-noiframe iubenda-embed"
                title="Privacy Policy"
                onClick={(e) => e.stopPropagation()}
              >
                Privacy Policy
              </a>{" "}
              e la{" "}
              <a
                href="https://www.iubenda.com/privacy-policy/58775264/cookie-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 hover:underline transition-colors duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                Cookie Policy
              </a>
              .
            </>
          }
        />

        {/* Divider */}
        <div className="border-t border-zinc-800" />

        {/* ── Checkbox 3: Marketing (facoltativo) ── */}
        <CustomCheckbox
          id="consent-marketing"
          checked={marketingAccepted}
          onChange={setMarketing}
          badge="Facoltativo"
          label="Acconsento al trattamento dei dati per finalità di marketing, newsletter e offerte commerciali."
        />
      </div>

      {/* Helper text */}
      {!canSubmit && (
        <p className="mt-2.5 text-xs text-zinc-600 pl-1" role="status" aria-live="polite">
          Accetta i consensi obbligatori per procedere con la registrazione.
        </p>
      )}

      {/* ── CTA Button ── */}
      <button
        type="submit"
        disabled={!canSubmit || isLoading}
        aria-disabled={!canSubmit || isLoading}
        onClick={handleSubmit}
        className={`
          mt-5 w-full
          flex items-center justify-center gap-2
          px-4 py-3
          rounded-xl
          text-sm font-semibold
          border
          transition-all duration-200
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950
          ${
            canSubmit && !isLoading
              ? `
                  bg-gradient-to-r from-emerald-500 to-green-600
                  hover:from-emerald-400 hover:to-green-500
                  active:scale-[0.98]
                  border-emerald-500/50
                  text-white
                  shadow-sm shadow-emerald-900/40
                  cursor-pointer
                `
              : `
                  bg-zinc-800
                  border-zinc-700
                  text-zinc-600
                  cursor-not-allowed
                `
          }
        `}
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            Registrazione in corso…
          </>
        ) : (
          <>
            <UserPlus size={16} aria-hidden="true" />
            Crea Account
          </>
        )}
      </button>
    </section>
  );
}

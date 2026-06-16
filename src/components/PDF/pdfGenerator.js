import jsPDF from 'jspdf'
import { loadLogoForPdf } from '../../utils/loadLogoForPdf'
import { buildPdfPalette } from '../../utils/pdfThemes'
import {
  getDocumentTitle,
  getLegalFooter,
  isProfileLegalForReceipt,
} from '../../utils/receiptValidation'

// ===================================================
// MODULO — pdfGenerator.js
// Genera una ricevuta PDF professionale per un lead
// usando jsPDF (client-side, nessun server richiesto).
//
// Restituisce { pdfBytes: Uint8Array, filename: string, meta: object }
//
// MODIFICHE:
//   - aliquotaIva (secondo parametro, default 22) — IVA dinamica
//   - text-wrapping automatico sulla descrizione servizio con splitTextToSize
//   - Y della tabella si adatta all'altezza reale della riga
// ===================================================

// Palette neutra + tema utente (header/accent) applicata in generateReceiptPDF
const NEUTRAL = {
  mid:     [30,  41,  59],
  subtle:  [71,  85, 105],
  light:   [148, 163, 184],
  white:   [248, 250, 252],
  emerald: [52,  211, 153],
  border:  [51,  65,  85],
}

function eur(val) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val || 0)
}

function dateIT(date = new Date()) {
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
}

function receiptNumber() {
  const now  = new Date()
  const year = now.getFullYear()
  const seq  = String(Date.now()).slice(-5)
  return `RIC-${year}-${seq}`
}

function quoteNumber() {
  const now  = new Date()
  const year = now.getFullYear()
  const seq  = String(Date.now()).slice(-5)
  return `PREV-${year}-${seq}`
}

function paymentStatusPdfLabel(status) {
  switch (status) {
    case 'pagata':     return { label: 'PAGATA', fill: [52, 211, 153] }
    case 'scaduta':    return { label: 'SCADUTA', fill: [248, 113, 113] }
    case 'non_pagata':
    default:           return { label: 'IN ATTESA DI PAGAMENTO', fill: [251, 191, 36] }
  }
}

const LOGO_MAX_W_MM = 24
const LOGO_MAX_H_MM = 22

function fitLogoMm(natW, natH) {
  const aspect = natW / natH
  let w = LOGO_MAX_W_MM
  let h = LOGO_MAX_H_MM
  if (aspect > LOGO_MAX_W_MM / LOGO_MAX_H_MM) {
    h = LOGO_MAX_W_MM / aspect
  } else {
    w = LOGO_MAX_H_MM * aspect
  }
  return { w, h }
}

// ===================================================
// FUNZIONE PRINCIPALE
// @param lead        {object}  — dati del lead
// @param aliquotaIva {number}  — aliquota IVA (22|10|5|4|0), default 22
// @param options     {object}  — company, documentStato ('INVIATO'|'BOZZA')
// ===================================================
export async function generateReceiptPDF(lead, aliquotaIva = 22, options = {}) {
  const {
    company,
    documentStato,
    documentType = 'receipt',
    paymentStatus,
    dueDate,
    validUntil,
    documentNumber,
  } = options
  const isQuote = documentType === 'quote'
  const theme = buildPdfPalette(company?.pdf_theme)
  const C = { ...NEUTRAL, dark: theme.dark, accent: theme.accent }
  const legal = isProfileLegalForReceipt(company)
  const docTitle = isQuote ? 'PREVENTIVO' : getDocumentTitle(company)
  const legalFooter = getLegalFooter(company, aliquotaIva)

  const logoShape = company?.logo_shape || 'square'
  const logoImage = company?.logo_url
    ? await loadLogoForPdf(company.logo_url, logoShape)
    : null
  const doc    = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const W      = doc.internal.pageSize.getWidth()   // 210 mm
  const H      = doc.internal.pageSize.getHeight()  // 297 mm
  const margin = 20

  // ── Calcoli fiscali dinamici (arrotondati al centesimo) ──────────────────────
  const imponibile = Math.round((parseFloat(lead.prezzo) || 0) * 100) / 100
  const ivaRate    = aliquotaIva / 100
  const iva        = Math.round(imponibile * ivaRate * 100) / 100
  const totale     = Math.round((imponibile + iva) * 100) / 100

  const numRicevuta = documentNumber || (isQuote ? quoteNumber() : receiptNumber())
  const dataOggi    = dateIT()

  // ============================================
  // SFONDO HEADER — barra superiore scura
  // ============================================
  doc.setFillColor(...C.dark)
  doc.rect(0, 0, W, 52, 'F')

  doc.setFillColor(...C.accent)
  doc.rect(0, 50, W, 2, 'F')

  // ============================================
  // INTESTAZIONE EMITTENTE (logo + profilo azienda o default LeadOS)
  // ============================================
  const nomeAzienda = company?.nome_azienda?.trim()
  let textX = margin
  let textMaxW = W - margin * 2 - 60

  if (logoImage) {
    const { w, h } = fitLogoMm(logoImage.width, logoImage.height)
    const logoY = 12 + (LOGO_MAX_H_MM - h) / 2
    doc.setFillColor(255, 255, 255)
    const pad = 0.6
    const corner = logoShape === 'round' ? Math.min(w, h) / 2 + pad : 1.2
    doc.roundedRect(margin - pad, logoY - pad, w + pad * 2, h + pad * 2, corner, corner, 'F')
    doc.addImage(logoImage.dataUrl, logoImage.format, margin, logoY, w, h)
    textX = margin + LOGO_MAX_W_MM + 5
    textMaxW = W - textX - 60
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(nomeAzienda ? 18 : 24)
  doc.setTextColor(...C.white)

  if (nomeAzienda) {
    const nomeLines = doc.splitTextToSize(nomeAzienda, textMaxW)
    doc.text(nomeLines, textX, 26)
    let subY = 26 + nomeLines.length * 6 + 2
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...C.light)
    if (company?.piva?.trim()) {
      doc.text(`P.IVA ${company.piva.trim()}`, textX, subY)
      subY += 4
    }
    if (company?.codice_fiscale?.trim()) {
      doc.text(`C.F. ${company.codice_fiscale.trim()}`, textX, subY)
      subY += 4
    }
    if (company?.indirizzo?.trim()) {
      const addrLines = doc.splitTextToSize(company.indirizzo.trim(), textMaxW)
      doc.text(addrLines, textX, subY)
    }
  } else if (!logoImage) {
    doc.text('Lead', margin, 28)
    doc.setTextColor(...C.accent)
    const leadWidth = doc.getTextWidth('Lead')
    doc.text('OS', margin + leadWidth, 28)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...C.light)
    doc.text('Sistema di Gestione Clienti', margin, 35)
  } else {
    // Solo logo: mostra P.IVA / indirizzo accanto se presenti
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...C.light)
    let subY = 22
    if (company?.piva?.trim()) {
      doc.text(`P.IVA ${company.piva.trim()}`, textX, subY)
      subY += 4
    }
    if (company?.codice_fiscale?.trim()) {
      doc.text(`C.F. ${company.codice_fiscale.trim()}`, textX, subY)
      subY += 4
    }
    if (company?.indirizzo?.trim()) {
      const addrLines = doc.splitTextToSize(company.indirizzo.trim(), textMaxW)
      doc.text(addrLines, textX, subY)
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...C.white)
  doc.text(docTitle, W - margin, 24, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...C.accent)
  doc.text(numRicevuta, W - margin, 31, { align: 'right' })
  doc.setFontSize(7)
  doc.setTextColor(...C.light)
  doc.text(`Nr. doc. ${numRicevuta}`, W - margin, 37, { align: 'right' })

  // ============================================
  // META-INFO (data + stato)
  // ============================================
  let y = 66

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...C.subtle)
  doc.text('DATA EMISSIONE', margin, y)
  doc.text('STATO', W / 2, y)

  y += 5
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...C.dark)
  doc.text(dataOggi, margin, y)

  let statoLabel
  let badgeFill

  if (isQuote) {
    statoLabel = (documentStato || 'BOZZA').toUpperCase()
    const quoteColors = {
      BOZZA:     [148, 163, 184],
      INVIATO:   [56, 189, 248],
      ACCETTATO: [52, 211, 153],
      RIFIUTATO: [248, 113, 113],
    }
    badgeFill = quoteColors[statoLabel] || [148, 163, 184]
  } else if (paymentStatus) {
    const ps = paymentStatusPdfLabel(paymentStatus)
    statoLabel = ps.label
    badgeFill = ps.fill
  } else {
    statoLabel = documentStato
      ? documentStato.toUpperCase()
      : (lead.stato || 'concluso').toUpperCase()
    const statoColors = {
      INVIATO:   [52, 211, 153],
      BOZZA:     [148, 163, 184],
      NUOVO:     [148, 163, 184],
      CONCLUSO:  [52, 211, 153],
    }
    badgeFill = statoColors[statoLabel] || [52, 211, 153]
  }

  const badgeW = Math.max(28, doc.getTextWidth(statoLabel) + 10)

  doc.setFillColor(...badgeFill)
  doc.roundedRect(W / 2, y - 5, badgeW, 7, 1.5, 1.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(15, 23, 42)
  doc.text(statoLabel, W / 2 + badgeW / 2, y - 0.5, { align: 'center' })

  if (!isQuote && dueDate) {
    y += 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...C.subtle)
    doc.text(`Scadenza pagamento: ${dateIT(new Date(dueDate))}`, margin, y)
  }

  if (isQuote && validUntil) {
    y += 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...C.subtle)
    doc.text(`Validità: fino al ${dateIT(new Date(validUntil))}`, margin, y)
  }

  // ============================================
  // DIVIDER
  // ============================================
  y += 12
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.3)
  doc.line(margin, y, W - margin, y)

  // ============================================
  // SEZIONE CLIENTE
  // ============================================
  y += 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...C.subtle)
  doc.text('DESTINATARIO / CLIENTE', margin, y)

  y += 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...C.dark)
  doc.text(lead.nome || 'Cliente', margin, y)

  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...C.subtle)
  if (lead.email)    { doc.text(lead.email,    margin, y); y += 5 }
  if (lead.telefono) { doc.text(lead.telefono, margin, y); y += 5 }

  // ============================================
  // TABELLA SERVIZI
  // ============================================
  y += 10

  // Header riga
  doc.setFillColor(...C.dark)
  doc.rect(margin, y, W - margin * 2, 9, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.white)
  doc.text('DESCRIZIONE SERVIZIO', margin + 4,    y + 5.8)
  doc.text('QTÀ',    W - margin - 48, y + 5.8, { align: 'center' })
  doc.text('PREZZO', W - margin - 4,  y + 5.8, { align: 'right'  })

  // ── Riga servizio — TEXT-WRAP DINAMICO ──────────────────────────────────────
  y += 9

  const colDescX  = margin + 4          // 24 mm — inizio testo descrizione
  const colQtyX   = W - margin - 48     // 142 mm — centro colonna QTÀ
  const maxDescW  = colQtyX - colDescX - 18   // ~100 mm — larghezza max prima di QTÀ
  const lineH     = 5                   // mm per riga a 9pt

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)

  const righe  = doc.splitTextToSize(lead.servizio || 'Servizio professionale', maxDescW)
  const rowH   = Math.max(12, righe.length * lineH + 8)   // altezza riga dinamica
  const midY   = y + rowH / 2 + 1.5                        // centro verticale per QTÀ e PREZZO

  doc.setFillColor(248, 250, 252)
  doc.rect(margin, y, W - margin * 2, rowH, 'F')

  doc.setTextColor(...C.dark)
  doc.text(righe, colDescX, y + 5.5)                       // testo multiriga

  doc.text('1', W - margin - 48, midY, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.text(eur(imponibile), W - margin - 4, midY, { align: 'right' })

  // Bordo tabella (altezza dinamica = header 9mm + riga rowH)
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.3)
  doc.rect(margin, y - 9, W - margin * 2, rowH + 9, 'S')

  // ============================================
  // RIQUADRO TOTALI
  // ============================================
  y += rowH + 8   // ← era y += 20 fisso; ora si adatta all'altezza reale

  const totaliX = W / 2
  const totaliW = W / 2 - margin

  doc.setFillColor(241, 245, 249)
  doc.roundedRect(totaliX, y, totaliW, 38, 2, 2, 'F')

  const labelX = totaliX + 5
  const valX   = totaliX + totaliW - 5
  let ty       = y + 10

  // Imponibile
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...C.subtle)
  doc.text('Imponibile', labelX, ty)
  doc.setTextColor(...C.dark)
  doc.text(eur(imponibile), valX, ty, { align: 'right' })

  ty += 8

  // IVA — etichetta con aliquota dinamica
  doc.setTextColor(...C.subtle)
  doc.text(`IVA (${aliquotaIva}%)`, labelX, ty)
  doc.setTextColor(...C.dark)
  doc.text(eur(iva), valX, ty, { align: 'right' })

  ty += 4
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.3)
  doc.line(totaliX + 5, ty, totaliX + totaliW - 5, ty)
  ty += 7

  // Totale
  doc.setFillColor(...C.dark)
  doc.roundedRect(totaliX + 3, ty - 5.5, totaliW - 6, 10, 1.5, 1.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...C.white)
  doc.text('TOTALE', labelX + 2, ty + 1.5)
  doc.setTextColor(...C.accent)
  doc.text(eur(totale), valX - 2, ty + 1.5, { align: 'right' })

  // ============================================
  // NOTE FISCALI
  // ============================================
  y += 18
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.subtle)
  const legalLines = doc.splitTextToSize(legalFooter, W - margin * 2)
  doc.text(legalLines, margin, y)
  y += legalLines.length * 3.5 + 4

  if (legal) {
    let payLine = 'Modalità di pagamento: saldo a vista salvo diverso accordo.'
    const iban = company?.iban?.trim()
    if (iban) payLine += ` IBAN: ${iban}`
    const payLines = doc.splitTextToSize(payLine, W - margin * 2)
    doc.text(payLines, margin, y)
    y += payLines.length * 3.5 + 2
  }

  if (isQuote) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7)
    doc.setTextColor(...C.subtle)
    doc.text('Questo preventivo non costituisce fattura fiscale.', margin, y)
    y += 5
  }

  // ============================================
  // FOOTER
  // ============================================
  y += 8
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.3)
  doc.line(margin, y, W - margin, y)

  y += 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...C.subtle)
  if (legal) {
    doc.text(
      `Documento generato elettronicamente il ${dateIT()} · ${numRicevuta}`,
      W / 2, y, { align: 'center' },
    )
  } else {
    doc.text(
      'Profilo azienda incompleto: completa Nome, P.IVA e Indirizzo in Impostazioni per una ricevuta fiscalmente valida.',
      W / 2, y, { align: 'center' },
    )
    y += 5
    doc.setTextColor(...C.light)
    doc.text(`Generato il ${dateIT()} · ${numRicevuta}`, W / 2, y, { align: 'center' })
  }

  // ============================================
  // OUTPUT
  // ============================================
  const filename = isQuote
    ? `preventivo_${lead.nome?.replace(/\s+/g, '_').toLowerCase()}_${numRicevuta}.pdf`
    : `ricevuta_${lead.nome?.replace(/\s+/g, '_').toLowerCase()}_${numRicevuta}.pdf`
  const pdfBytes = doc.output('arraybuffer')

  return {
    pdfBytes: new Uint8Array(pdfBytes),
    filename,
    meta: {
      imponibile,
      iva,
      totale,
      numRicevuta,
      aliquotaIva,
      logoIncluso: Boolean(logoImage),
    },
  }
}

export async function generateQuotePDF(lead, aliquotaIva = 22, options = {}) {
  return generateReceiptPDF(lead, aliquotaIva, {
    ...options,
    documentType: 'quote',
  })
}

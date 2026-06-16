// supabase/functions/send-email/index.ts
// Edge Function Deno — Supabase
//
// DEPLOY:
//   supabase functions deploy send-email --project-ref ciaklzqpfcbmegzckdkt
//
// VARIABILE D'AMBIENTE richiesta (Supabase Dashboard):
//   Settings → Edge Functions → Secrets → RESEND_API_KEY
//
// Payload: autenticazione JWT obbligatoria. Ricevute: leadId. Team: inviteToken.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const FREE_EMAIL_LIMIT = 10

type Company = {
  nome_azienda?: string | null
  piva?: string | null
  indirizzo?: string | null
  logo_url?: string | null
  logo_shape?: string | null
}

function logoImgStyle(shape: string | null | undefined): string {
  switch (shape) {
    case 'round':
      return 'display:block;width:48px;height:48px;object-fit:cover;border-radius:50%;margin-bottom:8px;'
    case 'oval':
      return 'display:block;width:56px;height:40px;object-fit:cover;border-radius:50%;margin-bottom:8px;'
    default:
      return 'display:block;max-height:48px;max-width:120px;width:auto;height:auto;margin-bottom:8px;border-radius:4px;'
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatEur(val: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(val)
}

function cleanLogoUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim()
  if (!trimmed) return null
  try {
    const u = new URL(trimmed.split('?')[0])
    if (u.protocol !== 'https:') return null
    return u.toString()
  } catch {
    return null
  }
}

async function resolveWorkspaceId(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<string> {
  const { data: membership } = await admin
    .from('team_members')
    .select('owner_id')
    .eq('member_id', userId)
    .maybeSingle()
  return membership?.owner_id ?? userId
}

function monthStartIso(): string {
  const d = new Date()
  d.setUTCDate(1)
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

function buildHeaderHtml(company: Company | undefined, numRicevuta: string, docLabel = 'Ricevuta'): string {
  const nome = company?.nome_azienda?.trim()
  const logo = cleanLogoUrl(company?.logo_url)

  if (nome || logo) {
    const logoBlock = logo
      ? `<img src="${esc(logo)}" alt="Logo" style="${logoImgStyle(company?.logo_shape)}" />`
      : ''
    const pivaLine = company?.piva?.trim()
      ? `<p style="color:#64748b;font-size:12px;margin:4px 0 0;">P.IVA ${esc(company.piva.trim())}</p>`
      : ''
    const addrLine = company?.indirizzo?.trim()
      ? `<p style="color:#64748b;font-size:12px;margin:2px 0 0;">${esc(company.indirizzo.trim())}</p>`
      : ''
    const title = nome
      ? `<span style="font-size:22px;font-weight:800;color:#f8fafc;letter-spacing:-0.5px;">${esc(nome)}</span>`
      : ''

    return `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
          <div>
            ${logoBlock}
            ${title}
            ${pivaLine}
            ${addrLine}
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <p style="color:#64748b;font-size:11px;margin:0;text-transform:uppercase;letter-spacing:1px;">${esc(docLabel)}</p>
            <p style="color:#22d3ee;font-size:13px;font-weight:600;margin:4px 0 0;font-family:monospace;">${esc(numRicevuta)}</p>
          </div>
        </div>`
  }

  return `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <span style="font-size:26px;font-weight:800;color:#f8fafc;letter-spacing:-0.5px;">Lead<span style="color:#22d3ee;">OS</span></span>
            <p style="color:#64748b;font-size:12px;margin:4px 0 0;">Sistema di Gestione Clienti</p>
          </div>
          <div style="text-align:right;">
            <p style="color:#64748b;font-size:11px;margin:0;text-transform:uppercase;letter-spacing:1px;">${esc(docLabel)}</p>
            <p style="color:#22d3ee;font-size:13px;font-weight:600;margin:4px 0 0;font-family:monospace;">${esc(numRicevuta)}</p>
          </div>
        </div>`
}

function buildEmailHtml(params: {
  nome: string
  servizio: string
  totale: number
  receiptUrl: string
  numRicevuta: string
  imponibile: number
  iva: number
  aliquotaIva: number
  company?: Company
  docType?: string
}): string {
  const {
    nome, servizio, totale, receiptUrl, numRicevuta,
    imponibile, iva, aliquotaIva, company, docType,
  } = params

  const isQuote = docType === 'quote'
  const docLabel = isQuote ? 'Preventivo' : 'Ricevuta'
  const intro = isQuote
    ? 'Ti inviamo il preventivo richiesto. Il PDF è allegato; puoi anche scaricarlo dal pulsante qui sotto.'
    : 'Ti inviamo la ricevuta relativa alla prestazione effettuata.<br>Il PDF è allegato a questa email; puoi anche scaricarlo dal pulsante qui sotto.'
  const btnLabel = isQuote ? 'Scarica Preventivo PDF' : 'Scarica Ricevuta PDF'

  const dataOggi = new Date().toLocaleDateString('it-IT', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const ivaLabel = aliquotaIva === 0 ? 'IVA (esente)' : `IVA (${aliquotaIva}%)`

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${docLabel} ${esc(numRicevuta)}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:580px;margin:0 auto;padding:40px 20px;">

    <div style="background:#0f172a;border:1px solid #1e293b;border-radius:16px;overflow:hidden;margin-bottom:24px;">
      <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:32px 32px 28px;border-bottom:2px solid #22d3ee;">
        ${buildHeaderHtml(company, numRicevuta, docLabel)}
      </div>

      <div style="padding:28px 32px 0;">
        <p style="color:#94a3b8;font-size:14px;margin:0 0 6px;">Gentile</p>
        <p style="color:#f8fafc;font-size:20px;font-weight:700;margin:0 0 16px;">${esc(nome)}</p>
        <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 24px;">
          ${intro}
        </p>
      </div>

      <div style="margin:0 32px 24px;background:#1e293b;border-radius:12px;overflow:hidden;">
        <div style="background:#0f172a;padding:10px 16px;border-bottom:1px solid #334155;">
          <p style="color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin:0;">Dettaglio</p>
        </div>
        <div style="padding:16px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
            <span style="color:#94a3b8;font-size:13px;">${esc(servizio)}</span>
            <span style="color:#f8fafc;font-size:13px;font-weight:500;">${formatEur(imponibile)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
            <span style="color:#64748b;font-size:12px;">${ivaLabel}</span>
            <span style="color:#64748b;font-size:12px;">${formatEur(iva)}</span>
          </div>
          <div style="border-top:1px solid #334155;padding-top:12px;display:flex;justify-content:space-between;">
            <span style="color:#f8fafc;font-size:15px;font-weight:700;">Totale</span>
            <span style="color:#22d3ee;font-size:16px;font-weight:800;font-family:monospace;">${formatEur(totale)}</span>
          </div>
        </div>
      </div>

      <div style="padding:0 32px 32px;text-align:center;">
        <a href="${esc(receiptUrl)}"
           style="display:inline-block;background:#22d3ee;color:#0f172a;font-weight:700;
                  font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none;">
          ${btnLabel}
        </a>
        <p style="color:#475569;font-size:11px;margin:16px 0 0;">
          Il link è valido per 7 giorni · ${dataOggi}
        </p>
      </div>
    </div>

    <p style="color:#334155;font-size:11px;text-align:center;line-height:1.6;margin:0;">
      Messaggio generato automaticamente · Non rispondere · ${esc(numRicevuta)}
    </p>
  </div>
</body>
</html>`
}

function buildTeamInviteEmailHtml(params: {
  ownerName: string
  inviteUrl: string
  inviteeEmail: string
}): string {
  const { ownerName, inviteUrl, inviteeEmail } = params
  const dataOggi = new Date().toLocaleDateString('it-IT', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;margin-bottom:16px;">
      <div style="background:linear-gradient(135deg,#4c1d95,#1e293b);padding:28px 24px;">
        <p style="margin:0;color:#c4b5fd;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Invito team LeadOS</p>
        <h1 style="margin:8px 0 0;color:#f8fafc;font-size:22px;font-weight:800;">Collabora con ${esc(ownerName)}</h1>
      </div>
      <div style="padding:24px;">
        <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 16px;">
          Ciao,<br><br>
          <strong style="color:#f1f5f9;">${esc(ownerName)}</strong> ti ha invitato a unirti al workspace LeadOS
          (lead, preventivi e ricevute condivise).
        </p>
        <p style="color:#94a3b8;font-size:13px;margin:0 0 20px;">
          Invito per: <strong style="color:#e2e8f0;">${esc(inviteeEmail)}</strong><br>
          Registrati o accedi con questa email, poi apri il link.
        </p>
        <a href="${esc(inviteUrl)}"
           style="display:inline-block;background:#22d3ee;color:#0f172a;font-weight:700;
                  font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none;">
          Accetta invito
        </a>
        <p style="color:#475569;font-size:11px;margin:16px 0 0;word-break:break-all;">
          ${esc(inviteUrl)}
        </p>
        <p style="color:#475569;font-size:11px;margin:8px 0 0;">
          Link valido 14 giorni · ${dataOggi}
        </p>
      </div>
    </div>
    <p style="color:#334155;font-size:11px;text-align:center;line-height:1.6;margin:0;">
      Messaggio automatico LeadOS · Non rispondere
    </p>
  </div>
</body>
</html>`
}

Deno.serve(async (req: Request) => {
  const headers = corsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, req)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Non autenticato' }, 401, req)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabaseUser = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) return jsonResponse({ error: 'Sessione non valida' }, 401, req)

    const admin = createClient(supabaseUrl, serviceKey)
    const workspaceId = await resolveWorkspaceId(admin, user.id)

    const body = await req.json()
    const {
      to, nome, servizio, totale, receiptUrl, numRicevuta,
      imponibile, iva, aliquotaIva, company,
      pdfBase64, pdfFilename, docType,
      inviteUrl, ownerName, leadId, quoteId, inviteToken,
    } = body

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      return jsonResponse({
        error: 'RESEND_API_KEY non configurata in Supabase → Settings → Edge Functions → Secrets.',
      }, 500, req)
    }

    let emailPayload: Record<string, unknown>

    if (docType === 'team_invite') {
      if (workspaceId !== user.id) {
        return jsonResponse({ error: 'Solo il titolare può inviare inviti team' }, 403, req)
      }

      const { data: sub } = await admin
        .from('subscriptions')
        .select('plan, status')
        .eq('azienda_id', workspaceId)
        .maybeSingle()

      if (sub?.plan !== 'agency' || !['active', 'trialing'].includes(sub?.status ?? '')) {
        return jsonResponse({ error: 'Piano Agency richiesto' }, 403, req)
      }

      const toNorm = String(to || '').trim().toLowerCase()
      const tokenNorm = String(inviteToken || '').trim()
      if (!toNorm || !tokenNorm) {
        return jsonResponse({ error: 'Campi obbligatori: to, inviteToken' }, 400, req)
      }

      const { data: inv } = await admin
        .from('team_invites')
        .select('id, email, token, expires_at, accepted_at')
        .eq('owner_id', workspaceId)
        .eq('token', tokenNorm)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()

      if (!inv || inv.email?.toLowerCase() !== toNorm) {
        return jsonResponse({ error: 'Invito non valido o non corrispondente' }, 403, req)
      }

      const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'
      const url = `${appUrl.replace(/\/$/, '')}/join-team?token=${encodeURIComponent(tokenNorm)}`
      const owner = (ownerName || company?.nome_azienda || 'il titolare del team').trim()

      emailPayload = {
        from: 'LeadOS <ricevute@resend.dev>',
        to: [toNorm],
        subject: `Invito team LeadOS — ${owner}`,
        html: buildTeamInviteEmailHtml({
          ownerName: owner,
          inviteUrl: url,
          inviteeEmail: toNorm,
        }),
      }
    } else {
      const leadUuid = String(leadId || '').trim()
      if (!leadUuid || !to || !nome || !receiptUrl) {
        return jsonResponse({
          error: 'Campi obbligatori: leadId, to, nome, receiptUrl',
        }, 400, req)
      }

      const { data: lead } = await admin
        .from('leads')
        .select('id, email, nome, azienda_id')
        .eq('id', leadUuid)
        .eq('azienda_id', workspaceId)
        .maybeSingle()

      if (!lead) {
        return jsonResponse({ error: 'Lead non trovato nel workspace' }, 403, req)
      }

      if (lead.email?.toLowerCase() !== String(to).trim().toLowerCase()) {
        return jsonResponse({ error: 'Email destinatario non corrisponde al lead' }, 403, req)
      }

      if (docType === 'quote' && quoteId) {
        const { data: quote } = await admin
          .from('quotes')
          .select('id')
          .eq('id', quoteId)
          .eq('azienda_id', workspaceId)
          .eq('lead_id', leadUuid)
          .maybeSingle()
        if (!quote) {
          return jsonResponse({ error: 'Preventivo non valido' }, 403, req)
        }
      }

      const { data: sub } = await admin
        .from('subscriptions')
        .select('plan, status')
        .eq('azienda_id', workspaceId)
        .maybeSingle()

      const plan = sub?.plan ?? 'free'
      const active = ['active', 'trialing'].includes(sub?.status ?? '')

      if (plan === 'free' || !active) {
        const { count } = await admin
          .from('receipts')
          .select('id', { count: 'exact', head: true })
          .eq('azienda_id', workspaceId)
          .gte('created_at', monthStartIso())

        if ((count ?? 0) >= FREE_EMAIL_LIMIT) {
          return jsonResponse({
            error: 'Limite email mensile raggiunto (piano Free). Passa a Pro.',
            code: 'email_limit',
          }, 403, req)
        }
      }

      const tot = Number(totale) || 0
      const imp = imponibile != null ? Number(imponibile) : tot / 1.22
      const ivaVal = iva != null ? Number(iva) : tot - imp
      const aliq = aliquotaIva != null ? Number(aliquotaIva) : 22

      const isQuote = docType === 'quote'
      const docLabel = isQuote ? 'Preventivo' : 'Ricevuta'

      emailPayload = {
        from: 'LeadOS <ricevute@resend.dev>',
        to: [String(to).trim()],
        subject: `${docLabel} ${numRicevuta} — ${nome}`,
        html: buildEmailHtml({
          nome,
          servizio: servizio || 'Servizio professionale',
          totale: tot,
          receiptUrl,
          numRicevuta: numRicevuta || '',
          imponibile: imp,
          iva: ivaVal,
          aliquotaIva: aliq,
          company,
          docType,
        }),
      }

      if (pdfBase64 && pdfFilename) {
        const maxBytes = 8 * 1024 * 1024
        if (String(pdfBase64).length > maxBytes) {
          return jsonResponse({ error: 'PDF troppo grande' }, 400, req)
        }
        emailPayload.attachments = [
          { filename: String(pdfFilename).slice(0, 120), content: pdfBase64 },
        ]
      }
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    })

    if (!resendResponse.ok) {
      const resendError = await resendResponse.json()
      throw new Error(`Resend error: ${JSON.stringify(resendError)}`)
    }

    const { id } = await resendResponse.json()
    return jsonResponse({ success: true, id }, 200, req)
  } catch (err) {
    console.error('[send-email]', err)
    return jsonResponse({ error: err?.message ?? 'Errore invio email' }, 500, req)
  }
})

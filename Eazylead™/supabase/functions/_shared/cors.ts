const DEFAULT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

function allowedOrigins(): string[] {
  const app = Deno.env.get('APP_URL')?.trim()
  const extra = Deno.env.get('CORS_ORIGINS')?.split(',').map((s) => s.trim()).filter(Boolean) ?? []
  const list = [...DEFAULT_ORIGINS, ...extra]
  if (app) list.push(app.replace(/\/$/, ''))
  return [...new Set(list)]
}

export function corsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get('Origin') ?? ''
  const allow = allowedOrigins().includes(origin) ? origin : allowedOrigins()[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

/** @deprecated use corsHeaders(req) */
export const CORS_HEADERS = corsHeaders()

export function jsonResponse(body: unknown, status = 200, req?: Request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}
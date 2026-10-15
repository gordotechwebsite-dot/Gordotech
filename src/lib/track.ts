// Private visitor log: page views and contact clicks go to the Gordotech API (/api/track).
const API_URL = import.meta.env.VITE_API_URL || 'https://gordotech-api.fly.dev'

const WHATSAPP_SEDES: Record<string, string> = {
  '573144810431': 'Duitama',
  '573219863883': 'Tunja',
  '573213815465': 'Clinica',
  LXBP7OHGAN7SP1: 'Duitama',
}

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

function storedId(storage: Storage, key: string) {
  try {
    let id = storage.getItem(key)
    if (!id) {
      id = randomId()
      storage.setItem(key, id)
    }
    return id
  } catch {
    return randomId()
  }
}

function send(payload: Record<string, unknown>) {
  const body = JSON.stringify({
    visitor_id: storedId(localStorage, 'gordotech_vid'),
    session_id: storedId(sessionStorage, 'gordotech_sid'),
    screen: `${window.screen.width}x${window.screen.height}`,
    lang: navigator.language || '',
    ...payload,
  })
  try {
    // text/plain keeps it a CORS "simple" request (no preflight)
    fetch(`${API_URL}/api/track`, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => {})
  } catch {
    /* tracking must never break the page */
  }
}

let sessionStarted = false

export function trackPageView(path: string, search: string) {
  const first = !sessionStarted && !sessionStorage.getItem('gordotech_sid_started')
  sessionStarted = true
  try { sessionStorage.setItem('gordotech_sid_started', '1') } catch { /* ignore */ }
  const params = new URLSearchParams(search)
  const referrer = first && document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer : ''
  send({
    kind: 'pageview',
    path,
    first,
    referrer,
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
  })
}

function classifyLink(href: string): { event: string; label: string } | null {
  const low = href.toLowerCase()
  if (low.includes('wa.me/') || low.includes('whatsapp.com/')) {
    const key = Object.keys(WHATSAPP_SEDES).find(k => href.includes(k))
    return { event: 'whatsapp', label: key ? WHATSAPP_SEDES[key] : 'WhatsApp' }
  }
  if (low.startsWith('tel:')) return { event: 'llamada', label: href.slice(4) }
  if (low.includes('google.com/maps') || low.includes('maps.google') || low.includes('maps.app.goo.gl') || low.includes('waze.com')) {
    return { event: 'como_llegar', label: low.includes('clinica') ? 'Clinica' : low.includes('tunja') ? 'Tunja' : low.includes('duitama') ? 'Duitama' : 'Mapa' }
  }
  for (const net of ['instagram', 'tiktok', 'facebook']) {
    if (low.includes(`${net}.com`)) return { event: 'red_social', label: net.charAt(0).toUpperCase() + net.slice(1) }
  }
  return null
}

export function trackContactClick(e: MouseEvent) {
  const link = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
  if (!link) return
  const hit = classifyLink(link.href)
  if (hit) send({ kind: 'event', ...hit, path: window.location.pathname })
}

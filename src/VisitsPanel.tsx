import { useState, useEffect, useCallback, Fragment } from 'react'
import { RefreshCw } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://gordotech-api.fly.dev'

type Item = { name: string; count: number }

type Summary = {
  totals: { visitors: number; sessions: number; pageviews: number; whatsapp: number; llamada: number; como_llegar: number; red_social: number }
  by_day: { day: string; visitors: number; pageviews: number }[]
  by_hour: { hour: number; count: number }[]
  cities: Item[]
  devices: Item[]
  os: Item[]
  browsers: Item[]
  sources: Item[]
  pages: Item[]
  products: Item[]
  contacts: Item[]
}

type Visitor = {
  visitor_id: string
  first_seen: string
  last_seen: string
  sessions: number
  pageviews: number
  whatsapp: number
  contacts: number
  ips: number
  ip: string
  city: string
  region: string
  country: string
  isp: string
  device: string
  os: string
  browser: string
  last_path: string
  source: string
}

type TimelineEvent = {
  created_at: string
  kind: string
  event: string
  label: string
  path: string
  source: string
  ip: string
  device: string
  os: string
  browser: string
  screen: string
  city: string | null
  region: string | null
  country: string | null
  isp: string | null
}

const RANGES = [
  { days: 1, label: 'Hoy' },
  { days: 7, label: '7 dias' },
  { days: 30, label: '30 dias' },
  { days: 90, label: '90 dias' },
]

const EVENT_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  llamada: 'Llamada',
  como_llegar: 'Como llegar',
  red_social: 'Red social',
}

// The API stores UTC timestamps ("YYYY-MM-DD HH:MM:SS"); show them in Colombia time, 12 h
function formatTime(ts: string) {
  const d = new Date(ts.replace(' ', 'T') + 'Z')
  return d.toLocaleString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatHour(h: number) {
  const suffix = h < 12 ? 'a. m.' : 'p. m.'
  return `${h % 12 === 0 ? 12 : h % 12} ${suffix}`
}

function place(v: { city?: string | null; region?: string | null; country?: string | null }) {
  if (v.city) return `${v.city}${v.region ? `, ${v.region}` : ''}`
  return v.country || 'Sin ubicar'
}

function contactName(name: string) {
  const [event, label] = name.split(' · ')
  return `${EVENT_LABELS[event] || event}${label ? ` · ${label}` : ''}`
}

async function adminGet(path: string, token: string) {
  const res = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return res.json()
}

function TopList({ title, items, format }: { title: string; items: Item[]; format?: (name: string) => string }) {
  const max = Math.max(1, ...items.map(i => i.count))
  return (
    <div className="border border-white/10 rounded-lg p-5">
      <h3 className="text-sm uppercase tracking-wider text-gray-400 mb-4">{title}</h3>
      {items.length === 0 ? (
        <p className="text-gray-500 text-sm">Sin datos</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map(item => (
            <li key={item.name} className="text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-gray-200 truncate" title={item.name}>{format ? format(item.name) : item.name}</span>
                <span className="text-gray-400 tabular-nums">{item.count}</span>
              </div>
              <div className="h-px bg-white/5 mt-1.5">
                <div className="h-px bg-blue-400" style={{ width: `${(item.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function VisitsPanel({ token }: { token: string }) {
  const [days, setDays] = useState(7)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [openVisitor, setOpenVisitor] = useState<string | null>(null)
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // Locate new IPs first so cities show up in this same load
      await fetch(`${API_URL}/api/admin/visits/geolocate?limit=40`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
      const [s, v] = await Promise.all([
        adminGet(`/api/admin/visits/summary?days=${days}`, token),
        adminGet(`/api/admin/visits/visitors?days=${days}&limit=300`, token),
      ])
      setSummary(s)
      setVisitors(v.visitors || [])
    } catch {
      setError('No se pudieron cargar las visitas')
    } finally {
      setLoading(false)
    }
  }, [days, token])

  useEffect(() => { load() }, [load])

  const toggleVisitor = async (id: string) => {
    if (openVisitor === id) {
      setOpenVisitor(null)
      return
    }
    setOpenVisitor(id)
    setTimeline([])
    try {
      const data = await adminGet(`/api/admin/visits/visitor/${encodeURIComponent(id)}`, token)
      setTimeline(data.events || [])
    } catch {
      setTimeline([])
    }
  }

  const q = search.trim().toLowerCase()
  const filtered = q
    ? visitors.filter(v => [v.ip, v.city, v.region, v.isp, v.device, v.os, v.browser, v.source, v.last_path].join(' ').toLowerCase().includes(q))
    : visitors

  const t = summary?.totals
  const maxDay = Math.max(1, ...(summary?.by_day || []).map(d => d.visitors))
  const hours = Array.from({ length: 24 }, (_, h) => summary?.by_hour.find(x => x.hour === h)?.count || 0)
  const maxHour = Math.max(1, ...hours)

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '2px' }}>VISITAS</h2>
        <div className="flex items-center gap-2">
          {RANGES.map(r => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`px-4 py-2 text-sm border rounded-md transition-colors ${days === r.days ? 'border-blue-400 text-blue-300' : 'border-white/10 text-gray-400 hover:text-white'}`}
            >
              {r.label}
            </button>
          ))}
          <button onClick={load} disabled={loading} className="p-2 border border-white/10 rounded-md text-gray-400 hover:text-white disabled:opacity-50" title="Actualizar">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {t && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 border-t border-l border-white/10">
          {[
            { label: 'Visitantes', value: t.visitors },
            { label: 'Visitas', value: t.sessions },
            { label: 'Paginas vistas', value: t.pageviews },
            { label: 'Clics WhatsApp', value: t.whatsapp },
            { label: 'Como llegar', value: t.como_llegar },
            { label: 'Redes / llamadas', value: t.red_social + t.llamada },
          ].map(k => (
            <div key={k.label} className="border-r border-b border-white/10 p-5">
              <p className="text-gray-400 text-xs uppercase tracking-wider">{k.label}</p>
              <p className="text-3xl md:text-4xl font-bold mt-2 tabular-nums">{k.value.toLocaleString('es-CO')}</p>
            </div>
          ))}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border border-white/10 rounded-lg p-5">
            <h3 className="text-sm uppercase tracking-wider text-gray-400 mb-4">Visitantes por dia</h3>
            {summary.by_day.length === 0 ? <p className="text-gray-500 text-sm">Sin datos</p> : (
              <div className="flex items-end gap-1 h-40">
                {summary.by_day.map(d => (
                  <div key={d.day} className="flex-1 flex flex-col items-center justify-end h-full min-w-0" title={`${d.day}: ${d.visitors} visitantes, ${d.pageviews} paginas`}>
                    <span className="text-[10px] text-gray-400 tabular-nums mb-1">{d.visitors}</span>
                    <div className="w-full bg-blue-400/80" style={{ height: `${(d.visitors / maxDay) * 100}%`, minHeight: 2 }} />
                    <span className="text-[10px] text-gray-500 mt-1 truncate w-full text-center">{d.day.slice(8)}/{d.day.slice(5, 7)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="border border-white/10 rounded-lg p-5">
            <h3 className="text-sm uppercase tracking-wider text-gray-400 mb-4">Hora de llegada (hora Colombia)</h3>
            <div className="flex items-end gap-0.5 h-40">
              {hours.map((c, h) => (
                <div key={h} className="flex-1 flex flex-col items-center justify-end h-full min-w-0" title={`${formatHour(h)}: ${c} visitas`}>
                  <div className="w-full bg-blue-400/80" style={{ height: `${(c / maxHour) * 100}%`, minHeight: c ? 2 : 0 }} />
                  <span className="text-[9px] text-gray-500 mt-1">{h % 6 === 0 ? formatHour(h).replace(' ', '') : ''}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <TopList title="Ciudades" items={summary.cities} />
          <TopList title="De donde llegan" items={summary.sources} />
          <TopList title="Contactos" items={summary.contacts} format={contactName} />
          <TopList title="Productos mas vistos" items={summary.products} format={n => n.replace(/^\/producto\/(\d+\/)?/, '').replace(/-/g, ' ')} />
          <TopList title="Paginas mas vistas" items={summary.pages} />
          <TopList title="Dispositivos" items={[...summary.devices, ...summary.os]} />
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h3 className="text-xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1.5px' }}>VISITANTES ({filtered.length})</h3>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar IP, ciudad, operador, dispositivo..."
            className="w-full md:w-80 bg-transparent border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
          />
        </div>
        <div className="overflow-x-auto border border-white/10 rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 text-xs uppercase tracking-wider border-b border-white/10">
                <th className="px-4 py-3 font-medium">Ultima visita</th>
                <th className="px-4 py-3 font-medium">IP</th>
                <th className="px-4 py-3 font-medium">Ubicacion</th>
                <th className="px-4 py-3 font-medium">Operador</th>
                <th className="px-4 py-3 font-medium">Dispositivo</th>
                <th className="px-4 py-3 font-medium">Llego por</th>
                <th className="px-4 py-3 font-medium text-right">Visitas</th>
                <th className="px-4 py-3 font-medium text-right">Paginas</th>
                <th className="px-4 py-3 font-medium text-right">WhatsApp</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-500">{loading ? 'Cargando...' : 'Todavia no hay visitas en este rango'}</td></tr>
              )}
              {filtered.map(v => (
                <Fragment key={v.visitor_id}>
                  <tr onClick={() => toggleVisitor(v.visitor_id)} className={`border-b border-white/5 cursor-pointer hover:bg-white/[0.03] ${openVisitor === v.visitor_id ? 'bg-white/[0.03]' : ''}`}>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-200">{formatTime(v.last_seen)}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-300">{v.ip}{v.ips > 1 && <span className="text-gray-500"> +{v.ips - 1}</span>}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-200">{place(v)}</td>
                    <td className="px-4 py-3 text-gray-400 max-w-[180px] truncate" title={v.isp}>{v.isp}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-300">{v.device} · {v.os} · {v.browser}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-300">{v.source || '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{v.sessions}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{v.pageviews}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${v.whatsapp ? 'text-green-400' : 'text-gray-500'}`}>{v.whatsapp}</td>
                  </tr>
                  {openVisitor === v.visitor_id && (
                    <tr className="border-b border-white/10">
                      <td colSpan={9} className="px-4 py-4">
                        <p className="text-xs text-gray-500 mb-3">Primera visita: {formatTime(v.first_seen)} · ID {v.visitor_id.slice(0, 8)}</p>
                        {timeline.length === 0 ? <p className="text-gray-500 text-sm">Cargando...</p> : (
                          <ol className="space-y-1.5 max-h-80 overflow-y-auto">
                            {timeline.map((e, i) => (
                              <li key={i} className="flex gap-4 text-sm">
                                <span className="text-gray-500 whitespace-nowrap w-36 flex-shrink-0">{formatTime(e.created_at)}</span>
                                {e.kind === 'event' ? (
                                  <span className="text-green-400">{EVENT_LABELS[e.event] || e.event}{e.label ? ` · ${e.label}` : ''} <span className="text-gray-500">desde {e.path}</span></span>
                                ) : (
                                  <span className="text-gray-200">{e.path}{e.source && <span className="text-gray-500"> · llego por {e.source}</span>}</span>
                                )}
                                <span className="text-gray-600 text-xs ml-auto whitespace-nowrap hidden md:inline">{e.ip} · {place(e)}</span>
                              </li>
                            ))}
                          </ol>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500">La ubicacion sale de la IP y es aproximada (ciudad del operador). Un visitante es un mismo navegador; si borra datos o cambia de celular cuenta como uno nuevo.</p>
      </div>
    </div>
  )
}

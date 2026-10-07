import { useState, useEffect, useCallback } from 'react'
import { X, Plus, Trash2, Edit3, Save, LogOut, Upload, BarChart3, Package, Circle, Wrench, Eye, Search, Lock, FolderOpen, Image, Type, ToggleLeft, ToggleRight, ArrowUp, ArrowDown, Play, Film, MapPin, Star, MessageSquare, Camera } from 'lucide-react'
import { resolveColor } from './lib/colors'

const API_URL = import.meta.env.VITE_API_URL || 'https://gordotech-api.fly.dev'

/** Resolve upload URL: if it's already absolute (R2), use as-is; otherwise prefix API_URL */
function resolveUploadUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${API_URL}${url}`
}

type Variant = {
  id: number
  product_id: number
  storage: string
  color: string
  price: string
  sort_order: number
  active: boolean
}

type Product = {
  id: number
  name: string
  category: string
  condition: string
  image: string
  images: string[]
  colors: string[]
  color_images: Record<string, string[]>
  storage_options: string[]
  badge: string | null
  available: string[]
  price: string
  old_price: string
  description: string
  featured_recommended: boolean
  featured_trending: boolean
  sort_order: number
  variants?: Variant[]
}

type Category = {
  id: number
  slug: string
  name: string
  image: string
  sort_order: number
}

type Bubble = {
  id: number
  model_id: string
  label: string
  image: string
  sort_order: number
}

type RepairService = {
  id: number
  title: string
  description: string
  price: string
  icon: string
  sort_order: number
}

type HeroSlide = {
  id: number
  title: string
  subtitle: string
  image: string
  video_url: string
  link: string
  active: boolean
  sort_order: number
}

type MarqueeText = {
  id: number
  text: string
  active: boolean
  sort_order: number
}

type Stats = {
  total_products: number
  new_products: number
  used_products: number
  categories: number
  bubbles: number
  repair_services: number
  hero_slides: number
}

type Review = {
  id: number
  sucursal_slug: string
  customer_name: string
  rating: number
  text: string
  sort_order: number
  active: boolean
  created_at: string | null
}

type GalleryPhoto = {
  id: number
  image: string
  caption: string
  sort_order: number
  active: boolean
}

type Popup = {
  id: number
  image: string
  title: string
  link: string
  active: boolean
  sort_order: number
}

type Tab = 'dashboard' | 'products' | 'bubbles' | 'services' | 'gallery' | 'slideshow' | 'marquee' | 'settings' | 'sucursales' | 'resenas' | 'popups'

const TAB_PATHS: Record<string, Tab> = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/productos': 'products',
  '/categorias': 'bubbles',
  '/burbujas': 'bubbles',
  '/servicios': 'services',
  '/galeria-reparacion': 'gallery',
  '/slideshow': 'slideshow',
  '/marquee': 'marquee',
  '/config': 'settings',
  '/sucursales': 'sucursales',
  '/resenas': 'resenas',
  '/popups': 'popups',
}

const TAB_TO_PATH: Record<Tab, string> = {
  dashboard: '/dashboard',
  products: '/productos',
  bubbles: '/categorias',
  services: '/servicios',
  gallery: '/galeria-reparacion',
  slideshow: '/slideshow',
  marquee: '/marquee',
  settings: '/config',
  sucursales: '/sucursales',
  resenas: '/resenas',
  popups: '/popups',
}

function getTabFromPath(): Tab {
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  return TAB_PATHS[path] || 'dashboard'
}

// ==================== API HELPERS ====================

async function apiGet(path: string, token: string) {
  const res = await fetch(`${API_URL}${path}?token=${token}`)
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return res.json()
}

async function apiPost(path: string, body: Record<string, unknown>, token: string) {
  const res = await fetch(`${API_URL}${path}?token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return res.json()
}

async function apiPut(path: string, body: Record<string, unknown>, token: string) {
  const res = await fetch(`${API_URL}${path}?token=${token}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return res.json()
}

async function apiDelete(path: string, token: string) {
  const res = await fetch(`${API_URL}${path}?token=${token}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return res.json()
}

async function apiUpload(file: File, token: string) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_URL}/api/admin/upload?token=${token}`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return res.json()
}

// ==================== LOGIN COMPONENT ====================

function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        setError('Credenciales incorrectas')
        return
      }
      const data = await res.json()
      onLogin(data.token)
    } catch {
      setError('Error de conexion al servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '2px' }}>GORDOTECH ADMIN</h1>
          <p className="text-gray-400 mt-2">Panel de Administracion</p>
        </div>
        
        <form onSubmit={handleSubmit} className="bg-gray-900/80 border border-white/10 rounded-2xl p-6 space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 text-red-300 text-sm text-center">{error}</div>
          )}
          <div>
            <label className="block text-gray-400 text-sm mb-1.5">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-gray-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
              placeholder="admin"
              required
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1.5">Contrasena</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-semibold rounded-xl transition-colors"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ==================== IMAGE UPLOAD BUTTON ====================

function ImageUploader({ token, currentImage, onUpload }: { token: string; currentImage: string; onUpload: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const data = await apiUpload(file, token)
      onUpload(resolveUploadUrl(data.url))
    } catch {
      alert('Error subiendo imagen')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {currentImage && (
          <img src={currentImage} alt="" className="w-16 h-16 rounded-lg object-cover bg-gray-800" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        )}
        <label className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border border-white/10 rounded-lg cursor-pointer hover:border-blue-500/30 transition-colors text-sm text-gray-300">
          <Upload className="w-4 h-4" />
          {uploading ? 'Subiendo...' : 'Subir imagen'}
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={uploading} />
        </label>
      </div>
      <input
        type="text"
        value={currentImage}
        onChange={e => onUpload(e.target.value)}
        placeholder="URL de imagen o subir archivo"
        className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
      />
    </div>
  )
}

// ==================== MULTI IMAGE UPLOADER ====================

function MultiImageUploader({ token, images, onChange }: { token: string; images: string[]; onChange: (images: string[]) => void }) {
  const [uploading, setUploading] = useState(false)

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const newUrls: string[] = []
      for (let i = 0; i < files.length; i++) {
        const data = await apiUpload(files[i], token)
        newUrls.push(resolveUploadUrl(data.url))
      }
      onChange([...images, ...newUrls])
    } catch {
      alert('Error subiendo imagenes')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index))
  }

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return
    const updated = [...images]
    const [moved] = updated.splice(from, 1)
    updated.splice(to, 0, moved)
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {images.map((img, i) => (
          <div key={i} className="relative group w-20 h-20">
            <img src={img} alt={`Foto ${i + 1}`} className="w-full h-full rounded-lg object-cover bg-gray-800 border border-white/10" onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/200x200/1a1a2e/7BA3C9/png?text=Error' }} />
            <div className="absolute inset-0 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              {i > 0 && (
                <button onClick={() => moveImage(i, i - 1)} className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-white text-xs hover:bg-white/40" title="Mover izquierda">&larr;</button>
              )}
              <button onClick={() => removeImage(i)} className="w-6 h-6 bg-red-500/80 rounded-full flex items-center justify-center text-white hover:bg-red-600" title="Eliminar">
                <X className="w-3 h-3" />
              </button>
              {i < images.length - 1 && (
                <button onClick={() => moveImage(i, i + 1)} className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-white text-xs hover:bg-white/40" title="Mover derecha">&rarr;</button>
              )}
            </div>
            {i === 0 && (
              <div className="absolute -top-1 -left-1 px-1.5 py-0.5 bg-blue-500 rounded text-white text-[10px] font-bold">Principal</div>
            )}
          </div>
        ))}
        <label className={`w-20 h-20 border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-colors ${uploading ? 'opacity-50' : ''}`}>
          <Plus className="w-5 h-5 text-gray-400" />
          <span className="text-[10px] text-gray-500 mt-1">{uploading ? 'Subiendo...' : 'Agregar'}</span>
          <input type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" disabled={uploading} />
        </label>
      </div>
      <p className="text-xs text-gray-500">La primera imagen sera la principal. Puedes reordenar pasando el mouse y usando las flechas.</p>
    </div>
  )
}

// ==================== COLOR IMAGE UPLOADER ====================

function ColorImageUploader({ token, color, onUpload }: { token: string; color: string; onUpload: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const data = await apiUpload(file, token)
      onUpload(resolveUploadUrl(data.url))
    } catch {
      alert('Error subiendo imagen')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <label className={`inline-flex items-center gap-1 px-2 py-1 bg-blue-600/30 border border-blue-500/30 rounded-lg cursor-pointer hover:bg-blue-600/50 transition-colors text-xs text-blue-300 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
      <Plus className="w-3 h-3" />
      {uploading ? 'Subiendo...' : 'Subir foto'}
      <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={uploading} />
    </label>
  )
}

// ==================== PRODUCT FORM ====================

function ProductForm({ product, token, categories, onSave, onCancel }: {
  product: Product | null
  token: string
  categories: Category[]
  onSave: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    name: product?.name || '',
    category: product?.category || '',
    condition: product?.condition || 'Semi-usado',
    image: product?.image || '',
    images: product?.images || [],
    colors: product?.colors?.join(', ') || '',
    color_images: (() => {
      // Normalize legacy string values to arrays
      const raw = product?.color_images || {};
      const normalized: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(raw)) {
        if (Array.isArray(v)) normalized[k] = v;
        else if (typeof v === 'string' && v) normalized[k] = [v];
      }
      return normalized;
    })(),
    storage_options: product?.storage_options?.join(', ') || '',
    badge: product?.badge || '',
    available_duitama: product?.available?.includes('duitama') ?? true,
    available_tunja: product?.available?.includes('tunja') ?? true,
    price: product?.price || '',
    old_price: product?.old_price || '',
    description: product?.description || '',
    featured_recommended: product?.featured_recommended || false,
    featured_trending: product?.featured_trending || false,
    sort_order: product?.sort_order || 0,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const available: string[] = []
      if (form.available_duitama) available.push('duitama')
      if (form.available_tunja) available.push('tunja')
      
      const body = {
        name: form.name,
        category: form.category,
        condition: form.condition,
        image: form.images.length > 0 ? form.images[0] : form.image,
        images: form.images,
        colors: form.colors.split(',').map(c => c.trim()).filter(Boolean),
        color_images: form.color_images,
        storage_options: form.storage_options.split(',').map(s => s.trim()).filter(Boolean),
        badge: form.badge || null,
        available,
        price: form.price,
        old_price: form.old_price,
        description: form.description,
        featured_recommended: form.featured_recommended,
        featured_trending: form.featured_trending,
        sort_order: form.sort_order,
      }

      if (product) {
        await apiPut(`/api/admin/products/${product.id}`, body, token)
      } else {
        await apiPost('/api/admin/products', body, token)
      }
      onSave()
    } catch {
      alert('Error guardando producto')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 md:p-6 overflow-y-auto">
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-3xl my-8">
        <div className="flex items-center justify-between p-5 md:p-6 border-b border-white/10">
          <h3 className="text-xl md:text-2xl font-bold text-white">{product ? 'Editar Producto' : 'Nuevo Producto'}</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
        </div>
        
        <div className="p-5 md:p-6 space-y-5 max-h-96 overflow-y-auto lg:max-h-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            <div>
              <label className="block text-gray-400 text-sm md:text-base mb-1.5">Nombre *</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm md:text-base focus:outline-none focus:border-blue-500/50" placeholder="iPhone 17 Pro Max" />
            </div>
            <div>
              <label className="block text-gray-400 text-sm md:text-base mb-1.5">Condicion</label>
              <select value={form.condition} onChange={e => setForm({...form, condition: e.target.value})}
                className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm md:text-base focus:outline-none focus:border-blue-500/50">
                <option value="Nuevo">Nuevo</option>
                <option value="Semi-usado">Semi-usado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm md:text-base mb-1.5">Categoria *</label>
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
              className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm md:text-base focus:outline-none focus:border-blue-500/50">
              <option value="">Sin categoria</option>
              {categories.map(c => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-400 text-sm md:text-base mb-1.5">Imagenes del producto</label>
            <MultiImageUploader
              token={token}
              images={form.images}
              onChange={imgs => setForm({ ...form, images: imgs, image: imgs.length > 0 ? imgs[0] : form.image })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            <div>
              <label className="block text-gray-400 text-sm md:text-base mb-1.5">Opciones de almacenamiento (separadas por coma)</label>
              <input value={form.storage_options} onChange={e => setForm({...form, storage_options: e.target.value})}
                className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm md:text-base focus:outline-none focus:border-blue-500/50" placeholder="128GB, 256GB, 512GB" />
            </div>
            <div>
              <label className="block text-gray-400 text-sm md:text-base mb-1.5">Colores (nombre o hex, separados por coma)</label>
              <input value={form.colors} onChange={e => setForm({...form, colors: e.target.value})}
                className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm md:text-base focus:outline-none focus:border-blue-500/50" placeholder="Naranja cósmico, Negro, Titanio natural" />
            </div>
          </div>

          {/* Color-Image Assignment (multiple photos per color) */}
          {form.colors.split(',').map(c => c.trim()).filter(Boolean).length > 0 && (
            <div>
              <label className="block text-gray-400 text-sm mb-2">Fotos por color</label>
              <div className="space-y-4">
                {form.colors.split(',').map(c => c.trim()).filter(Boolean).map((color) => {
                  const colorImgs = form.color_images[color] || []
                  return (
                    <div key={color} className="bg-gray-800/30 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-5 h-5 rounded-full border border-white/20 flex-shrink-0" style={{ backgroundColor: resolveColor(color) }} />
                        <span className="text-white text-sm font-medium">{color}</span>
                        <span className="text-gray-500 text-xs">({colorImgs.length} foto{colorImgs.length !== 1 ? 's' : ''})</span>
                      </div>
                      {/* Thumbnails of assigned images */}
                      <div className="flex flex-wrap gap-2">
                        {colorImgs.map((img, idx) => (
                          <div key={idx} className="relative group w-14 h-14">
                            <img src={img} alt={`${color} ${idx + 1}`} className="w-full h-full rounded object-cover bg-gray-800 border border-white/10" onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/1a1a2e/7BA3C9/png?text=Error' }} />
                            <div className="absolute inset-0 bg-black/60 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-0.5">
                              {idx > 0 && (
                                <button type="button" onClick={() => {
                                  const arr = [...colorImgs]; const [m] = arr.splice(idx, 1); arr.splice(idx - 1, 0, m);
                                  setForm({ ...form, color_images: { ...form.color_images, [color]: arr } })
                                }} className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-white text-[10px] hover:bg-white/40">&larr;</button>
                              )}
                              <button type="button" onClick={() => {
                                const arr = colorImgs.filter((_, i) => i !== idx);
                                const updated = { ...form.color_images };
                                if (arr.length === 0) delete updated[color]; else updated[color] = arr;
                                setForm({ ...form, color_images: updated })
                              }} className="w-5 h-5 bg-red-500/80 rounded-full flex items-center justify-center text-white hover:bg-red-600">
                                <X className="w-3 h-3" />
                              </button>
                              {idx < colorImgs.length - 1 && (
                                <button type="button" onClick={() => {
                                  const arr = [...colorImgs]; const [m] = arr.splice(idx, 1); arr.splice(idx + 1, 0, m);
                                  setForm({ ...form, color_images: { ...form.color_images, [color]: arr } })
                                }} className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-white text-[10px] hover:bg-white/40">&rarr;</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Add images to this color */}
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {form.images.filter(img => !colorImgs.includes(img)).length > 0 && (
                          <select
                            value=""
                            onChange={e => {
                              if (!e.target.value) return;
                              const updated = { ...form.color_images, [color]: [...colorImgs, e.target.value] };
                              setForm({ ...form, color_images: updated })
                              e.target.value = '';
                            }}
                            className="bg-gray-800/50 border border-white/10 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-500/50"
                          >
                            <option value="">+ Agregar foto...</option>
                            {form.images.filter(img => !colorImgs.includes(img)).map((img, idx) => (
                              <option key={idx} value={img}>Foto {form.images.indexOf(img) + 1}</option>
                            ))}
                          </select>
                        )}
                        <ColorImageUploader token={token} color={color} onUpload={(url) => {
                          const updated = { ...form.color_images, [color]: [...colorImgs, url] };
                          setForm({ ...form, color_images: updated })
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2">Sube o selecciona varias fotos para cada color. Al tocar un color en la tienda, se mostraran estas fotos.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            <div>
              <label className="block text-gray-400 text-sm md:text-base mb-1.5">Precio Actual</label>
              <input value={form.price} onChange={e => setForm({...form, price: e.target.value})}
                className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm md:text-base focus:outline-none focus:border-blue-500/50" placeholder="2.500.000" />
            </div>
            <div>
              <label className="block text-red-400 text-sm md:text-base mb-1.5">Precio Anterior (tachado en rojo)</label>
              <input value={form.old_price} onChange={e => setForm({...form, old_price: e.target.value})}
                className="w-full bg-gray-800/50 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm md:text-base focus:outline-none focus:border-red-500/50" placeholder="3.200.000" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            <div>
              <label className="block text-gray-400 text-sm md:text-base mb-1.5">Badge / Etiqueta</label>
              <input value={form.badge} onChange={e => setForm({...form, badge: e.target.value})}
                className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm md:text-base focus:outline-none focus:border-blue-500/50" placeholder="Nuevo, Oferta, etc." />
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm md:text-base mb-1.5">Descripcion</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3}
              className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm md:text-base focus:outline-none focus:border-blue-500/50 resize-none" placeholder="Descripcion del producto..." />
          </div>

          <div>
            <label className="block text-gray-400 text-sm md:text-base mb-1.5">Orden</label>
            <input type="number" value={form.sort_order} onChange={e => setForm({...form, sort_order: parseInt(e.target.value) || 0})}
              className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm md:text-base focus:outline-none focus:border-blue-500/50" />
          </div>

          <div className="flex flex-wrap gap-4 md:gap-6">
            <label className="flex items-center gap-2.5 text-sm md:text-base text-gray-300 cursor-pointer">
              <input type="checkbox" checked={form.available_duitama} onChange={e => setForm({...form, available_duitama: e.target.checked})} className="rounded w-4 h-4" />
              Disponible en Duitama
            </label>
            <label className="flex items-center gap-2.5 text-sm md:text-base text-gray-300 cursor-pointer">
              <input type="checkbox" checked={form.available_tunja} onChange={e => setForm({...form, available_tunja: e.target.checked})} className="rounded w-4 h-4" />
              Disponible en Tunja
            </label>
            <label className="flex items-center gap-2.5 text-sm md:text-base text-gray-300 cursor-pointer">
              <input type="checkbox" checked={form.featured_recommended} onChange={e => setForm({...form, featured_recommended: e.target.checked})} className="rounded w-4 h-4" />
              Recomendado
            </label>
            <label className="flex items-center gap-2.5 text-sm md:text-base text-gray-300 cursor-pointer">
              <input type="checkbox" checked={form.featured_trending} onChange={e => setForm({...form, featured_trending: e.target.checked})} className="rounded w-4 h-4" />
              Tendencia
            </label>
          </div>

          {/* ===== Variants Section (only for saved products) ===== */}
          {product && (
            <VariantsSection productId={product.id} token={token} />
          )}
        </div>

        <div className="flex gap-3 p-5 md:p-6 border-t border-white/10">
          <button onClick={onCancel} className="flex-1 py-3 border border-white/10 text-gray-300 rounded-xl hover:bg-white/5 transition-colors text-sm md:text-base">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !form.name} className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-xl transition-colors text-sm md:text-base font-medium flex items-center justify-center gap-2">
            <Save className="w-5 h-5" />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ==================== VARIANTS SECTION ====================

function VariantsSection({ productId, token }: { productId: number; token: string }) {
  const [variants, setVariants] = useState<Variant[]>([])
  const [loading, setLoading] = useState(true)
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [vForm, setVForm] = useState({ storage: '', color: '', price: '', sort_order: 0, active: true })
  const [saving, setSaving] = useState(false)

  const loadVariants = useCallback(async () => {
    try {
      const data = await apiGet(`/api/admin/products/${productId}/variants`, token)
      setVariants(data.variants || [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [productId, token])

  useEffect(() => { loadVariants() }, [loadVariants])

  const openNew = () => {
    setEditingVariant(null)
    setVForm({ storage: '', color: '', price: '', sort_order: 0, active: true })
    setShowForm(true)
  }

  const openEdit = (v: Variant) => {
    setEditingVariant(v)
    setVForm({ storage: v.storage, color: v.color, price: v.price, sort_order: v.sort_order, active: v.active })
    setShowForm(true)
  }

  const handleSaveVariant = async () => {
    setSaving(true)
    try {
      if (editingVariant) {
        await apiPut(`/api/admin/products/${productId}/variants/${editingVariant.id}`, vForm, token)
      } else {
        await apiPost(`/api/admin/products/${productId}/variants`, vForm, token)
      }
      setShowForm(false)
      await loadVariants()
    } catch {
      alert('Error guardando variante')
    }
    setSaving(false)
  }

  const handleDeleteVariant = async (variantId: number) => {
    if (!confirm('Eliminar esta variante?')) return
    try {
      await apiDelete(`/api/admin/products/${productId}/variants/${variantId}`, token)
      await loadVariants()
    } catch {
      alert('Error eliminando variante')
    }
  }

  return (
    <div className="border border-purple-500/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-bold text-purple-300">Variantes de Precio (Almacenamiento + Color)</h4>
          <p className="text-xs text-gray-500">Cada combinacion puede tener un precio diferente</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1 px-3 py-1.5 bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-300 text-xs hover:bg-purple-600/50 transition-colors">
          <Plus className="w-3 h-3" /> Agregar
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-xs">Cargando variantes...</p>
      ) : variants.length === 0 ? (
        <p className="text-gray-500 text-xs">Sin variantes. El producto usara el precio base.</p>
      ) : (
        <div className="space-y-1.5">
          {variants.map(v => (
            <div key={v.id} className={`flex items-center justify-between p-2.5 rounded-lg border text-sm ${v.active ? 'bg-gray-800/30 border-white/10' : 'bg-gray-800/10 border-white/5 opacity-50'}`}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {v.color && (
                  <div className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0" style={{ backgroundColor: resolveColor(v.color) }} title={v.color} />
                )}
                <span className="text-white font-medium truncate">
                  {v.storage && v.color ? `${v.storage} / ${v.color}` : v.storage || v.color || 'Sin especificar'}
                </span>
                <span className="text-green-400 font-bold flex-shrink-0">$ {v.price || '-'}</span>
                {!v.active && <span className="text-xs text-red-400 flex-shrink-0">(inactiva)</span>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                <button onClick={() => openEdit(v)} className="w-7 h-7 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 hover:bg-blue-500/40 transition-colors">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDeleteVariant(v.id)} className="w-7 h-7 bg-red-500/20 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/40 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Variant form modal */}
      {showForm && (
        <div className="mt-3 p-3 bg-gray-800/50 border border-purple-500/20 rounded-xl space-y-3">
          <h5 className="text-sm font-bold text-white">{editingVariant ? 'Editar Variante' : 'Nueva Variante'}</h5>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-gray-400 text-xs mb-1">Almacenamiento</label>
              <input value={vForm.storage} onChange={e => setVForm({ ...vForm, storage: e.target.value })}
                className="w-full bg-gray-900/50 border border-white/10 rounded-lg px-2.5 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50" placeholder="256GB" />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">Color</label>
              <input value={vForm.color} onChange={e => setVForm({ ...vForm, color: e.target.value })}
                className="w-full bg-gray-900/50 border border-white/10 rounded-lg px-2.5 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50" placeholder="Negro" />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">Precio</label>
              <input value={vForm.price} onChange={e => setVForm({ ...vForm, price: e.target.value })}
                className="w-full bg-gray-900/50 border border-white/10 rounded-lg px-2.5 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50" placeholder="5.200.000" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
              <input type="checkbox" checked={vForm.active} onChange={e => setVForm({ ...vForm, active: e.target.checked })} className="rounded" />
              Activa
            </label>
            <div className="flex items-center gap-1">
              <label className="text-gray-400 text-xs">Orden:</label>
              <input type="number" value={vForm.sort_order} onChange={e => setVForm({ ...vForm, sort_order: parseInt(e.target.value) || 0 })}
                className="w-16 bg-gray-900/50 border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 border border-white/10 text-gray-300 rounded-lg text-xs hover:bg-white/5">Cancelar</button>
            <button onClick={handleSaveVariant} disabled={saving} className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-500/50 text-white rounded-lg text-xs font-medium">
              {saving ? 'Guardando...' : editingVariant ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== BUBBLE FORM ====================

function BubbleForm({ bubble, token, categories, onSave, onCancel }: {
  bubble: Bubble | null
  token: string
  categories: Category[]
  onSave: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    model_id: bubble?.model_id || '',
    label: bubble?.label || '',
    image: bubble?.image || '',
    sort_order: bubble?.sort_order || 0,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      // Save bubble
      if (bubble) {
        await apiPut(`/api/admin/bubbles/${bubble.id}`, form, token)
      } else {
        await apiPost('/api/admin/bubbles', form, token)
      }
      // Sync category: create or update the corresponding category
      const slug = form.model_id.toLowerCase().replace(/\s+/g, '-')
      const categoryData = { slug, name: form.label, image: form.image, sort_order: form.sort_order }
      const existingCat = categories.find(c => c.slug === slug || c.slug === form.model_id)
      try {
        if (existingCat) {
          await apiPut(`/api/admin/categories/${existingCat.id}`, categoryData, token)
        } else {
          await apiPost('/api/admin/categories', categoryData, token)
        }
      } catch {
        // Category sync is best-effort
      }
      onSave()
    } catch {
      alert('Error guardando categoria')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 md:p-6">
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 md:p-6 border-b border-white/10">
          <h3 className="text-xl md:text-2xl font-bold text-white">{bubble ? 'Editar Categoria' : 'Nueva Categoria'}</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
        </div>
        
        <div className="p-5 md:p-6 space-y-5">
          <div>
            <label className="block text-gray-400 text-sm md:text-base mb-1.5">Slug / ID (ej: iphones, ipads)</label>
            <input value={form.model_id} onChange={e => setForm({...form, model_id: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
              className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm md:text-base focus:outline-none focus:border-blue-500/50" placeholder="ej: iphones, ipads, macbook" />
          </div>
          <div>
            <label className="block text-gray-400 text-sm md:text-base mb-1.5">Nombre visible</label>
            <input value={form.label} onChange={e => setForm({...form, label: e.target.value})}
              className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm md:text-base focus:outline-none focus:border-blue-500/50" placeholder="ej: iPhones, iPads, MacBook" />
          </div>
          <div>
            <label className="block text-gray-400 text-sm md:text-base mb-1.5">Imagen</label>
            <ImageUploader token={token} currentImage={form.image} onUpload={url => setForm({...form, image: url})} />
          </div>
          <div>
            <label className="block text-gray-400 text-sm md:text-base mb-1.5">Orden</label>
            <input type="number" value={form.sort_order} onChange={e => setForm({...form, sort_order: parseInt(e.target.value) || 0})}
              className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm md:text-base focus:outline-none focus:border-blue-500/50" />
          </div>
        </div>

        <div className="flex gap-3 p-5 md:p-6 border-t border-white/10">
          <button onClick={onCancel} className="flex-1 py-3 border border-white/10 text-gray-300 rounded-xl hover:bg-white/5 transition-colors text-sm md:text-base">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !form.model_id || !form.label} className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-xl transition-colors text-sm md:text-base font-medium flex items-center justify-center gap-2">
            <Save className="w-5 h-5" />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ==================== SERVICE FORM ====================

function ServiceForm({ service, token, onSave, onCancel }: {
  service: RepairService | null
  token: string
  onSave: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    title: service?.title || '',
    description: service?.description || '',
    price: service?.price || '',
    icon: service?.icon || 'Smartphone',
    sort_order: service?.sort_order || 0,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      if (service) {
        await apiPut(`/api/admin/repair-services/${service.id}`, form, token)
      } else {
        await apiPost('/api/admin/repair-services', form, token)
      }
      onSave()
    } catch {
      alert('Error guardando servicio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 md:p-6">
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 md:p-6 border-b border-white/10">
          <h3 className="text-xl md:text-2xl font-bold text-white">{service ? 'Editar Servicio' : 'Nuevo Servicio'}</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
        </div>
        
        <div className="p-5 md:p-6 space-y-5">
          <div>
            <label className="block text-gray-400 text-sm md:text-base mb-1.5">Titulo</label>
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
              className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm md:text-base focus:outline-none focus:border-blue-500/50" />
          </div>
          <div>
            <label className="block text-gray-400 text-sm md:text-base mb-1.5">Descripcion</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2}
              className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm md:text-base focus:outline-none focus:border-blue-500/50 resize-none" />
          </div>
          <div>
            <label className="block text-gray-400 text-sm md:text-base mb-1.5">Precio</label>
            <input value={form.price} onChange={e => setForm({...form, price: e.target.value})}
              className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm md:text-base focus:outline-none focus:border-blue-500/50" placeholder="Desde $150.000" />
          </div>
          <div>
            <label className="block text-gray-400 text-sm md:text-base mb-1.5">Icono</label>
            <select value={form.icon} onChange={e => setForm({...form, icon: e.target.value})}
              className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm md:text-base focus:outline-none focus:border-blue-500/50">
              <option value="Smartphone">Smartphone</option>
              <option value="Zap">Zap (Rayo)</option>
              <option value="Shield">Shield (Escudo)</option>
              <option value="Award">Award (Premio)</option>
              <option value="Wrench">Wrench (Llave)</option>
            </select>
          </div>
          <div>
            <label className="block text-gray-400 text-sm md:text-base mb-1.5">Orden</label>
            <input type="number" value={form.sort_order} onChange={e => setForm({...form, sort_order: parseInt(e.target.value) || 0})}
              className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm md:text-base focus:outline-none focus:border-blue-500/50" />
          </div>
        </div>

        <div className="flex gap-3 p-5 md:p-6 border-t border-white/10">
          <button onClick={onCancel} className="flex-1 py-3 border border-white/10 text-gray-300 rounded-xl hover:bg-white/5 transition-colors text-sm md:text-base">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !form.title} className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-xl transition-colors text-sm md:text-base font-medium flex items-center justify-center gap-2">
            <Save className="w-5 h-5" />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ==================== MAIN ADMIN PANEL ====================

export default function AdminPanel({ onExit }: { onExit: () => void }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('gordotech-admin-token'))
  const [activeTab, setActiveTabRaw] = useState<Tab>(() => getTabFromPath())

  const setActiveTab = useCallback((tab: Tab) => {
    setActiveTabRaw(tab)
    const newPath = TAB_TO_PATH[tab] || '/dashboard'
    if (window.location.pathname !== newPath) {
      window.history.pushState(null, '', newPath)
    }
  }, [])
  const [stats, setStats] = useState<Stats | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [services, setServices] = useState<RepairService[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [conditionFilter, setConditionFilter] = useState('todos')
  const [categoryFilter, setCategoryFilter] = useState('todos')
  const [cityFilter, setCityFilter] = useState('todos')
  
  // Form modals
  const [editingProduct, setEditingProduct] = useState<Product | null | 'new'>(null)
  const [editingBubble, setEditingBubble] = useState<Bubble | null | 'new'>(null)
  const [editingService, setEditingService] = useState<RepairService | null | 'new'>(null)
  const [sucursales, setSucursales] = useState<Array<{id:number,name:string,slug:string,address:string,city:string,image:string,whatsapp:string,instagram:string,tiktok:string,phone:string,description:string,sort_order:number,active:boolean}>>([])  
  const [editingSucursal, setEditingSucursal] = useState<null | 'new' | Record<string,unknown>>(null)
  const [sucursalForm, setSucursalForm] = useState({ name:'', slug:'', address:'', city:'', image:'', whatsapp:'', instagram:'', tiktok:'', phone:'', description:'', sort_order:0, active:true })
  const [savingSucursal, setSavingSucursal] = useState(false)
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([])
  const [marqueeTexts, setMarqueeTexts] = useState<MarqueeText[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: number; name: string } | null>(null)
  
  // Slide editing
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null | 'new'>(null)
  const [slideForm, setSlideForm] = useState({ title: '', subtitle: '', image: '', video_url: '', link: '', sort_order: 0 })
  const [savingSlide, setSavingSlide] = useState(false)
  
  // Marquee editing
  const [newMarqueeText, setNewMarqueeText] = useState('')
  const [editingMarqueeId, setEditingMarqueeId] = useState<number | null>(null)
  const [editingMarqueeValue, setEditingMarqueeValue] = useState('')
  const [savingMarquee, setSavingMarquee] = useState(false)

  // Reviews
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewFilter, setReviewFilter] = useState('todos')
  const [editingReview, setEditingReview] = useState<Review | null | 'new'>(null)
  const [reviewForm, setReviewForm] = useState({ sucursal_slug: 'duitama', customer_name: '', rating: 5, text: '', sort_order: 0, active: true })
  const [savingReview, setSavingReview] = useState(false)

  // Repair Gallery
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([])
  const [editingGalleryPhoto, setEditingGalleryPhoto] = useState<GalleryPhoto | null | 'new'>(null)
  const [galleryForm, setGalleryForm] = useState({ image: '', caption: '', sort_order: 0, active: true })
  const [savingGallery, setSavingGallery] = useState(false)

  // Popups
  const [popups, setPopups] = useState<Popup[]>([])
  const [editingPopup, setEditingPopup] = useState<Popup | null | 'new'>(null)
  const [popupForm, setPopupForm] = useState({ image: '', title: '', link: '', sort_order: 0, active: true })
  const [savingPopup, setSavingPopup] = useState(false)

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')

  const handleLogin = (newToken: string) => {
    setToken(newToken)
    localStorage.setItem('gordotech-admin-token', newToken)
  }

  const handleLogout = () => {
    setToken(null)
    localStorage.removeItem('gordotech-admin-token')
  }

  const loadStats = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiGet('/api/admin/stats', token)
      setStats(data)
    } catch {
      handleLogout()
    }
  }, [token])

  const loadProducts = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiGet('/api/admin/products', token)
      setProducts(data.products)
    } catch {
      handleLogout()
    }
  }, [token])

  const loadCategories = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiGet('/api/admin/categories', token)
      setCategories(data.categories)
    } catch {
      handleLogout()
    }
  }, [token])

  const loadBubbles = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiGet('/api/admin/bubbles', token)
      setBubbles(data.bubbles)
    } catch {
      handleLogout()
    }
  }, [token])

  const restoreBubbleImages = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiPost('/api/admin/bubbles/restore-images', {}, token)
      setBubbles(data.bubbles)
      alert(`${data.message}`)
    } catch {
      alert('Error al restaurar imágenes')
    }
  }, [token])

  const loadServices = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiGet('/api/admin/repair-services', token)
      setServices(data.services)
    } catch {
      handleLogout()
    }
  }, [token])

  const loadHeroSlides = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiGet('/api/admin/hero-slides', token)
      setHeroSlides(data.slides)
    } catch {
      handleLogout()
    }
  }, [token])

  const loadMarqueeTexts = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiGet('/api/admin/marquee-texts', token)
      setMarqueeTexts(data.texts)
    } catch {
      handleLogout()
    }
  }, [token])

  const loadSucursales = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiGet('/api/admin/sucursales', token)
      setSucursales(data.sucursales || [])
    } catch {
      // not critical
    }
  }, [token])

  const loadReviews = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiGet('/api/admin/resenas', token)
      setReviews(data.reviews || [])
    } catch {
      // not critical
    }
  }, [token])

  const loadGalleryPhotos = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiGet('/api/admin/repair-gallery', token)
      setGalleryPhotos(data.photos || [])
    } catch {
      // not critical
    }
  }, [token])

  const loadPopups = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiGet('/api/admin/popups', token)
      setPopups(data.popups || [])
    } catch {
      // not critical
    }
  }, [token])

  // Sync tab with browser back/forward
  useEffect(() => {
    const onPopState = () => setActiveTabRaw(getTabFromPath())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (token) {
      loadStats()
      loadProducts()
      loadCategories()
      loadBubbles()
      loadServices()
      loadHeroSlides()
      loadMarqueeTexts()
      loadSucursales()
      loadReviews()
      loadGalleryPhotos()
      loadPopups()
    }
  }, [token, loadStats, loadProducts, loadCategories, loadBubbles, loadServices, loadHeroSlides, loadMarqueeTexts, loadSucursales, loadReviews, loadGalleryPhotos, loadPopups])

  const handleDelete = async () => {
    if (!deleteConfirm || !token) return
    try {
      if (deleteConfirm.type === 'product') await apiDelete(`/api/admin/products/${deleteConfirm.id}`, token)
      if (deleteConfirm.type === 'bubble') {
        await apiDelete(`/api/admin/bubbles/${deleteConfirm.id}`, token)
        // Also delete the corresponding category
        const matchingCat = categories.find(c => c.name === deleteConfirm.name)
        if (matchingCat) {
          try { await apiDelete(`/api/admin/categories/${matchingCat.id}`, token) } catch { /* best-effort */ }
        }
      }
      if (deleteConfirm.type === 'service') await apiDelete(`/api/admin/repair-services/${deleteConfirm.id}`, token)
      if (deleteConfirm.type === 'slide') await apiDelete(`/api/admin/hero-slides/${deleteConfirm.id}`, token)
      if (deleteConfirm.type === 'marquee') await apiDelete(`/api/admin/marquee-texts/${deleteConfirm.id}`, token)
      if (deleteConfirm.type === 'sucursal') await apiDelete(`/api/admin/sucursales/${deleteConfirm.id}`, token)
      if (deleteConfirm.type === 'review') await apiDelete(`/api/admin/resenas/${deleteConfirm.id}`, token)
      if (deleteConfirm.type === 'gallery') await apiDelete(`/api/admin/repair-gallery/${deleteConfirm.id}`, token)
      if (deleteConfirm.type === 'popup') await apiDelete(`/api/admin/popups/${deleteConfirm.id}`, token)
      setDeleteConfirm(null)
      loadStats()
      if (deleteConfirm.type === 'product') loadProducts()
      if (deleteConfirm.type === 'bubble') { loadBubbles(); loadCategories() }
      if (deleteConfirm.type === 'service') loadServices()
      if (deleteConfirm.type === 'slide') loadHeroSlides()
      if (deleteConfirm.type === 'marquee') loadMarqueeTexts()
      if (deleteConfirm.type === 'sucursal') loadSucursales()
      if (deleteConfirm.type === 'review') loadReviews()
      if (deleteConfirm.type === 'gallery') loadGalleryPhotos()
      if (deleteConfirm.type === 'popup') loadPopups()
    } catch {
      alert('Error eliminando')
    }
  }

  const handleChangePassword = async () => {
    if (!token) return
    try {
      await apiPost('/api/admin/change-password', { current_password: currentPassword, new_password: newPassword }, token)
      setPasswordMsg('Contrasena actualizada correctamente')
      setCurrentPassword('')
      setNewPassword('')
      setTimeout(() => setPasswordMsg(''), 3000)
    } catch {
      setPasswordMsg('Error: Contrasena actual incorrecta')
    }
  }

  if (!token) return <AdminLogin onLogin={handleLogin} />

  const filteredProducts = products.filter(p => {
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCondition = conditionFilter === 'todos' || 
      (conditionFilter === 'nuevos' && p.condition === 'Nuevo') ||
      (conditionFilter === 'semi-usados' && p.condition === 'Semi-usado')
    const matchesCategory = categoryFilter === 'todos' || p.category === categoryFilter
    const matchesCity = cityFilter === 'todos' || p.available.includes(cityFilter)
    return matchesSearch && matchesCondition && matchesCategory && matchesCity
  })

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'products', label: 'Productos', icon: <Package className="w-5 h-5" /> },
    { id: 'bubbles', label: 'Categorias', icon: <FolderOpen className="w-5 h-5" /> },
    { id: 'services', label: 'Servicios', icon: <Wrench className="w-5 h-5" /> },
    { id: 'gallery', label: 'Galeria Reparacion', icon: <Camera className="w-5 h-5" /> },
    { id: 'slideshow', label: 'Slideshow', icon: <Image className="w-5 h-5" /> },
    { id: 'marquee', label: 'Marquee', icon: <Type className="w-5 h-5" /> },
    { id: 'sucursales', label: 'Sucursales', icon: <MapPin className="w-5 h-5" /> },
    { id: 'resenas', label: 'Resenas', icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'popups', label: 'Pop Up', icon: <Image className="w-5 h-5" /> },
    { id: 'settings', label: 'Config', icon: <Lock className="w-5 h-5" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900/80 border-b border-white/10 sticky top-0 z-40">
        <div className="w-full max-w-[1800px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex-1 flex items-center">
            <img src="/gordotech-admin-logo.png" alt="Gordotech" className="h-12 md:h-16 w-auto" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '2px' }}>GORDOTECH ADMIN</h1>
          <div className="flex-1 flex items-center justify-end gap-4">
            <button onClick={onExit} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm md:text-base transition-colors">
              <Eye className="w-5 h-5" /> Ver tienda
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 text-gray-400 hover:text-red-400 text-sm md:text-base transition-colors">
              <LogOut className="w-5 h-5" /> Salir
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-gray-900/40 border-b border-white/5">
        <div className="w-full max-w-[1800px] mx-auto px-4 md:px-8 flex gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-2.5 px-4 md:px-5 py-3.5 md:py-4 text-sm md:text-base font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="w-full max-w-[1800px] mx-auto px-4 md:px-8 py-6 md:py-8">
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && stats && (
          <div className="space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '2px' }}>DASHBOARD</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
              {[
                { label: 'Total Productos', value: stats.total_products, color: 'blue' },
                { label: 'Nuevos', value: stats.new_products, color: 'green' },
                { label: 'Semi-usados', value: stats.used_products, color: 'amber' },
                { label: 'Categorias', value: stats.categories, color: 'cyan' },
                { label: 'Servicios', value: stats.repair_services, color: 'rose' },
              ].map((stat, i) => (
                <div key={i} className={`bg-${stat.color}-500/10 border border-${stat.color}-500/20 rounded-2xl p-5 md:p-6`}>
                  <p className="text-gray-400 text-sm md:text-base">{stat.label}</p>
                  <p className="text-3xl md:text-4xl font-bold mt-2">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div className="space-y-5 md:space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '2px' }}>PRODUCTOS ({products.length})</h2>
              <button onClick={() => setEditingProduct('new')} className="flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm md:text-base font-medium transition-colors">
                <Plus className="w-5 h-5" /> Nuevo Producto
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar producto..."
                    className="w-full bg-gray-800/50 border border-white/10 rounded-xl pl-12 pr-4 py-3 md:py-3.5 text-white text-sm md:text-base focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div className="flex gap-2">
                  {['todos', 'duitama', 'tunja'].map(f => (
                    <button key={f} onClick={() => setCityFilter(f)}
                      className={`px-4 py-2.5 md:py-3 rounded-xl text-sm md:text-base font-medium transition-colors ${cityFilter === f ? 'bg-green-500 text-white' : 'bg-gray-800/50 text-gray-400 hover:text-white border border-white/10'}`}>
                      {f === 'todos' ? 'Todas' : f === 'duitama' ? 'Duitama' : 'Tunja'}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  {['todos', 'nuevos', 'semi-usados'].map(f => (
                    <button key={f} onClick={() => setConditionFilter(f)}
                      className={`px-4 py-2.5 md:py-3 rounded-xl text-sm md:text-base font-medium transition-colors ${conditionFilter === f ? 'bg-blue-500 text-white' : 'bg-gray-800/50 text-gray-400 hover:text-white border border-white/10'}`}>
                      {f === 'todos' ? 'Todos' : f === 'nuevos' ? 'Nuevos' : 'Semi-usados'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setCategoryFilter('todos')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${categoryFilter === 'todos' ? 'bg-cyan-500 text-white' : 'bg-gray-800/50 text-gray-400 hover:text-white border border-white/10'}`}>
                  Todas
                </button>
                {categories.map(c => (
                  <button key={c.slug} onClick={() => setCategoryFilter(c.slug)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${categoryFilter === c.slug ? 'bg-cyan-500 text-white' : 'bg-gray-800/50 text-gray-400 hover:text-white border border-white/10'}`}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Table */}
            <div className="bg-gray-900/50 border border-white/10 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-gray-400 text-xs md:text-sm font-medium px-5 py-4 uppercase tracking-wider">Producto</th>
                      <th className="text-left text-gray-400 text-xs md:text-sm font-medium px-5 py-4 uppercase tracking-wider hidden md:table-cell">Categoria</th>
                      <th className="text-left text-gray-400 text-xs md:text-sm font-medium px-5 py-4 uppercase tracking-wider hidden md:table-cell">Condicion</th>
                      <th className="text-left text-gray-400 text-xs md:text-sm font-medium px-5 py-4 uppercase tracking-wider hidden md:table-cell">Storage</th>
                      <th className="text-left text-gray-400 text-xs md:text-sm font-medium px-5 py-4 uppercase tracking-wider hidden lg:table-cell">Precio</th>
                      <th className="text-left text-gray-400 text-xs md:text-sm font-medium px-5 py-4 uppercase tracking-wider hidden lg:table-cell">Featured</th>
                      <th className="text-right text-gray-400 text-xs md:text-sm font-medium px-5 py-4 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(product => (
                      <tr key={product.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-4">
                            <img src={product.image} alt="" className="w-14 h-14 md:w-16 md:h-16 rounded-xl object-cover bg-gray-800" onError={e => { (e.target as HTMLImageElement).src = `https://placehold.co/64x64/1a1a2e/7BA3C9/png?text=${encodeURIComponent(product.name.slice(0,2))}` }} />
                            <div>
                              <p className="text-white text-sm md:text-base font-medium">{product.name}</p>
                              <p className="text-gray-500 text-xs md:text-sm md:hidden">{product.condition}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <span className="px-2.5 py-1 bg-cyan-500/20 text-cyan-400 rounded-md text-xs md:text-sm font-medium">
                            {categories.find(c => c.slug === product.category)?.name || product.category || '-'}
                          </span>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <span className={`px-2.5 py-1 rounded-md text-xs md:text-sm font-medium ${product.condition === 'Nuevo' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {product.condition}
                          </span>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <p className="text-gray-400 text-xs md:text-sm">{product.storage_options.join(', ')}</p>
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <p className="text-gray-400 text-sm md:text-base font-medium">{product.price || '-'}</p>
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <div className="flex gap-1.5">
                            {product.featured_recommended && <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs md:text-sm">Rec</span>}
                            {product.featured_trending && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs md:text-sm">Trend</span>}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => setEditingProduct(product)} className="p-2.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-blue-400">
                              <Edit3 className="w-5 h-5" />
                            </button>
                            <button onClick={() => setDeleteConfirm({ type: 'product', id: product.id, name: product.name })} className="p-2.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-red-400">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredProducts.length === 0 && (
                <div className="text-center py-12 text-gray-500 text-base">No se encontraron productos</div>
              )}
            </div>
          </div>
        )}

        {/* CATEGORIES TAB (unified with bubbles) */}
        {activeTab === 'bubbles' && (
          <div className="space-y-5 md:space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '2px' }}>CATEGORIAS ({bubbles.length})</h2>
              <div className="flex gap-2">
                <button onClick={restoreBubbleImages} className="flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm md:text-base font-medium transition-colors">
                  Restaurar Imagenes
                </button>
                <button onClick={() => setEditingBubble('new')} className="flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm md:text-base font-medium transition-colors">
                  <Plus className="w-5 h-5" /> Nueva Categoria
                </button>
              </div>
            </div>
            <p className="text-gray-400 text-sm md:text-base">Gestiona las categorias de productos. Cada categoria se muestra como burbuja en la tienda para navegacion rapida.</p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6">
              {bubbles.map(bubble => (
                <div key={bubble.id} className="bg-gray-900/50 border border-white/10 rounded-2xl p-5 md:p-6 text-center group hover:border-cyan-500/30 transition-all">
                  <img src={bubble.image} alt={bubble.label} className="w-24 h-24 md:w-28 md:h-28 rounded-full mx-auto object-cover bg-gray-800 mb-4" onError={e => { (e.target as HTMLImageElement).src = `https://placehold.co/112x112/1a1a2e/7BA3C9/png?text=${encodeURIComponent(bubble.label.slice(0,2))}` }} />
                  <p className="text-white text-sm md:text-base font-medium">{bubble.label}</p>
                  <p className="text-gray-500 text-xs md:text-sm mb-1">Slug: {bubble.model_id}</p>
                  <p className="text-gray-500 text-xs md:text-sm mb-3">Orden: {bubble.sort_order}</p>
                  <p className="text-cyan-400 text-xs md:text-sm mb-4">{products.filter(p => p.category === bubble.model_id).length} productos</p>
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => setEditingBubble(bubble)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-blue-400">
                      <Edit3 className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <button onClick={() => setDeleteConfirm({ type: 'bubble', id: bubble.id, name: bubble.label })} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-red-400">
                      <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SERVICES TAB */}
        {activeTab === 'services' && (
          <div className="space-y-5 md:space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '2px' }}>SERVICIOS DE REPARACION ({services.length})</h2>
              <button onClick={() => setEditingService('new')} className="flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm md:text-base font-medium transition-colors">
                <Plus className="w-5 h-5" /> Nuevo Servicio
              </button>
            </div>

            <div className="space-y-3 md:space-y-4">
              {services.map(service => (
                <div key={service.id} className="bg-gray-900/50 border border-white/10 rounded-2xl p-5 md:p-6 flex items-center justify-between hover:border-blue-500/30 transition-all">
                  <div className="flex items-center gap-4 md:gap-5">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Wrench className="w-6 h-6 md:w-7 md:h-7 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-base md:text-lg">{service.title}</p>
                      <p className="text-gray-400 text-sm md:text-base">{service.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-blue-400 font-medium text-sm md:text-base hidden md:block">{service.price}</span>
                    <div className="flex gap-1.5">
                      <button onClick={() => setEditingService(service)} className="p-2.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-blue-400">
                        <Edit3 className="w-5 h-5" />
                      </button>
                      <button onClick={() => setDeleteConfirm({ type: 'service', id: service.id, name: service.title })} className="p-2.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-red-400">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GALLERY REPARACION TAB */}
        {activeTab === 'gallery' && (
          <div className="space-y-5 md:space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '2px' }}>GALERIA DE REPARACION ({galleryPhotos.length})</h2>
              <button onClick={() => { setEditingGalleryPhoto('new'); setGalleryForm({ image: '', caption: '', sort_order: galleryPhotos.length, active: true }) }} className="flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm md:text-base font-medium transition-colors">
                <Plus className="w-5 h-5" /> Nueva Foto
              </button>
            </div>

            {galleryPhotos.length === 0 && (
              <div className="bg-gray-900/50 border border-white/10 rounded-2xl p-10 md:p-12 text-center">
                <Camera className="w-14 h-14 md:w-16 md:h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-base md:text-lg">No hay fotos en la galeria de reparacion</p>
                <p className="text-gray-500 text-sm md:text-base mt-2">Agrega fotos del tecnico trabajando para mostrar en la pagina de reparacion</p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {galleryPhotos.map(photo => (
                <div key={photo.id} className={`bg-gray-900/50 border rounded-2xl overflow-hidden transition-all ${photo.active ? 'border-white/10 hover:border-blue-500/30' : 'border-white/5 opacity-60'}`}>
                  <div className="relative aspect-square bg-gray-800">
                    {photo.image ? (
                      <img src={photo.image} alt={photo.caption} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/1a1a2e/7BA3C9/png?text=Sin+imagen' }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Camera className="w-10 h-10 text-gray-600" /></div>
                    )}
                    {!photo.active && (
                      <div className="absolute top-2 left-2 px-2.5 py-1 bg-red-500/80 rounded text-xs text-white font-bold">INACTIVA</div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-white text-sm md:text-base font-medium truncate">{photo.caption || '(Sin descripcion)'}</p>
                    <p className="text-gray-500 text-xs md:text-sm mt-1">Orden: {photo.sort_order}</p>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => { setEditingGalleryPhoto(photo); setGalleryForm({ image: photo.image, caption: photo.caption, sort_order: photo.sort_order, active: photo.active }) }} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-blue-400">
                        <Edit3 className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                      <button onClick={() => setDeleteConfirm({ type: 'gallery', id: photo.id, name: photo.caption || 'Foto' })} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-red-400">
                        <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Gallery Photo Form Modal */}
            {editingGalleryPhoto !== null && (
              <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between p-5 border-b border-white/10">
                    <h3 className="text-lg font-bold text-white">{editingGalleryPhoto === 'new' ? 'Nueva Foto' : 'Editar Foto'}</h3>
                    <button onClick={() => setEditingGalleryPhoto(null)} className="p-1 hover:bg-white/10 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Imagen *</label>
                      <ImageUploader
                        currentImage={galleryForm.image}
                        onUpload={(url: string) => setGalleryForm(f => ({...f, image: url}))}
                        token={token}
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Descripcion / Caption</label>
                      <input value={galleryForm.caption} onChange={e => setGalleryForm(f => ({...f, caption: e.target.value}))}
                        className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50" placeholder="Ej: Cambio de pantalla iPhone 15" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">Orden</label>
                        <input type="number" value={galleryForm.sort_order} onChange={e => setGalleryForm(f => ({...f, sort_order: parseInt(e.target.value) || 0}))}
                          className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50" />
                      </div>
                      <div className="flex items-end pb-1">
                        <div className="flex items-center gap-3">
                          <label className="text-gray-400 text-sm">Activa</label>
                          <button onClick={() => setGalleryForm(f => ({...f, active: !f.active}))} className="p-1">
                            {galleryForm.active ? <ToggleRight className="w-6 h-6 text-green-400" /> : <ToggleLeft className="w-6 h-6 text-gray-500" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 p-5 border-t border-white/10">
                    <button onClick={() => setEditingGalleryPhoto(null)} className="flex-1 py-2.5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/5 transition-colors text-sm">Cancelar</button>
                    <button onClick={async () => {
                      if (!galleryForm.image) return
                      setSavingGallery(true)
                      try {
                        if (editingGalleryPhoto === 'new') {
                          await apiPost('/api/admin/repair-gallery', galleryForm, token)
                        } else {
                          await apiPut(`/api/admin/repair-gallery/${editingGalleryPhoto.id}`, galleryForm, token)
                        }
                        setEditingGalleryPhoto(null)
                        loadGalleryPhotos()
                      } catch { alert('Error guardando foto') } finally { setSavingGallery(false) }
                    }} disabled={savingGallery || !galleryForm.image} className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-xl transition-colors text-sm font-medium flex items-center justify-center gap-2">
                      <Save className="w-4 h-4" />
                      {savingGallery ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SLIDESHOW TAB */}
        {activeTab === 'slideshow' && (
          <div className="space-y-5 md:space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '2px' }}>HERO SLIDESHOW ({heroSlides.length})</h2>
              <button onClick={() => { setEditingSlide('new'); setSlideForm({ title: '', subtitle: '', image: '', video_url: '', link: '#productos', sort_order: heroSlides.length }) }} className="flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm md:text-base font-medium transition-colors">
                <Plus className="w-5 h-5" /> Nuevo Slide
              </button>
            </div>

            <div className="space-y-3 md:space-y-4">
              {heroSlides.map(slide => (
                <div key={slide.id} className={`bg-gray-900/50 border rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 transition-all ${slide.active ? 'border-white/10 hover:border-blue-500/30' : 'border-white/5 opacity-60'}`}>
                  <div className="relative w-full md:w-48 lg:w-56 h-28 md:h-32 rounded-xl bg-gray-800 flex-shrink-0 overflow-hidden">
                    {slide.video_url && !slide.image && (slide.video_url.endsWith('.mp4') || slide.video_url.endsWith('.webm') || slide.video_url.endsWith('.mov')) ? (
                      <video src={slide.video_url} className="w-full h-full object-cover" muted playsInline preload="metadata" onLoadedData={e => { (e.target as HTMLVideoElement).currentTime = 1 }} />
                    ) : slide.image ? (
                      <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x200/1a1a2e/7BA3C9/png?text=Sin+imagen' }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Film className="w-8 h-8 text-gray-600" /></div>
                    )}
                    {slide.video_url && (
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-blue-500/80 rounded text-[9px] text-white font-bold flex items-center gap-0.5"><Play className="w-2.5 h-2.5" fill="white" /> VIDEO</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-base md:text-lg truncate">{slide.title || '(Sin titulo)'}</p>
                    <p className="text-gray-400 text-sm md:text-base truncate">{slide.subtitle || '(Sin subtitulo)'}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className="text-gray-500 text-xs md:text-sm">Orden: {slide.sort_order}</span>
                      <span className="text-gray-500 text-xs md:text-sm">Link: {slide.link || '-'}</span>
                      {slide.video_url && <span className="text-blue-400 text-xs md:text-sm flex items-center gap-1"><Film className="w-3.5 h-3.5" />{slide.video_url.split('/').pop()}</span>}
                      <span className={`text-xs md:text-sm px-2.5 py-0.5 rounded-full ${slide.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {slide.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={async () => { await apiPost(`/api/admin/hero-slides/${slide.id}/toggle`, {}, token); loadHeroSlides() }} className="p-2.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-yellow-400" title={slide.active ? 'Desactivar' : 'Activar'}>
                      {slide.active ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button onClick={() => { setEditingSlide(slide); setSlideForm({ title: slide.title, subtitle: slide.subtitle, image: slide.image, video_url: slide.video_url || '', link: slide.link, sort_order: slide.sort_order }) }} className="p-2.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-blue-400">
                      <Edit3 className="w-5 h-5" />
                    </button>
                    <button onClick={() => setDeleteConfirm({ type: 'slide', id: slide.id, name: slide.title || 'Slide' })} className="p-2.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-red-400">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
              {heroSlides.length === 0 && (
                <div className="text-center py-12 text-gray-500 text-base">No hay slides. Agrega uno para mostrar en la pagina principal.</div>
              )}
            </div>

            {/* Slide edit modal */}
            {editingSlide !== null && (
              <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 overflow-y-auto">
                <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg my-8">
                  <div className="flex items-center justify-between p-5 border-b border-white/10">
                    <h3 className="text-xl font-bold text-white">{editingSlide === 'new' ? 'Nuevo Slide' : 'Editar Slide'}</h3>
                    <button onClick={() => setEditingSlide(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Imagen del slide</label>
                      <ImageUploader token={token} currentImage={slideForm.image} onUpload={url => setSlideForm({...slideForm, image: url})} />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Video URL (MP4 local o YouTube) - opcional</label>
                      <input value={slideForm.video_url} onChange={e => setSlideForm({...slideForm, video_url: e.target.value})}
                        className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50" placeholder="ej: /videos/mi-video.mp4 o URL de YouTube" />
                      <p className="text-gray-500 text-xs mt-1">Soporta archivos MP4 locales (ej: /videos/nombre.mp4) y YouTube. El video se muestra en lugar de la imagen.</p>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Titulo</label>
                      <input value={slideForm.title} onChange={e => setSlideForm({...slideForm, title: e.target.value})}
                        className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50" placeholder="ej: iPhone 17 Pro Max" />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Subtitulo</label>
                      <input value={slideForm.subtitle} onChange={e => setSlideForm({...slideForm, subtitle: e.target.value})}
                        className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50" placeholder="ej: El mas poderoso. Disponible ahora." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">Link</label>
                        <input value={slideForm.link} onChange={e => setSlideForm({...slideForm, link: e.target.value})}
                          className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50" placeholder="#productos" />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">Orden</label>
                        <input type="number" value={slideForm.sort_order} onChange={e => setSlideForm({...slideForm, sort_order: parseInt(e.target.value) || 0})}
                          className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 p-5 border-t border-white/10">
                    <button onClick={() => setEditingSlide(null)} className="flex-1 py-2.5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/5 transition-colors text-sm">Cancelar</button>
                    <button onClick={async () => {
                      setSavingSlide(true)
                      try {
                        if (editingSlide === 'new') {
                          await apiPost('/api/admin/hero-slides', slideForm, token)
                        } else {
                          await apiPut(`/api/admin/hero-slides/${editingSlide.id}`, slideForm, token)
                        }
                        setEditingSlide(null)
                        loadHeroSlides()
                        loadStats()
                      } catch { alert('Error guardando slide') } finally { setSavingSlide(false) }
                    }} disabled={savingSlide || (!slideForm.image && !slideForm.video_url)} className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-xl transition-colors text-sm font-medium flex items-center justify-center gap-2">
                      <Save className="w-4 h-4" />
                      {savingSlide ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MARQUEE TAB */}
        {activeTab === 'marquee' && (
          <div className="space-y-5 md:space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '2px' }}>TEXTOS DEL BANNER ({marqueeTexts.length})</h2>
            </div>
            <p className="text-gray-400 text-sm md:text-base">Estos textos se muestran en el banner animado en la parte superior de la pagina. Se concatenan y se desplazan horizontalmente.</p>

            {/* Add new text */}
            <div className="flex gap-3">
              <input
                value={newMarqueeText}
                onChange={e => setNewMarqueeText(e.target.value)}
                placeholder="Nuevo texto para el banner..."
                className="flex-1 bg-gray-800/50 border border-white/10 rounded-xl px-4 py-3 md:py-3.5 text-white text-sm md:text-base focus:outline-none focus:border-blue-500/50"
                onKeyDown={async e => {
                  if (e.key === 'Enter' && newMarqueeText.trim()) {
                    setSavingMarquee(true)
                    try {
                      await apiPost('/api/admin/marquee-texts', { text: newMarqueeText.trim(), sort_order: marqueeTexts.length }, token)
                      setNewMarqueeText('')
                      loadMarqueeTexts()
                    } catch { alert('Error') } finally { setSavingMarquee(false) }
                  }
                }}
              />
              <button onClick={async () => {
                if (!newMarqueeText.trim()) return
                setSavingMarquee(true)
                try {
                  await apiPost('/api/admin/marquee-texts', { text: newMarqueeText.trim(), sort_order: marqueeTexts.length }, token)
                  setNewMarqueeText('')
                  loadMarqueeTexts()
                } catch { alert('Error') } finally { setSavingMarquee(false) }
              }} disabled={savingMarquee || !newMarqueeText.trim()} className="px-5 py-3 md:py-3.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-xl text-sm md:text-base font-medium transition-colors flex items-center gap-2">
                <Plus className="w-5 h-5" /> Agregar
              </button>
            </div>

            {/* Texts list */}
            <div className="space-y-2 md:space-y-3">
              {marqueeTexts.map((mt, idx) => (
                <div key={mt.id} className={`bg-gray-900/50 border rounded-xl p-4 md:p-5 flex items-center gap-3 md:gap-4 transition-all ${mt.active ? 'border-white/10' : 'border-white/5 opacity-60'}`}>
                  <div className="flex flex-col gap-0.5">
                    <button onClick={async () => {
                      if (idx === 0) return
                      await apiPut(`/api/admin/marquee-texts/${mt.id}`, { sort_order: marqueeTexts[idx - 1].sort_order }, token)
                      await apiPut(`/api/admin/marquee-texts/${marqueeTexts[idx - 1].id}`, { sort_order: mt.sort_order }, token)
                      loadMarqueeTexts()
                    }} disabled={idx === 0} className="p-1 text-gray-500 hover:text-white disabled:opacity-30"><ArrowUp className="w-4 h-4 md:w-5 md:h-5" /></button>
                    <button onClick={async () => {
                      if (idx === marqueeTexts.length - 1) return
                      await apiPut(`/api/admin/marquee-texts/${mt.id}`, { sort_order: marqueeTexts[idx + 1].sort_order }, token)
                      await apiPut(`/api/admin/marquee-texts/${marqueeTexts[idx + 1].id}`, { sort_order: mt.sort_order }, token)
                      loadMarqueeTexts()
                    }} disabled={idx === marqueeTexts.length - 1} className="p-1 text-gray-500 hover:text-white disabled:opacity-30"><ArrowDown className="w-4 h-4 md:w-5 md:h-5" /></button>
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingMarqueeId === mt.id ? (
                      <input
                        value={editingMarqueeValue}
                        onChange={e => setEditingMarqueeValue(e.target.value)}
                        className="w-full bg-gray-800/50 border border-blue-500/50 rounded-lg px-4 py-2 text-white text-sm md:text-base focus:outline-none"
                        autoFocus
                        onKeyDown={async e => {
                          if (e.key === 'Enter') {
                            await apiPut(`/api/admin/marquee-texts/${mt.id}`, { text: editingMarqueeValue }, token)
                            setEditingMarqueeId(null)
                            loadMarqueeTexts()
                          }
                          if (e.key === 'Escape') setEditingMarqueeId(null)
                        }}
                      />
                    ) : (
                      <p className="text-white text-sm md:text-base truncate">{mt.text}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={async () => {
                      await apiPut(`/api/admin/marquee-texts/${mt.id}`, { active: !mt.active }, token)
                      loadMarqueeTexts()
                    }} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title={mt.active ? 'Desactivar' : 'Activar'}>
                      {mt.active ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5 text-gray-500" />}
                    </button>
                    <button onClick={() => { setEditingMarqueeId(mt.id); setEditingMarqueeValue(mt.text) }} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-blue-400">
                      <Edit3 className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <button onClick={() => setDeleteConfirm({ type: 'marquee', id: mt.id, name: mt.text.slice(0, 30) })} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-red-400">
                      <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  </div>
                </div>
              ))}
              {marqueeTexts.length === 0 && (
                <div className="text-center py-12 text-gray-500 text-base">No hay textos. Agrega uno para mostrar en el banner superior.</div>
              )}
            </div>
          </div>
        )}

        {/* SUCURSALES TAB */}
        {activeTab === 'sucursales' && (
          <div className="space-y-5 md:space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '2px' }}>SUCURSALES ({sucursales.length})</h2>
              <button onClick={() => { setSucursalForm({ name:'', slug:'', address:'', city:'', image:'', whatsapp:'', instagram:'', tiktok:'', phone:'', description:'', sort_order: sucursales.length, active:true }); setEditingSucursal('new') }} className="flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm md:text-base font-medium transition-colors">
                <Plus className="w-5 h-5" /> Nueva Sucursal
              </button>
            </div>
            <p className="text-gray-400 text-sm md:text-base">Gestiona las sedes de Gordotech. Puedes asignarle una foto a cada sucursal para que se muestre en la página de Sucursales.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {sucursales.map(s => (
                <div key={s.id} className={`bg-gray-900/50 border rounded-2xl overflow-hidden transition-all ${s.active ? 'border-white/10' : 'border-white/5 opacity-60'}`}>
                  {/* Preview image */}
                  <div className="relative aspect-video bg-gray-800 overflow-hidden">
                    {s.image ? (
                      <img src={s.image.startsWith('/uploads') ? `${API_URL}${s.image}` : s.image} alt={s.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MapPin className="w-12 h-12 text-gray-600" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-4 left-4">
                      <p className="text-white font-bold text-base md:text-lg drop-shadow" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.5px' }}>{s.name}</p>
                      <p className="text-gray-300 text-xs md:text-sm">{s.city}</p>
                    </div>
                  </div>
                  <div className="p-4 md:p-5">
                    <p className="text-gray-400 text-xs md:text-sm mb-1 truncate">{s.address}</p>
                    {s.whatsapp && <p className="text-green-400 text-xs md:text-sm truncate">WA: {s.whatsapp}</p>}
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => {
                        setSucursalForm({ name: s.name, slug: s.slug, address: s.address, city: s.city, image: s.image, whatsapp: s.whatsapp, instagram: s.instagram, tiktok: s.tiktok, phone: s.phone, description: s.description, sort_order: s.sort_order, active: s.active })
                        setEditingSucursal(s as unknown as Record<string,unknown>)
                      }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors">
                        <Edit3 className="w-4 h-4" /> Editar
                      </button>
                      <button onClick={() => setDeleteConfirm({ type: 'sucursal', id: s.id, name: s.name })} className="px-4 py-2.5 text-sm bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {sucursales.length === 0 && (
                <div className="col-span-3 text-center py-12 text-gray-500 text-base">No hay sucursales configuradas. Crea una nueva.</div>
              )}
            </div>

            {/* Sucursal edit modal */}
            {editingSucursal !== null && (
              <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 overflow-y-auto">
                <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg my-8">
                  <div className="flex items-center justify-between p-5 border-b border-white/10">
                    <h3 className="text-xl font-bold text-white">{editingSucursal === 'new' ? 'Nueva Sucursal' : 'Editar Sucursal'}</h3>
                    <button onClick={() => setEditingSucursal(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Foto de la sucursal</label>
                      <ImageUploader token={token} currentImage={sucursalForm.image} onUpload={url => setSucursalForm(f => ({...f, image: url}))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">Nombre *</label>
                        <input value={sucursalForm.name} onChange={e => setSucursalForm(f => ({...f, name: e.target.value, slug: f.slug || e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}))}
                          className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50" placeholder="Gordotech Duitama" />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">Ciudad *</label>
                        <input value={sucursalForm.city} onChange={e => setSucursalForm(f => ({...f, city: e.target.value}))}
                          className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50" placeholder="Duitama" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Direccion</label>
                      <input value={sucursalForm.address} onChange={e => setSucursalForm(f => ({...f, address: e.target.value}))}
                        className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50" placeholder="Pasaje Comercial Solano, Local 102" />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">WhatsApp (solo numeros, sin +)</label>
                      <input value={sucursalForm.whatsapp} onChange={e => setSucursalForm(f => ({...f, whatsapp: e.target.value}))}
                        className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50" placeholder="573144810431" />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Instagram (URL completa)</label>
                      <input value={sucursalForm.instagram} onChange={e => setSucursalForm(f => ({...f, instagram: e.target.value}))}
                        className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50" placeholder="https://www.instagram.com/gordotechduitama" />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">TikTok (URL completa)</label>
                      <input value={sucursalForm.tiktok} onChange={e => setSucursalForm(f => ({...f, tiktok: e.target.value}))}
                        className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50" placeholder="https://www.tiktok.com/@gordotech1" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">Telefono</label>
                        <input value={sucursalForm.phone} onChange={e => setSucursalForm(f => ({...f, phone: e.target.value}))}
                          className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50" placeholder="+57 314 481 0431" />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">Orden</label>
                        <input type="number" value={sucursalForm.sort_order} onChange={e => setSucursalForm(f => ({...f, sort_order: parseInt(e.target.value) || 0}))}
                          className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Descripcion</label>
                      <input value={sucursalForm.description} onChange={e => setSucursalForm(f => ({...f, description: e.target.value}))}
                        className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50" placeholder="Tu destino Apple en Duitama" />
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-gray-400 text-sm">Activa</label>
                      <button onClick={() => setSucursalForm(f => ({...f, active: !f.active}))} className="p-1">
                        {sucursalForm.active ? <ToggleRight className="w-6 h-6 text-green-400" /> : <ToggleLeft className="w-6 h-6 text-gray-500" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-3 p-5 border-t border-white/10">
                    <button onClick={() => setEditingSucursal(null)} className="flex-1 py-2.5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/5 transition-colors text-sm">Cancelar</button>
                    <button onClick={async () => {
                      if (!sucursalForm.name) return
                      setSavingSucursal(true)
                      try {
                        const payload = { ...sucursalForm, slug: sucursalForm.slug || sucursalForm.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }
                        if (editingSucursal === 'new') {
                          await apiPost('/api/admin/sucursales', payload, token)
                        } else {
                          await apiPut(`/api/admin/sucursales/${(editingSucursal as {id:number}).id}`, payload, token)
                        }
                        setEditingSucursal(null)
                        loadSucursales()
                      } catch { alert('Error guardando sucursal') } finally { setSavingSucursal(false) }
                    }} disabled={savingSucursal || !sucursalForm.name} className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-xl transition-colors text-sm font-medium flex items-center justify-center gap-2">
                      <Save className="w-4 h-4" />
                      {savingSucursal ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* RESENAS TAB */}
        {activeTab === 'resenas' && (
          <div className="space-y-5 md:space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '2px' }}>RESENAS ({reviews.length})</h2>
              <button onClick={() => { setReviewForm({ sucursal_slug: 'duitama', customer_name: '', rating: 5, text: '', sort_order: reviews.length, active: true }); setEditingReview('new') }} className="flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm md:text-base font-medium transition-colors">
                <Plus className="w-5 h-5" /> Nueva Resena
              </button>
            </div>
            <p className="text-gray-400 text-sm md:text-base">Gestiona las resenas que se muestran en la pagina de Sucursales. Puedes agregar, editar y eliminar resenas manualmente.</p>

            {/* Filter by sucursal */}
            <div className="flex gap-2 flex-wrap">
              {['todos', 'duitama', 'tunja', 'clinica'].map(slug => (
                <button key={slug} onClick={() => setReviewFilter(slug)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${reviewFilter === slug ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                  {slug === 'todos' ? 'Todas' : slug === 'clinica' ? 'Clinica' : slug.charAt(0).toUpperCase() + slug.slice(1)}
                </button>
              ))}
            </div>

            {/* Reviews list */}
            <div className="space-y-3 md:space-y-4">
              {reviews
                .filter(r => reviewFilter === 'todos' || r.sucursal_slug === reviewFilter)
                .sort((a, b) => a.sort_order - b.sort_order)
                .map(review => (
                <div key={review.id} className={`bg-gray-900/50 border rounded-xl p-4 md:p-5 transition-all ${review.active ? 'border-white/10' : 'border-white/5 opacity-60'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-semibold text-white text-sm md:text-base">{review.customer_name}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs md:text-sm bg-blue-500/20 text-blue-300">
                          {review.sucursal_slug === 'clinica' ? 'Clinica' : review.sucursal_slug.charAt(0).toUpperCase() + review.sucursal_slug.slice(1)}
                        </span>
                        <span className="flex items-center gap-0.5 text-yellow-400">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star key={i} className={`w-3.5 h-3.5 md:w-4 md:h-4 ${i < review.rating ? 'fill-yellow-400' : 'fill-gray-600 text-gray-600'}`} />
                          ))}
                        </span>
                        {!review.active && <span className="text-xs md:text-sm text-gray-500">(inactiva)</span>}
                      </div>
                      <p className="text-gray-300 text-sm md:text-base leading-relaxed">{review.text}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={async () => {
                        await apiPut(`/api/admin/resenas/${review.id}`, { active: !review.active }, token)
                        loadReviews()
                      }} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title={review.active ? 'Desactivar' : 'Activar'}>
                        {review.active ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5 text-gray-500" />}
                      </button>
                      <button onClick={() => {
                        setReviewForm({ sucursal_slug: review.sucursal_slug, customer_name: review.customer_name, rating: review.rating, text: review.text, sort_order: review.sort_order, active: review.active })
                        setEditingReview(review)
                      }} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-blue-400">
                        <Edit3 className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                      <button onClick={() => setDeleteConfirm({ type: 'review', id: review.id, name: review.customer_name })} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-red-400">
                        <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {reviews.filter(r => reviewFilter === 'todos' || r.sucursal_slug === reviewFilter).length === 0 && (
                <div className="text-center py-12 text-gray-500 text-base">No hay resenas{reviewFilter !== 'todos' ? ` para ${reviewFilter}` : ''}. Agrega una nueva.</div>
              )}
            </div>

            {/* Review edit/create modal */}
            {editingReview !== null && (
              <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 overflow-y-auto">
                <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg my-8">
                  <div className="flex items-center justify-between p-5 border-b border-white/10">
                    <h3 className="text-xl font-bold text-white">{editingReview === 'new' ? 'Nueva Resena' : 'Editar Resena'}</h3>
                    <button onClick={() => setEditingReview(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Sucursal *</label>
                      <select value={reviewForm.sucursal_slug} onChange={e => setReviewForm(f => ({...f, sucursal_slug: e.target.value}))}
                        className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50">
                        <option value="duitama">Duitama</option>
                        <option value="tunja">Tunja</option>
                        <option value="clinica">Clinica de Celulares</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Nombre del cliente *</label>
                      <input value={reviewForm.customer_name} onChange={e => setReviewForm(f => ({...f, customer_name: e.target.value}))}
                        className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50" placeholder="Juan Perez" />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Calificacion *</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(n => (
                          <button key={n} onClick={() => setReviewForm(f => ({...f, rating: n}))}
                            className="p-1 transition-colors">
                            <Star className={`w-6 h-6 ${n <= reviewForm.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-600 text-gray-600'}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Texto de la resena *</label>
                      <textarea value={reviewForm.text} onChange={e => setReviewForm(f => ({...f, text: e.target.value}))} rows={3}
                        className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50 resize-none" placeholder="Excelente servicio..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">Orden</label>
                        <input type="number" value={reviewForm.sort_order} onChange={e => setReviewForm(f => ({...f, sort_order: parseInt(e.target.value) || 0}))}
                          className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50" />
                      </div>
                      <div className="flex items-end pb-1">
                        <div className="flex items-center gap-3">
                          <label className="text-gray-400 text-sm">Activa</label>
                          <button onClick={() => setReviewForm(f => ({...f, active: !f.active}))} className="p-1">
                            {reviewForm.active ? <ToggleRight className="w-6 h-6 text-green-400" /> : <ToggleLeft className="w-6 h-6 text-gray-500" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 p-5 border-t border-white/10">
                    <button onClick={() => setEditingReview(null)} className="flex-1 py-2.5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/5 transition-colors text-sm">Cancelar</button>
                    <button onClick={async () => {
                      if (!reviewForm.customer_name || !reviewForm.text) return
                      setSavingReview(true)
                      try {
                        if (editingReview === 'new') {
                          await apiPost('/api/admin/resenas', reviewForm, token)
                        } else {
                          await apiPut(`/api/admin/resenas/${editingReview.id}`, reviewForm, token)
                        }
                        setEditingReview(null)
                        loadReviews()
                      } catch { alert('Error guardando resena') } finally { setSavingReview(false) }
                    }} disabled={savingReview || !reviewForm.customer_name || !reviewForm.text} className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-xl transition-colors text-sm font-medium flex items-center justify-center gap-2">
                      <Save className="w-4 h-4" />
                      {savingReview ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* POPUPS TAB */}
        {activeTab === 'popups' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '2px' }}>POP UP</h2>
              <button onClick={() => { setEditingPopup('new'); setPopupForm({ image: '', title: '', link: '', sort_order: 0, active: true }) }}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl transition-colors text-sm md:text-base font-medium">
                <Plus className="w-5 h-5" /> Nuevo Pop Up
              </button>
            </div>

            {popups.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Image className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">No hay pop ups configurados</p>
                <p className="text-sm mt-1">Agrega un pop up para que aparezca al abrir la pagina</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {popups.map(popup => (
                  <div key={popup.id} className="bg-gray-900/50 border border-white/10 rounded-2xl overflow-hidden">
                    {popup.image && (
                      <div className="aspect-[4/5] bg-gray-800 overflow-hidden">
                        <img src={popup.image} alt={popup.title || 'Pop Up'} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium truncate">{popup.title || `Pop Up #${popup.id}`}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${popup.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                          {popup.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      {popup.link && <p className="text-gray-400 text-xs truncate">{popup.link}</p>}
                      <div className="flex gap-2">
                        <button onClick={async () => {
                          try { await apiPost(`/api/admin/popups/${popup.id}/toggle`, {}, token); loadPopups() } catch { alert('Error') }
                        }} className="flex-1 py-2 border border-white/10 text-gray-300 rounded-lg hover:bg-white/5 transition-colors text-sm flex items-center justify-center gap-1">
                          {popup.active ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4" />}
                          {popup.active ? 'Desactivar' : 'Activar'}
                        </button>
                        <button onClick={() => { setEditingPopup(popup); setPopupForm({ image: popup.image, title: popup.title, link: popup.link, sort_order: popup.sort_order, active: popup.active }) }}
                          className="p-2 border border-white/10 text-gray-300 rounded-lg hover:bg-white/5 transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirm({ type: 'popup', id: popup.id, name: popup.title || `Pop Up #${popup.id}` })}
                          className="p-2 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Popup Form Modal */}
            {editingPopup !== null && (
              <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg">
                  <div className="flex items-center justify-between p-5 md:p-6 border-b border-white/10">
                    <h3 className="text-xl md:text-2xl font-bold text-white">{editingPopup === 'new' ? 'Nuevo Pop Up' : 'Editar Pop Up'}</h3>
                    <button onClick={() => setEditingPopup(null)} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
                  </div>
                  <div className="p-5 md:p-6 space-y-5">
                    <div>
                      <label className="block text-gray-400 text-sm md:text-base mb-1.5">Imagen *</label>
                      <ImageUploader token={token} currentImage={popupForm.image} onUpload={url => setPopupForm(f => ({...f, image: url}))} />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm md:text-base mb-1.5">Titulo (opcional)</label>
                      <input value={popupForm.title} onChange={e => setPopupForm(f => ({...f, title: e.target.value}))}
                        className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm md:text-base focus:outline-none focus:border-blue-500/50" placeholder="ej: Plan Retoma" />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm md:text-base mb-1.5">Link (opcional, al hacer clic en la imagen)</label>
                      <input value={popupForm.link} onChange={e => setPopupForm(f => ({...f, link: e.target.value}))}
                        className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm md:text-base focus:outline-none focus:border-blue-500/50" placeholder="https://gordotech.co/plan-retoma" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 text-sm md:text-base mb-1.5">Orden</label>
                        <input type="number" value={popupForm.sort_order} onChange={e => setPopupForm(f => ({...f, sort_order: parseInt(e.target.value) || 0}))}
                          className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm md:text-base focus:outline-none focus:border-blue-500/50" />
                      </div>
                      <div className="flex items-end pb-1">
                        <div className="flex items-center gap-3">
                          <label className="text-gray-400 text-sm md:text-base">Activo</label>
                          <button onClick={() => setPopupForm(f => ({...f, active: !f.active}))} className="p-1">
                            {popupForm.active ? <ToggleRight className="w-7 h-7 text-green-400" /> : <ToggleLeft className="w-7 h-7 text-gray-500" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 p-5 md:p-6 border-t border-white/10">
                    <button onClick={() => setEditingPopup(null)} className="flex-1 py-3 border border-white/10 text-gray-300 rounded-xl hover:bg-white/5 transition-colors text-sm md:text-base">Cancelar</button>
                    <button onClick={async () => {
                      if (!popupForm.image) return
                      setSavingPopup(true)
                      try {
                        if (editingPopup === 'new') {
                          await apiPost('/api/admin/popups', popupForm, token)
                        } else {
                          await apiPut(`/api/admin/popups/${editingPopup.id}`, popupForm, token)
                        }
                        setEditingPopup(null)
                        loadPopups()
                      } catch { alert('Error guardando popup') } finally { setSavingPopup(false) }
                    }} disabled={savingPopup || !popupForm.image} className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-xl transition-colors text-sm md:text-base font-medium flex items-center justify-center gap-2">
                      <Save className="w-5 h-5" />
                      {savingPopup ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-8 max-w-xl">
            <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '2px' }}>CONFIGURACION</h2>
            
            <div className="bg-gray-900/50 border border-white/10 rounded-2xl p-6 md:p-8 space-y-5">
              <h3 className="text-xl md:text-2xl font-semibold text-white">Cambiar Contrasena</h3>
              {passwordMsg && (
                <div className={`p-4 rounded-xl text-sm md:text-base ${passwordMsg.includes('Error') ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>{passwordMsg}</div>
              )}
              <div>
                <label className="block text-gray-400 text-sm md:text-base mb-1.5">Contrasena actual</label>
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-4 py-3 md:py-3.5 text-white text-sm md:text-base focus:outline-none focus:border-blue-500/50" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm md:text-base mb-1.5">Nueva contrasena</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-gray-800/50 border border-white/10 rounded-lg px-4 py-3 md:py-3.5 text-white text-sm md:text-base focus:outline-none focus:border-blue-500/50" />
              </div>
              <button onClick={handleChangePassword} disabled={!currentPassword || !newPassword}
                className="w-full py-3 md:py-3.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-xl transition-colors text-sm md:text-base font-medium">
                Cambiar Contrasena
              </button>
            </div>
          </div>
        )}
      </main>

      {/* MODALS */}
      {editingProduct !== null && (
        <ProductForm
          product={editingProduct === 'new' ? null : editingProduct}
          token={token}
          categories={categories}
          onSave={() => { setEditingProduct(null); loadProducts(); loadStats() }}
          onCancel={() => setEditingProduct(null)}
        />
      )}

      {editingBubble !== null && (
        <BubbleForm
          bubble={editingBubble === 'new' ? null : editingBubble}
          token={token}
          categories={categories}
          onSave={() => { setEditingBubble(null); loadBubbles(); loadCategories(); loadStats() }}
          onCancel={() => setEditingBubble(null)}
        />
      )}

      {editingService !== null && (
        <ServiceForm
          service={editingService === 'new' ? null : editingService}
          token={token}
          onSave={() => { setEditingService(null); loadServices(); loadStats() }}
          onCancel={() => setEditingService(null)}
        />
      )}

      {/* DELETE CONFIRM */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md p-8 text-center">
            <Trash2 className="w-14 h-14 text-red-400 mx-auto mb-5" />
            <h3 className="text-xl font-bold text-white mb-2">Eliminar {deleteConfirm.name}?</h3>
            <p className="text-gray-400 text-sm md:text-base mb-6">Esta accion no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 border border-white/10 text-gray-300 rounded-xl hover:bg-white/5 transition-colors text-sm md:text-base">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors text-sm md:text-base font-medium">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

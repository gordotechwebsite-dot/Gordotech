import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom'
import './App.css'
import { MapPin, Smartphone, Wrench, Shield, Star, ChevronRight, Phone, Mail, Clock, Instagram, MessageCircle, ArrowRight, Zap, Award, X, Menu, ShoppingCart, Heart, ArrowLeft, TrendingUp, Sparkles, Settings, ChevronLeft, ZoomIn, Minus, Plus, Trash2 } from 'lucide-react'
import AdminPanel from './AdminPanel'
import { lazy } from 'react'
const ProductViewer3D = lazy(() => import('./ProductViewer3D'))

// Local 3D model mapping for products that have GLB files
const LOCAL_3D_MODELS: Record<string, string> = {
  'iphone 14 pro': '/models/iphone_14_pro.glb',
  'iphone 14 pro max': '/models/iphone_14_pro.glb',
}

function getModel3DUrl(product: { name: string; model_3d?: string }): string | null {
  // First check if product has a model_3d URL from the backend
  if (product.model_3d) return product.model_3d
  // Then check local mappings by product name
  const nameLower = product.name.toLowerCase()
  for (const [key, url] of Object.entries(LOCAL_3D_MODELS)) {
    if (nameLower.includes(key)) return url
  }
  return null
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Apple-style scroll-triggered animation hook
function useScrollAnimation(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.unobserve(el) } },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])
  return { ref, isVisible }
}

// Reusable scroll-reveal wrapper
function ScrollReveal({ children, className = '', delay = 0, animation = 'fade-up' }: {
  children: React.ReactNode; className?: string; delay?: number; animation?: 'fade-up' | 'fade' | 'scale'
}) {
  const { ref, isVisible } = useScrollAnimation()
  const animClass = animation === 'scale' ? 'scroll-animate scroll-animate-scale'
    : animation === 'fade' ? 'scroll-animate scroll-animate-fade'
    : 'scroll-animate'
  return (
    <div ref={ref} className={`${animClass} ${isVisible ? 'is-visible' : ''} ${className}`}
      style={delay > 0 ? { animationDelay: `${delay}s` } : undefined}>
      {children}
    </div>
  )
}

type City = 'duitama' | 'tunja' | null

// City-based social media links
const CITY_SOCIALS: Record<'duitama' | 'tunja', { instagram: string; tiktok: string; whatsapp: string; whatsappNumber: string }> = {
  duitama: {
    instagram: 'https://www.instagram.com/gordotechduitama',
    tiktok: 'https://www.tiktok.com/@gordotech1',
    whatsapp: 'https://api.whatsapp.com/message/LXBP7OHGAN7SP1?autoload=1&app_absent=0',
    whatsappNumber: '573144810431',
  },
  tunja: {
    instagram: 'https://www.instagram.com/gordotechtunja',
    tiktok: 'https://www.tiktok.com/@gordotech1',
    whatsapp: 'https://wa.me/573219863883',
    whatsappNumber: '573219863883',
  },
}

// City store addresses for "Retira Hoy"
const CITY_ADDRESSES: Record<'duitama' | 'tunja', { short: string; full: string }> = {
  duitama: { short: 'C.C Pasaje Solano, Duitama', full: 'C.C Pasaje Solano, Local 1-02, Calle 20a # 12-32' },
  tunja: { short: 'Oporto Centro de Negocios, Tunja', full: 'Av. Universitaria # 45a-40, Oficina 304, Oporto Centro de Negocios' },
}

// Spanish color name to CSS color mapping
const COLOR_MAP: Record<string, string> = {
  negro: '#000000', blanco: '#FFFFFF', azul: '#0047AB', rojo: '#FF0000',
  verde: '#008000', amarillo: '#FFD700', naranja: '#FF8C00', rosa: '#FF69B4',
  morado: '#800080', gris: '#808080', plata: '#C0C0C0', oro: '#FFD700',
  dorado: '#DAA520', celeste: '#87CEEB', turquesa: '#40E0D0', beige: '#F5F5DC',
  crema: '#FFFDD0', coral: '#FF7F50', lavanda: '#E6E6FA', marron: '#8B4513',
  bronce: '#CD7F32', titanio: '#878681', grafito: '#383838', medianoche: '#191970',
  'azul ultramar': '#120A8F', 'verde menta': '#98FF98', 'rosa pastel': '#FFD1DC',
  natural: '#D2B48C', desierto: '#EDC9AF',
}

function resolveColor(color: string): string {
  const trimmed = color.trim().toLowerCase()
  return COLOR_MAP[trimmed] || color
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.73a8.19 8.19 0 004.76 1.52V6.8a4.84 4.84 0 01-1-.11z" />
    </svg>
  )
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

function isVideoUrl(url: string): boolean {
  if (!url) return false
  return url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov') || url.includes('/videos/')
}

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null
  if (isVideoUrl(url)) return null // MP4 files are handled natively
  let videoId: string | null = null
  const watchMatch = url.match(/(?:youtube\.com\/watch\?v=)([\w-]+)/)
  if (watchMatch) videoId = watchMatch[1]
  if (!videoId) { const shortMatch = url.match(/(?:youtu\.be\/)([\w-]+)/); if (shortMatch) videoId = shortMatch[1] }
  if (!videoId) { const embedMatch = url.match(/(?:youtube\.com\/embed\/)([\w-]+)/); if (embedMatch) videoId = embedMatch[1] }
  if (!videoId) return null
  let startTime = 0
  const tMatch = url.match(/[?&]t=(\d+)/)
  if (tMatch) startTime = parseInt(tMatch[1])
  if (!startTime) startTime = 60
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&start=${startTime}&vq=hd1080&hd=1`
}



// Cart types
type CartItem = {
  productId: number
  name: string
  image: string
  condition: string
  selectedStorage: string
  selectedColor: string
  price: string
  quantity: number
}

type CartData = {
  items: CartItem[]
  lastActivity: number // timestamp
}

const CART_EXPIRY_MS = 10 * 60 * 1000 // 10 minutes
const CART_STORAGE_KEY = 'gordotech_cart'

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const data: CartData = JSON.parse(raw)
    if (Date.now() - data.lastActivity > CART_EXPIRY_MS) {
      localStorage.removeItem(CART_STORAGE_KEY)
      return []
    }
    return data.items
  } catch {
    return []
  }
}

function saveCart(items: CartItem[]) {
  const data: CartData = { items, lastActivity: Date.now() }
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(data))
}

function touchCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return
    const data: CartData = JSON.parse(raw)
    data.lastActivity = Date.now()
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(data))
  } catch { /* ignore */ }
}

// Product data - Semi-usados
const semiUsados = [
  // iPhone 12 Series
  { id: 101, name: 'iPhone 12', storageOptions: ['128GB'], image: 'https://images.unsplash.com/photo-1611472173362-3f53dbd65d80?w=400&h=500&fit=crop', colors: ['#000000', '#FFFFFF', '#4169E1'] },
  { id: 102, name: 'iPhone 12 Mini', storageOptions: ['128GB'], image: 'https://images.unsplash.com/photo-1611472173362-3f53dbd65d80?w=400&h=500&fit=crop', colors: ['#000000', '#F28B82', '#FFFFFF'] },
  { id: 103, name: 'iPhone 12 Pro', storageOptions: ['128GB', '256GB'], image: 'https://images.unsplash.com/photo-1607936854279-55e8a4c64888?w=400&h=500&fit=crop', colors: ['#4A4A4A', '#FFD700', '#1C1C1E'] },
  { id: 104, name: 'iPhone 12 Pro Max', storageOptions: ['128GB', '256GB'], image: 'https://images.unsplash.com/photo-1607936854279-55e8a4c64888?w=400&h=500&fit=crop', colors: ['#4A4A4A', '#FFD700', '#1C1C1E'] },
  // iPhone 13 Series
  { id: 105, name: 'iPhone 13', storageOptions: ['128GB'], image: 'https://images.unsplash.com/photo-1632633173522-47456de71b76?w=400&h=500&fit=crop', colors: ['#1C1C1E', '#F28B82', '#AECBFA'] },
  { id: 106, name: 'iPhone 13 Mini', storageOptions: ['128GB'], image: 'https://images.unsplash.com/photo-1632633173522-47456de71b76?w=400&h=500&fit=crop', colors: ['#1C1C1E', '#F28B82', '#FFFFFF'] },
  { id: 107, name: 'iPhone 13 Pro', storageOptions: ['128GB', '256GB'], image: 'https://images.unsplash.com/photo-1638038772924-ef79cce2426d?w=400&h=500&fit=crop', colors: ['#4A4A4A', '#87CEEB', '#FFD700'] },
  { id: 108, name: 'iPhone 13 Pro Max', storageOptions: ['128GB', '256GB'], image: 'https://images.unsplash.com/photo-1638038772924-ef79cce2426d?w=400&h=500&fit=crop', colors: ['#4A4A4A', '#87CEEB', '#FFD700'] },
  // iPhone 14 Series
  { id: 109, name: 'iPhone 14', storageOptions: ['128GB'], image: 'https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=400&h=500&fit=crop', colors: ['#000000', '#E3D0B9', '#F28B82'] },
  { id: 110, name: 'iPhone 14 Plus', storageOptions: ['128GB'], image: 'https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=400&h=500&fit=crop', colors: ['#000000', '#E3D0B9', '#AECBFA'] },
  { id: 111, name: 'iPhone 14 Pro', storageOptions: ['128GB', '256GB'], image: 'https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=400&h=500&fit=crop', colors: ['#1C1C1E', '#6B5B4F', '#F5F5DC'] },
  { id: 112, name: 'iPhone 14 Pro Max', storageOptions: ['128GB', '256GB', '512GB'], image: 'https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=400&h=500&fit=crop', colors: ['#1C1C1E', '#6B5B4F', '#F5F5DC'] },
  // iPhone 15 Series
  { id: 113, name: 'iPhone 15', storageOptions: ['128GB'], image: 'https://images.unsplash.com/photo-1696446702183-cbd13d78e1e7?w=400&h=500&fit=crop', colors: ['#000000', '#F28B82', '#AECBFA'] },
  { id: 114, name: 'iPhone 15 Plus', storageOptions: ['128GB'], image: 'https://images.unsplash.com/photo-1696446702183-cbd13d78e1e7?w=400&h=500&fit=crop', colors: ['#000000', '#F28B82', '#AECBFA'] },
  { id: 115, name: 'iPhone 15 Pro', storageOptions: ['128GB', '256GB'], image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=500&fit=crop', colors: ['#1C1C1E', '#F5F5DC', '#4A4A4A'] },
  { id: 116, name: 'iPhone 15 Pro Max', storageOptions: ['256GB', '512GB', '1TB'], image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=500&fit=crop', colors: ['#1C1C1E', '#F5F5DC', '#4A4A4A'] },
  // iPhone 16 Series
  { id: 117, name: 'iPhone 16', storageOptions: ['128GB'], image: 'https://images.unsplash.com/photo-1710023038956-3dce1ef3ac38?w=400&h=500&fit=crop', colors: ['#000000', '#AECBFA', '#F5F5DC'] },
  { id: 118, name: 'iPhone 16 Plus', storageOptions: ['128GB'], image: 'https://images.unsplash.com/photo-1710023038956-3dce1ef3ac38?w=400&h=500&fit=crop', colors: ['#000000', '#AECBFA', '#F5F5DC'] },
  { id: 119, name: 'iPhone 16 Pro', storageOptions: ['128GB', '256GB', '512GB'], image: 'https://images.unsplash.com/photo-1710023038956-3dce1ef3ac38?w=400&h=500&fit=crop', colors: ['#1C1C1E', '#E3D0B9', '#F5F5DC'] },
  { id: 120, name: 'iPhone 16 Pro Max', storageOptions: ['256GB', '512GB', '1TB'], image: 'https://images.unsplash.com/photo-1710023038956-3dce1ef3ac38?w=400&h=500&fit=crop', colors: ['#1C1C1E', '#E3D0B9', '#F5F5DC'] },
  // iPhone 17 Series
  { id: 121, name: 'iPhone 17', storageOptions: ['256GB'], image: 'https://images.unsplash.com/photo-1710023038956-3dce1ef3ac38?w=400&h=500&fit=crop', colors: ['#1C1C1E', '#F5F5DC'] },
  { id: 122, name: 'iPhone Air', storageOptions: ['256GB'], image: 'https://images.unsplash.com/photo-1710023038956-3dce1ef3ac38?w=400&h=500&fit=crop', colors: ['#1C1C1E', '#F5F5DC', '#87CEEB'] },
  { id: 123, name: 'iPhone 17 Pro', storageOptions: ['256GB', '512GB', '1TB'], image: 'https://images.unsplash.com/photo-1710023038956-3dce1ef3ac38?w=400&h=500&fit=crop', colors: ['#1C1C1E', '#4A4A4A', '#F5F5DC'] },
  { id: 124, name: 'iPhone 17 Pro Max', storageOptions: ['256GB', '512GB', '1TB', '2TB'], image: 'https://images.unsplash.com/photo-1710023038956-3dce1ef3ac38?w=400&h=500&fit=crop', colors: ['#1C1C1E', '#4A4A4A', '#F5F5DC'] },
]

// Product data - Nuevos iPhones
const nuevos = [
  { id: 201, name: 'iPhone 14', storageOptions: ['128GB'], image: 'https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=400&h=500&fit=crop', colors: ['#000000', '#E3D0B9', '#F28B82'] },
  { id: 202, name: 'iPhone 15', storageOptions: ['128GB'], image: 'https://images.unsplash.com/photo-1696446702183-cbd13d78e1e7?w=400&h=500&fit=crop', colors: ['#000000', '#F28B82', '#AECBFA'] },
  { id: 203, name: 'iPhone 16', storageOptions: ['128GB'], image: 'https://images.unsplash.com/photo-1710023038956-3dce1ef3ac38?w=400&h=500&fit=crop', colors: ['#000000', '#AECBFA', '#F5F5DC'] },
  { id: 204, name: 'iPhone 17', storageOptions: ['256GB'], image: 'https://images.unsplash.com/photo-1710023038956-3dce1ef3ac38?w=400&h=500&fit=crop', colors: ['#1C1C1E', '#F5F5DC'] },
  { id: 205, name: 'iPhone Air', storageOptions: ['256GB'], image: 'https://images.unsplash.com/photo-1710023038956-3dce1ef3ac38?w=400&h=500&fit=crop', colors: ['#1C1C1E', '#F5F5DC', '#87CEEB'] },
  { id: 206, name: 'iPhone 17 Pro', storageOptions: ['256GB', '512GB'], image: 'https://images.unsplash.com/photo-1710023038956-3dce1ef3ac38?w=400&h=500&fit=crop', colors: ['#1C1C1E', '#4A4A4A', '#F5F5DC'] },
  { id: 207, name: 'iPhone 17 Pro Max', storageOptions: ['256GB', '512GB', '1TB', '2TB'], image: 'https://images.unsplash.com/photo-1710023038956-3dce1ef3ac38?w=400&h=500&fit=crop', colors: ['#1C1C1E', '#4A4A4A', '#F5F5DC'] },
]

// Product data - iPads Nuevas
const ipads = [
  { id: 301, name: 'iPad A16 128GB', storageOptions: ['128GB'], image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=500&fit=crop', colors: ['#C0C0C0', '#87CEEB', '#FFD700'] },
  { id: 302, name: 'iPad A16 256GB', storageOptions: ['256GB'], image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=500&fit=crop', colors: ['#C0C0C0', '#87CEEB', '#FFD700'] },
  { id: 303, name: 'iPad Air 11" M3', storageOptions: ['128GB', '256GB'], image: 'https://images.unsplash.com/photo-1587033411391-5d9e51cce126?w=400&h=500&fit=crop', colors: ['#C0C0C0', '#4A4A4A', '#E8D0AA'] },
  { id: 304, name: 'iPad Air 13" M3', storageOptions: ['128GB', '256GB'], image: 'https://images.unsplash.com/photo-1587033411391-5d9e51cce126?w=400&h=500&fit=crop', colors: ['#C0C0C0', '#4A4A4A', '#E8D0AA'] },
  { id: 305, name: 'iPad Pro 11"', storageOptions: ['256GB', '512GB', '1TB'], image: 'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=400&h=500&fit=crop', colors: ['#C0C0C0', '#1C1C1E'] },
  { id: 306, name: 'iPad Pro 13"', storageOptions: ['256GB', '512GB', '1TB'], image: 'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=400&h=500&fit=crop', colors: ['#C0C0C0', '#1C1C1E'] },
]

// Product data - MacBook
const macbooks = [
  { id: 401, name: 'MacBook Air 13" M4', storageOptions: ['256GB/16GB'], image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=500&fit=crop', colors: ['#C0C0C0', '#4A4A4A', '#E8D0AA', '#1C1C1E'] },
]

// Product data - AirPods
const airpods = [
  { id: 501, name: 'AirPods 4', storageOptions: [], image: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=400&h=500&fit=crop', colors: ['#FFFFFF'] },
  { id: 502, name: 'AirPods 4 ANC', storageOptions: [], image: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=400&h=500&fit=crop', colors: ['#FFFFFF'] },
  { id: 503, name: 'AirPods Pro 2', storageOptions: [], image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400&h=500&fit=crop', colors: ['#FFFFFF'] },
  { id: 504, name: 'AirPods Pro 3', storageOptions: [], image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400&h=500&fit=crop', colors: ['#FFFFFF'] },
]

// Product data - Apple Watch
const appleWatches = [
  { id: 601, name: 'Apple Watch SE2', storageOptions: ['42mm', '46mm'], image: 'https://images.unsplash.com/photo-1546868871-af0de0ae72be?w=400&h=500&fit=crop', colors: ['#C0C0C0', '#1C1C1E', '#E8D0AA'] },
  { id: 602, name: 'Apple Watch SE3', storageOptions: ['42mm', '46mm'], image: 'https://images.unsplash.com/photo-1546868871-af0de0ae72be?w=400&h=500&fit=crop', colors: ['#C0C0C0', '#1C1C1E', '#E8D0AA'] },
  { id: 603, name: 'Apple Watch Series 10', storageOptions: ['42mm', '46mm'], image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&h=500&fit=crop', colors: ['#C0C0C0', '#1C1C1E', '#E8D0AA'] },
  { id: 604, name: 'Apple Watch Series 11', storageOptions: ['42mm', '46mm'], image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&h=500&fit=crop', colors: ['#C0C0C0', '#1C1C1E', '#4A4A4A'] },
  { id: 605, name: 'Apple Watch Ultra 2', storageOptions: ['49mm'], image: 'https://images.unsplash.com/photo-1694618432450-44056bd70e87?w=400&h=500&fit=crop', colors: ['#E8D0AA', '#1C1C1E'] },
  { id: 606, name: 'Apple Watch Ultra 3', storageOptions: ['49mm'], image: 'https://images.unsplash.com/photo-1694618432450-44056bd70e87?w=400&h=500&fit=crop', colors: ['#E8D0AA', '#1C1C1E'] },
]

// Product data - Accesorios
const accesorios = [
  { id: 701, name: 'Apple Pencil USB-C', storageOptions: [], image: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400&h=500&fit=crop', colors: ['#FFFFFF'] },
  { id: 702, name: 'Apple Pencil Pro', storageOptions: [], image: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400&h=500&fit=crop', colors: ['#FFFFFF'] },
]

// Build unified product list
type Product = {
  id: number
  name: string
  slug?: string
  category: string
  condition: string
  image: string
  images: string[]
  colors: string[]
  storageOptions: string[]
  badge: string | null
  available: string[]
  price?: string
  oldPrice?: string
  description?: string
  sort_order?: number
  model_3d?: string
  color_images?: Record<string, string>
}

function generateSlug(name: string): string {
  let slug = name.toLowerCase().trim()
  slug = slug.replace(/[áàäâ]/g, 'a')
  slug = slug.replace(/[éèëê]/g, 'e')
  slug = slug.replace(/[íìïî]/g, 'i')
  slug = slug.replace(/[óòöô]/g, 'o')
  slug = slug.replace(/[úùüû]/g, 'u')
  slug = slug.replace(/[ñ]/g, 'n')
  slug = slug.replace(/[^a-z0-9\s-]/g, '')
  slug = slug.replace(/[\s]+/g, '-')
  slug = slug.replace(/-+/g, '-')
  return slug.replace(/^-|-$/g, '')
}

function getProductSlug(product: Product): string {
  return product.slug || generateSlug(product.name)
}

const products: Product[] = [
  ...nuevos.map(p => ({
    ...p,
    category: 'iphones',
    condition: 'Nuevo' as const,
    images: [p.image],
    badge: 'Nuevo' as string | null,
    available: ['duitama', 'tunja'],
  })),
  ...semiUsados.map(p => ({
    ...p,
    category: 'iphones',
    condition: 'Semi-usado' as const,
    images: [p.image],
    badge: null as string | null,
    available: ['duitama', 'tunja'],
  })),
  ...ipads.map(p => ({
    ...p,
    category: 'ipads',
    condition: 'Nuevo' as const,
    images: [p.image],
    badge: 'Nuevo' as string | null,
    available: ['duitama', 'tunja'],
  })),
  ...macbooks.map(p => ({
    ...p,
    category: 'macbook',
    condition: 'Nuevo' as const,
    images: [p.image],
    badge: 'Nuevo' as string | null,
    available: ['duitama', 'tunja'],
  })),
  ...airpods.map(p => ({
    ...p,
    category: 'airpods',
    condition: 'Nuevo' as const,
    images: [p.image],
    badge: 'Nuevo' as string | null,
    available: ['duitama', 'tunja'],
  })),
  ...appleWatches.map(p => ({
    ...p,
    category: 'apple-watch',
    condition: 'Nuevo' as const,
    images: [p.image],
    badge: 'Nuevo' as string | null,
    available: ['duitama', 'tunja'],
  })),
  ...accesorios.map(p => ({
    ...p,
    category: 'accesorios',
    condition: 'Nuevo' as const,
    images: [p.image],
    badge: null as string | null,
    available: ['duitama', 'tunja'],
  })),
]

const repairServices = [
  { icon: Smartphone, title: 'Cambio de Pantalla', description: 'Pantallas originales y compatibles para todos los modelos de iPhone', price: 'Desde $150.000' },
  { icon: Zap, title: 'Cambio de Bateria', description: 'Baterias de alta calidad con garantia de 6 meses', price: 'Desde $120.000' },
  { icon: Shield, title: 'Reparacion de Placa', description: 'Microelectronica avanzada para solucionar problemas de placa', price: 'Consultar' },
  { icon: Award, title: 'Diagnostico Gratis', description: 'Te decimos exactamente que tiene tu equipo sin costo alguno', price: 'Gratis' },
]


// City Selection Splash Screen
function CitySelector({ onSelect }: { onSelect: (city: City) => void }) {
  const [hoveredCity, setHoveredCity] = useState<City>(null)
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    setTimeout(() => setAnimateIn(true), 100)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
          {/* Grid lines */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: 'linear-gradient(rgba(123,163,201,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(123,163,201,0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }} />
        </div>
      </div>

      <div className={`relative z-10 text-center transition-all duration-1000 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        {/* Logo */}
        <div className="mb-12">
          <div className="flex items-center justify-center mb-4">
            <img src="/images/gordotech-logo.png" alt="Gordotech Logo" className="w-48 md:w-64" />
          </div>
        </div>

        {/* Greeting */}
        <div className={`mb-12 transition-all duration-1000 delay-300 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          <h2 className="text-2xl md:text-4xl text-white font-light mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>
            Hola
          </h2>
          <p className="text-gray-400 text-lg md:text-xl">En que ciudad te encuentras?</p>
        </div>

        {/* City Cards */}
        <div className={`flex flex-col sm:flex-row gap-6 justify-center transition-all duration-1000 delay-500 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          {/* Duitama */}
          <button
            onClick={() => onSelect('duitama')}
            onMouseEnter={() => setHoveredCity('duitama')}
            onMouseLeave={() => setHoveredCity(null)}
            className={`group relative w-72 p-8 rounded-3xl border transition-all duration-500 cursor-pointer ${
              hoveredCity === 'duitama'
                ? 'bg-blue-500/10 border-blue-400/50 scale-105 shadow-2xl shadow-blue-500/20'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <MapPin className={`w-10 h-10 mx-auto mb-4 transition-colors ${hoveredCity === 'duitama' ? 'text-blue-400' : 'text-gray-400'}`} />
            <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '2px' }}>DUITAMA</h3>
            <div className="flex items-center justify-center gap-2 mt-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-sm">Explorar</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>

          {/* Tunja */}
          <button
            onClick={() => onSelect('tunja')}
            onMouseEnter={() => setHoveredCity('tunja')}
            onMouseLeave={() => setHoveredCity(null)}
            className={`group relative w-72 p-8 rounded-3xl border transition-all duration-500 cursor-pointer ${
              hoveredCity === 'tunja'
                ? 'bg-blue-500/10 border-blue-400/50 scale-105 shadow-2xl shadow-blue-500/20'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <MapPin className={`w-10 h-10 mx-auto mb-4 transition-colors ${hoveredCity === 'tunja' ? 'text-blue-400' : 'text-gray-400'}`} />
            <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '2px' }}>TUNJA</h3>
            <div className="flex items-center justify-center gap-2 mt-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-sm">Explorar</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className={`absolute bottom-8 text-gray-600 text-xs transition-all duration-1000 delay-700 ${animateIn ? 'opacity-100' : 'opacity-0'}`}>
        <p>Gordotech &copy; 2024 &middot; Conectando tus suenos</p>
      </div>
    </div>
  )
}

// Main Store Component
// ==================== ANIMATED MARQUEE BANNER ====================
function AnimatedMarquee({ texts }: { texts: string[] }) {
  if (texts.length === 0) return null
  const marqueeContent = texts.join('  \u2022  ')
  const repeated = `${marqueeContent}  \u2022  `.repeat(4)
  
  return (
    <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white overflow-hidden whitespace-nowrap relative" style={{ height: '36px' }}>
      <div className="absolute inset-0 flex items-center">
        <div className="animate-marquee inline-block" style={{ animationDuration: `${Math.max(20, texts.length * 12)}s` }}>
          <span className="text-xs md:text-sm font-medium tracking-wide">
            {repeated}
          </span>
        </div>
      </div>
    </div>
  )
}

// ==================== HERO SLIDESHOW ====================
function HeroSlideshow({ slides }: { slides: HeroSlide[] }) {
  const [current, setCurrent] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [animKey, setAnimKey] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [videoPlaying, setVideoPlaying] = useState(false)

  const goTo = useCallback((index: number) => {
    if (isTransitioning || index === current) return
    setIsTransitioning(true)
    setCurrent(index)
    setAnimKey(k => k + 1)
    setTimeout(() => setIsTransitioning(false), 900)
  }, [current, isTransitioning])

  const goNext = useCallback(() => {
    if (slides.length <= 1) return
    goTo((current + 1) % slides.length)
  }, [current, slides.length, goTo])

  const goPrev = useCallback(() => {
    if (slides.length <= 1) return
    goTo((current - 1 + slides.length) % slides.length)
  }, [current, slides.length, goTo])

  // Reset videoPlaying when slide changes
  useEffect(() => {
    setVideoPlaying(false)
  }, [current])

  // Timer: always ensure slideshow advances, never gets stuck
  useEffect(() => {
    if (isPaused || slides.length <= 1) return
    const currentSlide = slides[current]
    const hasVideo = currentSlide?.video_url && isVideoUrl(currentSlide.video_url)
    if (hasVideo) {
      if (videoPlaying) {
        timerRef.current = setTimeout(goNext, 20000)
      } else {
        timerRef.current = setTimeout(goNext, 8000)
      }
      return () => { if (timerRef.current) clearTimeout(timerRef.current) }
    }
    timerRef.current = setTimeout(goNext, 8000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [goNext, isPaused, slides.length, current, videoPlaying, slides])

  // Safety: detect stuck videos (ended but didn't trigger onEnded)
  useEffect(() => {
    if (isPaused || slides.length <= 1) return
    const interval = setInterval(() => {
      const videoEl = document.querySelector(`section video[src]`) as HTMLVideoElement | null
      if (videoEl && videoEl.ended && !videoEl.paused) {
        goNext()
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [isPaused, slides.length, goNext])

  if (slides.length === 0) return null

  return (
    <section 
      className="relative w-full overflow-hidden bg-black"
      style={{ height: 'clamp(400px, 60vw, 650px)' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides */}
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-[1200ms] ease-in-out ${
            i === current ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          {/* Background: black for video slides, image with Ken Burns for image-only slides */}
          {slide.video_url && (isVideoUrl(slide.video_url) || getYouTubeEmbedUrl(slide.video_url)) ? (
            <div className="absolute inset-0 bg-black" />
          ) : (
            <img
              src={slide.image}
              alt={slide.title}
              className={`absolute inset-0 w-full h-full object-cover ${i === current ? 'animate-ken-burns' : ''}`}
              onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/1200x600/0f172a/3b82f6/png?text=${encodeURIComponent(slide.title)}` }}
            />
          )}
          {/* Native MP4 video - optimized loading */}
          {slide.video_url && isVideoUrl(slide.video_url) && (
            <div className="absolute inset-0" style={{ overflow: 'hidden' }}>
              <video
                key={`video-${slide.id}-${current}`}
                src={i === current ? slide.video_url : undefined}
                autoPlay
                muted
                playsInline
                preload={i === current ? 'auto' : 'none'}
                onPlaying={i === current ? () => setVideoPlaying(true) : undefined}
                onEnded={i === current ? () => { if (!isPaused) goNext() } : undefined}
                onError={i === current ? () => { if (!isPaused) goNext() } : undefined}
                className="pointer-events-none"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'translate(-50%, -50%)',
                }}
              />
            </div>
          )}
          {/* YouTube iframe fallback */}
          {slide.video_url && !isVideoUrl(slide.video_url) && getYouTubeEmbedUrl(slide.video_url) && (
            <div className="absolute inset-0 transition-opacity duration-1000" style={{ overflow: 'hidden' }}>
              <iframe
                key={`video-${slide.id}`}
                src={i === current ? getYouTubeEmbedUrl(slide.video_url)! : undefined}
                className="pointer-events-none"
                onLoad={i === current ? () => setVideoPlaying(true) : undefined}
                style={{
                  border: 'none',
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: 'max(177.78vh, 100vw)',
                  height: 'max(56.25vw, 100%)',
                  transform: 'translate(-50%, -50%)',
                }}
                allow="autoplay; encrypted-media"
                allowFullScreen
                title={slide.title}
              />
            </div>
          )}
          {/* Gradient overlays - lighter for video, dramatic for images */}
          {slide.video_url && (isVideoUrl(slide.video_url) || getYouTubeEmbedUrl(slide.video_url)) ? (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
            </>
          )}
          
          {/* Content - Apple-style dramatic entrance */}
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
              {i === current ? (
                <div key={`content-${animKey}`} className="max-w-2xl">
                  {slide.title && (
                    <h2 className="animate-hero-title text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 leading-[0.95] drop-shadow-[0_2px_20px_rgba(0,0,0,0.5)]" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '3px' }}>
                      {slide.title}
                    </h2>
                  )}
                  {slide.subtitle && (
                    <p className="animate-hero-subtitle text-lg md:text-2xl text-gray-200/90 mb-8 max-w-lg font-light tracking-wide">
                      {slide.subtitle}
                    </p>
                  )}
                  {slide.link && (
                    <a
                      href={slide.link}
                      className="animate-hero-button inline-flex items-center gap-2 px-8 py-3.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 text-sm md:text-base"
                    >
                      Ver Ahora
                      <ChevronRight className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ) : (
                <div className="max-w-2xl opacity-0">
                  {slide.title && <h2 className="text-4xl">{slide.title}</h2>}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 z-20 hidden md:flex w-10 h-10 md:w-12 md:h-12 bg-black/40 backdrop-blur-sm hover:bg-black/60 text-white rounded-full items-center justify-center transition-all hover:scale-110 border border-white/10"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-20 hidden md:flex w-10 h-10 md:w-12 md:h-12 bg-black/40 backdrop-blur-sm hover:bg-black/60 text-white rounded-full items-center justify-center transition-all hover:scale-110 border border-white/10"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </>
      )}

    </section>
  )
}

function Store({ city, onChangeCity, onAdminClick, productSlug, productId, initialProduct }: { city: City; onChangeCity: () => void; onAdminClick: () => void; productSlug?: string; productId?: string; initialProduct?: Product }) {
  const navigate = useNavigate()
  const socials = CITY_SOCIALS[city || 'duitama']
  const pickupAddress = CITY_ADDRESSES[city || 'duitama']
  const [activeModel, setActiveModel] = useState<string>('todos')
  const [activeCondition, setActiveCondition] = useState<string>('todos')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null)
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [zoomOpen, setZoomOpen] = useState(false)
  const [show3DView, setShow3DView] = useState(false)
  const [hoveredBubbleId, setHoveredBubbleId] = useState<string | null>(null)
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [dataLoaded, setDataLoaded] = useState(false)
  
  // Hero slideshow + marquee data
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([])
  const [marqueeTexts, setMarqueeTexts] = useState<string[]>([])
  
  // API-loaded data with fallback to static
  const [apiProducts, setApiProducts] = useState<Product[]>(products)
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([])
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([])
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [modelBubbles, setModelBubbles] = useState<{id: string; label: string; image: string}[]>([
    { id: 'todos', label: 'Todos', image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300&h=300&fit=crop' },
    { id: 'iphones', label: 'iPhones', image: 'https://images.unsplash.com/photo-1710023038956-3dce1ef3ac38?w=300&h=300&fit=crop' },
    { id: 'ipads', label: 'iPads', image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300&h=300&fit=crop' },
    { id: 'macbook', label: 'MacBook', image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&h=300&fit=crop' },
    { id: 'airpods', label: 'AirPods', image: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=300&h=300&fit=crop' },
    { id: 'apple watch', label: 'Apple Watch', image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=300&h=300&fit=crop' },
    { id: 'accesorios', label: 'Accesorios', image: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=300&h=300&fit=crop' },
  ])
  const [apiRepairServices, setApiRepairServices] = useState(repairServices)

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>(loadCart)
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [cartAddedFeedback, setCartAddedFeedback] = useState(false)
  const [selectedStorage, setSelectedStorage] = useState<string>('')
  const [selectedColor, setSelectedColor] = useState<string>('')
  const [checkoutName, setCheckoutName] = useState('')
  const [checkoutPhone, setCheckoutPhone] = useState('')
  const [checkoutNotes, setCheckoutNotes] = useState('')
  const cartExpiryTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    saveCart(cartItems)
  }, [cartItems])

  // Cart expiration check every 30s
  useEffect(() => {
    cartExpiryTimer.current = setInterval(() => {
      try {
        const raw = localStorage.getItem(CART_STORAGE_KEY)
        if (!raw) return
        const data: CartData = JSON.parse(raw)
        if (Date.now() - data.lastActivity > CART_EXPIRY_MS) {
          setCartItems([])
          localStorage.removeItem(CART_STORAGE_KEY)
        }
      } catch { /* ignore */ }
    }, 30000)
    return () => { if (cartExpiryTimer.current) clearInterval(cartExpiryTimer.current) }
  }, [])

  // Reset selected storage/color when product changes
  useEffect(() => {
    if (selectedProduct) {
      setSelectedStorage(selectedProduct.storageOptions[0] || '')
      setSelectedColor(selectedProduct.colors[0] || '')
    }
  }, [selectedProduct])

  const addToCart = useCallback((product: Product, storage: string, color: string) => {
    touchCart()
    setCartItems(prev => {
      const existing = prev.find(
        item => item.productId === product.id && item.selectedStorage === storage && item.selectedColor === color
      )
      if (existing) {
        return prev.map(item =>
          item.productId === product.id && item.selectedStorage === storage && item.selectedColor === color
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        image: product.image,
        condition: product.condition,
        selectedStorage: storage,
        selectedColor: color,
        price: product.price || '',
        quantity: 1,
      }]
    })
    setCartAddedFeedback(true)
    setTimeout(() => setCartAddedFeedback(false), 2000)
  }, [])

  const removeFromCart = useCallback((productId: number, storage: string, color: string) => {
    touchCart()
    setCartItems(prev => prev.filter(
      item => !(item.productId === productId && item.selectedStorage === storage && item.selectedColor === color)
    ))
  }, [])

  const updateCartQuantity = useCallback((productId: number, storage: string, color: string, delta: number) => {
    touchCart()
    setCartItems(prev => prev.map(item => {
      if (item.productId === productId && item.selectedStorage === storage && item.selectedColor === color) {
        const newQty = item.quantity + delta
        return newQty > 0 ? { ...item, quantity: newQty } : item
      }
      return item
    }).filter(item => item.quantity > 0))
  }, [])

  const clearCart = useCallback(() => {
    setCartItems([])
    localStorage.removeItem(CART_STORAGE_KEY)
  }, [])

  const cartTotal = cartItems.reduce((sum, item) => {
    // Colombian pesos use dots as thousands separator (e.g. 5.750.000)
    const priceStr = item.price.replace(/[^0-9]/g, '')
    const price = parseInt(priceStr, 10) || 0
    return sum + price * item.quantity
  }, 0)

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  const sendCartWhatsApp = useCallback(() => {
    const lines = cartItems.map((item, i) => {
      let line = `${i + 1}. ${item.name} (${item.condition})`
      if (item.selectedStorage) line += ` - ${item.selectedStorage}`
      if (item.selectedColor) line += ` - ${item.selectedColor}`
      line += ` x${item.quantity}`
      if (item.price && item.price !== '-') line += ` - $${item.price}`
      return line
    })
    let msg = `Hola Gordotech! Quiero hacer un pedido:\n\n${lines.join('\n')}`
    if (cartTotal > 0) msg += `\n\nTotal estimado: $${cartTotal.toLocaleString('es-CO')}`
    if (checkoutName) msg += `\n\nNombre: ${checkoutName}`
    if (checkoutPhone) msg += `\nTelefono: ${checkoutPhone}`
    if (checkoutNotes) msg += `\nNotas: ${checkoutNotes}`
    window.open(`https://wa.me/${socials.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank')
  }, [cartItems, cartTotal, checkoutName, checkoutPhone, checkoutNotes, socials.whatsappNumber])

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      try {
        const [productsRes, recommendedRes, trendingRes, bubblesRes, servicesRes, slidesRes, marqueeRes] = await Promise.all([
          fetch(`${API_URL}/api/products?city=${city || 'duitama'}`).then(r => r.ok ? r.json() : null),
          fetch(`${API_URL}/api/products/recommended?city=${city || 'duitama'}`).then(r => r.ok ? r.json() : null),
          fetch(`${API_URL}/api/products/trending?city=${city || 'duitama'}`).then(r => r.ok ? r.json() : null),
          fetch(`${API_URL}/api/bubbles`).then(r => r.ok ? r.json() : null),
          fetch(`${API_URL}/api/repair-services`).then(r => r.ok ? r.json() : null),
          fetch(`${API_URL}/api/hero-slides`).then(r => r.ok ? r.json() : null),
          fetch(`${API_URL}/api/marquee-texts`).then(r => r.ok ? r.json() : null),
        ])
        if (productsRes?.products) {
          setApiProducts(productsRes.products.map((p: Record<string, unknown>) => ({
            id: p.id as number,
            name: p.name as string,
            category: (p.category as string) || '',
            condition: p.condition as string,
            image: p.image as string,
            images: (p.images as string[]) || [],
            colors: p.colors as string[],
            storageOptions: p.storage_options as string[],
            badge: (p.badge as string) || null,
            available: p.available as string[],
            price: (p.price as string) || '',
            oldPrice: (p.old_price as string) || '',
            description: (p.description as string) || '',
          })))
        }
        if (recommendedRes?.products) {
          setRecommendedProducts(recommendedRes.products.map((p: Record<string, unknown>) => ({
            id: p.id as number, name: p.name as string, category: (p.category as string) || '',
            condition: p.condition as string,
            image: p.image as string, images: (p.images as string[]) || [], colors: p.colors as string[], storageOptions: p.storage_options as string[],
            badge: (p.badge as string) || null, available: p.available as string[],
            price: (p.price as string) || '', oldPrice: (p.old_price as string) || '', description: (p.description as string) || '',
          })))
        }
        if (trendingRes?.products) {
          setTrendingProducts(trendingRes.products.map((p: Record<string, unknown>) => ({
            id: p.id as number, name: p.name as string, category: (p.category as string) || '',
            condition: p.condition as string,
            image: p.image as string, images: (p.images as string[]) || [], colors: p.colors as string[], storageOptions: p.storage_options as string[],
            badge: (p.badge as string) || null, available: p.available as string[],
            price: (p.price as string) || '', oldPrice: (p.old_price as string) || '', description: (p.description as string) || '',
          })))
        }
        if (bubblesRes?.bubbles) {
          const apiBubbles = bubblesRes.bubbles.map((b: Record<string, unknown>) => ({
            id: b.model_id as string, label: b.label as string, image: b.image as string,
          }))
          setModelBubbles(apiBubbles)
        }
        if (servicesRes?.services) {
          const iconMap: Record<string, typeof Smartphone> = { Smartphone, Zap, Shield, Award, Wrench }
          setApiRepairServices(servicesRes.services.map((s: Record<string, unknown>) => ({
            icon: iconMap[s.icon as string] || Smartphone,
            title: s.title as string,
            description: s.description as string,
            price: s.price as string,
          })))
        }
        if (slidesRes?.slides) {
          setHeroSlides(slidesRes.slides)
        }
        if (marqueeRes?.texts) {
          setMarqueeTexts(marqueeRes.texts.map((t: { text: string }) => t.text))
        }
      } catch {
        // Fallback to static data if API unavailable
        console.log('Using static data (API unavailable)')
      } finally {
        setDataLoaded(true)
      }
    }
    loadData()
  }, [city])

  const scrollToTop = useCallback(() => {
    // iOS Safari sometimes ignores smooth scrolling after route/state changes
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [])

  // Navigate to product URL and select product
  const selectProduct = useCallback((product: Product) => {
    scrollToTop()
    setSelectedProduct(product)
    setGalleryIndex(0)
    const slug = getProductSlug(product)
    navigate(`/producto/${product.id}/${slug}`, { state: { product } })
    // extra safety after navigation/render
    setTimeout(scrollToTop, 50)
  }, [navigate, scrollToTop])

  // Clear product selection and go back to home
  const clearProduct = useCallback(() => {
    setSelectedProduct(null)
    setGalleryIndex(0)
    setZoomOpen(false)
    setShow3DView(false)
    navigate('/')
  }, [navigate])

  // Load product from URL (for direct links / sharing)
  useEffect(() => {
    if (!productSlug && !productId) {
      if (selectedProduct) {
        setSelectedProduct(null)
        setGalleryIndex(0)
      }
      return
    }
    // If already have the right product selected (e.g. from initialProduct or route state), skip
    if (selectedProduct && productId && String(selectedProduct.id) === productId) {
      return
    }
    // Find by product ID first (unique), then fall back to slug
    const found = productId
      ? apiProducts.find(p => String(p.id) === productId)
      : apiProducts.find(p => getProductSlug(p) === productSlug)
    if (found && (!selectedProduct || String(selectedProduct.id) !== String(found.id))) {
      setSelectedProduct(found)
      setGalleryIndex(0)
      scrollToTop()
      return
    }
    // If not found locally, fetch from API by ID or slug
    if (!found && !selectedProduct) {
      const fetchProduct = async () => {
        try {
          const url = productId
            ? `${API_URL}/api/products/${productId}`
            : `${API_URL}/api/products/by-slug/${productSlug}`
          const res = await fetch(url)
          if (res.ok) {
            const data = await res.json()
            const product: Product = {
              id: data.id, name: data.name, slug: data.slug, category: data.category || '',
              condition: data.condition, image: data.image, images: data.images || [],
              colors: data.colors, storageOptions: data.storage_options,
              badge: data.badge || null, available: data.available,
              price: data.price || '', oldPrice: data.old_price || '', description: data.description || '',
              model_3d: data.model_3d || '',
            }
            setSelectedProduct(product)
            setGalleryIndex(0)
            scrollToTop()
          }
        } catch {
          // Product not found, stay on home
        }
      }
      fetchProduct()
    }
  }, [productSlug, productId, apiProducts, selectedProduct, scrollToTop])

  const cityName = city === 'duitama' ? 'Duitama' : 'Tunja'

  // Update page title and meta tags for SEO
  useEffect(() => {
    if (selectedProduct) {
      document.title = `${selectedProduct.name} - Gordotech | Tu destino Apple en Boyaca`
      const metaDesc = document.querySelector('meta[name="description"]')
      if (metaDesc) metaDesc.setAttribute('content', `${selectedProduct.name} (${selectedProduct.condition}) disponible en Gordotech ${cityName}. Envios a toda Colombia.`)
      const ogTitle = document.querySelector('meta[property="og:title"]')
      if (ogTitle) ogTitle.setAttribute('content', `${selectedProduct.name} - Gordotech`)
      const ogDesc = document.querySelector('meta[property="og:description"]')
      if (ogDesc) ogDesc.setAttribute('content', `${selectedProduct.name} (${selectedProduct.condition}) disponible en Gordotech.`)
      const ogImage = document.querySelector('meta[property="og:image"]')
      if (ogImage) ogImage.setAttribute('content', selectedProduct.image)
      const ogUrl = document.querySelector('meta[property="og:url"]')
      if (ogUrl) ogUrl.setAttribute('content', `https://gordotech.com/producto/${getProductSlug(selectedProduct)}`)
    } else {
      document.title = 'Gordotech - iPhones, iPads, MacBooks y mas | Tu destino Apple en Boyaca'
      const metaDesc = document.querySelector('meta[name="description"]')
      if (metaDesc) metaDesc.setAttribute('content', 'Gordotech - Tu destino Apple en Boyaca. iPhones nuevos y semi-usados, iPads, MacBooks, AirPods y Apple Watch al mejor precio. Envios a toda Colombia.')
    }
  }, [selectedProduct, cityName])

  // Load related products when a product is selected
  useEffect(() => {
    if (!selectedProduct) { setRelatedProducts([]); return }
    const loadRelated = async () => {
      try {
        const res = await fetch(`${API_URL}/api/products/${selectedProduct.id}/related?city=${city || 'duitama'}`)
        if (res.ok) {
          const data = await res.json()
          setRelatedProducts(data.products.map((p: Record<string, unknown>) => ({
            id: p.id as number, name: p.name as string, category: (p.category as string) || '',
            condition: p.condition as string,
            image: p.image as string, images: (p.images as string[]) || [], colors: p.colors as string[], storageOptions: p.storage_options as string[],
            badge: (p.badge as string) || null, available: p.available as string[],
            price: (p.price as string) || '', oldPrice: (p.old_price as string) || '', description: (p.description as string) || '',
          })))
        }
      } catch {
        // Fallback: compute related locally
        const generation = selectedProduct.name.match(/iPhone (\d+|Air)/)?.[1] || ''
        setRelatedProducts(apiProducts.filter(p => 
          p.id !== selectedProduct.id && 
          (p.name.includes(`iPhone ${generation}`) || p.condition === selectedProduct.condition)
        ).slice(0, 4))
      }
    }
    loadRelated()
  }, [selectedProduct, city, apiProducts])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const filteredProducts = apiProducts.filter(p => {
    const inCity = p.available.includes(city || 'duitama')
    if (!inCity) return false
    if (activeCondition === 'nuevos' && p.condition !== 'Nuevo') return false
    if (activeCondition === 'semi-usados' && p.condition !== 'Semi-usado') return false
    if (activeModel !== 'todos') {
      // Use explicit category field first, fallback to name-based matching
      if (p.category) {
        return p.category === activeModel || p.category === activeModel.replace(' ', '-')
      }
      const name = p.name.toLowerCase()
      switch (activeModel) {
        case 'iphones': return name.includes('iphone')
        case 'ipads': return name.includes('ipad')
        case 'macbook': return name.includes('macbook')
        case 'airpods': return name.includes('airpods')
        case 'apple-watch': return name.includes('apple watch')
        case 'accesorios': return name.includes('pencil') || name.includes('accesorio')
        default: return name.includes(activeModel.toLowerCase())
      }
    }
    return true
  })

  // Loading screen while API data is being fetched
  if (!dataLoaded && !selectedProduct) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center" style={{ fontFamily: "'Inter', sans-serif" }}>
        <img src="/images/gordotech-icon-white.png" alt="Gordotech" className="h-16 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header / Navbar */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-gray-950/95 backdrop-blur-lg shadow-lg shadow-black/20 border-b border-white/5' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <button onClick={() => { clearProduct(); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="flex items-center gap-3 cursor-pointer">
              <img src="/images/gordotech-icon-white.png" alt="Gordotech - Ir al inicio" className="h-10 md:h-12" />
            </button>

            {/* Nav Links - Desktop */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#productos" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">Productos</a>
              {city === 'duitama' && (
                <a href="#reparacion" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">Reparacion</a>
              )}
              <a href="#ubicacion" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">Ubicacion</a>
              <a href="#contacto" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">Contacto</a>
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <button
                onClick={onChangeCity}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm"
              >
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-gray-300">{cityName}</span>
              </button>
              <button onClick={() => { setCartOpen(!cartOpen); setCheckoutOpen(false) }} className="relative p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                <ShoppingCart className="w-5 h-5 text-gray-300" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white animate-pulse">{cartCount}</span>
                )}
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 border-t border-white/5 mt-2 pt-4">
              <nav className="flex flex-col gap-3">
                <a href="#productos" onClick={() => setMobileMenuOpen(false)} className="text-gray-300 hover:text-white transition-colors text-sm font-medium py-2">Productos</a>
                {city === 'duitama' && (
                  <a href="#reparacion" onClick={() => setMobileMenuOpen(false)} className="text-gray-300 hover:text-white transition-colors text-sm font-medium py-2">Reparacion</a>
                )}
                <a href="#ubicacion" onClick={() => setMobileMenuOpen(false)} className="text-gray-300 hover:text-white transition-colors text-sm font-medium py-2">Ubicacion</a>
                <a href="#contacto" onClick={() => setMobileMenuOpen(false)} className="text-gray-300 hover:text-white transition-colors text-sm font-medium py-2">Contacto</a>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-[60]" onClick={() => setCartOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="absolute right-0 top-0 h-full w-full max-w-md bg-[#0d0d1a] border-l border-white/10 shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Cart Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}>MI CARRITO ({cartCount})</h3>
              </div>
              <button onClick={() => setCartOpen(false)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingCart className="w-16 h-16 text-gray-600 mb-4" />
                  <p className="text-gray-400 text-lg font-medium">Tu carrito esta vacio</p>
                  <p className="text-gray-500 text-sm mt-2">Agrega productos para comenzar</p>
                  <button onClick={() => setCartOpen(false)} className="mt-6 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-all">
                    Ver Productos
                  </button>
                </div>
              ) : (
                cartItems.map((item, idx) => (
                  <div key={`${item.productId}-${item.selectedStorage}-${item.selectedColor}-${idx}`} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                    <img src={item.image} alt={item.name} className="w-20 h-20 object-contain rounded-xl bg-gray-800/50 flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/80x80/1a1a2e/7BA3C9/png?text=P` }} />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{item.name}</h4>
                      <p className={`text-xs ${item.condition === 'Nuevo' ? 'text-blue-400' : 'text-amber-400'}`}>{item.condition}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {item.selectedStorage && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-300">{item.selectedStorage}</span>}
                        {item.selectedColor && <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: resolveColor(item.selectedColor) }} />}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateCartQuantity(item.productId, item.selectedStorage, item.selectedColor, -1)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all">
                            <Minus className="w-3 h-3 text-gray-400" />
                          </button>
                          <span className="text-sm font-bold text-white w-6 text-center">{item.quantity}</span>
                          <button onClick={() => updateCartQuantity(item.productId, item.selectedStorage, item.selectedColor, 1)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all">
                            <Plus className="w-3 h-3 text-gray-400" />
                          </button>
                        </div>
                        {item.price && item.price !== '-' && (
                          <p className="text-sm font-bold text-white">$ {item.price}</p>
                        )}
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(item.productId, item.selectedStorage, item.selectedColor)} className="p-1.5 rounded-lg hover:bg-red-500/20 transition-all self-start">
                      <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-400" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer */}
            {cartItems.length > 0 && (
              <div className="border-t border-white/10 p-6 space-y-4">
                {cartTotal > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Total estimado</span>
                    <span className="text-2xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>$ {cartTotal.toLocaleString('es-CO')}</span>
                  </div>
                )}
                <button
                  onClick={() => { setCartOpen(false); setCheckoutOpen(true) }}
                  className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-2xl transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-3 text-lg"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Continuar al Pre-Checkout
                </button>
                <button onClick={clearCart} className="w-full py-3 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-gray-400 hover:text-red-400 font-medium rounded-xl transition-all text-sm">
                  Vaciar Carrito
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pre-Checkout Modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={() => setCheckoutOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#0d0d1a] border border-white/10 rounded-3xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Checkout Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-[#0d0d1a] z-10 rounded-t-3xl">
              <h3 className="text-xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}>PRE-CHECKOUT</h3>
              <button onClick={() => setCheckoutOpen(false)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Summary */}
              <div>
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Resumen del Pedido</h4>
                <div className="space-y-3">
                  {cartItems.map((item, idx) => (
                    <div key={`checkout-${item.productId}-${idx}`} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                      <img src={item.image} alt={item.name} className="w-12 h-12 object-contain rounded-lg bg-gray-800/50" onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/48x48/1a1a2e/7BA3C9/png?text=P` }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">
                          {item.selectedStorage}{item.selectedColor ? ` · ${item.selectedColor}` : ''} · x{item.quantity}
                        </p>
                      </div>
                      {item.price && item.price !== '-' && (
                        <p className="text-sm font-bold text-white flex-shrink-0">$ {item.price}</p>
                      )}
                    </div>
                  ))}
                </div>
                {cartTotal > 0 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                    <span className="text-gray-400 font-medium">Total estimado</span>
                    <span className="text-2xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>$ {cartTotal.toLocaleString('es-CO')}</span>
                  </div>
                )}
              </div>

              {/* Customer Info */}
              <div>
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Tus Datos (Opcional)</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Tu nombre"
                    value={checkoutName}
                    onChange={e => setCheckoutName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors text-sm"
                  />
                  <input
                    type="tel"
                    placeholder="Tu telefono"
                    value={checkoutPhone}
                    onChange={e => setCheckoutPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors text-sm"
                  />
                  <textarea
                    placeholder="Notas adicionales (ej: color preferido, metodo de pago...)"
                    value={checkoutNotes}
                    onChange={e => setCheckoutNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors text-sm resize-none"
                  />
                </div>
              </div>

              {/* Checkout Actions */}
              <div className="space-y-3">
                <button
                  onClick={() => { sendCartWhatsApp(); clearCart(); setCheckoutOpen(false) }}
                  className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-2xl transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/25 flex items-center justify-center gap-3 text-lg"
                >
                  <MessageCircle className="w-5 h-5" />
                  Enviar Pedido por WhatsApp
                </button>
                <button onClick={() => { setCheckoutOpen(false); setCartOpen(true) }} className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-medium rounded-xl transition-all text-sm">
                  Volver al Carrito
                </button>
              </div>

              <p className="text-center text-xs text-gray-500">
                Tu pedido sera enviado por WhatsApp para confirmar disponibilidad y coordinar el pago y entrega.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cart Added Feedback Toast */}
      {cartAddedFeedback && (
        <div className="fixed bottom-6 right-6 z-[80] px-6 py-3 bg-green-600 text-white font-medium rounded-2xl shadow-lg shadow-green-500/25 flex items-center gap-2 animate-bounce">
          <ShoppingCart className="w-4 h-4" />
          Producto agregado al carrito
        </div>
      )}

      {/* Animated Marquee Banner - hidden on product detail */}
      {!selectedProduct && (
      <div className="pt-16 md:pt-20">
        <AnimatedMarquee texts={marqueeTexts} />
      </div>
      )}

      {/* Hero Slideshow - hidden on product detail */}
      {!selectedProduct && <HeroSlideshow slides={heroSlides} />}

      {/* Main Content */}
      <main>

      {/* Model Bubbles - hidden on product detail */}
      {!selectedProduct && (
      <ScrollReveal>
      <section className="py-8 md:py-12 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-start gap-5 md:gap-8 overflow-x-auto pb-4 pt-2 px-2 scrollbar-hide">
            {modelBubbles.map(model => {
              const isHovered = hoveredBubbleId === model.id
              return (
              <button
                key={model.id}
                onClick={() => {
                  setActiveModel(model.id)
                  setHoveredBubbleId(null)
                  document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth' })
                }}
                onMouseEnter={() => setHoveredBubbleId(model.id)}
                onMouseLeave={() => setHoveredBubbleId(null)}
                onTouchStart={() => {
                  setHoveredBubbleId(model.id)
                  if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
                  hoverTimeout.current = setTimeout(() => setHoveredBubbleId(null), 1500)
                }}
                className="flex flex-col items-center gap-2.5 group cursor-pointer flex-shrink-0 relative"
              >
                <div className={`transition-all duration-300 bg-gray-900 border-2 ${
                  isHovered
                    ? 'w-28 h-28 md:w-32 md:h-32 rounded-2xl border-blue-500 shadow-lg shadow-blue-500/30 z-50 -translate-y-2'
                    : activeModel === model.id
                      ? 'w-20 h-20 md:w-24 md:h-24 rounded-full border-blue-500 shadow-lg shadow-blue-500/30 scale-110 overflow-hidden'
                      : 'w-20 h-20 md:w-24 md:h-24 rounded-full border-gray-600 group-hover:border-blue-400 overflow-hidden'
                }`}>
                  <img
                    src={model.image}
                    alt={model.label}
                    className={`w-full h-full transition-all duration-300 ${isHovered ? 'object-contain p-1' : 'object-cover'}`}
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/300x300/1a1a2e/7BA3C9/png?text=${encodeURIComponent(model.label)}` }}
                  />
                </div>
                <span className={`text-xs font-medium text-center leading-tight transition-colors ${
                  activeModel === model.id ? 'text-white' : 'text-gray-400 group-hover:text-white'
                }`}>
                  {model.label}
                </span>
              </button>
              )
            })}
          </div>
        </div>
      </section>
      </ScrollReveal>
      )}

      {/* Add top padding when viewing product detail (no hero/marquee) */}
      {selectedProduct && <div className="pt-20 md:pt-24" />}

      {/* Recomendado para ti */}
      {!selectedProduct && recommendedProducts.length > 0 && (
        <section className="py-10 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <ScrollReveal>
            <div className="flex items-center gap-3 mb-8">
              <Sparkles className="w-6 h-6 text-blue-400" />
              <h3 className="text-2xl md:text-4xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}>RECOMENDADO PARA TI</h3>
            </div>
            </ScrollReveal>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {recommendedProducts.map((product, idx) => (
                <ScrollReveal key={product.id} delay={idx * 0.08} animation="scale">
                                <button onClick={() => selectProduct(product)} className="w-full group text-left bg-white/5 rounded-2xl border border-white/5 overflow-hidden hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-1">
                                  <div className="relative aspect-square bg-gradient-to-b from-gray-800/30 to-gray-900/30 p-4 flex items-center justify-center">
                                    {product.badge && (
                                      <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500 text-white">{product.badge}</div>
                                    )}
                                    <div className={`absolute ${product.badge ? 'top-12' : 'top-3'} right-3 z-10 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`}>
                                      <Heart className="w-4 h-4 text-gray-300" />
                                    </div>
                                    <img src={product.image} alt={product.name} className="w-full h-full object-contain rounded-xl group-hover:scale-105 transition-transform duration-500" onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/400x400/1a1a2e/7BA3C9/png?text=${encodeURIComponent(product.name)}` }} />
                                  </div>
                                  <div className="p-3 md:p-4">
                                    <p className="text-xs text-blue-400 font-medium mb-1">{product.condition}</p>
                    <h4 className="text-sm md:text-base font-bold text-white mb-1.5 line-clamp-2">{product.name}</h4>
                    <div className="flex flex-wrap items-center gap-1 mb-2">
                      {product.storageOptions.map((s, i) => (
                              <span key={i} className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-gray-400">{s}</span>
                            ))}
                      {product.colors.length > 0 && <span className="mx-0.5" />}
                      {product.colors.map((color, i) => (
                        <div key={`c${i}`} className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: resolveColor(color) }} />
                      ))}
                          </div>
                          {product.price && product.price !== '-' ? (
                            <div className="mb-1">
                              {product.oldPrice && product.oldPrice !== '-' && (
                                <p className="text-[10px] text-red-400 line-through">$ {product.oldPrice}</p>
                              )}
                              <p className="text-base md:text-lg font-bold text-white">$ {product.price}</p>
                            </div>
                          ) : (
                            <p className="text-xs text-blue-400 font-medium flex items-center gap-1 mb-1"><MessageCircle className="w-3 h-3" /> Consultar Precio</p>
                          )}
                          <p className="text-[10px] text-green-400 font-medium flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> Retira Hoy en {pickupAddress.short}</p>
                        </div>
                      </button>
                      </ScrollReveal>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Tendencia Ahora */}
      {!selectedProduct && trendingProducts.length > 0 && (
        <section className="py-10 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <ScrollReveal>
            <div className="flex items-center gap-3 mb-8">
              <TrendingUp className="w-6 h-6 text-amber-400" />
              <h3 className="text-2xl md:text-4xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}>TENDENCIA AHORA</h3>
            </div>
            </ScrollReveal>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {trendingProducts.map((product, idx) => (
                <ScrollReveal key={product.id} delay={idx * 0.08} animation="scale">
                <button onClick={() => selectProduct(product)} className="w-full group text-left bg-white/5 rounded-2xl border border-white/5 overflow-hidden hover:border-amber-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-1">
                  <div className="relative aspect-square bg-gradient-to-b from-gray-800/30 to-gray-900/30 p-4 flex items-center justify-center">
                    <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-black flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Trending</div>
                    <div className="absolute top-12 right-3 z-10 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Heart className="w-4 h-4 text-gray-300" />
                    </div>
                    <img src={product.image} alt={product.name} className="w-full h-full object-contain rounded-xl group-hover:scale-105 transition-transform duration-500" onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/400x400/1a1a2e/7BA3C9/png?text=${encodeURIComponent(product.name)}` }} />
                  </div>
                  <div className="p-3 md:p-4">
                    <p className={`text-xs font-medium mb-1 ${product.condition === 'Nuevo' ? 'text-blue-400' : 'text-amber-400'}`}>{product.condition}</p>
                    <h4 className="text-sm md:text-base font-bold text-white mb-1.5 line-clamp-2">{product.name}</h4>
                    <div className="flex flex-wrap items-center gap-1 mb-2">
                      {product.storageOptions.map((s, i) => (
                              <span key={i} className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-gray-400">{s}</span>
                            ))}
                      {product.colors.length > 0 && <span className="mx-0.5" />}
                      {product.colors.map((color, i) => (
                        <div key={`c${i}`} className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: resolveColor(color) }} />
                      ))}
                          </div>
                          {product.price && product.price !== '-' ? (
                            <div className="mb-1">
                              {product.oldPrice && product.oldPrice !== '-' && (
                                <p className="text-[10px] text-red-400 line-through">$ {product.oldPrice}</p>
                              )}
                              <p className="text-base md:text-lg font-bold text-white">$ {product.price}</p>
                            </div>
                          ) : (
                            <p className="text-xs text-blue-400 font-medium flex items-center gap-1 mb-1"><MessageCircle className="w-3 h-3" /> Consultar Precio</p>
                          )}
                          <p className="text-[10px] text-green-400 font-medium flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> Retira Hoy en {pickupAddress.short}</p>
                        </div>
                      </button>
                      </ScrollReveal>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Product Detail View */}
      {selectedProduct && (() => {
        // Build gallery: always start with main image, then add any additional gallery images (no duplicates)
        const mainImg = selectedProduct.image
        const extraImgs = (selectedProduct.images || []).filter(img => img && img !== mainImg)
        const galleryImages = [mainImg, ...extraImgs].filter(Boolean)
        const model3DUrl = getModel3DUrl(selectedProduct)
        return (
        <section className="py-10 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <button onClick={clearProduct} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 text-sm">
              <ArrowLeft className="w-4 h-4" />
              Volver a productos
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">
              {/* Product Image Gallery */}
              <div className="space-y-4">
                {/* Gallery/3D View Tabs */}
                {model3DUrl && (
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => setShow3DView(false)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${!show3DView ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="m21 15-5-5L5 21" />
                      </svg>
                      Fotos
                    </button>
                    <button
                      onClick={() => setShow3DView(true)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${show3DView ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9m-9 9a9 9 0 0 1 9-9" />
                      </svg>
                      Vista 360°
                    </button>
                  </div>
                )}

                {/* 3D Viewer */}
                {show3DView && model3DUrl ? (
                  <div className="relative aspect-square bg-gradient-to-b from-gray-800/50 to-gray-900/50 rounded-3xl overflow-hidden">
                    <Suspense fallback={
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
                        <p className="text-gray-400 text-sm">Cargando modelo 3D...</p>
                      </div>
                    }>
                      <ProductViewer3D modelUrl={model3DUrl} productName={selectedProduct.name} />
                    </Suspense>
                  </div>
                ) : (
                <>
                <div className="relative aspect-square bg-gradient-to-b from-gray-800/50 to-gray-900/50 rounded-3xl overflow-hidden flex items-center justify-center p-10 group">
                  {selectedProduct.badge && (
                    <div className="absolute top-6 right-6 z-10 px-4 py-1.5 rounded-full text-sm font-bold bg-blue-500 text-white">{selectedProduct.badge}</div>
                  )}
                  <img
                    src={galleryImages[galleryIndex] || selectedProduct.image}
                    alt={`${selectedProduct.name} - Foto ${galleryIndex + 1}`}
                    className="w-full h-full object-contain rounded-2xl cursor-pointer"
                    onClick={() => setZoomOpen(true)}
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/600x600/1a1a2e/7BA3C9/png?text=${encodeURIComponent(selectedProduct.name)}` }}
                  />
                  {/* Navigation arrows */}
                  {galleryImages.length > 1 && (
                    <>
                      <button
                        onClick={() => setGalleryIndex(i => i > 0 ? i - 1 : galleryImages.length - 1)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setGalleryIndex(i => i < galleryImages.length - 1 ? i + 1 : 0)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                  {/* Zoom button */}
                  <button
                    onClick={() => setZoomOpen(true)}
                    className="absolute bottom-4 right-4 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </button>
                  {/* Image counter */}
                  {galleryImages.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 rounded-full text-white text-xs font-medium z-20">
                      {galleryIndex + 1} / {galleryImages.length}
                    </div>
                  )}
                </div>
                {/* Thumbnails */}
                {galleryImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {galleryImages.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setGalleryIndex(i)}
                        className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${i === galleryIndex ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-white/10 hover:border-white/30'}`}
                      >
                        <img src={img} alt={`${selectedProduct.name} - Miniatura ${i + 1}`} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/100x100/1a1a2e/7BA3C9/png?text=${i + 1}` }} />
                      </button>
                    ))}
                  </div>
                )}
                </>
                )}
              </div>

              {/* Zoom Modal */}
              {zoomOpen && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setZoomOpen(false)}>
                  <button onClick={() => setZoomOpen(false)} className="absolute top-6 right-6 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white z-50">
                    <X className="w-6 h-6" />
                  </button>
                  {galleryImages.length > 1 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setGalleryIndex(i => i > 0 ? i - 1 : galleryImages.length - 1) }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white z-50"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setGalleryIndex(i => i < galleryImages.length - 1 ? i + 1 : 0) }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white z-50"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </>
                  )}
                  <img
                    src={galleryImages[galleryIndex] || selectedProduct.image}
                    alt={selectedProduct.name}
                    className="max-w-full max-h-[90vh] object-contain rounded-xl"
                    onClick={(e) => e.stopPropagation()}
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/800x800/1a1a2e/7BA3C9/png?text=${encodeURIComponent(selectedProduct.name)}` }}
                  />
                  {galleryImages.length > 1 && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 rounded-full text-white text-sm font-medium">
                      {galleryIndex + 1} / {galleryImages.length}
                    </div>
                  )}
                </div>
              )}

              {/* Product Info */}
              <div className="flex flex-col justify-center">
                <div className={`inline-block px-3 py-1 rounded-lg text-sm font-medium mb-4 w-fit ${selectedProduct.condition === 'Nuevo' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {selectedProduct.condition}
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-6" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}>{selectedProduct.name}</h2>
                
                <div className="mb-6">
                  <p className="text-gray-400 text-sm mb-3">Almacenamiento disponible</p>
                  <div className="flex flex-wrap gap-3">
                    {selectedProduct.storageOptions.map((storage, i) => (
                      <button key={i} onClick={() => setSelectedStorage(storage)} className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all cursor-pointer ${selectedStorage === storage ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-white/5 border-white/10 text-white hover:border-blue-500/50'}`}>{storage}</button>
                    ))}
                  </div>
                </div>

                <div className="mb-8">
                  <p className="text-gray-400 text-sm mb-3">Colores disponibles</p>
                  <div className="flex items-center gap-3">
                    {selectedProduct.colors.map((color, i) => (
                      <button key={i} onClick={() => { setSelectedColor(color); const colorImg = selectedProduct.color_images?.[color]; if (colorImg) { const idx = galleryImages.indexOf(colorImg); if (idx >= 0) setGalleryIndex(idx) } else if (i < galleryImages.length) { setGalleryIndex(i) } }} className={`w-8 h-8 rounded-full border-2 transition-colors cursor-pointer ${selectedColor === color ? 'border-blue-400 ring-2 ring-blue-400/30' : 'border-white/20 hover:border-blue-400'}`} style={{ backgroundColor: resolveColor(color) }} title={color} />
                    ))}
                  </div>
                </div>

                {/* Price */}
                {selectedProduct.price && selectedProduct.price !== '-' && (
                  <div className="mb-6">
                    {selectedProduct.oldPrice && selectedProduct.oldPrice !== '-' && (
                      <p className="text-sm text-red-400 line-through">$ {selectedProduct.oldPrice}</p>
                    )}
                    <p className="text-3xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}>$ {selectedProduct.price}</p>
                  </div>
                )}

                {/* Retira Hoy badge */}
                <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20">
                  <MapPin className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <div>
                    <p className="text-green-400 font-semibold text-sm">Retira Hoy</p>
                    <p className="text-gray-400 text-xs">{pickupAddress.full}</p>
                  </div>
                </div>

                {/* Add to Cart + WhatsApp buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => addToCart(selectedProduct, selectedStorage, selectedColor)}
                    className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-2xl transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-3 text-lg"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Agregar al Carrito
                  </button>
                  <a
                    href={`https://wa.me/${socials.whatsappNumber}?text=${encodeURIComponent(`Hola Gordotech! Me interesa el ${selectedProduct.name} (${selectedProduct.condition})${selectedStorage ? ` - ${selectedStorage}` : ''}${selectedColor ? ` - ${selectedColor}` : ''}. ¿Tienen disponible y cuál es el precio?`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 bg-green-600/10 hover:bg-green-600 border border-green-600/30 hover:border-green-600 text-green-400 hover:text-white font-semibold rounded-2xl transition-all flex items-center justify-center gap-3 text-base"
                  >
                    <MessageCircle className="w-5 h-5" />
                    {selectedProduct.price && selectedProduct.price !== '-' ? 'Comprar por WhatsApp' : 'Consultar Precio por WhatsApp'}
                  </a>
                </div>
              </div>
            </div>

            {/* Related Products */}
            <div>
              <h3 className="text-2xl md:text-4xl font-bold mb-8" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}>PRODUCTOS RELACIONADOS</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {relatedProducts.map(product => (
                  <button key={product.id} onClick={() => selectProduct(product)} className="group text-left bg-white/5 rounded-2xl border border-white/5 overflow-hidden hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-1">
                          <div className="relative aspect-square bg-gradient-to-b from-gray-800/30 to-gray-900/30 p-4 flex items-center justify-center">
                            {product.badge && (
                              <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500 text-white">{product.badge}</div>
                            )}
                            <div className={`absolute ${product.badge ? 'top-12' : 'top-3'} right-3 z-10 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`}>
                              <Heart className="w-4 h-4 text-gray-300" />
                            </div>
                            <img src={product.image} alt={product.name} className="w-full h-full object-contain rounded-xl group-hover:scale-105 transition-transform duration-500" onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/400x400/1a1a2e/7BA3C9/png?text=${encodeURIComponent(product.name)}` }} />
                          </div>
                          <div className="p-3 md:p-4">
                            <p className={`text-xs font-medium mb-1 ${product.condition === 'Nuevo' ? 'text-blue-400' : 'text-amber-400'}`}>{product.condition}</p>
                            <h4 className="text-sm md:text-base font-bold text-white mb-1.5 line-clamp-2">{product.name}</h4>
                            <div className="flex flex-wrap items-center gap-1 mb-2">
                              {product.storageOptions.map((s, i) => (
                                                            <span key={i} className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-gray-400">{s}</span>
                                                          ))}
                              {product.colors.length > 0 && <span className="mx-0.5" />}
                              {product.colors.map((color, i) => (
                                <div key={`c${i}`} className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: resolveColor(color) }} />
                              ))}
                                                        </div>
                                                        {product.price && product.price !== '-' ? (
                                                          <div className="mb-1">
                                                            {product.oldPrice && product.oldPrice !== '-' && (
                                                              <p className="text-[10px] text-red-400 line-through">$ {product.oldPrice}</p>
                                                            )}
                                                            <p className="text-base md:text-lg font-bold text-white">$ {product.price}</p>
                                                          </div>
                            ) : (
                              <p className="text-xs text-blue-400 font-medium flex items-center gap-1 mb-1"><MessageCircle className="w-3 h-3" /> Consultar Precio</p>
                            )}
                            <p className="text-[10px] text-green-400 font-medium flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> Retira Hoy en {pickupAddress.short}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
              )
            })()}

      {/* Products Section */}
      {!selectedProduct && (
      <section id="productos" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <ScrollReveal>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <h3 className="text-3xl md:text-5xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}>
                {activeModel === 'todos' ? 'TODOS LOS iPHONES' : activeModel.toUpperCase()}
              </h3>
              <p className="text-gray-400 mt-2">Disponibles en {cityName} &middot; {filteredProducts.length} productos</p>
            </div>
            {/* Condition Filter Tabs */}
            <div className="flex items-center gap-2">
              {[{ id: 'todos', label: 'Todos' }, { id: 'nuevos', label: 'Nuevos' }, { id: 'semi-usados', label: 'Semi-usados' }].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCondition(tab.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    activeCondition === tab.id
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          </ScrollReveal>

          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredProducts.map((product, idx) => (
              <ScrollReveal key={product.id} delay={Math.min(idx, 7) * 0.06} animation="scale">
              <button
                onClick={() => selectProduct(product)}
                className="w-full group text-left bg-white/5 rounded-2xl border border-white/5 overflow-hidden hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-1"
              >
                {/* Badge */}
                <div className="relative aspect-square bg-gradient-to-b from-gray-800/30 to-gray-900/30 p-4 flex items-center justify-center">
                  {product.badge && (
                    <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500 text-white">{product.badge}</div>
                  )}
                  <div className={`absolute ${product.badge ? 'top-12' : 'top-3'} right-3 z-10 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`}>
                    <Heart className="w-4 h-4 text-gray-300" />
                  </div>
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-contain rounded-xl group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/400x400/1a1a2e/7BA3C9/png?text=${encodeURIComponent(product.name)}` }}
                  />
                </div>

                {/* Info */}
                <div className="p-3 md:p-4">
                  <p className={`text-xs font-medium mb-1 ${product.condition === 'Nuevo' ? 'text-blue-400' : 'text-amber-400'}`}>{product.condition}</p>
                  <h4 className="text-sm md:text-base font-bold text-white mb-1.5 line-clamp-2">{product.name}</h4>
                  
                  {/* Storage Options + Colors */}
                  <div className="flex flex-wrap items-center gap-1 mb-2">
                    {product.storageOptions.map((storage, i) => (
                                            <span key={i} className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-gray-400">
                                              {storage}
                                            </span>
                    ))}
                    {product.colors.length > 0 && <span className="mx-0.5" />}
                    {product.colors.map((color, i) => (
                      <div key={`c${i}`} className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: resolveColor(color) }} />
                    ))}
                  </div>

                  {product.price && product.price !== '-' ? (
                    <div className="mb-1">
                      {product.oldPrice && product.oldPrice !== '-' && (
                        <p className="text-[10px] text-red-400 line-through">$ {product.oldPrice}</p>
                      )}
                      <p className="text-base md:text-lg font-bold text-white">$ {product.price}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-blue-400 font-medium flex items-center gap-1 mb-1"><MessageCircle className="w-3 h-3" /> Consultar Precio</p>
                  )}
                  <p className="text-[10px] text-green-400 font-medium flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> Retira Hoy en {pickupAddress.short}</p>
                </div>
              </button>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Plan Retoma Section - hidden on product detail */}
      {!selectedProduct && (
        <section className="py-16 md:py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/5" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
            <ScrollReveal>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 mb-6">
                <Smartphone className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-sm font-medium">Trae tu iPhone, subelo de nivel</span>
              </div>
              <h3 className="text-4xl md:text-6xl font-bold mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}>
                PLAN <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">RETOMA</span>
              </h3>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Del iPhone que tienes... al iPhone que suenas. Te recibimos tu equipo como parte de pago.
              </p>
            </div>
            </ScrollReveal>

            {/* 4 Steps */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
              {[
                { step: '1', title: 'Trae tu iPhone', icon: Smartphone },
                { step: '2', title: 'Lo evaluamos', icon: Settings },
                { step: '3', title: 'Te damos precio de retoma', icon: Star },
                { step: '4', title: 'Lo cambias por uno nuevo', icon: Zap },
              ].map((item, i) => (
                <ScrollReveal key={i} delay={i * 0.1} animation="fade-up">
                <div className="text-center p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all duration-500">
                  <div className="w-12 h-12 mx-auto bg-blue-500/10 rounded-full flex items-center justify-center mb-3">
                    <span className="text-blue-400 font-bold text-lg" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{item.step}</span>
                  </div>
                  <item.icon className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-white font-semibold text-sm">{item.title}</p>
                </div>
                </ScrollReveal>
              ))}
            </div>

            {/* Requirements */}
            <ScrollReveal delay={0.2}>
            <div className="max-w-3xl mx-auto">
              <div className="p-8 rounded-3xl bg-white/5 border border-white/10">
                <h4 className="text-2xl font-bold text-white mb-6 text-center" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}>
                  Requisitos Plan Retoma
                </h4>
                <p className="text-blue-400 font-semibold text-center mb-6">En excelente estado estetico</p>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5">
                    <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Award className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">Caja y factura original</p>
                      <p className="text-gray-400 text-xs mt-1">Sin eso no podemos validar el equipo</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">Sin reparaciones</p>
                      <p className="text-gray-400 text-xs mt-1">Nunca debe haber sido abierto, reparado o con piezas cambiadas</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5">
                    <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Zap className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">Bateria en buen estado</p>
                      <p className="text-gray-400 text-xs mt-1">Minimo 85% de salud de bateria</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
                    Desde iPhone 11 hasta iPhone 16
                  </span>
                </div>
              </div>
            </div>
            </ScrollReveal>

            {/* CTA */}
            <ScrollReveal delay={0.3}>
            <div className="text-center mt-10">
              <a
                href={`https://wa.me/${socials.whatsappNumber}?text=Hola%20Gordotech%2C%20quiero%20informacion%20sobre%20el%20Plan%20Retoma`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-2xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-green-500/25"
              >
                <MessageCircle className="w-5 h-5" />
                Consultar Plan Retoma por WhatsApp
              </a>
            </div>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* Repair Section - Only for Duitama, hidden on product detail */}
      {!selectedProduct && city === 'duitama' && (
        <section id="reparacion" className="py-16 md:py-24 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
            <ScrollReveal>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
                <Wrench className="w-4 h-4 text-blue-400" />
                <span className="text-blue-400 text-sm font-medium">Solo en Duitama</span>
              </div>
              <h3 className="text-4xl md:text-6xl font-bold mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}>
                CENTRO DE <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">REPARACION</span>
              </h3>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Nuestros tecnicos certificados reparan tu iPhone con repuestos de la mas alta calidad
              </p>
            </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {apiRepairServices.map((service, i) => (
                <ScrollReveal key={i} delay={i * 0.1} animation="fade-up">
                <div
                  className="group p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all duration-500 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1"
                >
                  <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-blue-500/20 transition-colors">
                    <service.icon className="w-7 h-7 text-blue-400" />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">{service.title}</h4>
                  <p className="text-gray-400 text-sm mb-4 leading-relaxed">{service.description}</p>
                  <p className="text-blue-400 font-bold text-lg" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{service.price}</p>
                </div>
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal delay={0.3}>
            <div className="text-center mt-12">
              <a
                href={`https://wa.me/${socials.whatsappNumber}?text=Hola%20Gordotech%2C%20necesito%20una%20reparacion`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-2xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-green-500/25"
              >
                <MessageCircle className="w-5 h-5" />
                Agendar Reparacion por WhatsApp
              </a>
            </div>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* Location Section - hidden on product detail */}
      {!selectedProduct && (
      <section id="ubicacion" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <ScrollReveal>
          <div className="text-center mb-16">
            <h3 className="text-4xl md:text-6xl font-bold mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}>
              VISITANOS EN <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">{cityName.toUpperCase()}</span>
            </h3>
            <p className="text-gray-400 text-lg">Ven a conocer nuestros productos en persona</p>
          </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Duitama */}
            <ScrollReveal delay={0.1}>
            <div className={`p-8 rounded-3xl border transition-all ${city === 'duitama' ? 'bg-blue-500/5 border-blue-500/20' : 'bg-white/5 border-white/5'}`}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}>DUITAMA</h4>
                  <p className="text-blue-400 text-sm">Tienda + Centro de Reparacion</p>
                </div>
              </div>
              <div className="space-y-4 text-gray-300">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                  <p className="text-sm">C.C Pasaje Solano, Local 1-02, Calle 20a # 12-32, Duitama, Boyaca</p>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <p className="text-sm">Lun - Sab: 9:00 AM - 7:00 PM</p>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <p className="text-sm">+57 314 481 0431</p>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <a href={CITY_SOCIALS.duitama.whatsapp} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 bg-green-600/10 hover:bg-green-600 border border-green-600/30 hover:border-green-600 text-green-400 hover:text-white font-medium rounded-xl transition-all text-center text-sm">
                  WhatsApp
                </a>
                <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="flex-1 py-3 bg-blue-500/10 hover:bg-blue-500 border border-blue-500/30 hover:border-blue-500 text-blue-400 hover:text-white font-medium rounded-xl transition-all text-center text-sm">
                  Ver en Mapa
                </a>
              </div>
            </div>
            </ScrollReveal>

            {/* Tunja */}
            <ScrollReveal delay={0.2}>
            <div className={`p-8 rounded-3xl border transition-all ${city === 'tunja' ? 'bg-blue-500/5 border-blue-500/20' : 'bg-white/5 border-white/5'}`}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}>TUNJA</h4>
                  <p className="text-blue-400 text-sm">Punto de Venta</p>
                </div>
              </div>
              <div className="space-y-4 text-gray-300">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                  <p className="text-sm">Av. Universitaria # 45a-40, Oficina 304, Oporto Centro de Negocios, Tunja, Boyaca</p>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <p className="text-sm">Lun - Sab: 9:00 AM - 7:00 PM</p>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <p className="text-sm">+57 321 986 3883</p>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <a href={CITY_SOCIALS.tunja.whatsapp} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 bg-green-600/10 hover:bg-green-600 border border-green-600/30 hover:border-green-600 text-green-400 hover:text-white font-medium rounded-xl transition-all text-center text-sm">
                  WhatsApp
                </a>
                <a href="https://www.google.com/maps/search/?api=1&query=Oporto+Centro+de+Negocios%2C+Av.+Universitaria+%2345a-40%2C+Tunja%2C+Boyaca" target="_blank" rel="noopener noreferrer" className="flex-1 py-3 bg-blue-500/10 hover:bg-blue-500 border border-blue-500/30 hover:border-blue-500 text-blue-400 hover:text-white font-medium rounded-xl transition-all text-center text-sm">
                  Ver en Mapa
                </a>
              </div>
            </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
      )}

      {/* CTA Banner - hidden on product detail */}
      {!selectedProduct && (
      <ScrollReveal animation="scale">
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="relative rounded-3xl bg-gradient-to-r from-blue-600 to-blue-800 p-10 md:p-16 overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
              backgroundSize: '30px 30px'
            }} />
            <div className="relative z-10 text-center">
              <h3 className="text-3xl md:text-5xl font-bold mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}>
                ENCUENTRA TU iPHONE IDEAL
              </h3>
              <p className="text-blue-100/80 text-lg mb-8 max-w-2xl mx-auto">
                Escribenos por WhatsApp y te asesoramos para que encuentres el iPhone perfecto para ti al mejor precio
              </p>
              <a
                href={`https://wa.me/${socials.whatsappNumber}?text=Hola%20Gordotech%2C%20quiero%20información%20sobre%20iPhones`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 bg-white text-blue-700 font-bold rounded-2xl transition-all hover:scale-105 hover:shadow-lg"
              >
                <MessageCircle className="w-5 h-5" />
                Chatea con Nosotros
              </a>
            </div>
          </div>
        </div>
      </section>
      </ScrollReveal>
      )}

      </main>

      {/* Footer */}
      <ScrollReveal>
      <footer id="contacto" className="border-t border-white/5 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <img src="/images/gordotech-logo.png" alt="Gordotech" className="h-12" />
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">Conectando tus suenos. Tu tienda de confianza para iPhones nuevos y semi-usados en Boyaca.</p>
              <div className="flex gap-3 mt-4">
                <a href={socials.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors">
                  <Instagram className="w-5 h-5 text-gray-400" />
                </a>
                <a href={socials.tiktok} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors">
                  <TikTokIcon className="w-5 h-5 text-gray-400" />
                </a>
                <a href={socials.whatsapp} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors">
                  <MessageCircle className="w-5 h-5 text-gray-400" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h5 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Productos</h5>
              <ul className="space-y-3">
                <li><a href="#productos" className="text-gray-400 hover:text-white transition-colors text-sm">iPhones Nuevos</a></li>
                <li><a href="#productos" className="text-gray-400 hover:text-white transition-colors text-sm">iPhones Semi-usados</a></li>
                <li><a href="#productos" className="text-gray-400 hover:text-white transition-colors text-sm">Accesorios</a></li>
              </ul>
            </div>

            {/* Services */}
            <div>
              <h5 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Servicios</h5>
              <ul className="space-y-3">
                <li><a href="#reparacion" className="text-gray-400 hover:text-white transition-colors text-sm">Reparacion iPhone</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Cambio de pantalla</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Cambio de bateria</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Diagnostico gratis</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h5 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Contacto</h5>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-gray-400 text-sm">
                  <Phone className="w-4 h-4 text-blue-400" />
                  +57 314 481 0431
                </li>
                <li className="flex items-center gap-2 text-gray-400 text-sm">
                  <Mail className="w-4 h-4 text-blue-400" />
                  info@gordotech.co
                </li>
                <li className="flex items-start gap-2 text-gray-400 text-sm">
                  <MapPin className="w-4 h-4 text-blue-400 mt-0.5" />
                  Duitama & Tunja, Boyaca
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-xs">&copy; 2026 Gordotech. Todos los derechos reservados. Conectando tus suenos.</p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <a href="#" className="hover:text-white transition-colors">Terminos</a>
              <a href="#" className="hover:text-white transition-colors">Privacidad</a>
              <a href="#" className="hover:text-white transition-colors">Garantia</a>
              <button onClick={onAdminClick} className="flex items-center gap-1.5 hover:text-white transition-colors" title="Panel de Administración">
                <Settings className="w-3.5 h-3.5" />
                Admin
              </button>
            </div>
          </div>
        </div>
      </footer>
      </ScrollReveal>

      {/* WhatsApp Floating Button */}
      <a
        href={`https://wa.me/${socials.whatsappNumber}?text=Hola%20Gordotech%2C%20necesito%20información`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 hover:scale-110 transition-all"
      >
        <MessageCircle className="w-7 h-7 text-white" />
      </a>
    </div>
  )
}

function ProductPageWrapper({ city, onChangeCity, onAdminClick }: { city: City; onChangeCity: () => void; onAdminClick: () => void }) {
  const { id, slug } = useParams<{ id: string; slug: string }>()
  const location = useLocation()
  const initialProduct = (location.state as { product?: Product })?.product
  return <Store city={city} onChangeCity={onChangeCity} onAdminClick={onAdminClick} productSlug={slug} productId={id} initialProduct={initialProduct} />
}

// Legacy slug-only wrapper for backwards compatibility
function ProductPageWrapperLegacy({ city, onChangeCity, onAdminClick }: { city: City; onChangeCity: () => void; onAdminClick: () => void }) {
  const { slug } = useParams<{ slug: string }>()
  return <Store city={city} onChangeCity={onChangeCity} onAdminClick={onAdminClick} productSlug={slug} />
}

function App() {
  const [city, setCity] = useState<City>(() => {
    const saved = localStorage.getItem('gordotech-city')
    return (saved === 'duitama' || saved === 'tunja') ? saved : null
  })
  const [showAdmin, setShowAdmin] = useState(false)

  // If visiting a product URL directly without city selected, default to duitama
  const isProductRoute = window.location.pathname.startsWith('/producto/')
  const effectiveCity = city || (isProductRoute ? 'duitama' as City : null)

  // Keyboard shortcut: Ctrl+Shift+A to toggle admin panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault()
        setShowAdmin(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Check URL hash for admin access
  useEffect(() => {
    if (window.location.hash === '#admin') {
      setShowAdmin(true)
    }
  }, [])

  const handleCitySelect = (selected: City) => {
    setCity(selected)
    if (selected) localStorage.setItem('gordotech-city', selected)
  }

  const handleChangeCity = () => {
    setCity(null)
    localStorage.removeItem('gordotech-city')
    window.scrollTo(0, 0)
  }

  if (showAdmin) {
    return <AdminPanel onExit={() => { setShowAdmin(false); window.location.hash = '' }} />
  }

  if (!effectiveCity) {
    return <CitySelector onSelect={handleCitySelect} />
  }

  return (
    <Routes>
      <Route path="/producto/:id/:slug" element={<ProductPageWrapper city={effectiveCity} onChangeCity={handleChangeCity} onAdminClick={() => setShowAdmin(true)} />} />
      <Route path="/producto/:slug" element={<ProductPageWrapperLegacy city={effectiveCity} onChangeCity={handleChangeCity} onAdminClick={() => setShowAdmin(true)} />} />
      <Route path="*" element={<Store city={effectiveCity} onChangeCity={handleChangeCity} onAdminClick={() => setShowAdmin(true)} />} />
    </Routes>
  )
}

export default App

import { useState, useEffect, useRef, useCallback, Suspense, useMemo, lazy } from 'react'
import { Routes, Route, useNavigate, useParams, useLocation, Link } from 'react-router-dom'
import './App.css'
import { MapPin, Smartphone, Wrench, Shield, Star, ChevronRight, Phone, Clock, Instagram, MessageCircle, Zap, Award, X, Heart, ArrowLeft, TrendingUp, ChevronLeft, ZoomIn, Sun, Moon, Settings } from 'lucide-react'

// GA4 WhatsApp click tracking
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}
function trackWhatsAppClick(city: string, page: string, product?: string) {
  if (window.gtag) {
    window.gtag('event', 'whatsapp_click', {
      event_category: 'WhatsApp',
      event_label: city,
      city: city,
      page_section: page,
      product_name: product || '',
    })
  }
}

// Lazy-load heavy components that are not needed on initial page load
const AdminPanel = lazy(() => import('./AdminPanel'))
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

const API_URL = import.meta.env.VITE_API_URL || 'https://gordotech-api.fly.dev'

// Resolve image URLs - prefix API_URL for relative /uploads/ paths
function resolveImageUrl(url: string): string {
  if (!url) return url
  if (url.startsWith('/uploads/')) return `${API_URL}${url}`
  return url
}

// Reliable fallback images for category bubbles (used when API/upload images fail)
const BUBBLE_FALLBACK_IMAGES: Record<string, string> = {
  'todos': 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300&h=300&fit=crop',
  'iphones': 'https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=300&h=300&fit=crop',
  'ipads': 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300&h=300&fit=crop',
  'macbook': 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&h=300&fit=crop',
  'airpods': 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=300&h=300&fit=crop',
  'apple watch': 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=300&h=300&fit=crop',
  'apple-watch': 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=300&h=300&fit=crop',
  'accesorios': 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=300&h=300&fit=crop',
  'samsung': 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=300&h=300&fit=crop',
}

// Preload images in background for instant display (limited concurrency)
const _preloadCache = new Set<string>()
function preloadImages(urls: string[], priority = false) {
  // Only preload first 6 images immediately, defer the rest
  const immediate = priority ? urls : urls.slice(0, 6)
  const deferred = priority ? [] : urls.slice(6)
  immediate.forEach(url => {
    if (url && !_preloadCache.has(url)) {
      _preloadCache.add(url)
      const img = new Image()
      img.src = url
    }
  })
  // Defer remaining images to load after initial render
  if (deferred.length > 0) {
    const deferFn = () => {
      deferred.forEach(url => {
        if (url && !_preloadCache.has(url)) {
          _preloadCache.add(url)
          const img = new Image()
          img.src = url
        }
      })
    }
    // Use requestIdleCallback if available, fallback to setTimeout for older Safari
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(deferFn)
    } else {
      setTimeout(deferFn, 200)
    }
  }
}

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
  tunja: { short: 'Oporto Centro de Negocios, Tunja', full: 'Av. Universitaria # 45a-40, Oficina 304, Oporto Centro de Negocios, Tunja' },
}

// Color map imported from shared module
import { resolveColor } from './lib/colors'

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

type MarqueeText = {
  id: number
  text: string
  active: boolean
  sort_order: number
}


// Get minimum price from product variants (returns { price, hasMultiple } or null)
function getMinVariantPrice(product: { price?: string; variants?: { price: string; active: boolean }[] }) {
  const variants = (product.variants || []).filter(v => v.active && v.price && v.price !== '-')
  if (variants.length === 0) return null
  const parsePrice = (p: string) => parseInt((p || '0').replace(/\./g, '').replace(/[^\d]/g, ''), 10) || 0
  const prices = variants.map(v => ({ raw: v.price, parsed: parsePrice(v.price) })).filter(p => p.parsed > 0)
  if (prices.length === 0) return null
  prices.sort((a, b) => a.parsed - b.parsed)
  const hasMultiple = prices.length > 1 && prices[0].parsed !== prices[prices.length - 1].parsed
  return { price: prices[0].raw, hasMultiple }
}

// Display-friendly condition label (API uses 'Semi-usado', we show 'Semi-nuevo')
function displayCondition(condition: string): string {
  if (condition === 'Semi-usado') return 'Semi-nuevo'
  return condition
}

// Product data - Semi-nuevos
const semiUsados = [
  // iPhone 12 Series
  { id: 101, name: 'iPhone 12', storageOptions: ['128GB'], image: 'https://images.unsplash.com/photo-1611472173362-3f53dbd65d80?w=400&h=500&fit=crop&q=80', colors: ['#000000', '#FFFFFF', '#4169E1'] },
  { id: 102, name: 'iPhone 12 Mini', storageOptions: ['128GB'], image: 'https://images.unsplash.com/photo-1611472173362-3f53dbd65d80?w=400&h=500&fit=crop&q=80', colors: ['#000000', '#F28B82', '#FFFFFF'] },
  { id: 103, name: 'iPhone 12 Pro', storageOptions: ['128GB', '256GB'], image: 'https://images.unsplash.com/photo-1607936854279-55e8a4c64888?w=400&h=500&fit=crop&q=80', colors: ['#4A4A4A', '#FFD700', '#1C1C1E'] },
  { id: 104, name: 'iPhone 12 Pro Max', storageOptions: ['128GB', '256GB'], image: 'https://images.unsplash.com/photo-1607936854279-55e8a4c64888?w=400&h=500&fit=crop&q=80', colors: ['#4A4A4A', '#FFD700', '#1C1C1E'] },
  // iPhone 13 Series
  { id: 105, name: 'iPhone 13', storageOptions: ['128GB'], image: 'https://images.unsplash.com/photo-1632633173522-47456de71b76?w=400&h=500&fit=crop&q=80', colors: ['#1C1C1E', '#F28B82', '#AECBFA'] },
  { id: 106, name: 'iPhone 13 Mini', storageOptions: ['128GB'], image: 'https://images.unsplash.com/photo-1632633173522-47456de71b76?w=400&h=500&fit=crop&q=80', colors: ['#1C1C1E', '#F28B82', '#FFFFFF'] },
  { id: 107, name: 'iPhone 13 Pro', storageOptions: ['128GB', '256GB'], image: 'https://images.unsplash.com/photo-1638038772924-ef79cce2426d?w=400&h=500&fit=crop&q=80', colors: ['#4A4A4A', '#87CEEB', '#FFD700'] },
  { id: 108, name: 'iPhone 13 Pro Max', storageOptions: ['128GB', '256GB'], image: 'https://images.unsplash.com/photo-1638038772924-ef79cce2426d?w=400&h=500&fit=crop&q=80', colors: ['#4A4A4A', '#87CEEB', '#FFD700'] },
  // iPhone 14 Series
  { id: 109, name: 'iPhone 14', storageOptions: ['128GB'], image: 'https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=400&h=500&fit=crop&q=80', colors: ['#000000', '#E3D0B9', '#F28B82'] },
  { id: 110, name: 'iPhone 14 Plus', storageOptions: ['128GB'], image: 'https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=400&h=500&fit=crop&q=80', colors: ['#000000', '#E3D0B9', '#AECBFA'] },
  { id: 111, name: 'iPhone 14 Pro', storageOptions: ['128GB', '256GB'], image: 'https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=400&h=500&fit=crop&q=80', colors: ['#1C1C1E', '#6B5B4F', '#F5F5DC'] },
  { id: 112, name: 'iPhone 14 Pro Max', storageOptions: ['128GB', '256GB', '512GB'], image: 'https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=400&h=500&fit=crop&q=80', colors: ['#1C1C1E', '#6B5B4F', '#F5F5DC'] },
  // iPhone 15 Series
  { id: 113, name: 'iPhone 15', storageOptions: ['128GB'], image: 'https://images.unsplash.com/photo-1696446702183-cbd13d78e1e7?w=400&h=500&fit=crop&q=80', colors: ['#000000', '#F28B82', '#AECBFA'] },
  { id: 114, name: 'iPhone 15 Plus', storageOptions: ['128GB'], image: 'https://images.unsplash.com/photo-1696446702183-cbd13d78e1e7?w=400&h=500&fit=crop&q=80', colors: ['#000000', '#F28B82', '#AECBFA'] },
  { id: 115, name: 'iPhone 15 Pro', storageOptions: ['128GB', '256GB'], image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=500&fit=crop&q=80', colors: ['#1C1C1E', '#F5F5DC', '#4A4A4A'] },
  { id: 116, name: 'iPhone 15 Pro Max', storageOptions: ['256GB', '512GB', '1TB'], image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=500&fit=crop&q=80', colors: ['#1C1C1E', '#F5F5DC', '#4A4A4A'] },
  // iPhone 16 Series
  { id: 117, name: 'iPhone 16', storageOptions: ['128GB'], image: 'https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=400&h=500&fit=crop&q=80', colors: ['#000000', '#AECBFA', '#F5F5DC'] },
  { id: 118, name: 'iPhone 16 Plus', storageOptions: ['128GB'], image: 'https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=400&h=500&fit=crop&q=80', colors: ['#000000', '#AECBFA', '#F5F5DC'] },
  { id: 119, name: 'iPhone 16 Pro', storageOptions: ['128GB', '256GB', '512GB'], image: 'https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=400&h=500&fit=crop&q=80', colors: ['#1C1C1E', '#E3D0B9', '#F5F5DC'] },
  { id: 120, name: 'iPhone 16 Pro Max', storageOptions: ['256GB', '512GB', '1TB'], image: 'https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=400&h=500&fit=crop&q=80', colors: ['#1C1C1E', '#E3D0B9', '#F5F5DC'] },
  // iPhone 17 Series
  { id: 121, name: 'iPhone 17', storageOptions: ['256GB'], image: 'https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=400&h=500&fit=crop&q=80', colors: ['#1C1C1E', '#F5F5DC'] },
  { id: 122, name: 'iPhone Air', storageOptions: ['256GB'], image: 'https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=400&h=500&fit=crop&q=80', colors: ['#1C1C1E', '#F5F5DC', '#87CEEB'] },
  { id: 123, name: 'iPhone 17 Pro', storageOptions: ['256GB', '512GB', '1TB'], image: 'https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=400&h=500&fit=crop&q=80', colors: ['#1C1C1E', '#4A4A4A', '#F5F5DC'] },
  { id: 124, name: 'iPhone 17 Pro Max', storageOptions: ['256GB', '512GB', '1TB', '2TB'], image: 'https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=400&h=500&fit=crop&q=80', colors: ['#1C1C1E', '#4A4A4A', '#F5F5DC'] },
]

// Product data - Nuevos iPhones
const nuevos = [
  { id: 201, name: 'iPhone 14', storageOptions: ['128GB'], image: 'https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=400&h=500&fit=crop&q=80', colors: ['#000000', '#E3D0B9', '#F28B82'] },
  { id: 202, name: 'iPhone 15', storageOptions: ['128GB'], image: 'https://images.unsplash.com/photo-1696446702183-cbd13d78e1e7?w=400&h=500&fit=crop&q=80', colors: ['#000000', '#F28B82', '#AECBFA'] },
  { id: 203, name: 'iPhone 16', storageOptions: ['128GB'], image: 'https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=400&h=500&fit=crop&q=80', colors: ['#000000', '#AECBFA', '#F5F5DC'] },
  { id: 204, name: 'iPhone 17', storageOptions: ['256GB'], image: 'https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=400&h=500&fit=crop&q=80', colors: ['#1C1C1E', '#F5F5DC'] },
  { id: 205, name: 'iPhone Air', storageOptions: ['256GB'], image: 'https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=400&h=500&fit=crop&q=80', colors: ['#1C1C1E', '#F5F5DC', '#87CEEB'] },
  { id: 206, name: 'iPhone 17 Pro', storageOptions: ['256GB', '512GB'], image: 'https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=400&h=500&fit=crop&q=80', colors: ['#1C1C1E', '#4A4A4A', '#F5F5DC'] },
  { id: 207, name: 'iPhone 17 Pro Max', storageOptions: ['256GB', '512GB', '1TB', '2TB'], image: 'https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=400&h=500&fit=crop&q=80', colors: ['#1C1C1E', '#4A4A4A', '#F5F5DC'] },
]

// Product data - iPads Nuevas
const ipads = [
  { id: 301, name: 'iPad A16 128GB', storageOptions: ['128GB'], image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=500&fit=crop&q=80', colors: ['#C0C0C0', '#87CEEB', '#FFD700'] },
  { id: 302, name: 'iPad A16 256GB', storageOptions: ['256GB'], image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=500&fit=crop&q=80', colors: ['#C0C0C0', '#87CEEB', '#FFD700'] },
  { id: 303, name: 'iPad Air 11" M3', storageOptions: ['128GB', '256GB'], image: 'https://images.unsplash.com/photo-1587033411391-5d9e51cce126?w=400&h=500&fit=crop&q=80', colors: ['#C0C0C0', '#4A4A4A', '#E8D0AA'] },
  { id: 304, name: 'iPad Air 13" M3', storageOptions: ['128GB', '256GB'], image: 'https://images.unsplash.com/photo-1587033411391-5d9e51cce126?w=400&h=500&fit=crop&q=80', colors: ['#C0C0C0', '#4A4A4A', '#E8D0AA'] },
  { id: 305, name: 'iPad Pro 11"', storageOptions: ['256GB', '512GB', '1TB'], image: 'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=400&h=500&fit=crop&q=80', colors: ['#C0C0C0', '#1C1C1E'] },
  { id: 306, name: 'iPad Pro 13"', storageOptions: ['256GB', '512GB', '1TB'], image: 'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=400&h=500&fit=crop&q=80', colors: ['#C0C0C0', '#1C1C1E'] },
]

// Product data - MacBook
const macbooks = [
  { id: 401, name: 'MacBook Air 13" M4', storageOptions: ['256GB/16GB'], image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=500&fit=crop&q=80', colors: ['#C0C0C0', '#4A4A4A', '#E8D0AA', '#1C1C1E'] },
]

// Product data - AirPods
const airpods = [
  { id: 501, name: 'AirPods 4', storageOptions: [], image: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=400&h=500&fit=crop&q=80', colors: ['#FFFFFF'] },
  { id: 502, name: 'AirPods 4 ANC', storageOptions: [], image: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=400&h=500&fit=crop&q=80', colors: ['#FFFFFF'] },
  { id: 503, name: 'AirPods Pro 2', storageOptions: [], image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400&h=500&fit=crop&q=80', colors: ['#FFFFFF'] },
  { id: 504, name: 'AirPods Pro 3', storageOptions: [], image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400&h=500&fit=crop&q=80', colors: ['#FFFFFF'] },
]

// Product data - Apple Watch
const appleWatches = [
  { id: 601, name: 'Apple Watch SE2', storageOptions: ['42mm', '46mm'], image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&h=500&fit=crop&q=80', colors: ['#C0C0C0', '#1C1C1E', '#E8D0AA'] },
  { id: 602, name: 'Apple Watch SE3', storageOptions: ['42mm', '46mm'], image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&h=500&fit=crop&q=80', colors: ['#C0C0C0', '#1C1C1E', '#E8D0AA'] },
  { id: 603, name: 'Apple Watch Series 10', storageOptions: ['42mm', '46mm'], image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&h=500&fit=crop&q=80', colors: ['#C0C0C0', '#1C1C1E', '#E8D0AA'] },
  { id: 604, name: 'Apple Watch Series 11', storageOptions: ['42mm', '46mm'], image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&h=500&fit=crop&q=80', colors: ['#C0C0C0', '#1C1C1E', '#4A4A4A'] },
  { id: 605, name: 'Apple Watch Ultra 2', storageOptions: ['49mm'], image: 'https://images.unsplash.com/photo-1694618432450-44056bd70e87?w=400&h=500&fit=crop&q=80', colors: ['#E8D0AA', '#1C1C1E'] },
  { id: 606, name: 'Apple Watch Ultra 3', storageOptions: ['49mm'], image: 'https://images.unsplash.com/photo-1694618432450-44056bd70e87?w=400&h=500&fit=crop&q=80', colors: ['#E8D0AA', '#1C1C1E'] },
]

// Product data - Accesorios
const accesorios = [
  { id: 701, name: 'Apple Pencil USB-C', storageOptions: [], image: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400&h=500&fit=crop&q=80', colors: ['#FFFFFF'] },
  { id: 702, name: 'Apple Pencil Pro', storageOptions: [], image: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400&h=500&fit=crop&q=80', colors: ['#FFFFFF'] },
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
  color_images?: Record<string, string[] | string>
  storageOptions: string[]
  badge: string | null
  available: string[]
  price?: string
  oldPrice?: string
  description?: string
  sort_order?: number
  model_3d?: string
  variants?: { id: number; product_id: number; storage: string; color: string; price: string; sort_order: number; active: boolean }[]
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

const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  { id: 13, title: '', subtitle: '', image: '/images/hero-iphone18-poster.jpg', video_url: '/videos/iphone18-pro-overview.mp4', link: '', active: true, sort_order: 0 },
  { id: 12, title: '', subtitle: '', image: '/images/hero-macbook-neo-poster.jpg', video_url: '/videos/macbook-neo-intro.mp4', link: '', active: true, sort_order: 1 },
]

// Light 540p encodes for small screens, slow networks and Save-Data
const LIGHT_HERO_VIDEOS = new Set(['/videos/iphone18-pro-overview.mp4', '/videos/macbook-neo-intro.mp4'])

function prefersLightVideo() {
  if (typeof navigator === 'undefined') return false
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } }).connection
  if (conn?.saveData) return true
  if (conn?.effectiveType && /(^|-)2g$/.test(conn.effectiveType)) return true
  return typeof window !== 'undefined' && window.innerWidth <= 768
}

function heroVideoSrc(url: string, light: boolean) {
  return light && LIGHT_HERO_VIDEOS.has(url) ? url.replace(/\.mp4$/, '-540p.mp4') : url
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
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({})
  const lastProgressRef = useRef(Date.now())
  const [lightVideo] = useState(prefersLightVideo)

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

  // Restart the current video from the top and keep the others paused
  useEffect(() => {
    setVideoPlaying(false)
    lastProgressRef.current = Date.now()
    Object.entries(videoRefs.current).forEach(([index, el]) => {
      if (!el) return
      if (Number(index) === current) {
        el.currentTime = 0
        el.play()?.catch(() => {})
      } else if (!el.paused) {
        el.pause()
      }
    })
  }, [current])

  // Timer: videos play in full, 13s per image slide, never gets stuck
  useEffect(() => {
    if (isPaused || slides.length <= 1) return
    const currentSlide = slides[current]
    const hasVideo = currentSlide?.video_url && isVideoUrl(currentSlide.video_url)
    if (hasVideo) {
      if (!videoPlaying) {
        // Still buffering: the poster is on screen, so give it room before giving up
        timerRef.current = setTimeout(goNext, 15000)
        return () => { if (timerRef.current) clearTimeout(timerRef.current) }
      }
      // Playing: advance on 'ended'. Watchdog retries a stalled video, then moves on
      const watchdog = setInterval(() => {
        const stalledFor = Date.now() - lastProgressRef.current
        if (stalledFor > 10000) {
          goNext()
        } else if (stalledFor > 4000) {
          videoRefs.current[current]?.play()?.catch(() => {})
        }
      }, 2000)
      return () => clearInterval(watchdog)
    }
    // 13s per image slide
    timerRef.current = setTimeout(goNext, 13000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [goNext, isPaused, slides.length, current, videoPlaying, slides])

  if (slides.length === 0) return null

  return (
    <section 
      className="relative w-full overflow-hidden bg-black"
      style={{ height: 'clamp(220px, 56vw, 80vh)' }}
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
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={i === 0 ? 'high' : 'auto'}
              className={`absolute inset-0 w-full h-full object-cover ${i === current ? 'animate-ken-burns' : ''}`}
              onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/1200x600/0f172a/3b82f6/png?text=${encodeURIComponent(slide.title)}` }}
            />
          )}
          {/* Native MP4 video - optimized loading */}
          {slide.video_url && isVideoUrl(slide.video_url) && (
            <div className="absolute inset-0" style={{ overflow: 'hidden' }}>
              <video
                key={`video-${slide.id}`}
                ref={(el) => { videoRefs.current[i] = el }}
                src={i === current || i === (current + 1) % slides.length ? heroVideoSrc(slide.video_url, lightVideo) : undefined}
                poster={slide.image || undefined}
                autoPlay={i === current}
                loop={slides.length <= 1}
                muted
                playsInline
                preload={i === current || i === (current + 1) % slides.length ? 'auto' : 'none'}
                onPlaying={i === current ? () => { setVideoPlaying(true); lastProgressRef.current = Date.now() } : undefined}
                onTimeUpdate={i === current ? () => { lastProgressRef.current = Date.now() } : undefined}
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
          {/* Gradient overlays - minimal for video, dramatic for images */}
          {slide.video_url && (isVideoUrl(slide.video_url) || getYouTubeEmbedUrl(slide.video_url)) ? (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
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
                    <h1 className="animate-hero-title text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 leading-[0.95] drop-shadow-[0_2px_20px_rgba(0,0,0,0.5)]" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '3px' }}>
                      {slide.title}
                    </h1>
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



      {/* Bottom fade gradient for smooth transition to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-16 md:h-24 z-20 pointer-events-none hero-bottom-fade" style={{ background: 'linear-gradient(to bottom, transparent, #030712)' }} />

    </section>
  )
}

function Store({ onAdminClick, productSlug, productId, initialProduct, isDarkMode, setIsDarkMode }: { onAdminClick: () => void; productSlug?: string; productId?: string; initialProduct?: Product; isDarkMode: boolean; setIsDarkMode: (v: boolean) => void }) {
  const navigate = useNavigate()
  const city = 'duitama' as City
  const socials = CITY_SOCIALS[city]
  const pickupAddress = CITY_ADDRESSES[city]
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
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(DEFAULT_HERO_SLIDES)
  const [marqueeTexts, setMarqueeTexts] = useState<string[]>([])
  
  // API-loaded data with fallback to static
  const [apiProducts, setApiProducts] = useState<Product[]>(products)
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([])
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([])
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [modelBubbles, setModelBubbles] = useState<{id: string; label: string; image: string}[]>([
    { id: 'todos', label: 'Todos', image: BUBBLE_FALLBACK_IMAGES['todos'] },
    { id: 'iphones', label: 'iPhones', image: BUBBLE_FALLBACK_IMAGES['iphones'] },
    { id: 'ipads', label: 'iPads', image: BUBBLE_FALLBACK_IMAGES['ipads'] },
    { id: 'macbook', label: 'MacBook', image: BUBBLE_FALLBACK_IMAGES['macbook'] },
    { id: 'airpods', label: 'AirPods', image: BUBBLE_FALLBACK_IMAGES['airpods'] },
    { id: 'apple watch', label: 'Apple Watch', image: BUBBLE_FALLBACK_IMAGES['apple watch'] },
    { id: 'accesorios', label: 'Accesorios', image: BUBBLE_FALLBACK_IMAGES['accesorios'] },
  ])
  const [apiRepairServices, setApiRepairServices] = useState(repairServices)

  const [whatsappMenuOpen, setWhatsappMenuOpen] = useState(false)
  const [whatsappCityModal, setWhatsappCityModal] = useState(false)
  const [selectedStorage, setSelectedStorage] = useState<string>('')
  const [selectedColor, setSelectedColor] = useState<string>('')
  // Track which product ID we already scrolled to top for, to avoid repeated scroll-to-top
  const scrolledForProductId = useRef<number | null>(null)

  // Compute matched variant price using useMemo for instant, reliable updates on ALL devices
  const matchedVariant = useMemo(() => {
    if (!selectedProduct || selectedProduct.condition === 'Semi-usado') return null
    const variants = selectedProduct.variants || []
    if (variants.length === 0) return null
    const selStorageLower = (selectedStorage || '').toLowerCase().trim()
    const selColorLower = (selectedColor || '').toLowerCase().trim()
    // Helper: check if storage values match (exact OR one contains the other)
    const storageMatch = (variantStorage: string, selectedStor: string): boolean => {
      if (!variantStorage && !selectedStor) return true
      if (!variantStorage || !selectedStor) return false
      const vs = variantStorage.toLowerCase().trim()
      const ss = selectedStor.toLowerCase().trim()
      return vs === ss || vs.includes(ss) || ss.includes(vs)
    }
    // Helper: check if color values match (case-insensitive)
    const colorMatch = (variantColor: string, selectedCol: string): boolean => {
      if (!variantColor && !selectedCol) return true
      if (!variantColor || !selectedCol) return false
      return variantColor.toLowerCase().trim() === selectedCol.toLowerCase().trim()
    }
    // Try exact match (both storage + color)
    return variants.find(v =>
      storageMatch(v.storage || '', selStorageLower) &&
      colorMatch(v.color || '', selColorLower)
    ) ||
    // Fallback: match storage only (variant has no color)
    variants.find(v =>
      storageMatch(v.storage || '', selStorageLower) && !v.color
    ) ||
    // Fallback: match color only (variant has no storage)
    variants.find(v =>
      colorMatch(v.color || '', selColorLower) && !v.storage
    ) || null
  }, [selectedProduct, selectedStorage, selectedColor])

  // Compute which colors are available for the selected storage
  const colorsForSelectedStorage = useMemo(() => {
    if (!selectedProduct || selectedProduct.condition === 'Semi-usado') return [] as string[]
    const variants = (selectedProduct.variants || []).filter(v => v.active && v.price)
    if (variants.length === 0) return selectedProduct.colors
    const selStorageLower = (selectedStorage || '').toLowerCase().trim()
    if (!selStorageLower) return selectedProduct.colors
    const colors: string[] = []
    for (const v of variants) {
      if (!v.storage) continue
      const vs = v.storage.toLowerCase().trim()
      const storageMatches = vs === selStorageLower || vs.includes(selStorageLower) || selStorageLower.includes(vs)
      if (storageMatches && v.color) {
        const vc = v.color.toLowerCase().trim()
        const match = selectedProduct.colors.find(c => c.toLowerCase().trim() === vc)
        if (match && !colors.includes(match)) colors.push(match)
      }
    }
    return colors.length > 0 ? colors : selectedProduct.colors
  }, [selectedProduct, selectedStorage])

  // Auto-select first available color when storage changes and current color isn't available
  useEffect(() => {
    if (!selectedProduct || selectedProduct.condition === 'Semi-usado') return
    const variants = (selectedProduct.variants || []).filter(v => v.active && v.price)
    if (variants.length === 0 || colorsForSelectedStorage.length === 0) return
    if (selectedColor && !colorsForSelectedStorage.includes(selectedColor)) {
      setSelectedColor(colorsForSelectedStorage[0])
    }
  }, [colorsForSelectedStorage, selectedColor, selectedProduct])

  // Trending carousel refs
  const trendingTrackRef = useRef<HTMLDivElement>(null)
  const trendingAnimId = useRef<number>(0)
  const trendingOffset = useRef(0)
  const trendingDragging = useRef(false)
  const trendingDragStartX = useRef(0)
  const trendingDragOffsetStart = useRef(0)
  const trendingHalfWidth = useRef(0)
  const trendingClickBlocked = useRef(false)

  // Reset selected storage/color when product changes — for new products with variants, pre-select cheapest variant
  useEffect(() => {
    if (selectedProduct) {
      const variants = selectedProduct.variants || []
      if (variants.length > 0 && selectedProduct.condition !== 'Semi-usado') {
        // Parse price string to number for comparison (e.g. "5.650.000" → 5650000)
        const parsePrice = (p: string) => parseInt((p || '0').replace(/\./g, '').replace(/[^\d]/g, ''), 10) || 0
        const cheapest = [...variants].filter(v => v.active && v.price).sort((a, b) => parsePrice(a.price) - parsePrice(b.price))[0]
        if (cheapest) {
          const cStorage = (cheapest.storage || '').toLowerCase().trim()
          const cColor = (cheapest.color || '').toLowerCase().trim()
          // Use contains matching for storage (e.g. variant "256GB" matches product "8 GB RAM 256GB")
          const matchedStorage = selectedProduct.storageOptions.find(s => {
            const sl = s.toLowerCase().trim()
            return sl === cStorage || sl.includes(cStorage) || cStorage.includes(sl)
          }) || cheapest.storage || selectedProduct.storageOptions[0] || ''
          // Use case-insensitive matching for color
          const matchedColor = selectedProduct.colors.find(c => c.toLowerCase().trim() === cColor) || cheapest.color || selectedProduct.colors[0] || ''
          setSelectedStorage(matchedStorage)
          setSelectedColor(matchedColor)
        } else {
          setSelectedStorage(selectedProduct.storageOptions[0] || '')
          setSelectedColor(selectedProduct.colors[0] || '')
        }
      } else {
        setSelectedStorage(selectedProduct.storageOptions[0] || '')
        setSelectedColor(selectedProduct.colors[0] || '')
      }
    }
  }, [selectedProduct])

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
          const mapped = productsRes.products.map((p: Record<string, unknown>) => ({
            id: p.id as number,
            name: p.name as string,
            category: (p.category as string) || '',
            condition: p.condition as string,
            image: resolveImageUrl(p.image as string),
            images: ((p.images as string[]) || []).map(resolveImageUrl),
            colors: p.colors as string[],
            color_images: (() => { const ci = (p.color_images as Record<string, string[] | string>) || {}; const resolved: Record<string, string[]> = {}; for (const [k, v] of Object.entries(ci)) { resolved[k] = (Array.isArray(v) ? v : v ? [v] : []).map(resolveImageUrl); } return resolved; })(),
            storageOptions: p.storage_options as string[],
            badge: (p.badge as string) || ((p.condition as string) === 'Nuevo' ? 'Nuevo' : null),
            available: p.available as string[],
            price: (p.price as string) || '',
            oldPrice: (p.old_price as string) || '',
            description: (p.description as string) || '',
            variants: (p.variants as { id: number; product_id: number; storage: string; color: string; price: string; sort_order: number; active: boolean }[]) || [],
          }))
          setApiProducts(mapped)
          preloadImages(mapped.map(p => p.image))
        }
        if (recommendedRes?.products) {
          const mapped = recommendedRes.products.map((p: Record<string, unknown>) => ({
            id: p.id as number, name: p.name as string, category: (p.category as string) || '',
            condition: p.condition as string,
            image: resolveImageUrl(p.image as string), images: ((p.images as string[]) || []).map(resolveImageUrl), colors: p.colors as string[],
            color_images: (() => { const ci = (p.color_images as Record<string, string[] | string>) || {}; const resolved: Record<string, string[]> = {}; for (const [k, v] of Object.entries(ci)) { resolved[k] = (Array.isArray(v) ? v : v ? [v] : []).map(resolveImageUrl); } return resolved; })(),
            storageOptions: p.storage_options as string[],
            badge: (p.badge as string) || ((p.condition as string) === 'Nuevo' ? 'Nuevo' : null), available: p.available as string[],
            price: (p.price as string) || '', oldPrice: (p.old_price as string) || '', description: (p.description as string) || '',
            variants: (p.variants as { id: number; product_id: number; storage: string; color: string; price: string; sort_order: number; active: boolean }[]) || [],
          }))
          setRecommendedProducts(mapped)
          preloadImages(mapped.map(p => p.image))
        }
        if (trendingRes?.products) {
          const mapped = trendingRes.products.map((p: Record<string, unknown>) => ({
            id: p.id as number, name: p.name as string, category: (p.category as string) || '',
            condition: p.condition as string,
            image: resolveImageUrl(p.image as string), images: ((p.images as string[]) || []).map(resolveImageUrl), colors: p.colors as string[],
            color_images: (() => { const ci = (p.color_images as Record<string, string[] | string>) || {}; const resolved: Record<string, string[]> = {}; for (const [k, v] of Object.entries(ci)) { resolved[k] = (Array.isArray(v) ? v : v ? [v] : []).map(resolveImageUrl); } return resolved; })(),
            storageOptions: p.storage_options as string[],
            badge: (p.badge as string) || ((p.condition as string) === 'Nuevo' ? 'Nuevo' : null), available: p.available as string[],
            price: (p.price as string) || '', oldPrice: (p.old_price as string) || '', description: (p.description as string) || '',
            variants: (p.variants as { id: number; product_id: number; storage: string; color: string; price: string; sort_order: number; active: boolean }[]) || [],
          }))
          setTrendingProducts(mapped)
          preloadImages(mapped.map(p => p.image))
        }
        if (bubblesRes?.bubbles) {
          const apiBubbles = bubblesRes.bubbles.map((b: Record<string, unknown>) => ({
            id: b.model_id as string, label: b.label as string, image: resolveImageUrl(b.image as string),
          }))
          setModelBubbles(apiBubbles)
          preloadImages(apiBubbles.map(b => b.image))
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
        if (slidesRes?.slides?.length) {
          // Only add image-only banners from API (video slides use hardcoded defaults)
          const apiBanners = slidesRes.slides
            .filter((s: HeroSlide) => s.active && s.image && !s.video_url)
            .map((s: HeroSlide) => ({ ...s, title: '', subtitle: '', link: '' }))
          if (apiBanners.length) {
            setHeroSlides(prev => [...prev, ...apiBanners].sort((a, b) => a.sort_order - b.sort_order))
          }
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

  // Trending carousel auto-scroll with translateX (time-based for consistent speed)
  useEffect(() => {
    const track = trendingTrackRef.current
    if (!track || trendingProducts.length === 0) return
    let running = true
    let lastTime = 0
    const TRENDING_PX_PER_SEC = 30 // pixels per second
    // Measure half width after render
    const measure = () => {
      if (track.scrollWidth > 0) {
        trendingHalfWidth.current = track.scrollWidth / 2
      }
    }
    measure()
    // Re-measure after images load
    const timer = setTimeout(measure, 1000)
    const animate = (now: number) => {
      if (!running) return
      if (lastTime === 0) lastTime = now
      const delta = (now - lastTime) / 1000
      lastTime = now
      if (!trendingDragging.current && trendingHalfWidth.current > 0) {
        trendingOffset.current += TRENDING_PX_PER_SEC * delta
        if (trendingOffset.current >= trendingHalfWidth.current) {
          trendingOffset.current -= trendingHalfWidth.current
        }
        track.style.transform = `translateX(-${trendingOffset.current}px)`
      }
      trendingAnimId.current = requestAnimationFrame(animate)
    }
    trendingAnimId.current = requestAnimationFrame(animate)
    return () => { running = false; cancelAnimationFrame(trendingAnimId.current); clearTimeout(timer) }
  }, [trendingProducts])

  // Bubbles marquee refs
  const bubblesTrackRef = useRef<HTMLDivElement>(null)
  const bubblesOffsetRef = useRef(0)
  const bubblesDragRef = useRef<{ active: boolean; startX: number; startOffset: number; moved: boolean }>({ active: false, startX: 0, startOffset: 0, moved: false })
  const bubblesRafRef = useRef<number>(0)
  const BUBBLES_PX_PER_SEC = 60 // pixels per second (time-based, consistent across all refresh rates)

  useEffect(() => {
    if (modelBubbles.length === 0) return
    let running = true
    let lastTime = 0
    const tick = (now: number) => {
      if (!running) return
      if (lastTime === 0) lastTime = now
      const delta = (now - lastTime) / 1000 // seconds since last frame
      lastTime = now
      const track = bubblesTrackRef.current
      if (track) {
        const singleWidth = track.scrollWidth / 3
        if (!bubblesDragRef.current.active) {
          bubblesOffsetRef.current -= BUBBLES_PX_PER_SEC * delta
        }
        if (bubblesOffsetRef.current <= -singleWidth) bubblesOffsetRef.current += singleWidth
        if (bubblesOffsetRef.current > 0) bubblesOffsetRef.current -= singleWidth
        track.style.transform = `translateX(${bubblesOffsetRef.current}px)`
      }
      bubblesRafRef.current = requestAnimationFrame(tick)
    }
    bubblesRafRef.current = requestAnimationFrame(tick)
    return () => { running = false; cancelAnimationFrame(bubblesRafRef.current) }
  }, [modelBubbles])

  const onBubblesPointerDown = useCallback((e: React.PointerEvent) => {
    bubblesDragRef.current = { active: true, startX: e.clientX, startOffset: bubblesOffsetRef.current, moved: false }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [])
  const onBubblesPointerMove = useCallback((e: React.PointerEvent) => {
    if (!bubblesDragRef.current.active) return
    const dx = e.clientX - bubblesDragRef.current.startX
    if (Math.abs(dx) > 3) bubblesDragRef.current.moved = true
    bubblesOffsetRef.current = bubblesDragRef.current.startOffset + dx
  }, [])
  const onBubblesPointerUp = useCallback(() => { bubblesDragRef.current.active = false; setTimeout(() => { bubblesDragRef.current.moved = false }, 0) }, [])

  const onTrendingPointerDown = useCallback((e: React.PointerEvent) => {
    trendingDragging.current = true
    trendingClickBlocked.current = false
    trendingDragStartX.current = e.clientX
    trendingDragOffsetStart.current = trendingOffset.current
  }, [])

  const onTrendingPointerMove = useCallback((e: React.PointerEvent) => {
    if (!trendingDragging.current) return
    const dx = e.clientX - trendingDragStartX.current
    if (Math.abs(dx) > 5) trendingClickBlocked.current = true
    let newOffset = trendingDragOffsetStart.current - dx
    const half = trendingHalfWidth.current
    if (half > 0) {
      while (newOffset < 0) newOffset += half
      while (newOffset >= half) newOffset -= half
    }
    trendingOffset.current = newOffset
    if (trendingTrackRef.current) {
      trendingTrackRef.current.style.transform = `translateX(-${newOffset}px)`
    }
  }, [])

  const onTrendingPointerUp = useCallback(() => {
    trendingDragging.current = false
  }, [])

  const scrollToTop = useCallback(() => {
    // iOS Safari sometimes ignores smooth scrolling after route/state changes
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [])

  // Helper to build a Product from API response data — MUST be defined before selectProduct
  const buildProductFromApi = useCallback((data: Record<string, unknown>): Product => {
    const ciRaw = (data.color_images as Record<string, string[] | string>) || {}
    const ciResolved: Record<string, string[]> = {}
    for (const [k, v] of Object.entries(ciRaw)) { ciResolved[k] = (Array.isArray(v) ? v : v ? [v] : []).map(resolveImageUrl) }
    const variants = (data.variants as Product['variants']) || []
    let storageOpts = (data.storage_options as string[]) || []
    // If storageOptions is empty but variants exist, extract unique storage values from variants
    if (storageOpts.length === 0 && variants.length > 0) {
      const seen = new Set<string>()
      variants.forEach(v => { if (v.storage && v.active !== false) { const s = v.storage.trim(); if (s && !seen.has(s)) { seen.add(s); storageOpts.push(s) } } })
    }
    // Same for colors: if empty but variants have colors, extract them
    let colors = (data.colors as string[]) || []
    if (colors.length === 0 && variants.length > 0) {
      const seen = new Set<string>()
      variants.forEach(v => { if (v.color) { const c = v.color.trim(); if (c && !seen.has(c.toLowerCase())) { seen.add(c.toLowerCase()); colors.push(c) } } })
    }
    return {
      id: data.id as number, name: data.name as string, slug: (data.slug as string) || '', category: (data.category as string) || '',
      condition: data.condition as string, image: resolveImageUrl(data.image as string), images: ((data.images as string[]) || []).map(resolveImageUrl),
      colors, color_images: ciResolved, storageOptions: storageOpts,
      badge: (data.badge as string) || ((data.condition as string) === 'Nuevo' ? 'Nuevo' : null), available: data.available as string[],
      price: (data.price as string) || '', oldPrice: (data.old_price as string) || '', description: (data.description as string) || '',
      model_3d: (data.model_3d as string) || '',
      variants,
    }
  }, [])

  // Navigate to product URL and select product
  // CRITICAL: If the product has no variants, fetch the full product from API to get them
  const selectProduct = useCallback((product: Product) => {
    scrolledForProductId.current = product.id
    scrollToTop()
    setSelectedProduct(product)
    setGalleryIndex(0)
    const slug = getProductSlug(product)
    navigate(`/producto/${product.id}/${slug}`, { state: { product } })
    // Always fetch full product data from API to ensure we have variants + color_images
    fetch(`${API_URL}/api/products/${product.id}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          const fullProduct = buildProductFromApi(data)
          // Only update if the user is still viewing this same product
          // and only if the API data has more info than what we already have
          setSelectedProduct(prev => {
            if (!prev || prev.id !== fullProduct.id) return prev // user navigated away
            // Merge: keep the current product but add any missing data from API
            const hasMoreVariants = (fullProduct.variants || []).length > (prev.variants || []).length
            const hasMoreColorImages = Object.keys(fullProduct.color_images || {}).length > Object.keys(prev.color_images || {}).length
            const hasMoreStorage = (fullProduct.storageOptions || []).length > (prev.storageOptions || []).length
            const hasMoreColors = (fullProduct.colors || []).length > (prev.colors || []).length
            if (hasMoreVariants || hasMoreColorImages || hasMoreStorage || hasMoreColors) {
              return { ...prev, variants: fullProduct.variants || prev.variants, color_images: fullProduct.color_images || prev.color_images, storageOptions: fullProduct.storageOptions.length > 0 ? fullProduct.storageOptions : prev.storageOptions, colors: fullProduct.colors.length > 0 ? fullProduct.colors : prev.colors }
            }
            return prev // no new data, don't trigger re-render
          })
        }
      })
      .catch(() => { /* API unavailable, use product as-is */ })
  }, [navigate, scrollToTop, buildProductFromApi])

  // Clear product selection and go back to home
  const clearProduct = useCallback(() => {
    scrolledForProductId.current = null
    setSelectedProduct(null)
    setGalleryIndex(0)
    setZoomOpen(false)
    setShow3DView(false)
    navigate('/')
  }, [navigate])

  // Load product from URL (for direct links / sharing)
  // CRITICAL: Always fetch from API to ensure variants are loaded (static/cached data may lack variants)
  useEffect(() => {
    if (!productSlug && !productId) {
      if (selectedProduct) {
        setSelectedProduct(null)
        setGalleryIndex(0)
      }
      return
    }

    const pid = productId || null
    const pslug = productSlug || null

    // Only scroll to top if we haven't already scrolled for this product
    const shouldScroll = (id: number) => {
      if (scrolledForProductId.current === id) return false
      scrolledForProductId.current = id
      return true
    }

    // Fetch the full product from the API to ensure variants + color_images are included
    const fetchFullProduct = async () => {
      try {
        const url = pid
          ? `${API_URL}/api/products/${pid}`
          : `${API_URL}/api/products/by-slug/${pslug}`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          const product = buildProductFromApi(data)
          // Use functional update to avoid resetting user's color/storage selection
          setSelectedProduct(prev => {
            if (prev && prev.id === product.id) {
              // Product already loaded — merge API data without replacing (preserves user selections)
              return { ...prev, ...product, color_images: { ...(prev.color_images || {}), ...(product.color_images || {}) }, storageOptions: product.storageOptions.length > 0 ? product.storageOptions : prev.storageOptions, colors: product.colors.length > 0 ? product.colors : prev.colors }
            }
            // First load — set the full product
            return product
          })
          if (!scrolledForProductId.current || scrolledForProductId.current !== product.id) {
            setGalleryIndex(0)
          }
          if (shouldScroll(product.id)) scrollToTop()
        }
      } catch {
        // API failed — try to use local data as fallback
      }
    }

    // If we already have this product selected and fully loaded, no need to re-fetch.
    // A product is "fully loaded" if its ID matches AND it came from the API (has color_images resolved or variants loaded).
    if (selectedProduct && pid && String(selectedProduct.id) === pid) {
      // Already have this product — but if it has NO variants, we should still fetch to get them
      const hasVariants = (selectedProduct.variants || []).length > 0
      if (hasVariants) return
      // Product exists but missing variants — fetch full data from API
      fetchFullProduct()
      return
    }

    // Try to find in already-loaded apiProducts (which include color_images and variants from API)
    const found = pid
      ? apiProducts.find(p => String(p.id) === pid)
      : apiProducts.find(p => getProductSlug(p) === pslug)

    if (found) {
      // Found locally — use it directly (it already has color_images + variants from the list API)
      setSelectedProduct(found)
      setGalleryIndex(0)
      if (shouldScroll(found.id)) scrollToTop()
      // Still fetch from API in background to get any extra data (e.g. model_3d)
      fetchFullProduct()
      return
    }

    // Not found locally — fetch from API
    fetchFullProduct()
  }, [productSlug, productId, apiProducts, scrollToTop, buildProductFromApi])

  const cityName = 'Duitama'

  // Update page title and meta tags for SEO + Open Graph
  useEffect(() => {
    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.querySelector(selector)
      if (!el) {
        el = document.createElement('meta')
        const isProperty = attr === 'content' && selector.includes('property=')
        if (isProperty) {
          const propMatch = selector.match(/property="([^"]+)"/)
          if (propMatch) el.setAttribute('property', propMatch[1])
        } else if (selector.includes('name=')) {
          const nameMatch = selector.match(/name="([^"]+)"/)
          if (nameMatch) el.setAttribute('name', nameMatch[1])
        }
        document.head.appendChild(el)
      }
      el.setAttribute(attr, value)
    }

    if (selectedProduct) {
      const productUrl = `https://gordotech.co/producto/${selectedProduct.id}/${getProductSlug(selectedProduct)}`
      const priceText = selectedProduct.price && selectedProduct.price !== '-' ? ` - $${selectedProduct.price}` : ''
      const storageText = selectedProduct.storageOptions?.length ? ` ${selectedProduct.storageOptions[0]}` : ''
      const titleText = `${selectedProduct.name}${storageText}${priceText} - Gordotech`
      const descText = `${selectedProduct.name} (${displayCondition(selectedProduct.condition)})${storageText}${priceText}. Disponible en Gordotech ${cityName}. Envios a toda Colombia.`
      // Ensure absolute URL for image
      const imageUrl = selectedProduct.image.startsWith('http') ? selectedProduct.image : `https://gordotech.co${selectedProduct.image}`

      document.title = titleText
      setMeta('meta[name="description"]', 'content', descText)
      setMeta('meta[name="keywords"]', 'content', `${selectedProduct.name} Duitama, ${selectedProduct.name} Tunja, ${selectedProduct.name} Paipa, ${selectedProduct.name} Sogamoso, ${selectedProduct.name} Boyaca, comprar ${selectedProduct.name} Duitama, comprar ${selectedProduct.name} Tunja, ${selectedProduct.name} precio Colombia, ${selectedProduct.name} semi-nuevo, ${selectedProduct.name} nuevo, ${selectedProduct.name} garantia, Gordotech`)
      // Open Graph
      setMeta('meta[property="og:title"]', 'content', titleText)
      setMeta('meta[property="og:description"]', 'content', descText)
      setMeta('meta[property="og:image"]', 'content', imageUrl)
      setMeta('meta[property="og:url"]', 'content', productUrl)
      setMeta('meta[property="og:type"]', 'content', 'product')
      setMeta('meta[property="og:site_name"]', 'content', 'Gordotech')
      setMeta('meta[property="og:locale"]', 'content', 'es_CO')
      // Twitter Card
      setMeta('meta[name="twitter:card"]', 'content', 'summary_large_image')
      setMeta('meta[name="twitter:title"]', 'content', titleText)
      setMeta('meta[name="twitter:description"]', 'content', descText)
      setMeta('meta[name="twitter:image"]', 'content', imageUrl)
      // Canonical
      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement
      if (!canonical) {
        canonical = document.createElement('link')
        canonical.setAttribute('rel', 'canonical')
        document.head.appendChild(canonical)
      }
      canonical.setAttribute('href', productUrl)
    } else {
      const defaultTitle = 'Gordotech - iPhones, iPads, MacBooks y mas | Tu destino Apple en Boyaca'
      const defaultDesc = 'Gordotech - Tu destino Apple en Boyaca. iPhones nuevos y semi-nuevos, iPads, MacBooks, AirPods y Apple Watch al mejor precio. Envios a toda Colombia.'
      const defaultUrl = 'https://gordotech.co'
      const defaultImage = 'https://gordotech.co/images/og-preview.png'

      document.title = defaultTitle
      setMeta('meta[name="description"]', 'content', defaultDesc)
      setMeta('meta[name="keywords"]', 'content', 'iPhone Duitama, iPhone Tunja, iPhone Paipa, iPhone Sogamoso, iPhone Nobsa, iPhone Santa Rosa de Viterbo, iPhone Tibasosa, iPad Duitama, iPad Tunja, MacBook Duitama, MacBook Tunja, AirPods Duitama, AirPods Tunja, Apple Watch Duitama, Apple Watch Tunja, comprar iPhone Boyaca, tienda Apple Duitama, tienda Apple Tunja, tienda Apple Boyaca, Gordotech, celulares Duitama, celulares Tunja, celulares Paipa, celulares Sogamoso, tecnologia Boyaca')
      setMeta('meta[property="og:title"]', 'content', defaultTitle)
      setMeta('meta[property="og:description"]', 'content', defaultDesc)
      setMeta('meta[property="og:image"]', 'content', defaultImage)
      setMeta('meta[property="og:url"]', 'content', defaultUrl)
      setMeta('meta[property="og:type"]', 'content', 'website')
      setMeta('meta[property="og:site_name"]', 'content', 'Gordotech')
      setMeta('meta[property="og:locale"]', 'content', 'es_CO')
      setMeta('meta[name="twitter:card"]', 'content', 'summary_large_image')
      setMeta('meta[name="twitter:title"]', 'content', defaultTitle)
      setMeta('meta[name="twitter:description"]', 'content', defaultDesc)
      setMeta('meta[name="twitter:image"]', 'content', defaultImage)
      // Reset canonical
      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement
      if (!canonical) {
        canonical = document.createElement('link')
        canonical.setAttribute('rel', 'canonical')
        document.head.appendChild(canonical)
      }
      canonical.setAttribute('href', defaultUrl)
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
            image: resolveImageUrl(p.image as string), images: ((p.images as string[]) || []).map(resolveImageUrl), colors: p.colors as string[], storageOptions: p.storage_options as string[],
            badge: (p.badge as string) || ((p.condition as string) === 'Nuevo' ? 'Nuevo' : null), available: p.available as string[],
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
    <div className={`min-h-screen bg-gray-950 text-white ${!isDarkMode ? 'light-mode' : ''}`} style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header / Navbar */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-gray-950/95 backdrop-blur-lg shadow-lg shadow-black/20 border-b border-white/5' : 'bg-transparent'}`}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
          {/* Mobile header - logo centered */}
          <div className="flex md:hidden items-center justify-center h-16">
            <button onClick={() => { clearProduct(); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="flex items-center gap-2 cursor-pointer">
              <img src="/images/gordotech-icon-white.png" alt="Gordotech - Ir al inicio" className="h-10 gordotech-logo-invert" />
              <img src="/images/gordotech-text-logo.png" alt="Gordotech" className="h-7 gordotech-logo-invert" />
            </button>
          </div>

          {/* Desktop header - logo centered */}
          <div className="hidden md:flex items-center justify-center h-20">
            <button onClick={() => { clearProduct(); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="flex items-center gap-3 cursor-pointer">
              <img src="/images/gordotech-icon-white.png" alt="Gordotech - Ir al inicio" className="h-12 gordotech-logo-invert" />
              <img src="/images/gordotech-text-logo.png" alt="Gordotech" className="h-8 gordotech-logo-invert" />
            </button>
          </div>
        </div>
      </header>



      {/* Category Quick Links + Marquee - hidden on product detail */}
      {!selectedProduct && (
      <div className="pt-16 md:pt-20">
        <div className="bg-gray-900/80 border-b border-white/5">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
            <div className="flex items-center justify-between py-2.5 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => navigate('/categoria/iphones')}
                className="flex-1 py-1.5 text-xs sm:text-sm lg:text-base font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all whitespace-nowrap flex items-center justify-center gap-1.5"
              >
                <img src="/images/apple-logo-white.png" alt="Apple" className="h-3.5 w-3.5 sm:h-4 sm:w-4 object-contain opacity-80 apple-logo-invert" />
                Nuevos
              </button>
              <span className="text-gray-600 text-xs">|</span>
              <button
                onClick={() => navigate('/semi-nuevos')}
                className="flex-1 py-1.5 text-xs sm:text-sm lg:text-base font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all whitespace-nowrap text-center"
              >
                Seminuevos
              </button>
              <span className="text-gray-600 text-xs">|</span>
              <button
                onClick={() => navigate('/plan-retoma')}
                className="flex-1 py-1.5 text-xs sm:text-sm lg:text-base font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all whitespace-nowrap text-center"
              >
                Plan Retoma
              </button>
              <span className="text-gray-600 text-xs">|</span>
              <button
                onClick={() => navigate('/reparacion')}
                className="flex-1 py-1.5 text-xs sm:text-sm lg:text-base font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all whitespace-nowrap text-center"
              >
                Reparacion
              </button>
            </div>
          </div>
        </div>
        <AnimatedMarquee texts={marqueeTexts} />
      </div>
      )}

      {/* Hero Slideshow - hidden on product detail */}
      {!selectedProduct && <HeroSlideshow slides={heroSlides} />}

      {/* Main Content */}
      <main>

      {/* Model Bubbles - auto-scrolling marquee with drag */}
      {!selectedProduct && modelBubbles.length > 0 && (
      <ScrollReveal>
      <section className="py-8 md:py-14 border-y border-white/5">
        <div className="overflow-hidden">
          <div
            ref={bubblesTrackRef}
            className="flex items-start cursor-grab active:cursor-grabbing select-none"
            style={{ willChange: 'transform' }}
            onPointerDown={onBubblesPointerDown}
            onPointerMove={onBubblesPointerMove}
            onPointerUp={onBubblesPointerUp}
            onPointerCancel={onBubblesPointerUp}
          >
            {[...modelBubbles, ...modelBubbles, ...modelBubbles].map((model, idx) => {
              const isHovered = hoveredBubbleId === model.id
              return (
              <button
                key={`${model.id}-${idx}`}
                onClick={(e) => {
                  if (bubblesDragRef.current.moved) { e.preventDefault(); return }
                  setHoveredBubbleId(null)
                  setActiveModel(model.id)
                  navigate(`/categoria/${model.id}`)
                }}
                onMouseEnter={() => setHoveredBubbleId(model.id)}
                onMouseLeave={() => setHoveredBubbleId(null)}
                className="flex flex-col items-center gap-2.5 group cursor-pointer flex-shrink-0 mx-5 md:mx-8 lg:mx-10 touch-none"
              >
                <div className={`transition-all duration-300 ${
                  activeModel === model.id || isHovered ? 'rounded-2xl' : 'rounded-full'
                }`} style={{
                  padding: (activeModel === model.id || isHovered) ? '2px' : '0px',
                  backgroundColor: (activeModel === model.id || isHovered) ? '#3b82f6' : 'transparent',
                }}>
                  <div className={`w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 overflow-hidden transition-all duration-300 ${
                    activeModel === model.id || isHovered ? 'rounded-xl' : 'rounded-full'
                  }`}>
                    <img
                      src={model.image}
                      alt={model.label}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      className="w-full h-full object-cover transition-all duration-300"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement
                        const fallback = BUBBLE_FALLBACK_IMAGES[model.id] || BUBBLE_FALLBACK_IMAGES[model.id.toLowerCase()]
                        if (fallback && img.src !== fallback) {
                          img.src = fallback
                        } else {
                          img.src = `https://placehold.co/300x300/1a1a2e/7BA3C9/png?text=${encodeURIComponent(model.label)}`
                        }
                      }}
                    />
                  </div>
                </div>
                <span className={`text-xs md:text-sm font-medium text-center leading-tight transition-colors ${
                  activeModel === model.id ? 'text-white' : 'text-gray-400 group-hover:text-white'
                }`} style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}>
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

      {/* Conoce Nuestras Sucursales CTA */}
      {!selectedProduct && (
        <ScrollReveal>
        <div className="py-6 md:py-10 lg:py-12">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <button
              onClick={() => navigate('/sucursales')}
              className="group relative inline-flex items-center justify-center px-8 py-4 md:px-12 md:py-5 lg:px-16 lg:py-6 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold text-base md:text-lg lg:text-xl rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/30 border border-white/10"
            >
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '2px' }}>Conoce Nuestras Sucursales</span>
            </button>
          </div>
        </div>
        </ScrollReveal>
      )}

      {/* Add top padding when viewing product detail (no hero/marquee) */}
      {selectedProduct && <div className="pt-20 md:pt-24" />}

      {/* Recomendado para ti */}
      {!selectedProduct && recommendedProducts.length > 0 && (
        <section className="py-10 md:py-16 lg:py-20">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
            <ScrollReveal>
            <div className="text-center mb-8 md:mb-12">
              <h3 className="text-2xl md:text-4xl lg:text-5xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '2px' }}>RECOMENDADO PARA TI</h3>
            </div>
            </ScrollReveal>
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 lg:gap-8">
              {recommendedProducts.map((product, idx) => (
                <ScrollReveal key={product.id} delay={idx * 0.08} animation="scale">
                                <button onClick={() => selectProduct(product)} className="w-full group text-left bg-white/5 rounded-2xl border border-white/5 overflow-hidden hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-1">
                                  <div className="relative aspect-square bg-gray-900/50 p-4 flex items-center justify-center img-shimmer">
                                    {product.badge && (
                                      <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500 text-white">{product.badge}</div>
                                    )}
                                    <div className={`absolute ${product.badge ? 'top-12' : 'top-3'} right-3 z-10 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`}>
                                      <Heart className="w-4 h-4 text-gray-300" />
                                    </div>
                                    <img src={product.image} alt={product.name} loading={idx < 4 ? 'eager' : 'lazy'} decoding="async" fetchPriority={idx < 4 ? 'high' : 'auto'} className="w-full h-full object-contain rounded-xl group-hover:scale-105 transition-transform duration-500" onLoad={(e) => { (e.target as HTMLImageElement).parentElement?.classList.remove('img-shimmer') }} onError={(e) => { (e.target as HTMLImageElement).parentElement?.classList.remove('img-shimmer'); (e.target as HTMLImageElement).src = `https://placehold.co/400x400/1a1a2e/7BA3C9/png?text=${encodeURIComponent(product.name)}` }} />
                                  </div>
                                  <div className="p-3 md:p-4">
                                    <p className="text-xs text-blue-400 font-medium mb-1">{displayCondition(product.condition)}</p>
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
                          {(() => { const minV = getMinVariantPrice(product); const displayPrice = minV ? minV.price : product.price; const showDesde = minV?.hasMultiple; return product.condition !== 'Semi-usado' && displayPrice && displayPrice !== '-' ? (
                            <div className="mb-1">
                              {!minV && product.oldPrice && product.oldPrice !== '-' && (
                                <p className="text-[10px] text-red-400 line-through">$ {product.oldPrice}</p>
                              )}
                              <p className="text-base md:text-lg font-bold text-white">{showDesde ? 'Desde ' : ''}$ {displayPrice}</p>
                            </div>
                          ) : product.condition !== 'Semi-usado' ? (
                            <p className="text-xs text-blue-400 font-medium flex items-center gap-1 mb-1"><MessageCircle className="w-3 h-3" /> Consultar Precio</p>
                          ) : null })()}
                          <div className="flex flex-wrap gap-x-2">
                            {(['duitama', 'tunja'] as const).filter(c => product.available.includes(c)).map(c => (
                              <p key={c} className="text-[10px] text-green-400 font-medium flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> {c === 'duitama' ? 'Duitama' : 'Tunja'}</p>
                            ))}
                          </div>
                        </div>
                      </button>
                      </ScrollReveal>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Tendencia Ahora - Infinite Carousel */}
      {!selectedProduct && trendingProducts.length > 0 && (
        <section className="py-10 md:py-16 lg:py-20">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
            <ScrollReveal>
            <div className="text-center mb-8 md:mb-12">
              <h3 className="text-2xl md:text-4xl lg:text-5xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '2px' }}>TENDENCIA AHORA</h3>
            </div>
            </ScrollReveal>
          </div>
          <div
            className="overflow-hidden cursor-grab active:cursor-grabbing select-none touch-pan-y"
            onPointerDown={onTrendingPointerDown}
            onPointerMove={onTrendingPointerMove}
            onPointerUp={onTrendingPointerUp}
            onPointerLeave={onTrendingPointerUp}
          >
            <div ref={trendingTrackRef} className="flex gap-4 md:gap-6 px-4 sm:px-6 w-max will-change-transform">
              {[...trendingProducts, ...trendingProducts].map((product, idx) => (
                <button key={`t-${idx}`} onClick={() => { if (!trendingClickBlocked.current) selectProduct(product) }} className="w-44 md:w-56 lg:w-64 flex-shrink-0 group text-left bg-white/5 rounded-2xl border border-white/5 overflow-hidden hover:border-amber-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5">
                  <div className="relative aspect-square bg-gray-900/50 p-3 flex items-center justify-center img-shimmer">
                    <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-black flex items-center gap-1"><TrendingUp className="w-2.5 h-2.5" /> Trending</div>
                    <img src={product.image} alt={product.name} loading="eager" decoding="async" className="w-full h-full object-contain rounded-xl group-hover:scale-105 transition-transform duration-500 pointer-events-none" onLoad={(e) => { (e.target as HTMLImageElement).parentElement?.classList.remove('img-shimmer') }} onError={(e) => { (e.target as HTMLImageElement).parentElement?.classList.remove('img-shimmer'); (e.target as HTMLImageElement).src = `https://placehold.co/400x400/1a1a2e/7BA3C9/png?text=${encodeURIComponent(product.name)}` }} />
                  </div>
                  <div className="p-3">
                    <p className={`text-[10px] font-medium mb-0.5 ${product.condition === 'Nuevo' ? 'text-blue-400' : 'text-amber-400'}`}>{displayCondition(product.condition)}</p>
                    <h4 className="text-xs md:text-sm font-bold text-white mb-1 line-clamp-2">{product.name}</h4>
                    <div className="flex flex-wrap items-center gap-1 mb-1.5">
                      {product.storageOptions.slice(0, 2).map((s, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-white/5 text-[8px] text-gray-400">{s}</span>
                      ))}
                      {product.colors.slice(0, 3).map((color, i) => (
                        <div key={`c${i}`} className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: resolveColor(color) }} />
                      ))}
                    </div>
                    {(() => { const minV = getMinVariantPrice(product); const displayPrice = minV ? minV.price : product.price; const showDesde = minV?.hasMultiple; return product.condition !== 'Semi-usado' && displayPrice && displayPrice !== '-' ? (
                      <div className="mb-0.5">
                        {!minV && product.oldPrice && product.oldPrice !== '-' && (
                          <p className="text-[9px] text-red-400 line-through">$ {product.oldPrice}</p>
                        )}
                        <p className="text-sm md:text-base font-bold text-white">{showDesde ? 'Desde ' : ''}$ {displayPrice}</p>
                      </div>
                    ) : product.condition !== 'Semi-usado' ? (
                      <p className="text-[10px] text-blue-400 font-medium flex items-center gap-1 mb-0.5"><MessageCircle className="w-2.5 h-2.5" /> Consultar</p>
                    ) : null })()}
                    <div className="flex flex-wrap gap-x-1.5">
                      {(['duitama', 'tunja'] as const).filter(c => product.available.includes(c)).map(c => (
                        <p key={c} className="text-[9px] text-green-400 font-medium flex items-center gap-0.5"><MapPin className="w-2 h-2" /> {c === 'duitama' ? 'Duitama' : 'Tunja'}</p>
                      ))}
                    </div>
                  </div>
                </button>
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
        const baseGalleryImages = [mainImg, ...extraImgs].filter(Boolean)

        // If a color has an explicit image group, show those when that color is selected (case-insensitive key lookup).
        const colorImagesMap = selectedProduct.color_images || {}
        const colorKey = selectedColor ? Object.keys(colorImagesMap).find(k => k.toLowerCase().trim() === selectedColor.toLowerCase().trim()) : undefined
        const rawColorImages = colorKey ? colorImagesMap[colorKey] : undefined
        const selectedColorImages = Array.isArray(rawColorImages) ? rawColorImages : rawColorImages ? [rawColorImages] : []

        const galleryImages = selectedColorImages.length > 0
          ? selectedColorImages
          : baseGalleryImages
        const model3DUrl = getModel3DUrl(selectedProduct)
        return (
        <section className="py-10 md:py-16">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
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
                <div className="relative aspect-square rounded-3xl overflow-hidden flex items-center justify-center p-10 group">
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
                        <img src={img} alt={`${selectedProduct.name} - Miniatura ${i + 1}`} loading="lazy" decoding="async" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/100x100/1a1a2e/7BA3C9/png?text=${i + 1}` }} />
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
                  {displayCondition(selectedProduct.condition)}
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-6" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}>{selectedProduct.name}</h2>
                
                <div className="mb-6">
                  <div className="flex flex-wrap items-start gap-4">
                    {selectedProduct.storageOptions.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-sm mb-2">Almacenamiento</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedProduct.storageOptions.map((storage, i) => (
                          <button key={i} onClick={() => { setSelectedStorage(storage) }} onPointerDown={(e) => { e.currentTarget.click() }} className={`storage-btn px-4 py-2 rounded-xl border text-sm font-medium cursor-pointer transition-all duration-200 ${selectedStorage === storage ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-white/5 border-white/10 text-white hover:border-blue-500/50'}`} style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}>{storage}</button>
                        ))}
                      </div>
                    </div>
                    )}
                    {colorsForSelectedStorage.length > 0 && (
                      <div>
                        <p className="text-gray-400 text-sm mb-2">Colores</p>
                        <div className="flex items-center gap-2">
                          {colorsForSelectedStorage.map((color, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setSelectedColor(color)
                                setGalleryIndex(0)
                              }}
                              onPointerDown={(e) => { e.currentTarget.click() }}
                              className={`color-btn w-8 h-8 rounded-full border-2 cursor-pointer transition-all duration-200 ${selectedColor === color ? 'border-blue-400 ring-2 ring-blue-400/30' : 'border-white/20 hover:border-blue-400'}`}
                              style={{ backgroundColor: resolveColor(color), WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                              title={color}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Price - dynamic based on variant or base price (uses useMemo for instant updates) */}
                {selectedProduct.condition !== 'Semi-usado' && (() => {
                  const variants = selectedProduct.variants || []
                  if (variants.length > 0) {
                    if (matchedVariant && matchedVariant.price) {
                      return (
                        <div className="mb-6">
                          {selectedProduct.oldPrice && selectedProduct.oldPrice !== '-' && (
                            <p className="text-sm text-red-400 line-through">$ {selectedProduct.oldPrice}</p>
                          )}
                          <p className="text-3xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}>$ {matchedVariant.price}</p>
                          <p className="text-xs text-gray-500 mt-1">{matchedVariant.storage && matchedVariant.color ? `${matchedVariant.storage} / ${matchedVariant.color}` : matchedVariant.storage || matchedVariant.color || ''}</p>
                        </div>
                      )
                    } else {
                      return (
                        <div className="mb-6">
                          <p className="text-sm text-gray-400 italic">Selecciona almacenamiento y color para ver el precio</p>
                        </div>
                      )
                    }
                  } else if (selectedProduct.price && selectedProduct.price !== '-') {
                    return (
                      <div className="mb-6">
                        {selectedProduct.oldPrice && selectedProduct.oldPrice !== '-' && (
                          <p className="text-sm text-red-400 line-through">$ {selectedProduct.oldPrice}</p>
                        )}
                        <p className="text-3xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}>$ {selectedProduct.price}</p>
                      </div>
                    )
                  }
                  return null
                })()}

                {/* WhatsApp button */}
                <div className="space-y-3">
                  <button
                    onClick={() => setWhatsappCityModal(true)}
                    className="w-full py-4 bg-green-600/10 hover:bg-green-600 border border-green-600/30 hover:border-green-600 text-green-400 hover:text-white font-semibold rounded-2xl transition-all flex items-center justify-center gap-3 text-base"
                  >
                    {selectedProduct.condition === 'Semi-usado' ? 'Consulta tu Equipo/Precio/Estado de bateria/Capacidad en Tiempo real' : (<><MessageCircle className="w-5 h-5" />{selectedProduct.price && selectedProduct.price !== '-' ? 'Comprar por WhatsApp' : 'Consultar Precio por WhatsApp'}</>)}
                  </button>

                  {/* WhatsApp City Selector Modal */}
                  {whatsappCityModal && selectedProduct && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setWhatsappCityModal(false)}>
                      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-white/10">
                          <h3 className="text-lg font-bold text-white text-center">¿A cuál sede deseas escribir?</h3>
                          <p className="text-gray-400 text-sm text-center mt-1">Escoge tu tienda Gordotech más cercana</p>
                        </div>
                        <div className="p-4 space-y-3">
                          {([{ key: 'tunja' as const, label: 'Tunja', sublabel: 'Oporto Centro de Negocios' }, { key: 'duitama' as const, label: 'Duitama', sublabel: 'Pasaje Solano Local 102' }]).map(city => (
                            <a
                              key={city.key}
                              href={`https://wa.me/${CITY_SOCIALS[city.key].whatsappNumber}?text=${encodeURIComponent(`Hola Gordotech ${city.label}! Me interesa el ${selectedProduct.name} (${displayCondition(selectedProduct.condition)})${selectedStorage ? ` - ${selectedStorage}` : ''}${selectedColor ? ` - ${selectedColor}` : ''}. ¿Tienen disponible y cuál es el precio?`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => { trackWhatsAppClick(city.label, 'producto', selectedProduct.name); setWhatsappCityModal(false) }}
                              className="flex items-center gap-4 p-4 rounded-xl bg-green-600/10 border border-green-600/20 hover:bg-green-600 hover:border-green-600 text-green-400 hover:text-white transition-all group"
                            >
                              <div className="w-12 h-12 rounded-full bg-green-500/20 group-hover:bg-white/20 flex items-center justify-center flex-shrink-0">
                                <MapPin className="w-6 h-6" />
                              </div>
                              <div className="flex-1">
                                <p className="font-bold text-base text-white">{city.label}</p>
                                <p className="text-xs text-gray-400 group-hover:text-green-100">{city.sublabel}</p>
                              </div>
                              <img src="/images/whatsapp-logo.png" alt="WhatsApp" loading="lazy" decoding="async" className="w-6 h-6 flex-shrink-0" />
                            </a>
                          ))}
                          <a
                            href={`https://wa.me/573213815465?text=${encodeURIComponent(`Hola Clínica de Celulares! Me interesa el ${selectedProduct.name} (${displayCondition(selectedProduct.condition)})${selectedStorage ? ` - ${selectedStorage}` : ''}${selectedColor ? ` - ${selectedColor}` : ''}. ¿Tienen disponible y cuál es el precio?`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => { trackWhatsAppClick('Clinica de Celulares', 'producto', selectedProduct.name); setWhatsappCityModal(false) }}
                            className="flex items-center gap-4 p-4 rounded-xl bg-green-600/10 border border-green-600/20 hover:bg-green-600 hover:border-green-600 text-green-400 hover:text-white transition-all group"
                          >
                            <div className="w-12 h-12 rounded-full bg-green-500/20 group-hover:bg-white/20 flex items-center justify-center flex-shrink-0">
                              <MapPin className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-base text-white">Clínica de Celulares</p>
                              <p className="text-xs text-gray-400 group-hover:text-green-100">San Andresito de la 18</p>
                            </div>
                            <img src="/images/whatsapp-logo.png" alt="WhatsApp" loading="lazy" decoding="async" className="w-6 h-6 flex-shrink-0" />
                          </a>
                        </div>
                        <div className="p-4 pt-0">
                          <button onClick={() => setWhatsappCityModal(false)} className="w-full py-2.5 text-gray-400 hover:text-white text-sm transition-colors">Cancelar</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Related Products */}
            <div>
              <h3 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-8 md:mb-12" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '2px' }}>PRODUCTOS RELACIONADOS</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 lg:gap-8">
                {relatedProducts.map(product => (
                  <button key={product.id} onClick={() => selectProduct(product)} className="group text-left bg-white/5 rounded-2xl border border-white/5 overflow-hidden hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-1">
                          <div className="relative aspect-square bg-gray-900/50 p-4 flex items-center justify-center">
                            {product.badge && (
                              <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500 text-white">{product.badge}</div>
                            )}
                            <div className={`absolute ${product.badge ? 'top-12' : 'top-3'} right-3 z-10 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`}>
                              <Heart className="w-4 h-4 text-gray-300" />
                            </div>
                            <img src={product.image} alt={product.name} loading="lazy" decoding="async" className="w-full h-full object-contain rounded-xl group-hover:scale-105 transition-transform duration-500" onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/400x400/1a1a2e/7BA3C9/png?text=${encodeURIComponent(product.name)}` }} />
                          </div>
                          <div className="p-3 md:p-4">
                            <p className={`text-xs font-medium mb-1 ${product.condition === 'Nuevo' ? 'text-blue-400' : 'text-amber-400'}`}>{displayCondition(product.condition)}</p>
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
                                                        {(() => { const minV = getMinVariantPrice(product); const displayPrice = minV ? minV.price : product.price; const showDesde = minV?.hasMultiple; return product.condition !== 'Semi-usado' && displayPrice && displayPrice !== '-' ? (
                                                          <div className="mb-1">
                                                            {!minV && product.oldPrice && product.oldPrice !== '-' && (
                                                              <p className="text-[10px] text-red-400 line-through">$ {product.oldPrice}</p>
                                                            )}
                                                            <p className="text-base md:text-lg font-bold text-white">{showDesde ? 'Desde ' : ''}$ {displayPrice}</p>
                                                          </div>
                            ) : product.condition !== 'Semi-usado' ? (
                              <p className="text-xs text-blue-400 font-medium flex items-center gap-1 mb-1"><MessageCircle className="w-3 h-3" /> Consultar Precio</p>
                            ) : null })()}
                            <div className="flex flex-wrap gap-x-2">
                              {(['duitama', 'tunja'] as const).filter(c => product.available.includes(c)).map(c => (
                                <p key={c} className="text-[10px] text-green-400 font-medium flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> {c === 'duitama' ? 'Duitama' : 'Tunja'}</p>
                              ))}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
              )
            })()}



      {/* Location Section - hidden on product detail */}
      {!selectedProduct && (
      <section id="ubicacion" className="py-16 md:py-24 lg:py-28">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
          <ScrollReveal>
          <div className="text-center mb-16">
            <h3 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '2px' }}>
              NUESTRAS <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">TIENDAS</span>
            </h3>
            <p className="text-gray-400 text-lg md:text-xl">Ven a conocer nuestros productos en persona</p>
          </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Duitama */}
            <ScrollReveal delay={0.1}>
            <div onClick={() => navigate('/sucursales')} className="p-8 rounded-3xl border transition-all bg-blue-500/5 border-blue-500/20 cursor-pointer hover:bg-blue-500/10 hover:border-blue-500/40">
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
                <a href={CITY_SOCIALS.duitama.whatsapp} onClick={(e) => { e.stopPropagation(); trackWhatsAppClick('Duitama', 'sucursales_home') }} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 bg-green-600/10 hover:bg-green-600 border border-green-600/30 hover:border-green-600 text-green-400 hover:text-white font-medium rounded-xl transition-all text-center text-sm">
                  WhatsApp
                </a>
                <a href="https://www.google.com/maps/dir//Gordotech+Duitama,+Cl.+20a+%2312-32,+Solano,+Duitama,+Boyac%C3%A1/@5.8259915,-73.0301255,14z/data=!4m8!4m7!1m0!1m5!1m1!1s0x8e6a3fb0048fe77f:0xd1f7a4fb7101b8e8!2m2!1d-73.0317497!2d5.8320283" onClick={(e) => e.stopPropagation()} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 bg-blue-500/10 hover:bg-blue-500 border border-blue-500/30 hover:border-blue-500 text-blue-400 hover:text-white font-medium rounded-xl transition-all text-center text-sm">
                  Ver en Mapa
                </a>
              </div>
            </div>
            </ScrollReveal>

            {/* Tunja */}
            <ScrollReveal delay={0.2}>
            <div onClick={() => navigate('/sucursales')} className="p-8 rounded-3xl border transition-all bg-blue-500/5 border-blue-500/20 cursor-pointer hover:bg-blue-500/10 hover:border-blue-500/40">
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
                <a href={CITY_SOCIALS.tunja.whatsapp} onClick={(e) => { e.stopPropagation(); trackWhatsAppClick('Tunja', 'sucursales_home') }} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 bg-green-600/10 hover:bg-green-600 border border-green-600/30 hover:border-green-600 text-green-400 hover:text-white font-medium rounded-xl transition-all text-center text-sm">
                  WhatsApp
                </a>
                <a href="https://www.google.com/maps/dir//Oporto+Centro+de+Negocios,+Av.+Universitaria+%2345a-40,+Tunja,+Boyac%C3%A1" onClick={(e) => e.stopPropagation()} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 bg-blue-500/10 hover:bg-blue-500 border border-blue-500/30 hover:border-blue-500 text-blue-400 hover:text-white font-medium rounded-xl transition-all text-center text-sm">
                  Ver en Mapa
                </a>
              </div>
            </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
      )}


      </main>

      {/* Contactanos Card */}
      <ScrollReveal>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 mb-8 flex justify-center">
        <Link to="/sucursales" className="block relative rounded-2xl overflow-hidden group cursor-pointer w-full max-w-xs sm:max-w-sm">
          <div className="aspect-[3/4] relative">
            <img src="/images/contactanos.jpg" alt="Contactanos" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 text-center">
              <h3 className="text-xl sm:text-2xl font-bold tracking-wider" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '2px', color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>CONTACTANOS</h3>
            </div>
          </div>
        </Link>
      </div>
      </ScrollReveal>

      {/* Footer */}
      <ScrollReveal>
      <footer id="contacto" className="border-t border-white/5 pt-16 pb-8">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
          {/* Brand top section */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src="/images/gordotech-logo.png" alt="Gordotech" loading="lazy" decoding="async" className="h-14 gordotech-logo-invert" />
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-md mx-auto">Conectando tus suenos. Tu tienda de confianza para iPhones nuevos y seminuevos en Boyaca.</p>
          </div>

          {/* Theme Toggle */}
          <div className="border-t border-white/5 pt-8 mb-6 flex items-center justify-center gap-3">
            <Sun className="w-4 h-4 text-gray-400" />
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`theme-toggle ${!isDarkMode ? 'light' : ''}`}
              aria-label={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              <span className="theme-toggle-knob">
                {isDarkMode ? <Moon className="w-3.5 h-3.5 text-gray-700" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
              </span>
            </button>
            <Moon className="w-4 h-4 text-gray-400" />
            <span className="text-gray-500 text-xs ml-1">{isDarkMode ? 'Modo Oscuro' : 'Modo Claro'}</span>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col items-center gap-3 text-center">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <a href="#" className="hover:text-white transition-colors">Terminos</a>
              <a href="#" className="hover:text-white transition-colors">Privacidad</a>
              <a href="#" className="hover:text-white transition-colors">Garantia</a>
              <a href="https://admin.gordotech.co" className="flex items-center gap-1.5 hover:text-white transition-colors" title="Panel de Administración">
                <Settings className="w-3.5 h-3.5" />
                Admin
              </a>
            </div>
            <p className="text-gray-500 text-xs">&copy; 2026 Gordotech. Todos los derechos reservados.</p>
            <p className="text-gray-600 text-[10px] italic">Conectando tus suenos.</p>
          </div>
        </div>
      </footer>
      </ScrollReveal>

      {/* WhatsApp Floating Button with City Options */}
      <div className="fixed bottom-6 right-6 z-50">
        {whatsappMenuOpen && (
          <div className="absolute bottom-16 right-0 mb-2 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden w-56 animate-in">
            <a
              href="https://wa.me/573219863883?text=Hola%20Gordotech%20Tunja%2C%20necesito%20información"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackWhatsAppClick('Tunja', 'flotante')}
              className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
            >
              <img src="/images/whatsapp-logo.png" alt="WhatsApp" loading="lazy" decoding="async" className="w-8 h-8 object-contain" />
                          <div><p className="text-white text-sm font-medium">Tunja</p><p className="text-gray-400 text-[10px]">Oporto Centro de Negocios</p></div>
                        </a>
                        <a
                          href="https://wa.me/573144810431?text=Hola%20Gordotech%20Duitama%2C%20necesito%20información"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackWhatsAppClick('Duitama', 'flotante')}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-t border-white/5"
                        >
                          <img src="/images/whatsapp-logo.png" alt="WhatsApp" loading="lazy" decoding="async" className="w-8 h-8 object-contain" />
                          <div><p className="text-white text-sm font-medium">Duitama</p><p className="text-gray-400 text-[10px]">Pasaje Solano Local 102</p></div>
                        </a>
                        <a
                          href="https://wa.me/573213815465?text=Hola%20Gordotech%20Clínica%2C%20necesito%20información"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackWhatsAppClick('Clinica de Celulares', 'flotante')}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-t border-white/5"
                        >
                          <img src="/images/whatsapp-logo.png" alt="WhatsApp" loading="lazy" decoding="async" className="w-8 h-8 object-contain" />
                          <div><p className="text-white text-sm font-medium">Clinica de Celulares</p><p className="text-gray-400 text-[10px]">San Andresito de la 18 Local 11</p></div>
            </a>
          </div>
        )}
        <button
          onClick={() => setWhatsappMenuOpen(!whatsappMenuOpen)}
          className={`w-14 h-14 ${whatsappMenuOpen ? 'bg-gray-700' : 'bg-white hover:bg-gray-100'} rounded-full flex items-center justify-center shadow-lg shadow-black/20 hover:scale-110 transition-all`}
        >
          {whatsappMenuOpen ? <X className="w-7 h-7 text-white" /> : <img src="/images/whatsapp-logo.png" alt="WhatsApp" loading="lazy" decoding="async" className="w-8 h-8 object-contain" />}
        </button>
      </div>
    </div>
  )
}

// Plan Retoma - separate page
function PlanRetomaPage({ isDarkMode }: { isDarkMode: boolean }) {
  const navigate = useNavigate()
  const [showCitySelect, setShowCitySelect] = useState(false)
  useEffect(() => {
    window.scrollTo(0, 0)
    document.title = 'Plan Retoma iPhone | Gordotech - Cambia tu iPhone por uno nuevo en Duitama, Tunja y Boyaca'
    const meta = document.querySelector('meta[name="description"]')
    if (meta) meta.setAttribute('content', 'Trae tu iPhone usado y recibe descuento en uno nuevo. Plan Retoma disponible en Duitama, Tunja, Paipa, Sogamoso y toda Boyaca. Aceptamos desde iPhone 12 en adelante. Gordotech tu tienda Apple de confianza.')
    const kwMeta = document.querySelector('meta[name="keywords"]')
    if (kwMeta) kwMeta.setAttribute('content', 'plan retoma iPhone Duitama, plan retoma iPhone Tunja, retoma iPhone Paipa, retoma iPhone Sogamoso, cambiar iPhone Duitama, cambiar iPhone Tunja, vender iPhone Duitama, vender iPhone Tunja, vender iPhone Paipa, vender iPhone Sogamoso, iPhone usado Duitama, iPhone usado Tunja, retoma Apple Boyaca, cambio iPhone Boyaca, Gordotech retoma, retoma iPhone Nobsa, retoma iPhone Santa Rosa de Viterbo, retoma iPhone Tibasosa')
    // Update canonical URL for this page
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement
    if (!canonical) { canonical = document.createElement('link'); canonical.setAttribute('rel', 'canonical'); document.head.appendChild(canonical) }
    canonical.setAttribute('href', 'https://gordotech.co/plan-retoma')
    // Update OG URL
    const ogUrl = document.querySelector('meta[property="og:url"]')
    if (ogUrl) ogUrl.setAttribute('content', 'https://gordotech.co/plan-retoma')
  }, [])

  return (
    <div className={`min-h-screen bg-gray-950 text-white ${!isDarkMode ? 'light-mode' : ''}`} style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-950/95 backdrop-blur-lg shadow-lg shadow-black/20 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>
            <button onClick={() => navigate('/')} className="flex items-center gap-2 cursor-pointer">
              <img src="/images/gordotech-icon-white.png" alt="Gordotech" className="h-8 gordotech-logo-invert" />
              <img src="/images/gordotech-text-logo.png" alt="Gordotech" className="h-6 gordotech-logo-invert" />
            </button>
            <div className="w-16" />
          </div>
        </div>
      </header>

      <div className="pt-20">
        <section className="py-16 md:py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/5" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 mb-6">
                <Smartphone className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-sm font-medium">Trae tu iPhone, subelo de nivel</span>
              </div>
              <h3 className="text-4xl md:text-6xl font-bold mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}>
                PLAN <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">RETOMA</span>
              </h3>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Del iPhone que tienes... al iPhone que sueñas. Te recibimos tu equipo como parte de pago.
              </p>
            </div>

            {/* 4 Steps */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
              {[
                { step: '1', title: 'Trae tu iPhone', icon: Smartphone },
                { step: '2', title: 'Lo evaluamos', icon: Settings },
                { step: '3', title: 'Te damos precio de retoma', icon: Star },
                { step: '4', title: 'Lo cambias por uno nuevo o seminuevo más avanzado', icon: Zap },
              ].map((item, i) => (
                <div key={i} className="text-center p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all duration-500">
                  <div className="w-12 h-12 mx-auto bg-blue-500/10 rounded-full flex items-center justify-center mb-3">
                    <span className="text-blue-400 font-bold text-lg" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{item.step}</span>
                  </div>
                  <item.icon className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-white font-semibold text-sm">{item.title}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center mb-10">
              <button
                onClick={() => setShowCitySelect(!showCitySelect)}
                className="inline-flex items-center gap-3 px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-2xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-green-500/25"
              >
                Consultar Plan Retoma
              </button>
              {showCitySelect && (
                <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center items-center">
                  <a href="https://wa.me/573144810431?text=Hola%20Gordotech%20Duitama%2C%20quiero%20informacion%20sobre%20el%20Plan%20Retoma" target="_blank" rel="noopener noreferrer"
                    onClick={() => trackWhatsAppClick('Duitama', 'plan_retoma')}
                    className="flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all w-full sm:w-auto">
                    <img src="/images/whatsapp-logo.png" alt="WhatsApp" loading="lazy" decoding="async" className="w-7 h-7 object-contain" />
                    <div className="text-left"><p className="text-white text-sm font-medium">Duitama</p><p className="text-gray-400 text-[10px]">Pasaje Solano Local 102</p></div>
                  </a>
                  <a href="https://wa.me/573219863883?text=Hola%20Gordotech%20Tunja%2C%20quiero%20informacion%20sobre%20el%20Plan%20Retoma" target="_blank" rel="noopener noreferrer"
                    onClick={() => trackWhatsAppClick('Tunja', 'plan_retoma')}
                    className="flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all w-full sm:w-auto">
                    <img src="/images/whatsapp-logo.png" alt="WhatsApp" loading="lazy" decoding="async" className="w-7 h-7 object-contain" />
                    <div className="text-left"><p className="text-white text-sm font-medium">Tunja</p><p className="text-gray-400 text-[10px]">Oporto Centro de Negocios</p></div>
                  </a>
                  <a href="https://wa.me/573213815465?text=Hola%20Clinica%20de%20Celulares%2C%20quiero%20informacion%20sobre%20el%20Plan%20Retoma" target="_blank" rel="noopener noreferrer"
                    onClick={() => trackWhatsAppClick('Clinica de Celulares', 'plan_retoma')}
                    className="flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all w-full sm:w-auto">
                    <img src="/images/whatsapp-logo.png" alt="WhatsApp" loading="lazy" decoding="async" className="w-7 h-7 object-contain" />
                    <div className="text-left"><p className="text-white text-sm font-medium">Clinica de Celulares</p><p className="text-gray-400 text-[10px]">San Andresito de la 18 Local 11</p></div>
                  </a>
                </div>
              )}
            </div>

            {/* Requirements */}
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
                      <p className="text-white font-semibold text-sm">Factura o caja original</p>
                      <p className="text-gray-400 text-xs mt-1">Requisito escencial para validar la propiedad y legalidad del equipo</p>
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
                      <p className="text-white font-semibold text-sm">Estado de bateria minimo al 85%</p>
                      <p className="text-gray-400 text-xs mt-1">Si esta por debajo del 85%, el equipo se recibe pero el valor de retoma baja considerablemente</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
                    Aceptamos desde el iPhone 12 en adelante
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

// Reparacion - separate page
function ReparacionPage({ isDarkMode }: { isDarkMode: boolean }) {
  const navigate = useNavigate()
  const city = 'duitama' as City
  const socials = CITY_SOCIALS[city]
  const [services, setServices] = useState(repairServices)
  const [galleryPhotos, setGalleryPhotos] = useState<{ id: number; image: string; caption: string }[]>([])
  const [lightboxPhoto, setLightboxPhoto] = useState<{ image: string; caption: string } | null>(null)
  useEffect(() => {
    window.scrollTo(0, 0)
    document.title = 'Centro de Reparaciones Apple | Gordotech - Reparacion iPhone, iPad, Mac en Duitama y Boyaca'
    const meta = document.querySelector('meta[name="description"]')
    if (meta) meta.setAttribute('content', 'Servicio tecnico especializado Apple en Duitama. Reparacion de pantalla, bateria, Face ID para iPhone, iPad y Mac. Atendemos clientes de Tunja, Paipa, Sogamoso, Nobsa, Santa Rosa de Viterbo y Tibasosa. Garantia en todas las reparaciones.')
    const kwMeta = document.querySelector('meta[name="keywords"]')
    if (kwMeta) kwMeta.setAttribute('content', 'reparacion iPhone Duitama, reparacion iPad Duitama, reparacion MacBook Duitama, reparacion iPhone Tunja, servicio tecnico Apple Duitama, servicio tecnico Apple Tunja, reparar iPhone Paipa, reparar iPhone Sogamoso, cambio pantalla iPhone Duitama, cambio bateria iPhone Duitama, reparacion Face ID Duitama, reparacion Apple Boyaca, arreglar iPhone Duitama, arreglar iPhone Tunja, reparar celular Duitama, reparar celular Tunja, reparar celular Paipa, reparar celular Sogamoso, Gordotech reparaciones, clinica celulares Duitama')
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement
    if (!canonical) { canonical = document.createElement('link'); canonical.setAttribute('rel', 'canonical'); document.head.appendChild(canonical) }
    canonical.setAttribute('href', 'https://gordotech.co/reparacion')
    const ogUrl = document.querySelector('meta[property="og:url"]')
    if (ogUrl) ogUrl.setAttribute('content', 'https://gordotech.co/reparacion')
  }, [])

  useEffect(() => {
    const loadServices = async () => {
      try {
        const res = await fetch(`${API_URL}/api/repair-services`)
        if (res.ok) {
          const data = await res.json()
          if (data?.services) {
            const iconMap: Record<string, typeof Smartphone> = { Smartphone, Zap, Shield, Award, Wrench }
            setServices(data.services.map((s: Record<string, unknown>) => ({
              icon: iconMap[s.icon as string] || Smartphone,
              title: s.title as string,
              description: s.description as string,
              price: s.price as string,
            })))
          }
        }
      } catch { /* use static fallback */ }
    }
    loadServices()
  }, [])

  useEffect(() => {
    const loadGallery = async () => {
      try {
        const res = await fetch(`${API_URL}/api/repair-gallery`)
        if (res.ok) {
          const data = await res.json()
          if (data?.photos) {
            setGalleryPhotos(data.photos.map((p: Record<string, unknown>) => ({
              id: p.id as number,
              image: resolveImageUrl(p.image as string),
              caption: (p.caption as string) || '',
            })))
          }
        }
      } catch { /* silently fail */ }
    }
    loadGallery()
  }, [])

  // Gallery marquee refs - two rows scrolling in opposite directions
  const galleryRow1Ref = useRef<HTMLDivElement>(null)
  const galleryRow2Ref = useRef<HTMLDivElement>(null)
  const galleryOffset1Ref = useRef(0)
  const galleryOffset2Ref = useRef(0)
  const GALLERY_PX_PER_SEC = 30 // pixels per second (time-based)

  useEffect(() => {
    if (galleryPhotos.length === 0) return
    let running = true
    let lastTime = 0
    const tick = (now: number) => {
      if (!running) return
      if (lastTime === 0) lastTime = now
      const delta = (now - lastTime) / 1000
      lastTime = now
      const row1 = galleryRow1Ref.current
      const row2 = galleryRow2Ref.current
      if (row1) {
        const singleWidth = row1.scrollWidth / 3
        galleryOffset1Ref.current -= GALLERY_PX_PER_SEC * delta
        if (galleryOffset1Ref.current <= -singleWidth) galleryOffset1Ref.current += singleWidth
        row1.style.transform = `translateX(${galleryOffset1Ref.current}px)`
      }
      if (row2) {
        const singleWidth = row2.scrollWidth / 3
        galleryOffset2Ref.current += GALLERY_PX_PER_SEC * delta
        if (galleryOffset2Ref.current >= 0) galleryOffset2Ref.current -= singleWidth
        row2.style.transform = `translateX(${galleryOffset2Ref.current}px)`
      }
      requestAnimationFrame(tick)
    }
    // Initialize row2 offset to -singleWidth so it starts at a shifted position
    const initTimer = setTimeout(() => {
      if (galleryRow2Ref.current) {
        const singleWidth = galleryRow2Ref.current.scrollWidth / 3
        galleryOffset2Ref.current = -singleWidth
      }
    }, 50)
    requestAnimationFrame(tick)
    return () => { running = false; clearTimeout(initTimer) }
  }, [galleryPhotos])

  // Split photos into two rows
  const halfIndex = Math.ceil(galleryPhotos.length / 2)
  const row1Photos = galleryPhotos.slice(0, halfIndex)
  const row2Photos = galleryPhotos.slice(halfIndex)

  return (
    <div className={`min-h-screen bg-gray-950 text-white ${!isDarkMode ? 'light-mode' : ''}`} style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-950/95 backdrop-blur-lg shadow-lg shadow-black/20 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>
            <button onClick={() => navigate('/')} className="flex items-center gap-2 cursor-pointer">
              <img src="/images/gordotech-icon-white.png" alt="Gordotech" className="h-8 gordotech-logo-invert" />
              <img src="/images/gordotech-text-logo.png" alt="Gordotech" className="h-6 gordotech-logo-invert" />
            </button>
            <div className="w-16" />
          </div>
        </div>
      </header>

      <div className="pt-20">
        <section className="py-6 md:py-10 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
            <div className="text-center mb-6">
              <h3 className="text-4xl md:text-6xl font-bold mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}>
                CENTRO DE <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">REPARACIONES</span>
              </h3>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Nuestros tecnicos certificados reparan tu iPhone con repuestos de la mas alta calidad
              </p>
            </div>

            {/* Boton Agendar Reparacion - above gallery */}
            <div className="text-center mb-6">
              <a
                href="https://wa.me/573213815465?text=Hola%20Gordotech%20Cl%C3%ADnica%2C%20necesito%20una%20reparacion"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackWhatsAppClick('Clinica de Celulares', 'reparacion')}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl transition-all hover:scale-105 hover:shadow-lg font-semibold"
                style={{ backgroundColor: '#34C759', color: '#ffffff' }}
              >
                Agendar Reparacion por WhatsApp
              </a>
            </div>

            {/* Galeria de Trabajos - Two auto-scrolling rows in opposite directions */}
            {galleryPhotos.length > 0 && (
              <div className="mb-16 space-y-4">
                {/* Row 1 - scrolls right to left */}
                {row1Photos.length > 0 && (
                  <div className="overflow-hidden">
                    <div
                      ref={galleryRow1Ref}
                      className="flex gap-4"
                      style={{ willChange: 'transform' }}
                    >
                      {[...row1Photos, ...row1Photos, ...row1Photos].map((photo, i) => (
                        <button
                          key={`row1-${i}`}
                          onClick={() => setLightboxPhoto(photo)}
                          className="group relative rounded-2xl overflow-hidden bg-gray-800 border border-white/5 hover:border-blue-500/30 transition-all duration-500 cursor-pointer flex-shrink-0"
                          style={{ width: '200px', height: '267px' }}
                        >
                          <img
                            src={photo.image}
                            alt={photo.caption}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            loading="lazy"
                            decoding="async"
                            draggable={false}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          {photo.caption && (
                            <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-center">
                              <p className="text-sm font-bold text-center drop-shadow-lg" style={{ color: '#ffffff', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{photo.caption}</p>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Row 2 - scrolls left to right */}
                {row2Photos.length > 0 && (
                  <div className="overflow-hidden">
                    <div
                      ref={galleryRow2Ref}
                      className="flex gap-4"
                      style={{ willChange: 'transform' }}
                    >
                      {[...row2Photos, ...row2Photos, ...row2Photos].map((photo, i) => (
                        <button
                          key={`row2-${i}`}
                          onClick={() => setLightboxPhoto(photo)}
                          className="group relative rounded-2xl overflow-hidden bg-gray-800 border border-white/5 hover:border-blue-500/30 transition-all duration-500 cursor-pointer flex-shrink-0"
                          style={{ width: '200px', height: '267px' }}
                        >
                          <img
                            src={photo.image}
                            alt={photo.caption}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            loading="lazy"
                            decoding="async"
                            draggable={false}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          {photo.caption && (
                            <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-center">
                              <p className="text-sm font-bold text-center drop-shadow-lg" style={{ color: '#ffffff', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{photo.caption}</p>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </section>
      </div>

      {/* Lightbox Modal */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <div className="max-w-4xl max-h-[85vh] w-full" onClick={e => e.stopPropagation()}>
            <img
              src={lightboxPhoto.image}
              alt={lightboxPhoto.caption}
              className="w-full h-full object-contain rounded-xl"
            />
            {lightboxPhoto.caption && (
              <p className="text-white text-center mt-4 text-lg">{lightboxPhoto.caption}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Semi Nuevos - separate page
function SemiNuevosPage({ isDarkMode }: { isDarkMode: boolean }) {
  const navigate = useNavigate()
  const [semiProducts, setSemiProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [whatsappOpen, setWhatsappOpen] = useState(false)
  const semiScrollRef = useRef<HTMLDivElement>(null)
  const semiAnimRef = useRef<number>(0)
  const semiUserInteracting = useRef(false)
  const semiDidDrag = useRef(false)
  const semiResumeTimer = useRef<ReturnType<typeof setTimeout>>(null)
  useEffect(() => {
    window.scrollTo(0, 0)
    document.title = 'iPhone Semi-Nuevos | Gordotech - iPhones usados garantizados en Duitama, Tunja y Boyaca'
    const meta = document.querySelector('meta[name="description"]')
    if (meta) meta.setAttribute('content', 'Compra iPhones semi-nuevos con garantia en Duitama, Tunja, Paipa, Sogamoso y toda Boyaca. Equipos verificados y probados. Precios accesibles con garantia Gordotech. Envios a Nobsa, Santa Rosa de Viterbo y Tibasosa.')
    const kwMeta = document.querySelector('meta[name="keywords"]')
    if (kwMeta) kwMeta.setAttribute('content', 'iPhone semi-nuevo Duitama, iPhone semi-nuevo Tunja, iPhone semi-nuevo Paipa, iPhone semi-nuevo Sogamoso, iPhone usado Duitama, iPhone usado Tunja, iPhone usado Paipa, iPhone usado Sogamoso, comprar iPhone barato Duitama, comprar iPhone barato Tunja, iPhone segunda mano Boyaca, iPhone garantia Duitama, iPhone garantia Tunja, celular semi-nuevo Duitama, celular semi-nuevo Tunja, iPhone economico Boyaca, Gordotech semi-nuevos, iPhone semi-nuevo Nobsa, iPhone semi-nuevo Santa Rosa de Viterbo, iPhone semi-nuevo Tibasosa')
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement
    if (!canonical) { canonical = document.createElement('link'); canonical.setAttribute('rel', 'canonical'); document.head.appendChild(canonical) }
    canonical.setAttribute('href', 'https://gordotech.co/semi-nuevos')
    const ogUrl = document.querySelector('meta[property="og:url"]')
    if (ogUrl) ogUrl.setAttribute('content', 'https://gordotech.co/semi-nuevos')
  }, [])

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetch(`${API_URL}/api/products?city=duitama`)
        if (res.ok) {
          const data = await res.json()
          if (data?.products) {
            const mapped = data.products.filter((p: Record<string, unknown>) => p.condition === 'Semi-usado').map((p: Record<string, unknown>) => ({
              id: p.id as number, name: p.name as string, category: (p.category as string) || '',
              condition: p.condition as string,
              image: resolveImageUrl(p.image as string), images: ((p.images as string[]) || []).map(resolveImageUrl),
              colors: p.colors as string[], storageOptions: p.storage_options as string[],
              badge: (p.badge as string) || ((p.condition as string) === 'Nuevo' ? 'Nuevo' : null), available: p.available as string[],
              price: (p.price as string) || '', oldPrice: (p.old_price as string) || '', description: (p.description as string) || '',
            }))
            setSemiProducts(mapped)
            preloadImages(mapped.map(p => p.image))
          }
        }
      } catch { /* fallback to static */ 
        setSemiProducts(products.filter(p => p.condition === 'Semi-usado'))
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [])

  // Shuffle products to intercalate models (e.g. 12, 14, Air, 13 Pro Max...)
  const shuffledProducts = useMemo(() => {
    const src = semiProducts.length > 0 ? [...semiProducts] : products.filter(p => p.condition === 'Semi-usado')
    if (src.length <= 1) return src
    // Spread products apart by picking from alternating halves
    const sorted = [...src]
    const mid = Math.ceil(sorted.length / 2)
    const firstHalf = sorted.slice(0, mid)
    const secondHalf = sorted.slice(mid)
    const interleaved: Product[] = []
    for (let i = 0; i < Math.max(firstHalf.length, secondHalf.length); i++) {
      if (i < secondHalf.length) interleaved.push(secondHalf[i])
      if (i < firstHalf.length) interleaved.push(firstHalf[i])
    }
    return interleaved
  }, [semiProducts])

  const displayProducts = shuffledProducts

  // Auto-scroll: continuously scroll the container using requestAnimationFrame (time-based)
  // Pauses when user touches/drags, resumes 1.5s after release
  useEffect(() => {
    if (loading || displayProducts.length === 0) return
    // Small delay to ensure DOM is rendered and ref is attached
    const startTimer = setTimeout(() => {
      const el = semiScrollRef.current
      if (!el) return
      // Start from the first-third position so user can scroll backwards too
      const oneThird = el.scrollWidth / 3
      el.scrollLeft = oneThird
      const SEMI_PX_PER_SEC = 75 // pixels per second (time-based)
      let lastTime = 0
      const tick = (now: number) => {
        if (lastTime === 0) lastTime = now
        const delta = (now - lastTime) / 1000
        lastTime = now
        if (!semiUserInteracting.current && el) {
          el.scrollLeft += SEMI_PX_PER_SEC * delta
          // When past 2/3 of total width, jump back to 1/3 (seamless loop)
          const twoThirds = el.scrollWidth * 2 / 3
          if (el.scrollLeft >= twoThirds) {
            el.scrollLeft -= oneThird
          }
          // If user scrolled backwards past start, jump forward
          if (el.scrollLeft <= 0) {
            el.scrollLeft += oneThird
          }
        }
        semiAnimRef.current = requestAnimationFrame(tick)
      }
      semiAnimRef.current = requestAnimationFrame(tick)
    }, 100)
    return () => { clearTimeout(startTimer); cancelAnimationFrame(semiAnimRef.current) }
  }, [loading, displayProducts.length])

  const onSemiTouchStart = () => {
    semiUserInteracting.current = true
    semiDidDrag.current = false
    if (semiResumeTimer.current) clearTimeout(semiResumeTimer.current)
  }
  const onSemiTouchMove = () => { semiDidDrag.current = true }
  const onSemiTouchEnd = () => {
    semiResumeTimer.current = setTimeout(() => { semiUserInteracting.current = false }, 1500)
  }
  const onSemiMouseDown = () => {
    semiUserInteracting.current = true
    semiDidDrag.current = false
    if (semiResumeTimer.current) clearTimeout(semiResumeTimer.current)
  }
  const onSemiMouseUp = () => {
    semiResumeTimer.current = setTimeout(() => { semiUserInteracting.current = false }, 1500)
  }
  const onSemiMouseLeave = () => {
    if (semiUserInteracting.current) {
      semiResumeTimer.current = setTimeout(() => { semiUserInteracting.current = false }, 500)
    }
  }

  return (
    <div className={`min-h-screen bg-gray-950 text-white ${!isDarkMode ? 'light-mode' : ''}`} style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-950/95 backdrop-blur-lg shadow-lg shadow-black/20 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>
            <button onClick={() => navigate('/')} className="flex items-center gap-2 cursor-pointer">
              <img src="/images/gordotech-icon-white.png" alt="Gordotech" className="h-8 gordotech-logo-invert" />
              <img src="/images/gordotech-text-logo.png" alt="Gordotech" className="h-6 gordotech-logo-invert" />
            </button>
            <div className="w-16" />
          </div>
        </div>
      </header>

      <div className="pt-20">
        {/* Products Gallery - FIRST */}
        <section className="py-8 md:py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="mb-8">
              <h3 className="text-3xl md:text-5xl font-bold text-center" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}>
                CATALOGO SEMINUEVOS
              </h3>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <img src="/images/gordotech-icon-white.png" alt="Cargando" className="h-12 animate-pulse" />
              </div>
            ) : (
              <div
                ref={semiScrollRef}
                className="flex gap-3 md:gap-6 pb-4 overflow-x-auto scrollbar-hide select-none cursor-grab active:cursor-grabbing"
                onTouchStart={onSemiTouchStart}
                onTouchMove={onSemiTouchMove}
                onTouchEnd={onSemiTouchEnd}
                onMouseDown={onSemiMouseDown}
                onMouseUp={onSemiMouseUp}
                onMouseLeave={onSemiMouseLeave}
              >
                {[...displayProducts, ...displayProducts, ...displayProducts].map((product, idx) => (
                  <button
                    key={`semi-${idx}`}
                    onClick={() => { if (!semiDidDrag.current) navigate(`/producto/${product.id}/${getProductSlug(product)}`) }}
                    className="flex-shrink-0 w-[55vw] sm:w-[40vw] md:w-[28vw] lg:w-[22vw] group text-left bg-white/5 rounded-2xl border border-white/5 overflow-hidden hover:border-amber-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5"
                  >
                    <div className="relative aspect-square bg-gray-900/50 p-4 flex items-center justify-center img-shimmer">
                      <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white">Seminuevo</div>
                      <img
                        src={product.image}
                        alt={product.name}
                        loading="eager"
                        decoding="async"
                        className="w-full h-full object-contain rounded-xl group-hover:scale-105 transition-transform duration-500"
                        onLoad={(e) => { (e.target as HTMLImageElement).parentElement?.classList.remove('img-shimmer') }}
                        onError={(e) => { (e.target as HTMLImageElement).parentElement?.classList.remove('img-shimmer'); (e.target as HTMLImageElement).src = `https://placehold.co/400x400/1a1a2e/7BA3C9/png?text=${encodeURIComponent(product.name)}` }}
                      />
                    </div>
                    <div className="p-3 md:p-4 text-center">
                      <h4 className="text-base md:text-lg font-bold text-white mb-2 line-clamp-2">{product.name}</h4>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* WhatsApp CTA - right after carousel */}
            <div className="text-center mt-8">
              <div className="relative inline-block">
                <button
                  onClick={() => setWhatsappOpen(!whatsappOpen)}
                  className="block w-full px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-2xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-green-500/25 text-center"
                >
                  Consulta tu Equipo/Precio/Estado de bateria/Capacidad en Tiempo real
                </button>
                {whatsappOpen && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden w-56">
                    <a
                      href="https://wa.me/573219863883?text=Hola%20Gordotech%20Tunja%2C%20quiero%20consultar%20disponibilidad%20de%20iPhones%20seminuevos"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackWhatsAppClick('Tunja', 'semi_nuevos')}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                    >
                      <img src="/images/whatsapp-logo.png" alt="WhatsApp" loading="lazy" decoding="async" className="w-8 h-8 object-contain" />
                      <div><p className="text-white text-sm font-medium">Tunja</p><p className="text-gray-400 text-[10px]">Oporto Centro de Negocios</p></div>
                    </a>
                    <a
                      href="https://wa.me/573144810431?text=Hola%20Gordotech%20Duitama%2C%20quiero%20consultar%20disponibilidad%20de%20iPhones%20seminuevos"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackWhatsAppClick('Duitama', 'semi_nuevos')}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-t border-white/5"
                    >
                      <img src="/images/whatsapp-logo.png" alt="WhatsApp" loading="lazy" decoding="async" className="w-8 h-8 object-contain" />
                      <div><p className="text-white text-sm font-medium">Duitama</p><p className="text-gray-400 text-[10px]">Pasaje Solano Local 102</p></div>
                    </a>
                    <a
                      href="https://wa.me/573213815465?text=Hola%20Cl%C3%ADnica%20de%20Celulares%2C%20quiero%20consultar%20disponibilidad%20de%20iPhones%20seminuevos"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackWhatsAppClick('Clinica de Celulares', 'semi_nuevos')}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-t border-white/5"
                    >
                      <img src="/images/whatsapp-logo.png" alt="WhatsApp" loading="lazy" decoding="async" className="w-8 h-8 object-contain" />
                      <div><p className="text-white text-sm font-medium">Clínica de Celulares</p><p className="text-gray-400 text-[10px]">San Andresito de la 18</p></div>
                    </a>
                  </div>
                )}
              </div>
              <p className="text-gray-400 text-sm mt-4">La disponibilidad cambia constantemente. Confirma antes de visitarnos.</p>
            </div>
          </div>
        </section>

        {/* Info Section - BELOW catalog and CTA */}
        <section className="py-12 md:py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 via-transparent to-blue-600/5" />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
                <Smartphone className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 text-sm font-medium">Calidad garantizada</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-bold mb-6" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}>
                iPHONES <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">SEMINUEVOS</span>
              </h2>
              <p className="text-gray-300 text-lg md:text-xl leading-relaxed max-w-3xl mx-auto">
                Equipos de exhibicion, 100% originales, con uso minimo y en excelentes condiciones. La mejor relacion precio-calidad con el respaldo de Gordotech.
              </p>
            </div>

            {/* Benefits Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
              <div className="p-5 rounded-2xl bg-white/5 border border-white/5 text-center">
                <div className="w-12 h-12 mx-auto bg-amber-500/10 rounded-full flex items-center justify-center mb-3">
                  <Shield className="w-6 h-6 text-amber-400" />
                </div>
                <h4 className="text-white font-bold text-sm mb-1">100% Originales</h4>
                <p className="text-gray-400 text-xs leading-relaxed">Equipos de exhibicion de operadores y tiendas oficiales Apple. Sin piezas cambiadas ni reparaciones.</p>
              </div>
              <div className="p-5 rounded-2xl bg-white/5 border border-white/5 text-center">
                <div className="w-12 h-12 mx-auto bg-green-500/10 rounded-full flex items-center justify-center mb-3">
                  <Award className="w-6 h-6 text-green-400" />
                </div>
                <h4 className="text-white font-bold text-sm mb-1">Garantia Gordotech</h4>
                <p className="text-gray-400 text-xs leading-relaxed">Todos nuestros seminuevos incluyen garantia. Si algo falla, nosotros respondemos.</p>
              </div>
              <div className="p-5 rounded-2xl bg-white/5 border border-white/5 text-center">
                <div className="w-12 h-12 mx-auto bg-blue-500/10 rounded-full flex items-center justify-center mb-3">
                  <Star className="w-6 h-6 text-blue-400" />
                </div>
                <h4 className="text-white font-bold text-sm mb-1">Uso Minimo</h4>
                <p className="text-gray-400 text-xs leading-relaxed">Han sido usados unicamente como muestra. Bateria en excelente estado y estetica impecable.</p>
              </div>
            </div>

          </div>
        </section>
      </div>
    </div>
  )
}

// Sucursales - separate page
interface Sucursal {
  id: number
  name: string
  slug: string
  address: string
  city: string
  image: string
  whatsapp: string
  instagram: string
  tiktok: string
  phone: string
  description: string
  sort_order: number
  active: boolean
}

interface SucursalReview {
  name: string
  text: string
  rating: number
}

const SUCURSAL_REVIEWS: Record<string, { reviews: SucursalReview[]; googleUrl: string; rating: number; count: number }> = {
  duitama: {
    googleUrl: 'https://share.google/iS1BbsB9RQfmlLCbK',
    rating: 5.0,
    count: 88,
    reviews: [
      { name: 'Marcela Rodriguez', text: 'Muy buena atención y exelente servicio', rating: 5 },
      { name: 'Unplugged Banda', text: 'La mejor tienda de Boyacá', rating: 5 },
      { name: 'Fabian Bonilla', text: 'Cool como te atienden Gracias por todo', rating: 5 },
      { name: 'felipe archila alvarez', text: 'Excelente atención, productos de calidad y variedad.', rating: 5 },
      { name: 'Sofia Leon', text: 'Super recomendados, 100 por ciento confiables y excelente atención', rating: 5 },
      { name: 'Juan León', text: 'excelente servicio, equipos de calidad 100% recomendado .', rating: 5 },
      { name: 'Héctor Niño', text: 'Compré mi celular allí en seminuevo y me ha salido super bueno, 100% garantizados', rating: 5 },
      { name: 'Deyanira Gaitan', text: 'He comprado en Gordotech Duitama y tiene excelentes equipos con muy buenos precios y garantizados, además me asesoraron muy bien con las dudas que tenia sobre los equipos, para decidirme por el mejor según mi presupuesto.', rating: 5 },
      { name: 'Fabian Alvarez', text: 'Ahí compré mi teléfono excelente servicio', rating: 5 },
      { name: 'Maria Angarita', text: 'Excelentes equipos y muy buena atención', rating: 5 },
      { name: 'Sandra Silva', text: 'El mejor lugar y super confiables de verdad que los super recomiendo', rating: 5 },
      { name: 'Lina Becerra', text: 'Compre un iPhone en excelentes condiciones y entrega inmediata', rating: 5 },
      { name: 'Danna Gómez', text: 'La atención es muy buena, compré mi celular allí y la calidad es increíble, el celular que quería ahí lo encontré mucho mejor que en otros lugares', rating: 5 },
      { name: 'carol p', text: 'La mejor tienda Apple de Duitama', rating: 5 },
      { name: 'Duvan Mesa Camacho', text: 'Buen servicio', rating: 5 },
      { name: 'ricardo jose barbosa serrano', text: 'Excelente servicio muy profesionales', rating: 5 },
      { name: 'Cesar Ferney Hurtado Estupiñan', text: 'Yo compre me samsung hace dos años, y super bueno ya toca es cambiarlo con descuento jajaaj', rating: 5 },
      { name: 'danexi ardila garrido', text: 'Excelente servicio, buena atención 👍🏻👍🏻👍🏻…', rating: 5 },
      { name: 'Johnnattan Latorre', text: 'Súper atentos y colaboradores con productos de calidad!', rating: 5 },
      { name: 'Gustavo Casas', text: 'Compré un iPhone 16 pro. Muy buen equipo y lo mejor fue la atención. Tienen buen conocimiento u asesoran muy bien.', rating: 5 },
      { name: 'Maryuri Tatiana Acosta Forero', text: 'Excelente atención , las chicas son muy amables y tienen muy buena disposición', rating: 5 },
      { name: 'Yasmin Porras', text: 'Excelente atención .muy buena experiencia', rating: 5 },
      { name: 'Felipe Acosta Cadena', text: 'Los mejores compré mi iPhone 17 pro Max mi iPad 16 y mi Pencil', rating: 5 },
      { name: 'Sara Corredor', text: 'Excelente servicio , los equipos en muy buen estado , siempre te reciben con la mejor actitud .', rating: 5 },
      { name: 'Juan Morales', text: 'Excelente atención, los dispositivos son muy confiables y muy accesibles', rating: 5 },
      { name: 'Erik Hernandez', text: 'Excelente servicio muy serios y buena atención', rating: 5 },
      { name: 'Andres salcedo', text: 'Excelente , equipos en buen estado, con sus garantías respectivas y en excelentes condiciones de funcionamiento', rating: 5 },
      { name: 'SergioSalcedo Violin', text: 'Excelente servicio y muy amable la muchacha que me atendió Daniela 10/10 mi samsung 24', rating: 5 },
      { name: 'Deisy Díaz', text: 'Tuve una experiencia muy bonita los vendedores son muy amables y le recomienda ñn cual es el mejor los felicito y los recomiendo', rating: 5 },
      { name: 'Lucyca', text: 'Excelente servicio me sentí cómoda, voy a volver y a recomendar a mis amigos y conocidos.', rating: 5 },
      { name: 'Santiago Centeno Agudelo', text: 'Gran servicio de Leo y su equipo!', rating: 5 },
      { name: 'Martha Cecilia Diaz Cabra', text: 'Tuve una excelente experiencia comprando mi iPhone en esta tienda. Desde el primer momento la atención fue muy amable, me explicaron todo con paciencia y resolvieron todas mis dudas. El equipo es muy profesional y se nota que saben bastante sobre los productos que venden. Además, todo el proceso de compra fue rápido, seguro y confiable. Me sentí muy tranquila con la asesoría que recibí. Sin duda volvería a comprar aquí y también la recomiendo a quienes estén buscando un iPhone o accesorios de calidad. ¡Servicio 10/10! 👏📱', rating: 5 },
      { name: 'Wem Mantilla', text: 'Un día viajamos de Sogamoso a Tunja en bus este tenía como cargar el celular y conectamos nuestro cargador en esas mi hijo se mareo y estaba malito y el bus paró en Duitama me baje con el para ver si el aire le ayudaba pero no se mejoro dejamos ir el bus cuando el se fue al rato me acordé del cargador y se nos quedó en el...para rematar..perdí lo de dos pasajes, mi hijo se enfermo y para rematar el cargador se queda..y el celular sin batería para avisar..me acordé de un comercial de gordotech y me acuerdo q decía al lado del inovo cogimos un taxi llegamos y si estaban ahí.. cómprame s el cargador original, buen precio excelente atención y al final todo no fue malo pude comunicarme y hoy en dia tengo ese cargador aún funcionando ..esto fue hace años y medio un abrazo..', rating: 5 },
      { name: 'LEONARDO VALDERRAMA', text: 'Muy buena atención, yo cotize mi teléfono en muchos lugares y definitivamente aquí encontré el mejor precio !! Súper recomendado', rating: 5 },
      { name: 'Juan esteban borda', text: 'Gran servicio, Gente muy amable', rating: 5 },
      { name: 'GVK GROUP', text: 'La mejor tienda de productos Apple de Boyaca, van a la fija en calidad y garantía , súper recomendados.', rating: 5 },
      { name: 'Leonardo Salcedo', text: 'Un excelente lugar, buena atención por parte de la niña Sarai Daniela cuando ella estaba , muy buena calidad de los celulares y muy buen stock manejando lo mejor de la gama alta tanto en android y iPhone.', rating: 5 },
      { name: 'Carlos Mojica', text: 'Compré un iPhone 16 pro Max en gordotech Duitama, excelente servicio, trato muy amable, garantizado 100%', rating: 5 },
      { name: 'Guillermo Quiroz Gomez', text: 'Buena atención, recomendado', rating: 5 },
      { name: 'Nathalia Ochoa', text: 'Excelente servicio, excelentes precios la mejor tienda ❤️', rating: 5 },
      { name: 'Melii Sandoval', text: 'Compré mi iPhone 16 pro Max excelente', rating: 5 },
      { name: 'Julian Alberto Pedraza Estepa', text: 'He comprado accesorios para mi celular Samsung y no he tenido problemas. Elementos 1A.', rating: 5 },
      { name: 'Carolina Lamilla', text: 'Compré dos relojes y la atención es súper genial y los relojes a un lo uso y no he tenido ningún problema con ellos Amo sus productos', rating: 5 },
      { name: 'diego reyes', text: 'Compré un iPhone 14 Pro y di en parte de pago mi 12 pro Max, sin duda la mejor retoma del mercado', rating: 5 },
      { name: 'luis Carlos Rodríguez', text: 'Compré mi iPhone 17 pro Max hace un mes, en la tienda gordotech, buen servicio, buena atención, oportuna y confiable, recomendada, los mejores equipos y precios los encuentras ahí!!!!!', rating: 5 },
      { name: 'Valentina Valderrama', text: 'Súper recomendados! Yo compré un iPhone 16 rosado, y me ha salido muy bueno, la calidad y la atención de la tienda también son excelentes!', rating: 5 },
      { name: 'Sebastian Valderrama', text: 'Excelentes productos, buenos precios y celulares garantizados.', rating: 5 },
      { name: 'Cero Reportes SAS', text: 'El mejor lugar para encontrar los mejores productos Apple', rating: 5 },
      { name: 'Jacob Matias', text: 'Excelente servicio , compré mi iPhone 16 pro Max súper feliz de comprar en gordotech 🤗✨🔥✅…', rating: 5 },
      { name: 'Josue Daniel Cristiano Jacome', text: 'He tenido la oportunidad de comprar mi celular y IPad en Gordotech. 100% recomendado 💯…', rating: 5 },
      { name: 'Francisco Carvajal Flechas', text: 'Compramos dos iPhone 15 pro Max cuando salieron y aún los tenemos nos han salido tan buenos que ya estamos pensando en cambiarnos al 17 pro Max con gordotech prontamente', rating: 5 },
      { name: 'sara perez “saraperezr”', text: 'Compré un iphone15 pro nuevo. Y es una maravilla 10/10 🥳…', rating: 5 },
      { name: 'Lorena Velandia Rincon', text: 'Excelente servicio , buena asesoría y espacios limpios y modernos .', rating: 5 },
      { name: 'Karol Malaver', text: '“Sin duda, Gordotech llegó a revolucionar la tecnología en Boyacá. Es un lugar que genera confianza desde el primer momento: la atención es excelente, te asesoran durante todo el proceso y ofrecen muy buenas garantías con una relación calidad–precio increíble. Además, cuentan con sedes en las principales ciudades del departamento. ¡Me encanta! ✨”', rating: 5 },
      { name: 'FERNANDO ROJAS', text: 'Es un lugar espectacular la atención es 10 de 10 en abril de 2025 compré un iPhone 16 pro Max de 256 nuevo excelente equipo no molesta para nada y lo mejor que con las recomendaciones que me dieron en gordotech su batería sigue estando al 100%', rating: 5 },
      { name: 'Andrea Maryel Buritica Jacome', text: 'Mi celular me ha salido súper bueno, se los súper recomiendo, no he tenido ningún problema, he comprado dos y los dos geniales, nuevos como seminuevos', rating: 5 },
      { name: 'Sol Yuliana Jacome Candela', text: 'Súper el lugar, compré mi iPhone 17 Pro Max, súper recomendado', rating: 5 },
      { name: 'Olmer Ruiz', text: 'Excelente servicio Adquirí un iphone nuevo y uno seminuevo y han salido 100 de 100 ✅✅', rating: 5 },
      { name: 'Daniel Prieto', text: 'Muy serios y excelentes precios, nunca he tenido problemas con los equipos que he comprado', rating: 5 },
      { name: 'the black suite ph', text: 'Excelente lugar no es la primera vez que compro mis equipos aquí son lo mejor en Duitama 🔥🔥🙏🏽…', rating: 5 },
      { name: 'Judy Alejandra Flechas Mayorga', text: 'Excelente lugar, productos totalmente garantizados a muy buenos precios, super recomendado', rating: 5 },
      { name: 'Sarai Daniela Salcedo Daza', text: 'Su telefonía como nueva y seminuevo lo mejor de lo mejor', rating: 5 },
      { name: 'Daniela Vargas', text: 'Celulares de calidad', rating: 5 },
      { name: 'Valeria Perez Ochoa', text: 'En el 2025 compre con gordotech dos equipos nuevos sellados/Iphone 16 pro y Samsung A56, muy buena atencion y seguridad y confianza al comprar🫡,recomendados…', rating: 5 },
      { name: 'Diana Carolina Diaz Cabra', text: 'Excelentes Productos y buena atención', rating: 5 },
      { name: 'Jefferson Montaña', text: 'Compré hace unos meses un IPhone 14 Semi nuevo. El servicio y la atención fue excelente.', rating: 5 },
      { name: 'Juan Diego Alvarado Mojica', text: 'Excelente mi celular lo tengo hace dos años y cero problemas', rating: 5 },
      { name: 'Steveen Sanabria', text: 'Buen servicio excelente atención 10/10', rating: 5 },
      { name: 'Daniela Mejia Consuegra', text: 'Me encantó la atención, compré mi celu y me asesoraron muy bien, todo fue transparente y rápido 🔝🔝🔝🔝Súper recomendado…', rating: 5 },
      { name: 'José Luis Gil Sosa', text: 'Facilidades de pago, precios cómodos, atención 10 de 10, garantía, no tengo queja alguna, son muy top 🔥👌…', rating: 5 },
      { name: 'John Agredo', text: 'Compré un IPhone 16 ProMax Seminuevo, impecable estado, el precio más de 500mil pesos más económico que en cualquier otro lugar, la atención lo mejor. 200% recomendados.', rating: 5 },
      { name: 'Anaaeiou', text: '¡Excelente servicio! Siempre encuentro con ellos todo y a un super precio ✨', rating: 5 },
      { name: 'Andres Mariño', text: 'Excelente atención, compré un equipo seminuevo y no ha dado lios... Recomendado.', rating: 5 },
      { name: 'alexander quintero', text: 'La mejor tienda Apple en Boyacá 🖤🖤…', rating: 5 },
      { name: 'Leonardo Joya', text: 'La mejor tienda Apple de Boyacá viaje desde sogamoso y conseguí todo tal cual me lo ofrecieron', rating: 5 },
    ],
  },
  tunja: {
    googleUrl: 'https://share.google/efN3sJxoXofu2zCLI',
    rating: 5.0,
    count: 30,
    reviews: [
      { name: 'Yeferson Ortiz', text: 'Exelente atención,servicio y muy buen lugar', rating: 5 },
      { name: 'David Reyes', text: 'Excelente precio, muy buen servicio', rating: 5 },
      { name: 'DEIGO MESA', text: 'Excelente servicio , muy rápido y confiable 👍👍👍 todo garantizado , buenos precios…', rating: 5 },
      { name: 'EDER SAMUEL MORENO PARRA', text: 'Excelentes precios y servicio', rating: 5 },
      { name: 'Claudia Maritza Arenas Giraldo', text: 'Excelente atención, gran variedad de productos y tenían todo lo que yo necesitaba', rating: 5 },
      { name: 'Maria Medina', text: 'Compré mi primer iPhone acá en la sede de Tunja', rating: 5 },
      { name: 'Julian Alberto Pedraza Estepa', text: 'Buen local precios accesibles.', rating: 5 },
      { name: 'Jhon Jairo Gil Hernandez', text: 'Feliz muy agradecido excelente atención super recomendados', rating: 5 },
      { name: 'Camilo Barrera', text: 'Excelente lugar buenos teléfonos', rating: 5 },
      { name: 'Hugo Alejandro Ramirez', text: 'Excelente servicio , calidad en productos 100% originales!!', rating: 5 },
      { name: 'Sofía Rosas', text: 'Excelente atención,muy amables', rating: 5 },
      { name: 'Paula Robles Serna', text: 'Excelente servicio y muy buenos precios. Las chicas muy atentas y se enfocan en ayudarte a encontrar lo que quieres 🔝🔝…', rating: 5 },
      { name: 'sebastian Montoya', text: 'De verdad que da gusto comprar en un sitio así. La atención es espectacular, el equipo es muy profesional y se nota que les importa el cliente. Me ayudaron en todo el proceso y resolvieron todas mis dudas. 10/10 🔥…', rating: 5 },
      { name: 'Claudia Rocio Pulido Moreno', text: 'Hoy pasé por el local a comprar un cargador para mi celular y la atención fue excelente, aparte cargadores y accesorios 100% originales, muy recomendado 👌…', rating: 5 },
      { name: 'Leidy Pinzon', text: 'Muy amables las chicas que atienden, y los productos a muy buen precio y excelente calidad.', rating: 5 },
      { name: 'Karen Rosas', text: 'Excelente servicio, las chicas muy atentas y eficientes! Y los productos 10/10 súper recomendado', rating: 5 },
      { name: 'ANA GABRIELA PEREZ TORRES', text: 'Excelente servicio', rating: 5 },
      { name: 'michael daniel garcia bernal', text: 'Compre el s26 ultra, excelente atencion y muy buen servicio total recomendacion 10/10', rating: 5 },
      { name: 'juan fernando g c', text: 'Hoy compré un iPhone 17 pro, excelente atención de las chicas y productos totalmente originales 10/10', rating: 5 },
      { name: 'sol jacome', text: 'Los visite en unicentro Tunja y muy buenos los precios, adquirí con ellos mi 17 pro', rating: 5 },
      { name: 'Juanita Maria Sosa Avendaño', text: 'Súper recomendado, tienen todos los productos de Apple con excelentes precios y una buena atención', rating: 5 },
      { name: 'Valentina Rodriguez Alba', text: 'Visité la tienda en Unicentro Tunja para ver algunas MacBook y me gustó mucho la experiencia. La atención fue buena y me explicaron sobre los equipos. El lugar es organizado y tienen muy buena tecnología. Recomendado.', rating: 5 },
      { name: 'luis alejandro rodriguez', text: 'La atención, los precios y los equipos son los mejores. Gran axperiencia ✌️', rating: 5 },
    ],
  },
  clinica: {
    googleUrl: 'https://share.google/z6R68LbLiy6u4qj35',
    rating: 4.9,
    count: 28,
    reviews: [
      { name: 'jose david vargas mayorga', text: 'Excelente servicio lo recomiendo viene con todo lo q dice', rating: 5 },
      { name: 'German Adolfo Gonzalez Sanabria', text: 'Buena experiencia, productos originales ya precios accesibles.', rating: 5 },
      { name: 'Ginita Bonita', text: 'Excelente asesoría y muy buen equipo de trabajo', rating: 5 },
      { name: 'Sammy Rojas', text: 'Buen trabajo , increíble resultado, le metió mucho amor al teléfono Muy buenos equipos y excelente equipo de trabajo', rating: 5 },
      { name: 'Valentina Cuervo rodriguez', text: 'Un excelente servicio y la mejor atención por parte de Daniela', rating: 5 },
      { name: 'Juan José Cabra Núñez', text: 'Muy buena experiencia. Daniela me atendió súper bien, fue muy amable y me asesoró perfectamente. Los AirPods funcionan excelente. Recomendado', rating: 5 },
      { name: 'jaider santiago huerfano bautista', text: 'Excelente servicio', rating: 5 },
      { name: 'Leonela Muñoz Acevedo', text: 'Gracias por ese iPhone 17 pro y la MacBook Air ❤️ totalmente nuevos y con su garantía de 1 año. Gracias Daniela por la atención en el momento de la compra.', rating: 5 },
      { name: 'Sleyder A', text: 'El iPhone 17 pro Max que compré con ellos salió perfecto y su garantía de un año lo mejora aún más. Daniela demostró mucha responsabilidad a la hora de la venta.', rating: 5 },
      { name: 'Victor Navarro', text: 'Compré mi iPhone en esta tienda y la experiencia fue excelente. Desde el inicio me atendieron muy bien, resolvieron todas mis dudas y me explicaron las diferencias entre los modelos sin presión para comprar. El equipo llegó en perfecto estado, totalmente original y tal como lo describían. Además, la entrega fue rápida y bien organizada. Me dio mucha confianza la forma en que manejan todo, desde el pago hasta la garantía. Sin duda recomiendo esta tienda si estás pensando en comprar un iPhone, ya que ofrecen buen servicio, transparencia y productos de calidad. Volvería a comprar con ellos sin pensarlo.', rating: 5 },
      { name: 'Cely Saavedra Cristian Geobanny', text: 'Exelente servicio... La atención exelente', rating: 5 },
      { name: 'Leonardo Salcedo', text: 'Excelente servicio, buena atención, y excelente trabajo en el arreglo de mi equipo. Muchas gracias.', rating: 5 },
      { name: 'Deybid Muñoz', text: 'Tiene buen servicio, hice un cambio de tapa de mi 14 pro Max, quedó perfecto y la calidad buena. La atención de Daniela fue perfecta.', rating: 5 },
      { name: 'Jhoan Pinto', text: 'Efectivo y recomendado, súper me resolvió en un momento, lo había llevado a otro lugar y me dijeron que no tenía arreglo y lo traje aquí donde el gordotech y me lo arreglo en 10 minutos, buen despachador y técnico, me voy feliz y sastifecha gracias!', rating: 5 },
      { name: 'glory man', text: 'La mejor tienda de celulares que puede existir en Boyaca, y sus mejores asesores en espacial Daniela', rating: 5 },
      { name: 'yecid sanabria', text: 'Súper, excelente servicio', rating: 5 },
      { name: 'Liseth gonzalez', text: 'Muy bien servicio', rating: 4 },
      { name: 'Lisethe Vargas', text: 'Tuve buena asesoría de parte del técnico y a la chica, fueron muy sinceros si era bueno salvar mi celular, y lleve uno mejor 😅…', rating: 5 },
      { name: 'Brayan sanchez', text: 'Excelente servicio', rating: 4 },
      { name: 'Fabio Moreno', text: 'Hice la restauración de iPhone 13 Pro Max de visor y tapa trasera y quedó a la altura 100%recomendado', rating: 5 },
      { name: 'Sarai Daniela Salcedo Daza', text: 'Me ayudaron a reparar la pantalla de mi teléfono, y quedó súper bien y su atención con su explicación también', rating: 5 },
      { name: 'Sergio Melendez', text: 'Buena experiencia arreglando mi S24, Rapido y buen servicio', rating: 5 },
    ],
  },
}

const SUCURSAL_MAPS: Record<string, string> = {
  duitama: 'https://www.google.com/maps/dir//Gordotech+Duitama,+Cl.+20a+%2312-32,+Solano,+Duitama,+Boyac%C3%A1/@5.8259915,-73.0301255,14z/data=!4m8!4m7!1m0!1m5!1m1!1s0x8e6a3fb0048fe77f:0xd1f7a4fb7101b8e8!2m2!1d-73.0317497!2d5.8320283',
  tunja: 'https://www.google.com/maps/dir//Oporto+Centro+de+Negocios,+Av.+Universitaria+%2345a-40,+Tunja,+Boyac%C3%A1',
  clinica: 'https://www.google.com/maps/search/Clinica+de+Celulares+Gordotech+San+Andresito+de+la+18+Duitama',
}

const DEFAULT_SUCURSALES: Sucursal[] = [
  { id: 1, name: 'Gordotech Duitama', slug: 'duitama', address: 'Pasaje Comercial Solano, Local 102', city: 'Duitama', image: '', whatsapp: '573144810431', instagram: 'https://www.instagram.com/gordotechduitama', tiktok: 'https://www.tiktok.com/@gordotech1', phone: '+57 314 481 0431', description: 'Tu destino Apple en Duitama', sort_order: 0, active: true },
  { id: 2, name: 'Gordotech Tunja', slug: 'tunja', address: 'Av. Universitaria # 45a-40, Oficina 304, Oporto Centro de Negocios', city: 'Tunja', image: '', whatsapp: '573219863883', instagram: 'https://www.instagram.com/gordotechtunja', tiktok: 'https://www.tiktok.com/@gordotech1', phone: '+57 321 986 3883', description: 'Tu destino Apple en Tunja', sort_order: 1, active: true },
  { id: 3, name: 'Clinica de Celulares', slug: 'clinica', address: 'San Andresito de la 18, Local 11', city: 'Duitama', image: '', whatsapp: '573213815465', instagram: 'https://www.instagram.com/clinicadecelulares_gordotech', tiktok: 'https://www.tiktok.com/@gordotech1', phone: '+57 321 381 5465', description: 'Reparacion profesional - Diagnostico Gratis', sort_order: 2, active: true },
]

function ReviewsMarquee({ reviews, googleUrl, rating, count }: { reviews: SucursalReview[]; googleUrl: string; rating: number; count: number }) {
  const doubled = [...reviews, ...reviews]
  const stars = (r: number) => {
    const full = Math.floor(r)
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-2.5 h-2.5 ${i < full ? 'text-amber-400 fill-amber-400' : 'text-gray-500'}`} />
    ))
  }
  return (
    <div className="w-full overflow-hidden">
      {/* Rating summary + Google link */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">{stars(rating)}</div>
          <span className="text-white/90 text-xs font-semibold">{rating}</span>
          <span className="text-white/50 text-xs">({count})</span>
        </div>
        <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white/90 text-xs transition-colors underline underline-offset-2">
          Ver en Google
        </a>
      </div>
      {/* Scrolling reviews */}
      <div className="relative overflow-hidden">
        <div className="flex gap-4 animate-reviews-scroll" style={{ width: 'max-content', '--marquee-duration': `${Math.round(reviews.length * (25 / 7))}s` } as React.CSSProperties}>
          {doubled.map((r, i) => (
            <div key={i} className="flex-shrink-0 w-52 rounded-lg px-3 py-2" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-white/90 text-xs font-semibold">{r.name}</span>
                <div className="flex gap-0.5 ml-auto">{stars(r.rating)}</div>
              </div>
              <p className="text-white/70 text-xs leading-relaxed line-clamp-2">{r.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SucursalesPage({ isDarkMode }: { isDarkMode: boolean }) {
  const navigate = useNavigate()
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewsMap, setReviewsMap] = useState<Record<string, { reviews: SucursalReview[]; googleUrl: string; rating: number; count: number }>>({})

  useEffect(() => {
    window.scrollTo(0, 0)
    document.title = 'Sucursales Gordotech | Tiendas Apple en Duitama, Tunja, Boyaca'
    const meta = document.querySelector('meta[name="description"]')
    if (meta) meta.setAttribute('content', 'Encuentra tu tienda Gordotech mas cercana. Sucursales en Duitama, Tunja y Clinica de Celulares. Atendemos clientes de Paipa, Sogamoso, Nobsa, Santa Rosa de Viterbo y Tibasosa. Horarios, direcciones y contacto WhatsApp.')
    const kwMeta = document.querySelector('meta[name="keywords"]')
    if (kwMeta) kwMeta.setAttribute('content', 'tienda Apple Duitama, tienda Apple Tunja, tienda celulares Duitama, tienda celulares Tunja, Gordotech Duitama, Gordotech Tunja, sucursales Gordotech, tienda iPhone Duitama, tienda iPhone Tunja, tienda Apple Paipa, tienda Apple Sogamoso, tienda tecnologia Duitama, tienda tecnologia Tunja, clinica celulares Duitama, Apple store Boyaca, donde comprar iPhone Duitama, donde comprar iPhone Tunja, donde comprar iPhone Paipa, donde comprar iPhone Sogamoso')
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement
    if (!canonical) { canonical = document.createElement('link'); canonical.setAttribute('rel', 'canonical'); document.head.appendChild(canonical) }
    canonical.setAttribute('href', 'https://gordotech.co/sucursales')
    const ogUrl = document.querySelector('meta[property="og:url"]')
    if (ogUrl) ogUrl.setAttribute('content', 'https://gordotech.co/sucursales')
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/sucursales`)
        const data = await res.json()
        if (data.sucursales && data.sucursales.length > 0) {
          setSucursales(data.sucursales)
          // Load reviews from API for each sucursal
          const rMap: Record<string, { reviews: SucursalReview[]; googleUrl: string; rating: number; count: number }> = {}
          await Promise.all(data.sucursales.map(async (s: Sucursal) => {
            try {
              const rRes = await fetch(`${API_URL}/api/sucursales/${s.slug}/resenas`)
              const rData = await rRes.json()
              if (rData.reviews && rData.reviews.length > 0) {
                const apiReviews: SucursalReview[] = rData.reviews.map((r: { customer_name: string; text: string; rating: number }) => ({ name: r.customer_name, text: r.text, rating: r.rating }))
                const avgRating = apiReviews.reduce((sum: number, r: SucursalReview) => sum + r.rating, 0) / apiReviews.length
                rMap[s.slug] = { reviews: apiReviews, googleUrl: SUCURSAL_REVIEWS[s.slug]?.googleUrl || '#', rating: Math.round(avgRating * 10) / 10, count: apiReviews.length }
              } else if (SUCURSAL_REVIEWS[s.slug]) {
                rMap[s.slug] = SUCURSAL_REVIEWS[s.slug]
              }
            } catch {
              if (SUCURSAL_REVIEWS[s.slug]) {
                rMap[s.slug] = SUCURSAL_REVIEWS[s.slug]
              }
            }
          }))
          setReviewsMap(rMap)
        } else {
          setSucursales(DEFAULT_SUCURSALES)
          setReviewsMap(SUCURSAL_REVIEWS)
        }
      } catch {
        setSucursales(DEFAULT_SUCURSALES)
        setReviewsMap(SUCURSAL_REVIEWS)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-lg shadow-lg shadow-black/10 dark:shadow-black/20 border-b border-gray-200 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>
            <button onClick={() => navigate('/')} className="flex items-center gap-2 cursor-pointer">
              <img src="/images/gordotech-icon-white.png" alt="Gordotech" className="h-8 gordotech-logo-invert" />
              <img src="/images/gordotech-text-logo.png" alt="Gordotech" className="h-6 gordotech-logo-invert" />
            </button>
            <div className="w-16" />
          </div>
        </div>
      </header>

      <div className="pt-20">
        <section className="py-12 md:py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 dark:from-blue-600/10 via-transparent to-purple-600/3 dark:to-purple-600/5" />
          <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
            <div className="text-center mb-10">
              <h3 className="text-4xl md:text-6xl font-bold mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}>
                NUESTRAS <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">SEDES</span>
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-base max-w-xl mx-auto">
                Visitanos en nuestras tiendas fisicas en Boyaca.
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto mb-12 px-4">
                {sucursales.filter(s => s.active).map((s) => {
                  const bgImage = s.image ? resolveImageUrl(s.image) : ''
                  const waUrl = `https://wa.me/${s.whatsapp}?text=${encodeURIComponent(`Hola ${s.name}, quiero visitarlos`)}`
                  const reviewData = reviewsMap[s.slug]
                  return (
                    <div key={s.id} className="rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-xl group transition-transform duration-300 hover:-translate-y-1">
                      {/* Photo with overlay info */}
                      <div className="relative overflow-hidden" style={{ aspectRatio: '3/4' }}>
                        {bgImage ? (
                          <img
                            src={bgImage}
                            alt={s.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                            <MapPin className="w-16 h-16 text-gray-600" />
                          </div>
                        )}
                        {/* Gradient overlays - top and bottom for readability */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/70" />

                        {/* Name + Address at TOP-left with margin - force white text over photo */}
                        <a
                          href={SUCURSAL_MAPS[s.slug] || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute top-4 left-4 right-4 cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ color: 'white', textDecoration: 'none' }}
                        >
                          <h4 className="font-bold text-xl leading-tight mb-1 drop-shadow-lg" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px', color: 'white' }}>
                            {s.name.toUpperCase()}
                          </h4>
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-blue-300 mt-0.5 flex-shrink-0" />
                            <p className="text-xs leading-snug drop-shadow" style={{ color: '#e5e7eb' }}>{s.address}</p>
                          </div>
                        </a>

                        {/* Reviews marquee at BOTTOM inside the photo */}
                        {reviewData && (
                          <div className="absolute bottom-3 left-0 right-0 px-3">
                            <ReviewsMarquee
                              reviews={reviewData.reviews}
                              googleUrl={reviewData.googleUrl}
                              rating={reviewData.rating}
                              count={reviewData.count}
                            />
                          </div>
                        )}
                      </div>

                      {/* Social links below the photo */}
                      <div className="px-3 sm:px-5 py-4 flex items-center justify-between gap-2 sm:gap-3">
                        {/* WhatsApp */}
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackWhatsAppClick(s.city || s.name, 'sucursales')}
                          className="flex items-center gap-1.5 sm:gap-2 flex-1 justify-center px-2 sm:px-3 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-200 rounded-xl transition-colors text-xs font-semibold min-w-0"
                        >
                          <img src="/images/whatsapp-logo.png" alt="WhatsApp" loading="lazy" decoding="async" className="w-4 h-4 object-contain flex-shrink-0" />
                          <span className="truncate">WhatsApp</span>
                        </a>

                        {/* Instagram */}
                        {s.instagram && (
                          <a
                            href={s.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 sm:gap-2 flex-1 justify-center px-2 sm:px-3 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-200 rounded-xl transition-colors text-xs font-semibold min-w-0"
                          >
                            <Instagram className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">Instagram</span>
                          </a>
                        )}

                        {/* TikTok */}
                        {s.tiktok && (
                          <a
                            href={s.tiktok}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 sm:gap-2 flex-1 justify-center px-2 sm:px-3 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-200 rounded-xl transition-colors text-xs font-semibold min-w-0"
                          >
                            <TikTokIcon className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">TikTok</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Back button */}
            <div className="text-center mt-10">
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 px-8 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-white rounded-xl transition-colors text-sm border border-gray-300 dark:border-white/10"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver al inicio
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

// Category page - shows all products of a specific category
function CategoryPage({ onAdminClick, isDarkMode, setIsDarkMode }: { onAdminClick: () => void; isDarkMode: boolean; setIsDarkMode: (v: boolean) => void }) {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [allProducts, setAllProducts] = useState<Product[]>(products)
  const [activeCondition, setActiveCondition] = useState<string>(slug === 'iphones' ? 'nuevos' : 'todos')
  const [loading, setLoading] = useState(true)

  // Category label mapping
  const categoryLabels: Record<string, string> = {
    'iphones': 'iPhones', 'ipads': 'iPads', 'macbook': 'MacBook', 'macbooks': 'MacBook',
    'airpods': 'AirPods', 'apple-watch': 'Apple Watch', 'apple watch': 'Apple Watch',
    'accesorios': 'Accesorios', 'todos': 'Todos los Productos',
  }
  const categoryLabel = categoryLabels[slug || ''] || slug || 'Productos'

  useEffect(() => {
    window.scrollTo(0, 0)
    document.title = `${categoryLabel} | Gordotech - Tienda Apple en Duitama, Tunja y Boyaca`
    const meta = document.querySelector('meta[name="description"]')
    if (meta) meta.setAttribute('content', `Compra ${categoryLabel} en Gordotech. Productos Apple nuevos y semi-nuevos con garantia en Duitama, Tunja, Paipa, Sogamoso y toda Boyaca. Los mejores precios en ${categoryLabel}. Envios a Nobsa, Santa Rosa de Viterbo y Tibasosa.`)
    const kwMeta = document.querySelector('meta[name="keywords"]')
    if (kwMeta) kwMeta.setAttribute('content', `${categoryLabel} Duitama, ${categoryLabel} Tunja, ${categoryLabel} Paipa, ${categoryLabel} Sogamoso, ${categoryLabel} Boyaca, comprar ${categoryLabel} Duitama, comprar ${categoryLabel} Tunja, comprar ${categoryLabel} Paipa, comprar ${categoryLabel} Sogamoso, ${categoryLabel} precio Colombia, ${categoryLabel} nuevo, ${categoryLabel} semi-nuevo, ${categoryLabel} garantia Boyaca, Gordotech ${categoryLabel}, ${categoryLabel} Nobsa, ${categoryLabel} Santa Rosa de Viterbo, ${categoryLabel} Tibasosa`)
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement
    if (!canonical) { canonical = document.createElement('link'); canonical.setAttribute('rel', 'canonical'); document.head.appendChild(canonical) }
    canonical.setAttribute('href', `https://gordotech.co/categoria/${slug}`)
    const ogUrl = document.querySelector('meta[property="og:url"]')
    if (ogUrl) ogUrl.setAttribute('content', `https://gordotech.co/categoria/${slug}`)
    const loadProducts = async () => {
      try {
        const res = await fetch(`${API_URL}/api/products?city=duitama`)
        const data = await res.json()
        if (data?.products) {
          const mapped = data.products.map((p: Record<string, unknown>) => ({
            id: p.id as number, name: p.name as string, category: (p.category as string) || '',
            condition: p.condition as string, image: resolveImageUrl(p.image as string),
            images: ((p.images as string[]) || []).map(resolveImageUrl), colors: p.colors as string[],
            color_images: (() => { const ci = (p.color_images as Record<string, string[] | string>) || {}; const resolved: Record<string, string[]> = {}; for (const [k, v] of Object.entries(ci)) { resolved[k] = (Array.isArray(v) ? v : v ? [v] : []).map(resolveImageUrl); } return resolved; })(),
            storageOptions: p.storage_options as string[], badge: (p.badge as string) || ((p.condition as string) === 'Nuevo' ? 'Nuevo' : null),
            available: p.available as string[], price: (p.price as string) || '',
            oldPrice: (p.old_price as string) || '', description: (p.description as string) || '',
            variants: (p.variants as Product['variants']) || [],
          }))
          setAllProducts(mapped)
          preloadImages(mapped.map(p => p.image))
        }
      } catch {
        // fallback to static
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [slug, categoryLabel])

  const filtered = allProducts.filter(p => {
    if (activeCondition === 'nuevos' && p.condition !== 'Nuevo') return false
    if (activeCondition === 'semi-usados' && p.condition !== 'Semi-usado') return false
    if (slug && slug !== 'todos') {
      if (p.category) {
        if (p.category === slug || p.category === slug.replace(' ', '-')) return true
      }
      const name = p.name.toLowerCase()
      switch (slug) {
        case 'iphones': return name.includes('iphone')
        case 'ipads': return name.includes('ipad')
        case 'macbook': case 'macbooks': return name.includes('macbook')
        case 'airpods': return name.includes('airpods')
        case 'apple-watch': case 'apple watch': return name.includes('apple watch')
        case 'accesorios': return name.includes('pencil') || name.includes('accesorio') || name.includes('airtag')
        default: return name.includes(slug.toLowerCase())
      }
    }
    return true
  })

  return (
    <div className="min-h-screen bg-gray-950 text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-950/95 backdrop-blur-lg shadow-lg shadow-black/20 border-b border-white/5">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => navigate('/')} className="flex items-center gap-2">
              <ArrowLeft className="w-5 h-5 text-gray-400" />
              <img src="/images/gordotech-icon-white.png" alt="Gordotech" className="h-8 gordotech-logo-invert" />
              <img src="/images/gordotech-text-logo.png" alt="Gordotech" className="h-5 hidden sm:block gordotech-logo-invert" />
            </button>
            <h1 className="text-lg lg:text-2xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '2px' }}>{categoryLabel}</h1>
            <div className="w-20" />
          </div>
        </div>
      </header>

      <div className="pt-20 pb-12">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
          {/* Condition filter tabs - only for iPhones */}
          {slug === 'iphones' && (
          <div className="flex gap-2 mb-8 justify-center">
            {(['nuevos', 'semi-usados'] as const).map(cond => (
              <button
                key={cond}
                onClick={() => {
                  if (cond === 'semi-usados') {
                    navigate('/semi-nuevos')
                  } else {
                    setActiveCondition(cond)
                  }
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCondition === cond
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {cond === 'nuevos' ? 'Nuevos' : 'Semi-nuevos'}
              </button>
            ))}
          </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <img src="/images/gordotech-icon-white.png" alt="Cargando" className="h-12 animate-pulse" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg mb-4">No hay productos en esta categoria</p>
              <button onClick={() => navigate('/')} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors">Volver al inicio</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 lg:gap-8">
              {filtered.map(product => (
                <button
                  key={product.id}
                  onClick={() => navigate(`/producto/${product.id}/${getProductSlug(product)}`, { state: { product } })}
                  className="group text-left bg-white/5 rounded-2xl border border-white/5 overflow-hidden hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-1"
                >
                  <div className="relative aspect-square bg-gray-900/50 p-4 flex items-center justify-center img-shimmer">
                    {product.badge && (
                      <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500 text-white">{product.badge}</div>
                    )}
                    <div className={`absolute ${product.badge ? 'top-12' : 'top-3'} right-3 z-10 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`}>
                      <Heart className="w-4 h-4 text-gray-300" />
                    </div>
                    <img src={product.image} alt={product.name} loading="eager" decoding="async" className="w-full h-full object-contain rounded-xl group-hover:scale-105 transition-transform duration-500" onLoad={(e) => { (e.target as HTMLImageElement).parentElement?.classList.remove('img-shimmer') }} onError={(e) => { (e.target as HTMLImageElement).parentElement?.classList.remove('img-shimmer'); (e.target as HTMLImageElement).src = `https://placehold.co/400x400/1a1a2e/7BA3C9/png?text=${encodeURIComponent(product.name)}` }} />
                  </div>
                  <div className="p-3 md:p-4">
                    <p className={`text-xs font-medium mb-1 ${product.condition === 'Nuevo' ? 'text-blue-400' : 'text-amber-400'}`}>{displayCondition(product.condition)}</p>
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
                    {(() => { const minV = getMinVariantPrice(product); const displayPrice = minV ? minV.price : product.price; const showDesde = minV?.hasMultiple; return product.condition !== 'Semi-usado' && displayPrice && displayPrice !== '-' ? (
                      <div className="mb-1">
                        {!minV && product.oldPrice && product.oldPrice !== '-' && (
                          <p className="text-[10px] text-red-400 line-through">$ {product.oldPrice}</p>
                        )}
                        <p className="text-base md:text-lg font-bold text-white">{showDesde ? 'Desde ' : ''}$ {displayPrice}</p>
                      </div>
                    ) : product.condition !== 'Semi-usado' ? (
                      <p className="text-xs text-blue-400 font-medium flex items-center gap-1 mb-1"><MessageCircle className="w-3 h-3" /> Consultar Precio</p>
                    ) : null })()}
                    <div className="flex flex-wrap gap-x-2">
                      {(['duitama', 'tunja'] as const).filter(c => product.available.includes(c)).map(c => (
                        <p key={c} className="text-[10px] text-green-400 font-medium flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> {c === 'duitama' ? 'Duitama' : 'Tunja'}</p>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ProductPageWrapper({ onAdminClick, isDarkMode, setIsDarkMode }: { onAdminClick: () => void; isDarkMode: boolean; setIsDarkMode: (v: boolean) => void }) {
  const { id, slug } = useParams<{ id: string; slug: string }>()
  const location = useLocation()
  const initialProduct = (location.state as { product?: Product })?.product
  return <Store onAdminClick={onAdminClick} productSlug={slug} productId={id} initialProduct={initialProduct} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
}

// Legacy slug-only wrapper for backwards compatibility
function ProductPageWrapperLegacy({ onAdminClick, isDarkMode, setIsDarkMode }: { onAdminClick: () => void; isDarkMode: boolean; setIsDarkMode: (v: boolean) => void }) {
  const { slug } = useParams<{ slug: string }>()
  return <Store onAdminClick={onAdminClick} productSlug={slug} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
}

function PopupOverlay() {
  const [popups, setPopups] = useState<{ id: number; image: string; title: string; link: string }[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const alreadyDismissed = sessionStorage.getItem('gordotech_popup_dismissed')
    if (alreadyDismissed) {
      setDismissed(true)
      return
    }
    fetch(`${API_URL}/api/popups`)
      .then(r => r.json())
      .then(data => {
        if (data.popups && data.popups.length > 0) {
          setPopups(data.popups)
        }
      })
      .catch(() => {})
  }, [])

  const handleClose = () => {
    setDismissed(true)
    sessionStorage.setItem('gordotech_popup_dismissed', '1')
  }

  if (dismissed || popups.length === 0) return null

  const popup = popups[currentIndex]

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <div
        className="relative max-w-lg w-full max-h-[90vh] animate-in fade-in zoom-in"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute -top-3 -right-3 z-10 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5 text-gray-800" />
        </button>

        {popup.link ? (
          <a href={popup.link} target="_blank" rel="noopener noreferrer" onClick={handleClose}>
            <img
              src={popup.image}
              alt={popup.title || 'Promocion'}
              className="w-full h-auto rounded-2xl shadow-2xl object-contain max-h-[85vh]"
            />
          </a>
        ) : (
          <img
            src={popup.image}
            alt={popup.title || 'Promocion'}
            className="w-full h-auto rounded-2xl shadow-2xl object-contain max-h-[85vh]"
          />
        )}

        {popups.length > 1 && (
          <div className="flex justify-center gap-2 mt-3">
            {popups.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${i === currentIndex ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function App() {
  const [showAdmin, setShowAdmin] = useState(false)

  // Global theme management - persists across all pages and refreshes
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('gordotech_theme')
    return saved ? saved === 'dark' : false
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDarkMode) {
      root.classList.remove('light-mode')
    } else {
      root.classList.add('light-mode')
    }
    localStorage.setItem('gordotech_theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

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

  // Check URL hash or admin subdomain for admin access
  useEffect(() => {
    if (window.location.hash === '#admin' || window.location.hostname === 'admin.gordotech.co') {
      setShowAdmin(true)
    }
  }, [])

  if (showAdmin) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="w-12 h-12 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div>}>
        <AdminPanel onExit={() => { setShowAdmin(false); window.location.hash = '' }} />
      </Suspense>
    )
  }

  return (
    <>
      <PopupOverlay />
      <Routes>
        <Route path="/plan-retoma" element={<PlanRetomaPage isDarkMode={isDarkMode} />} />
        <Route path="/reparacion" element={<ReparacionPage isDarkMode={isDarkMode} />} />
        <Route path="/semi-nuevos" element={<SemiNuevosPage isDarkMode={isDarkMode} />} />
        <Route path="/sucursales" element={<SucursalesPage isDarkMode={isDarkMode} />} />
        <Route path="/categoria/:slug" element={<CategoryPage onAdminClick={() => setShowAdmin(true)} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />} />
        <Route path="/producto/:id/:slug" element={<ProductPageWrapper onAdminClick={() => setShowAdmin(true)} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />} />
        <Route path="/producto/:slug" element={<ProductPageWrapperLegacy onAdminClick={() => setShowAdmin(true)} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />} />
        <Route path="*" element={<Store onAdminClick={() => setShowAdmin(true)} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />} />
      </Routes>
    </>
  )
}

export default App

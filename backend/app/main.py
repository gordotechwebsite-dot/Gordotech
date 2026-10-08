from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, Union, Any
import aiosqlite
import json
import os
import re
import uuid
import shutil
import time
from collections import defaultdict
from datetime import datetime, timedelta
from jose import jwt, JWTError
import bcrypt as bcrypt_lib

from app.database import get_db, init_db, seed_default_data, DB_PATH
from app.storage import upload_file, is_r2_enabled, UPLOAD_DIR

app = FastAPI()

# CORS - restricted to known origins
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "https://gordotech.co,https://www.gordotech.co,https://admin.gordotech.co,http://localhost:5173,http://localhost:4173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT Config
_jwt_secret = os.environ.get("JWT_SECRET", "")
if not _jwt_secret:
    import logging as _logging
    _logging.getLogger(__name__).warning(
        "JWT_SECRET not set! Using insecure default. Set JWT_SECRET env var in production."
    )
    _jwt_secret = "gordotech-secret-key-2024-change-in-production"
SECRET_KEY = _jwt_secret
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# Rate limiting for login
_login_attempts: dict[str, list[float]] = defaultdict(list)
LOGIN_MAX_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 900  # 15 minutes

# Max upload size: 10 MB
MAX_UPLOAD_SIZE = 10 * 1024 * 1024

# Mount uploads as static files (local fallback when R2 is not configured)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ==================== STARTUP ====================

@app.on_event("startup")
async def startup():
    await init_db()
    await seed_default_data()
    import logging
    logger = logging.getLogger(__name__)
    if is_r2_enabled():
        logger.info("Cloudflare R2 storage is ENABLED - images will be stored in R2")
    else:
        logger.info("Cloudflare R2 storage is NOT configured - using local filesystem storage")

# ==================== MODELS ====================

class LoginRequest(BaseModel):
    username: str
    password: str

class ProductCreate(BaseModel):
    name: str
    category: str = ""
    condition: str = "Semi-usado"
    image: str = ""
    images: list[str] = []
    colors: list[str] = []
    # color -> list of image URLs (group of photos for that color)
    color_images: dict[str, Union[str, list[str]]] = {}
    storage_options: list[str] = []
    badge: Optional[str] = None
    available: list[str] = ["duitama", "tunja"]
    price: str = ""
    old_price: str = ""
    description: str = ""
    featured_recommended: bool = False
    featured_trending: bool = False
    sort_order: int = 0
    model_3d: str = ""

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    condition: Optional[str] = None
    image: Optional[str] = None
    images: Optional[list[str]] = None
    colors: Optional[list[str]] = None
    color_images: Optional[dict[str, Union[str, list[str]]]] = None
    storage_options: Optional[list[str]] = None
    badge: Optional[str] = None
    available: Optional[list[str]] = None
    price: Optional[str] = None
    old_price: Optional[str] = None
    description: Optional[str] = None
    featured_recommended: Optional[bool] = None
    featured_trending: Optional[bool] = None
    sort_order: Optional[int] = None
    model_3d: Optional[str] = None

class CategoryCreate(BaseModel):
    slug: str
    name: str
    image: str = ""
    sort_order: int = 0

class CategoryUpdate(BaseModel):
    slug: Optional[str] = None
    name: Optional[str] = None
    image: Optional[str] = None
    sort_order: Optional[int] = None

class BubbleCreate(BaseModel):
    model_id: str
    label: str
    image: str = ""
    sort_order: int = 0

class BubbleUpdate(BaseModel):
    model_id: Optional[str] = None
    label: Optional[str] = None
    image: Optional[str] = None
    sort_order: Optional[int] = None

class RepairServiceCreate(BaseModel):
    title: str
    description: str = ""
    price: str = ""
    icon: str = "Smartphone"
    sort_order: int = 0

class RepairServiceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[str] = None
    icon: Optional[str] = None
    sort_order: Optional[int] = None

class HeroSlideCreate(BaseModel):
    title: str = ""
    subtitle: str = ""
    image: str = ""
    video_url: str = ""
    link: str = ""
    active: bool = True
    sort_order: int = 0

class HeroSlideUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    image: Optional[str] = None
    video_url: Optional[str] = None
    link: Optional[str] = None
    active: Optional[bool] = None
    sort_order: Optional[int] = None

class MarqueeTextCreate(BaseModel):
    text: str = ""
    active: bool = True
    sort_order: int = 0

class MarqueeTextUpdate(BaseModel):
    text: Optional[str] = None
    active: Optional[bool] = None
    sort_order: Optional[int] = None

class SucursalCreate(BaseModel):
    name: str
    slug: str = ""
    address: str = ""
    city: str = ""
    image: str = ""
    whatsapp: str = ""
    instagram: str = ""
    tiktok: str = ""
    phone: str = ""
    description: str = ""
    sort_order: int = 0
    active: bool = True

class SucursalUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    image: Optional[str] = None
    whatsapp: Optional[str] = None
    instagram: Optional[str] = None
    tiktok: Optional[str] = None
    phone: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None
    active: Optional[bool] = None

class ReviewCreate(BaseModel):
    sucursal_slug: str
    customer_name: str
    rating: int = 5
    text: str = ""
    sort_order: int = 0
    active: bool = True

class ReviewUpdate(BaseModel):
    sucursal_slug: Optional[str] = None
    customer_name: Optional[str] = None
    rating: Optional[int] = None
    text: Optional[str] = None
    sort_order: Optional[int] = None
    active: Optional[bool] = None

class RepairGalleryCreate(BaseModel):
    image: str = ""
    caption: str = ""
    sort_order: int = 0
    active: bool = True

class RepairGalleryUpdate(BaseModel):
    image: Optional[str] = None
    caption: Optional[str] = None
    sort_order: Optional[int] = None
    active: Optional[bool] = None

class VariantCreate(BaseModel):
    storage: str = ""
    color: str = ""
    price: str = ""
    sort_order: int = 0
    active: bool = True

class VariantUpdate(BaseModel):
    storage: Optional[str] = None
    color: Optional[str] = None
    price: Optional[str] = None
    sort_order: Optional[int] = None
    active: Optional[bool] = None

class PopupCreate(BaseModel):
    image: str = ""
    title: str = ""
    link: str = ""
    active: bool = True
    sort_order: int = 0

class PopupUpdate(BaseModel):
    image: Optional[str] = None
    title: Optional[str] = None
    link: Optional[str] = None
    active: Optional[bool] = None
    sort_order: Optional[int] = None

class CategoryBannerCreate(BaseModel):
    category: str = ""
    image: str = ""
    title: str = ""
    subtitle: str = ""
    link: str = ""
    active: bool = True
    sort_order: int = 0

class CategoryBannerUpdate(BaseModel):
    category: Optional[str] = None
    image: Optional[str] = None
    title: Optional[str] = None
    subtitle: Optional[str] = None
    link: Optional[str] = None
    active: Optional[bool] = None
    sort_order: Optional[int] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

# ==================== AUTH ====================

def create_token(username: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    return jwt.encode({"sub": username, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)

async def verify_token(token: str) -> str:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Token invalido")
        return username
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalido o expirado")

async def get_current_admin(
    request: Request,
    token: Optional[str] = Query(None),
):
    """Get admin from Authorization header (preferred) or query param token (legacy)."""
    jwt_token = None
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        jwt_token = auth_header[7:]
    elif token:
        jwt_token = token
    if not jwt_token:
        raise HTTPException(status_code=401, detail="No autorizado")
    return await verify_token(jwt_token)

# Helper to parse row to dict
def generate_slug(name: str) -> str:
    """Generate a URL-friendly slug from a product name."""
    slug = name.lower().strip()
    slug = re.sub(r'[áàäâ]', 'a', slug)
    slug = re.sub(r'[éèëê]', 'e', slug)
    slug = re.sub(r'[íìïî]', 'i', slug)
    slug = re.sub(r'[óòöô]', 'o', slug)
    slug = re.sub(r'[úùüû]', 'u', slug)
    slug = re.sub(r'[ñ]', 'n', slug)
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug.strip('-')

def row_to_variant(row):
    return {
        "id": row["id"],
        "product_id": row["product_id"],
        "storage": row["storage"] or "",
        "color": row["color"] or "",
        "price": row["price"] or "",
        "sort_order": row["sort_order"],
        "active": bool(row["active"]),
    }

async def get_variants_for_product(db, product_id: int) -> list:
    cursor = await db.execute(
        "SELECT * FROM product_variants WHERE product_id = ? AND active = 1 ORDER BY sort_order ASC, id ASC",
        (product_id,)
    )
    rows = await cursor.fetchall()
    return [row_to_variant(r) for r in rows]

def row_to_product(row):
    keys = row.keys()
    images_raw = row["images"] if "images" in keys else "[]"
    try:
        images = json.loads(images_raw) if images_raw else []
    except (json.JSONDecodeError, TypeError):
        images = []

    # Backward compatibility: if images is empty but image exists, use it as the first image
    if (not isinstance(images, list) or len(images) == 0) and row["image"]:
        images = [row["image"]]

    # Parse color_images (JSON object mapping color name -> [image URLs])
    color_images_raw = row["color_images"] if "color_images" in keys else "{}"
    try:
        color_images_parsed = json.loads(color_images_raw) if color_images_raw else {}
    except (json.JSONDecodeError, TypeError):
        color_images_parsed = {}

    color_images: dict[str, list[str]] = {}
    if isinstance(color_images_parsed, dict):
        for k, v in color_images_parsed.items():
            if not isinstance(k, str) or not k:
                continue
            if isinstance(v, str) and v:
                color_images[k] = [v]
            elif isinstance(v, list):
                imgs = [img for img in v if isinstance(img, str) and img]
                if imgs:
                    color_images[k] = imgs

    product_name = row["name"]
    return {
        "id": row["id"],
        "name": product_name,
        "slug": generate_slug(product_name),
        "category": row["category"] if "category" in keys else "",
        "condition": row["condition"],
        "image": row["image"],
        "images": images,
        "colors": json.loads(row["colors"]),
        "color_images": color_images,
        "storage_options": json.loads(row["storage_options"]),
        "badge": row["badge"],
        "available": json.loads(row["available"]),
        "price": row["price"] or "",
        "old_price": row["old_price"] if "old_price" in keys else "",
        "description": row["description"] or "",
        "featured_recommended": bool(row["featured_recommended"]),
        "featured_trending": bool(row["featured_trending"]),
        "sort_order": row["sort_order"],
        "model_3d": row["model_3d"] if "model_3d" in keys else "",
        "variants": [],  # populated separately
    }

def normalize_color_images_payload(color_images: Any) -> dict[str, list[str]]:
    """Normalize payload to: color -> list[str]. Accepts legacy color->str."""
    if not isinstance(color_images, dict):
        return {}

    normalized: dict[str, list[str]] = {}
    for k, v in color_images.items():
        if not isinstance(k, str) or not k:
            continue
        if isinstance(v, str) and v:
            normalized[k] = [v]
        elif isinstance(v, list):
            imgs = [img for img in v if isinstance(img, str) and img]
            if imgs:
                normalized[k] = imgs

    return normalized


def row_to_category(row):
    return {
        "id": row["id"],
        "slug": row["slug"],
        "name": row["name"],
        "image": row["image"],
        "sort_order": row["sort_order"],
    }

def row_to_bubble(row):
    return {
        "id": row["id"],
        "model_id": row["model_id"],
        "label": row["label"],
        "image": row["image"],
        "sort_order": row["sort_order"],
    }

def row_to_hero_slide(row):
    return {
        "id": row["id"],
        "title": row["title"],
        "subtitle": row["subtitle"],
        "image": row["image"],
        "video_url": row["video_url"] if "video_url" in row.keys() else "",
        "link": row["link"],
        "active": bool(row["active"]),
        "sort_order": row["sort_order"],
    }

def row_to_marquee(row):
    return {
        "id": row["id"],
        "text": row["text"],
        "active": bool(row["active"]),
        "sort_order": row["sort_order"],
    }

def row_to_service(row):
    return {
        "id": row["id"],
        "title": row["title"],
        "description": row["description"],
        "price": row["price"],
        "icon": row["icon"],
        "sort_order": row["sort_order"],
    }

def row_to_gallery_photo(row):
    return {
        "id": row["id"],
        "image": row["image"],
        "caption": row["caption"],
        "sort_order": row["sort_order"],
        "active": bool(row["active"]),
    }

def row_to_review(row):
    return {
        "id": row["id"],
        "sucursal_slug": row["sucursal_slug"],
        "customer_name": row["customer_name"],
        "rating": row["rating"],
        "text": row["text"],
        "sort_order": row["sort_order"],
        "active": bool(row["active"]),
    }

def row_to_sucursal(row):
    keys = row.keys()
    return {
        "id": row["id"],
        "name": row["name"],
        "slug": row["slug"] if "slug" in keys else "",
        "address": row["address"] if "address" in keys else "",
        "city": row["city"] if "city" in keys else "",
        "image": row["image"] if "image" in keys else "",
        "whatsapp": row["whatsapp"] if "whatsapp" in keys else "",
        "instagram": row["instagram"] if "instagram" in keys else "",
        "tiktok": row["tiktok"] if "tiktok" in keys else "",
        "phone": row["phone"] if "phone" in keys else "",
        "description": row["description"] if "description" in keys else "",
        "sort_order": row["sort_order"],
        "active": bool(row["active"]) if "active" in keys else True,
    }

def row_to_popup(row):
    return {
        "id": row["id"],
        "image": row["image"],
        "title": row["title"],
        "link": row["link"],
        "active": bool(row["active"]),
        "sort_order": row["sort_order"],
    }

def row_to_category_banner(row):
    return {
        "id": row["id"],
        "category": row["category"],
        "image": row["image"],
        "title": row["title"],
        "subtitle": row["subtitle"],
        "link": row["link"],
        "active": bool(row["active"]),
        "sort_order": row["sort_order"],
    }

# ==================== HEALTH ====================

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

# ==================== PUBLIC API ====================

@app.get("/api/products")
async def get_products(city: Optional[str] = None, condition: Optional[str] = None, model: Optional[str] = None):
    """Public endpoint - get all products with optional filters"""
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM products ORDER BY sort_order ASC, id ASC")
        rows = await cursor.fetchall()
        products = [row_to_product(r) for r in rows]
        
        # Fetch variants for all products
        for p in products:
            p["variants"] = await get_variants_for_product(db, p["id"])
        
        if city:
            products = [p for p in products if city in p["available"]]
        if condition and condition != "todos":
            cond_map = {"nuevos": "Nuevo", "semi-usados": "Semi-usado"}
            target = cond_map.get(condition.lower(), condition)
            products = [p for p in products if p["condition"] == target]
        if model and model != "todos":
            products = [p for p in products if p["category"] == model or model.lower() in p["name"].lower()]
        
        return {"products": products, "total": len(products)}
    finally:
        await db.close()

@app.get("/api/products/recommended")
async def get_recommended(city: Optional[str] = None):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM products WHERE featured_recommended = 1 ORDER BY sort_order ASC LIMIT 8")
        rows = await cursor.fetchall()
        products = [row_to_product(r) for r in rows]
        for p in products:
            p["variants"] = await get_variants_for_product(db, p["id"])
        if city:
            products = [p for p in products if city in p["available"]]
        return {"products": products}
    finally:
        await db.close()

@app.get("/api/products/trending")
async def get_trending(city: Optional[str] = None):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM products WHERE featured_trending = 1 ORDER BY sort_order ASC LIMIT 8")
        rows = await cursor.fetchall()
        products = [row_to_product(r) for r in rows]
        for p in products:
            p["variants"] = await get_variants_for_product(db, p["id"])
        if city:
            products = [p for p in products if city in p["available"]]
        return {"products": products}
    finally:
        await db.close()

@app.get("/api/products/by-slug/{slug}")
async def get_product_by_slug(slug: str):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM products ORDER BY sort_order ASC")
        rows = await cursor.fetchall()
        for row in rows:
            product = row_to_product(row)
            if product["slug"] == slug:
                product["variants"] = await get_variants_for_product(db, product["id"])
                return product
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    finally:
        await db.close()

@app.get("/api/products/{product_id}")
async def get_product(product_id: int):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM products WHERE id = ?", (product_id,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        product = row_to_product(row)
        product["variants"] = await get_variants_for_product(db, product["id"])
        return product
    finally:
        await db.close()

@app.get("/api/products/{product_id}/related")
async def get_related_products(product_id: int, city: Optional[str] = None):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM products WHERE id = ?", (product_id,))
        product = await cursor.fetchone()
        if not product:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        
        product_data = row_to_product(product)
        
        cursor = await db.execute("SELECT * FROM products WHERE id != ? ORDER BY sort_order ASC", (product_id,))
        rows = await cursor.fetchall()
        all_products = [row_to_product(r) for r in rows]
        
        if city:
            all_products = [p for p in all_products if city in p["available"]]
        
        # Related = same category first, then same condition
        same_cat = [p for p in all_products if p["category"] == product_data["category"]]
        same_cond = [p for p in all_products if p["condition"] == product_data["condition"] and p["category"] != product_data["category"]]
        related = (same_cat + same_cond)[:4]
        return {"products": related}
    finally:
        await db.close()

@app.get("/api/categories")
async def get_categories():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM categories ORDER BY sort_order ASC")
        rows = await cursor.fetchall()
        return {"categories": [row_to_category(r) for r in rows]}
    finally:
        await db.close()

@app.get("/api/bubbles")
async def get_bubbles():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM model_bubbles ORDER BY sort_order ASC")
        rows = await cursor.fetchall()
        return {"bubbles": [row_to_bubble(r) for r in rows]}
    finally:
        await db.close()

@app.get("/api/repair-services")
async def get_repair_services():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM repair_services ORDER BY sort_order ASC")
        rows = await cursor.fetchall()
        return {"services": [row_to_service(r) for r in rows]}
    finally:
        await db.close()

# ==================== AUTH ENDPOINTS ====================

@app.post("/api/admin/login")
async def admin_login(req: LoginRequest, request: Request):
    # Rate limiting by IP
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    # Clean old attempts
    _login_attempts[client_ip] = [t for t in _login_attempts[client_ip] if now - t < LOGIN_WINDOW_SECONDS]
    if len(_login_attempts[client_ip]) >= LOGIN_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail=f"Demasiados intentos. Intenta de nuevo en {LOGIN_WINDOW_SECONDS // 60} minutos."
        )
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM admin_users WHERE username = ?", (req.username,))
        user = await cursor.fetchone()
        if not user or not bcrypt_lib.checkpw(req.password.encode('utf-8'), user["password_hash"].encode('utf-8')):
            _login_attempts[client_ip].append(now)
            raise HTTPException(status_code=401, detail="Credenciales incorrectas")
        # Successful login - clear attempts
        _login_attempts.pop(client_ip, None)
        token = create_token(user["username"])
        return {"token": token, "username": user["username"]}
    finally:
        await db.close()

@app.get("/api/admin/me")
async def admin_me(username: str = Depends(get_current_admin)):
    return {"username": username}

@app.post("/api/admin/change-password")
async def change_password(req: ChangePasswordRequest, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM admin_users WHERE username = ?", (username,))
        user = await cursor.fetchone()
        if not user or not bcrypt_lib.checkpw(req.current_password.encode('utf-8'), user["password_hash"].encode('utf-8')):
            raise HTTPException(status_code=400, detail="Contrasena actual incorrecta")
        new_hash = bcrypt_lib.hashpw(req.new_password.encode('utf-8'), bcrypt_lib.gensalt()).decode('utf-8')
        await db.execute("UPDATE admin_users SET password_hash = ? WHERE username = ?", (new_hash, username))
        await db.commit()
        return {"message": "Contrasena actualizada"}
    finally:
        await db.close()

# ==================== ADMIN PRODUCT CRUD ====================

@app.get("/api/admin/products")
async def admin_get_products(username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM products ORDER BY sort_order ASC, id ASC")
        rows = await cursor.fetchall()
        return {"products": [row_to_product(r) for r in rows]}
    finally:
        await db.close()

@app.post("/api/admin/products")
async def admin_create_product(product: ProductCreate, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        images = product.images or ([product.image] if product.image else [])
        primary_image = images[0] if images else product.image

        # Auto-assign sort_order: new products go first in their category
        sort_order = product.sort_order
        if sort_order == 0 and product.category:
            cursor = await db.execute(
                "SELECT MIN(sort_order) as min_sort FROM products WHERE category = ?",
                (product.category,)
            )
            row = await cursor.fetchone()
            min_sort = row["min_sort"] if row and row["min_sort"] is not None else 100
            sort_order = min_sort - 1

        cursor = await db.execute(
            """INSERT INTO products (name, category, condition, image, images, colors, color_images, storage_options, badge, available, price, old_price, description, featured_recommended, featured_trending, sort_order, model_3d)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (product.name, product.category, product.condition, primary_image, json.dumps(images), json.dumps(product.colors),
             json.dumps(normalize_color_images_payload(product.color_images)), json.dumps(product.storage_options), product.badge, json.dumps(product.available),
             product.price, product.old_price, product.description, int(product.featured_recommended),
             int(product.featured_trending), sort_order, product.model_3d)
        )
        await db.commit()
        new_id = cursor.lastrowid
        cursor = await db.execute("SELECT * FROM products WHERE id = ?", (new_id,))
        row = await cursor.fetchone()
        return row_to_product(row)
    finally:
        await db.close()

@app.put("/api/admin/products/{product_id}")
async def admin_update_product(product_id: int, product: ProductUpdate, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM products WHERE id = ?", (product_id,))
        existing = await cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        
        updates = {}
        if product.name is not None:
            updates["name"] = product.name
        if product.category is not None:
            updates["category"] = product.category
        if product.condition is not None:
            updates["condition"] = product.condition
        if product.image is not None:
            updates["image"] = product.image
        if product.images is not None:
            updates["images"] = json.dumps(product.images)
            updates["image"] = product.images[0] if len(product.images) > 0 else ""
        if product.colors is not None:
            updates["colors"] = json.dumps(product.colors)
        if product.color_images is not None:
            updates["color_images"] = json.dumps(normalize_color_images_payload(product.color_images))
        if product.storage_options is not None:
            updates["storage_options"] = json.dumps(product.storage_options)
        if product.badge is not None:
            updates["badge"] = product.badge
        if product.available is not None:
            updates["available"] = json.dumps(product.available)
        if product.price is not None:
            updates["price"] = product.price
        if product.old_price is not None:
            updates["old_price"] = product.old_price
        if product.description is not None:
            updates["description"] = product.description
        if product.featured_recommended is not None:
            updates["featured_recommended"] = int(product.featured_recommended)
        if product.featured_trending is not None:
            updates["featured_trending"] = int(product.featured_trending)
        if product.sort_order is not None:
            updates["sort_order"] = product.sort_order
        if product.model_3d is not None:
            updates["model_3d"] = product.model_3d
        
        if updates:
            updates["updated_at"] = datetime.utcnow().isoformat()
            set_clause = ", ".join(f"{k} = ?" for k in updates)
            values = list(updates.values()) + [product_id]
            await db.execute(f"UPDATE products SET {set_clause} WHERE id = ?", values)
            await db.commit()
        
        cursor = await db.execute("SELECT * FROM products WHERE id = ?", (product_id,))
        row = await cursor.fetchone()
        return row_to_product(row)
    finally:
        await db.close()

@app.delete("/api/admin/products/{product_id}")
async def admin_delete_product(product_id: int, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    try:
        cursor = await db.execute("SELECT id FROM products WHERE id = ?", (product_id,))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        await db.execute("DELETE FROM products WHERE id = ?", (product_id,))
        await db.commit()
        return {"message": "Producto eliminado"}
    finally:
        await db.close()

# ==================== ADMIN BUBBLE CRUD ====================

@app.get("/api/admin/bubbles")
async def admin_get_bubbles(username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM model_bubbles ORDER BY sort_order ASC")
        rows = await cursor.fetchall()
        return {"bubbles": [row_to_bubble(r) for r in rows]}
    finally:
        await db.close()

@app.post("/api/admin/bubbles")
async def admin_create_bubble(bubble: BubbleCreate, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute(
            "INSERT INTO model_bubbles (model_id, label, image, sort_order) VALUES (?, ?, ?, ?)",
            (bubble.model_id, bubble.label, bubble.image, bubble.sort_order)
        )
        await db.commit()
        new_id = cursor.lastrowid
        cursor = await db.execute("SELECT * FROM model_bubbles WHERE id = ?", (new_id,))
        row = await cursor.fetchone()
        return row_to_bubble(row)
    finally:
        await db.close()

@app.put("/api/admin/bubbles/{bubble_id}")
async def admin_update_bubble(bubble_id: int, bubble: BubbleUpdate, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM model_bubbles WHERE id = ?", (bubble_id,))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Burbuja no encontrada")
        
        updates = {}
        if bubble.model_id is not None:
            updates["model_id"] = bubble.model_id
        if bubble.label is not None:
            updates["label"] = bubble.label
        if bubble.image is not None:
            updates["image"] = bubble.image
        if bubble.sort_order is not None:
            updates["sort_order"] = bubble.sort_order
        
        if updates:
            set_clause = ", ".join(f"{k} = ?" for k in updates)
            values = list(updates.values()) + [bubble_id]
            await db.execute(f"UPDATE model_bubbles SET {set_clause} WHERE id = ?", values)
            await db.commit()
        
        cursor = await db.execute("SELECT * FROM model_bubbles WHERE id = ?", (bubble_id,))
        row = await cursor.fetchone()
        return row_to_bubble(row)
    finally:
        await db.close()

@app.delete("/api/admin/bubbles/{bubble_id}")
async def admin_delete_bubble(bubble_id: int, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    try:
        cursor = await db.execute("SELECT id FROM model_bubbles WHERE id = ?", (bubble_id,))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Burbuja no encontrada")
        await db.execute("DELETE FROM model_bubbles WHERE id = ?", (bubble_id,))
        await db.commit()
        return {"message": "Burbuja eliminada"}
    finally:
        await db.close()

BUBBLE_DEFAULT_IMAGES = {
    "todos": "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300&h=300&fit=crop",
    "iphones": "https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=300&h=300&fit=crop",
    "ipads": "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300&h=300&fit=crop",
    "macbook": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&h=300&fit=crop",
    "airpods": "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=300&h=300&fit=crop",
    "apple watch": "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=300&h=300&fit=crop",
    "accesorios": "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=300&h=300&fit=crop",
    "samsung": "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=300&h=300&fit=crop",
}

@app.post("/api/admin/bubbles/restore-images")
async def admin_restore_bubble_images(username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM model_bubbles ORDER BY sort_order ASC")
        rows = await cursor.fetchall()
        updated = 0
        for row in rows:
            model_id = row["model_id"].lower()
            if model_id in BUBBLE_DEFAULT_IMAGES:
                await db.execute(
                    "UPDATE model_bubbles SET image = ? WHERE id = ?",
                    (BUBBLE_DEFAULT_IMAGES[model_id], row["id"])
                )
                updated += 1
        await db.commit()
        cursor = await db.execute("SELECT * FROM model_bubbles ORDER BY sort_order ASC")
        rows = await cursor.fetchall()
        return {"message": f"{updated} burbujas actualizadas", "bubbles": [row_to_bubble(r) for r in rows]}
    finally:
        await db.close()

# ==================== ADMIN CATEGORIES CRUD ====================

@app.get("/api/admin/categories")
async def admin_get_categories(username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM categories ORDER BY sort_order ASC")
        rows = await cursor.fetchall()
        return {"categories": [row_to_category(r) for r in rows]}
    finally:
        await db.close()

@app.post("/api/admin/categories")
async def admin_create_category(cat: CategoryCreate, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute(
            "INSERT INTO categories (slug, name, image, sort_order) VALUES (?, ?, ?, ?)",
            (cat.slug, cat.name, cat.image, cat.sort_order)
        )
        await db.commit()
        new_id = cursor.lastrowid
        cursor = await db.execute("SELECT * FROM categories WHERE id = ?", (new_id,))
        row = await cursor.fetchone()
        return row_to_category(row)
    finally:
        await db.close()

@app.put("/api/admin/categories/{cat_id}")
async def admin_update_category(cat_id: int, cat: CategoryUpdate, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM categories WHERE id = ?", (cat_id,))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Categoria no encontrada")
        
        updates = {}
        if cat.slug is not None:
            updates["slug"] = cat.slug
        if cat.name is not None:
            updates["name"] = cat.name
        if cat.image is not None:
            updates["image"] = cat.image
        if cat.sort_order is not None:
            updates["sort_order"] = cat.sort_order
        
        if updates:
            set_clause = ", ".join(f"{k} = ?" for k in updates)
            values = list(updates.values()) + [cat_id]
            await db.execute(f"UPDATE categories SET {set_clause} WHERE id = ?", values)
            await db.commit()
        
        cursor = await db.execute("SELECT * FROM categories WHERE id = ?", (cat_id,))
        row = await cursor.fetchone()
        return row_to_category(row)
    finally:
        await db.close()

@app.delete("/api/admin/categories/{cat_id}")
async def admin_delete_category(cat_id: int, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    try:
        cursor = await db.execute("SELECT id FROM categories WHERE id = ?", (cat_id,))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Categoria no encontrada")
        await db.execute("DELETE FROM categories WHERE id = ?", (cat_id,))
        await db.commit()
        return {"message": "Categoria eliminada"}
    finally:
        await db.close()

# ==================== ADMIN REPAIR SERVICES CRUD ====================

@app.get("/api/admin/repair-services")
async def admin_get_services(username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM repair_services ORDER BY sort_order ASC")
        rows = await cursor.fetchall()
        return {"services": [row_to_service(r) for r in rows]}
    finally:
        await db.close()

@app.post("/api/admin/repair-services")
async def admin_create_service(service: RepairServiceCreate, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute(
            "INSERT INTO repair_services (title, description, price, icon, sort_order) VALUES (?, ?, ?, ?, ?)",
            (service.title, service.description, service.price, service.icon, service.sort_order)
        )
        await db.commit()
        new_id = cursor.lastrowid
        cursor = await db.execute("SELECT * FROM repair_services WHERE id = ?", (new_id,))
        row = await cursor.fetchone()
        return row_to_service(row)
    finally:
        await db.close()

@app.put("/api/admin/repair-services/{service_id}")
async def admin_update_service(service_id: int, service: RepairServiceUpdate, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM repair_services WHERE id = ?", (service_id,))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Servicio no encontrado")
        
        updates = {}
        if service.title is not None:
            updates["title"] = service.title
        if service.description is not None:
            updates["description"] = service.description
        if service.price is not None:
            updates["price"] = service.price
        if service.icon is not None:
            updates["icon"] = service.icon
        if service.sort_order is not None:
            updates["sort_order"] = service.sort_order
        
        if updates:
            set_clause = ", ".join(f"{k} = ?" for k in updates)
            values = list(updates.values()) + [service_id]
            await db.execute(f"UPDATE repair_services SET {set_clause} WHERE id = ?", values)
            await db.commit()
        
        cursor = await db.execute("SELECT * FROM repair_services WHERE id = ?", (service_id,))
        row = await cursor.fetchone()
        return row_to_service(row)
    finally:
        await db.close()

@app.delete("/api/admin/repair-services/{service_id}")
async def admin_delete_service(service_id: int, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    try:
        cursor = await db.execute("SELECT id FROM repair_services WHERE id = ?", (service_id,))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Servicio no encontrado")
        await db.execute("DELETE FROM repair_services WHERE id = ?", (service_id,))
        await db.commit()
        return {"message": "Servicio eliminado"}
    finally:
        await db.close()

# ==================== REPAIR GALLERY (PUBLIC) ====================

@app.get("/api/repair-gallery")
async def get_repair_gallery():
    db = await aiosqlite.connect(DB_PATH)
    try:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM repair_gallery WHERE active = 1 ORDER BY sort_order ASC")
        rows = await cursor.fetchall()
        return {"photos": [row_to_gallery_photo(r) for r in rows]}
    finally:
        await db.close()

# ==================== ADMIN REPAIR GALLERY CRUD ====================

@app.get("/api/admin/repair-gallery")
async def admin_get_gallery(username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    try:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM repair_gallery ORDER BY sort_order ASC")
        rows = await cursor.fetchall()
        return {"photos": [row_to_gallery_photo(r) for r in rows]}
    finally:
        await db.close()

@app.post("/api/admin/repair-gallery")
async def admin_create_gallery_photo(photo: RepairGalleryCreate, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    try:
        cursor = await db.execute(
            "INSERT INTO repair_gallery (image, caption, sort_order, active) VALUES (?, ?, ?, ?)",
            (photo.image, photo.caption, photo.sort_order, 1 if photo.active else 0)
        )
        new_id = cursor.lastrowid
        await db.commit()
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM repair_gallery WHERE id = ?", (new_id,))
        row = await cursor.fetchone()
        return row_to_gallery_photo(row)
    finally:
        await db.close()

@app.put("/api/admin/repair-gallery/{photo_id}")
async def admin_update_gallery_photo(photo_id: int, photo: RepairGalleryUpdate, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    try:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM repair_gallery WHERE id = ?", (photo_id,))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Foto no encontrada")
        updates = {}
        if photo.image is not None: updates["image"] = photo.image
        if photo.caption is not None: updates["caption"] = photo.caption
        if photo.sort_order is not None: updates["sort_order"] = photo.sort_order
        if photo.active is not None: updates["active"] = 1 if photo.active else 0
        if updates:
            set_clause = ", ".join(f"{k} = ?" for k in updates)
            values = list(updates.values()) + [photo_id]
            await db.execute(f"UPDATE repair_gallery SET {set_clause} WHERE id = ?", values)
            await db.commit()
        cursor = await db.execute("SELECT * FROM repair_gallery WHERE id = ?", (photo_id,))
        row = await cursor.fetchone()
        return row_to_gallery_photo(row)
    finally:
        await db.close()

@app.delete("/api/admin/repair-gallery/{photo_id}")
async def admin_delete_gallery_photo(photo_id: int, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    try:
        cursor = await db.execute("SELECT id FROM repair_gallery WHERE id = ?", (photo_id,))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Foto no encontrada")
        await db.execute("DELETE FROM repair_gallery WHERE id = ?", (photo_id,))
        await db.commit()
        return {"message": "Foto eliminada"}
    finally:
        await db.close()

# ==================== HERO SLIDES (PUBLIC) ====================

@app.get("/api/hero-slides")
async def get_hero_slides():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM hero_slides WHERE active = 1 ORDER BY sort_order ASC")
        rows = await cursor.fetchall()
        return {"slides": [row_to_hero_slide(r) for r in rows]}
    finally:
        await db.close()

@app.get("/api/marquee-texts")
async def get_marquee_texts():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM marquee_texts WHERE active = 1 ORDER BY sort_order ASC")
        rows = await cursor.fetchall()
        return {"texts": [row_to_marquee(r) for r in rows]}
    finally:
        await db.close()

# ==================== ADMIN HERO SLIDES ====================

@app.get("/api/admin/hero-slides")
async def admin_get_hero_slides(username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM hero_slides ORDER BY sort_order ASC")
        rows = await cursor.fetchall()
        return {"slides": [row_to_hero_slide(r) for r in rows]}
    finally:
        await db.close()

@app.post("/api/admin/hero-slides")
async def admin_create_hero_slide(slide: HeroSlideCreate, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    try:
        cursor = await db.execute(
            "INSERT INTO hero_slides (title, subtitle, image, video_url, link, active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (slide.title, slide.subtitle, slide.image, slide.video_url, slide.link, int(slide.active), slide.sort_order)
        )
        await db.commit()
        slide_id = cursor.lastrowid
        return {"message": "Slide creado", "id": slide_id}
    finally:
        await db.close()

@app.put("/api/admin/hero-slides/{slide_id}")
async def admin_update_hero_slide(slide_id: int, slide: HeroSlideUpdate, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM hero_slides WHERE id = ?", (slide_id,))
        existing = await cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Slide no encontrado")
        
        updates = {}
        if slide.title is not None: updates["title"] = slide.title
        if slide.subtitle is not None: updates["subtitle"] = slide.subtitle
        if slide.image is not None: updates["image"] = slide.image
        if slide.video_url is not None: updates["video_url"] = slide.video_url
        if slide.link is not None: updates["link"] = slide.link
        if slide.active is not None: updates["active"] = int(slide.active)
        if slide.sort_order is not None: updates["sort_order"] = slide.sort_order
        
        if updates:
            set_clause = ", ".join(f"{k} = ?" for k in updates)
            values = list(updates.values()) + [slide_id]
            await db.execute(f"UPDATE hero_slides SET {set_clause} WHERE id = ?", values)
            await db.commit()
        
        return {"message": "Slide actualizado"}
    finally:
        await db.close()

@app.delete("/api/admin/hero-slides/{slide_id}")
async def admin_delete_hero_slide(slide_id: int, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    try:
        await db.execute("DELETE FROM hero_slides WHERE id = ?", (slide_id,))
        await db.commit()
        return {"message": "Slide eliminado"}
    finally:
        await db.close()

@app.post("/api/admin/hero-slides/{slide_id}/toggle")
async def admin_toggle_hero_slide(slide_id: int, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    try:
        await db.execute("UPDATE hero_slides SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?", (slide_id,))
        await db.commit()
        return {"message": "Slide actualizado"}
    finally:
        await db.close()

# ==================== ADMIN MARQUEE TEXTS ====================

@app.get("/api/admin/marquee-texts")
async def admin_get_marquee_texts(username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM marquee_texts ORDER BY sort_order ASC")
        rows = await cursor.fetchall()
        return {"texts": [row_to_marquee(r) for r in rows]}
    finally:
        await db.close()

@app.post("/api/admin/marquee-texts")
async def admin_create_marquee_text(mt: MarqueeTextCreate, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    try:
        cursor = await db.execute(
            "INSERT INTO marquee_texts (text, active, sort_order) VALUES (?, ?, ?)",
            (mt.text, int(mt.active), mt.sort_order)
        )
        await db.commit()
        return {"message": "Texto creado", "id": cursor.lastrowid}
    finally:
        await db.close()

@app.put("/api/admin/marquee-texts/{text_id}")
async def admin_update_marquee_text(text_id: int, mt: MarqueeTextUpdate, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM marquee_texts WHERE id = ?", (text_id,))
        existing = await cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Texto no encontrado")
        
        updates = {}
        if mt.text is not None: updates["text"] = mt.text
        if mt.active is not None: updates["active"] = int(mt.active)
        if mt.sort_order is not None: updates["sort_order"] = mt.sort_order
        
        if updates:
            set_clause = ", ".join(f"{k} = ?" for k in updates)
            values = list(updates.values()) + [text_id]
            await db.execute(f"UPDATE marquee_texts SET {set_clause} WHERE id = ?", values)
            await db.commit()
        
        return {"message": "Texto actualizado"}
    finally:
        await db.close()

@app.delete("/api/admin/marquee-texts/{text_id}")
async def admin_delete_marquee_text(text_id: int, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    try:
        await db.execute("DELETE FROM marquee_texts WHERE id = ?", (text_id,))
        await db.commit()
        return {"message": "Texto eliminado"}
    finally:
        await db.close()

# ==================== PUBLIC SUCURSALES ====================

@app.get("/api/sucursales")
async def get_sucursales():
    """Public endpoint - get all active sucursales"""
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM sucursales WHERE active = 1 ORDER BY sort_order ASC")
        rows = await cursor.fetchall()
        return {"sucursales": [row_to_sucursal(r) for r in rows]}
    finally:
        await db.close()

# ==================== ADMIN SUCURSALES ====================

@app.get("/api/admin/sucursales")
async def admin_get_sucursales(username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM sucursales ORDER BY sort_order ASC")
        rows = await cursor.fetchall()
        return {"sucursales": [row_to_sucursal(r) for r in rows]}
    finally:
        await db.close()

@app.post("/api/admin/sucursales")
async def admin_create_sucursal(s: SucursalCreate, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    try:
        slug = s.slug or generate_slug(s.name)
        cursor = await db.execute(
            "INSERT INTO sucursales (name, slug, address, city, image, whatsapp, instagram, tiktok, phone, description, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (s.name, slug, s.address, s.city, s.image, s.whatsapp, s.instagram, s.tiktok, s.phone, s.description, s.sort_order, int(s.active))
        )
        await db.commit()
        return {"message": "Sucursal creada", "id": cursor.lastrowid}
    finally:
        await db.close()

@app.put("/api/admin/sucursales/{sucursal_id}")
async def admin_update_sucursal(sucursal_id: int, s: SucursalUpdate, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM sucursales WHERE id = ?", (sucursal_id,))
        existing = await cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Sucursal no encontrada")
        
        updates = {}
        if s.name is not None: updates["name"] = s.name
        if s.slug is not None: updates["slug"] = s.slug
        if s.address is not None: updates["address"] = s.address
        if s.city is not None: updates["city"] = s.city
        if s.image is not None: updates["image"] = s.image
        if s.whatsapp is not None: updates["whatsapp"] = s.whatsapp
        if s.instagram is not None: updates["instagram"] = s.instagram
        if s.tiktok is not None: updates["tiktok"] = s.tiktok
        if s.phone is not None: updates["phone"] = s.phone
        if s.description is not None: updates["description"] = s.description
        if s.sort_order is not None: updates["sort_order"] = s.sort_order
        if s.active is not None: updates["active"] = int(s.active)
        
        if updates:
            set_clause = ", ".join(f"{k} = ?" for k in updates)
            values = list(updates.values()) + [sucursal_id]
            await db.execute(f"UPDATE sucursales SET {set_clause} WHERE id = ?", values)
            await db.commit()
        
        return {"message": "Sucursal actualizada"}
    finally:
        await db.close()

@app.delete("/api/admin/sucursales/{sucursal_id}")
async def admin_delete_sucursal(sucursal_id: int, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    try:
        await db.execute("DELETE FROM sucursales WHERE id = ?", (sucursal_id,))
        await db.commit()
        return {"message": "Sucursal eliminada"}
    finally:
        await db.close()

# ==================== REVIEWS PUBLIC ENDPOINTS ====================

@app.get("/api/sucursales/{slug}/resenas")
async def get_sucursal_reviews(slug: str):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM resenas WHERE sucursal_slug = ? AND active = 1 ORDER BY sort_order ASC", (slug,))
        rows = await cursor.fetchall()
        return {"reviews": [row_to_review(r) for r in rows]}
    finally:
        await db.close()

# ==================== REVIEWS ADMIN ENDPOINTS ====================

@app.get("/api/admin/resenas")
async def admin_get_reviews(username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM resenas ORDER BY sucursal_slug ASC, sort_order ASC")
        rows = await cursor.fetchall()
        return {"reviews": [row_to_review(r) for r in rows]}
    finally:
        await db.close()

@app.post("/api/admin/resenas")
async def admin_create_review(r: ReviewCreate, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    try:
        cursor = await db.execute(
            "INSERT INTO resenas (sucursal_slug, customer_name, rating, text, sort_order, active) VALUES (?, ?, ?, ?, ?, ?)",
            (r.sucursal_slug, r.customer_name, r.rating, r.text, r.sort_order, int(r.active))
        )
        await db.commit()
        return {"id": cursor.lastrowid, "message": "Resena creada"}
    finally:
        await db.close()

@app.put("/api/admin/resenas/{review_id}")
async def admin_update_review(review_id: int, r: ReviewUpdate, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM resenas WHERE id = ?", (review_id,))
        existing = await cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Resena no encontrada")
        
        updates = {}
        if r.sucursal_slug is not None: updates["sucursal_slug"] = r.sucursal_slug
        if r.customer_name is not None: updates["customer_name"] = r.customer_name
        if r.rating is not None: updates["rating"] = r.rating
        if r.text is not None: updates["text"] = r.text
        if r.sort_order is not None: updates["sort_order"] = r.sort_order
        if r.active is not None: updates["active"] = int(r.active)
        
        if updates:
            set_clause = ", ".join(f"{k} = ?" for k in updates)
            values = list(updates.values()) + [review_id]
            await db.execute(f"UPDATE resenas SET {set_clause} WHERE id = ?", values)
            await db.commit()
        
        return {"message": "Resena actualizada"}
    finally:
        await db.close()

@app.delete("/api/admin/resenas/{review_id}")
async def admin_delete_review(review_id: int, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    try:
        await db.execute("DELETE FROM resenas WHERE id = ?", (review_id,))
        await db.commit()
        return {"message": "Resena eliminada"}
    finally:
        await db.close()

@app.post("/api/admin/resenas/reseed")
async def admin_reseed_reviews(username: str = Depends(get_current_admin)):
    """Re-seed all default reviews into the database (clears existing and inserts defaults)."""
    from .database import seed_default_data
    db = await aiosqlite.connect(DB_PATH)
    try:
        await db.execute("DELETE FROM resenas")
        await db.commit()
    finally:
        await db.close()
    # Re-run seed which will detect empty table and insert defaults
    await seed_default_data()
    # Count inserted
    db2 = await aiosqlite.connect(DB_PATH)
    try:
        cursor = await db2.execute("SELECT COUNT(*) FROM resenas")
        count = (await cursor.fetchone())[0]
        return {"message": f"Resenas re-seed completado: {count} resenas insertadas"}
    finally:
        await db2.close()

# ==================== ADMIN VARIANT CRUD ====================

@app.get("/api/admin/products/{product_id}/variants")
async def admin_get_variants(product_id: int, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute(
            "SELECT * FROM product_variants WHERE product_id = ? ORDER BY sort_order ASC, id ASC",
            (product_id,)
        )
        rows = await cursor.fetchall()
        return {"variants": [row_to_variant(r) for r in rows]}
    finally:
        await db.close()

@app.post("/api/admin/products/{product_id}/variants")
async def admin_create_variant(product_id: int, variant: VariantCreate, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        # Verify product exists
        cursor = await db.execute("SELECT id FROM products WHERE id = ?", (product_id,))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        cursor = await db.execute(
            "INSERT INTO product_variants (product_id, storage, color, price, sort_order, active) VALUES (?, ?, ?, ?, ?, ?)",
            (product_id, variant.storage, variant.color, variant.price, variant.sort_order, int(variant.active))
        )
        await db.commit()
        new_id = cursor.lastrowid
        cursor = await db.execute("SELECT * FROM product_variants WHERE id = ?", (new_id,))
        row = await cursor.fetchone()
        return row_to_variant(row)
    finally:
        await db.close()

@app.put("/api/admin/products/{product_id}/variants/{variant_id}")
async def admin_update_variant(product_id: int, variant_id: int, v: VariantUpdate, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute(
            "SELECT * FROM product_variants WHERE id = ? AND product_id = ?",
            (variant_id, product_id)
        )
        existing = await cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Variante no encontrada")
        
        updates = {}
        if v.storage is not None: updates["storage"] = v.storage
        if v.color is not None: updates["color"] = v.color
        if v.price is not None: updates["price"] = v.price
        if v.sort_order is not None: updates["sort_order"] = v.sort_order
        if v.active is not None: updates["active"] = int(v.active)
        
        if updates:
            set_clause = ", ".join(f"{k} = ?" for k in updates)
            values = list(updates.values()) + [variant_id]
            await db.execute(f"UPDATE product_variants SET {set_clause} WHERE id = ?", values)
            await db.commit()
        
        cursor = await db.execute("SELECT * FROM product_variants WHERE id = ?", (variant_id,))
        row = await cursor.fetchone()
        return row_to_variant(row)
    finally:
        await db.close()

@app.delete("/api/admin/products/{product_id}/variants/{variant_id}")
async def admin_delete_variant(product_id: int, variant_id: int, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    try:
        cursor = await db.execute(
            "SELECT id FROM product_variants WHERE id = ? AND product_id = ?",
            (variant_id, product_id)
        )
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Variante no encontrada")
        await db.execute("DELETE FROM product_variants WHERE id = ?", (variant_id,))
        await db.commit()
        return {"message": "Variante eliminada"}
    finally:
        await db.close()

# ==================== IMAGE UPLOAD ==

@app.post("/api/admin/upload")
async def upload_image(file: UploadFile = File(...), username: str = Depends(get_current_admin)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos de imagen")
    
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail=f"Archivo demasiado grande. Maximo {MAX_UPLOAD_SIZE // (1024*1024)}MB")
    ext = os.path.splitext(file.filename or "image.jpg")[1] or ".jpg"
    
    # Auto-crop transparent padding from PNG images
    try:
        from PIL import Image
        import io
        img = Image.open(io.BytesIO(content))
        if img.mode == "RGBA":
            bbox = img.getbbox()
            if bbox:
                # Add small padding (5% of dimensions)
                pad_x = max(int((bbox[2] - bbox[0]) * 0.05), 2)
                pad_y = max(int((bbox[3] - bbox[1]) * 0.05), 2)
                crop_box = (
                    max(0, bbox[0] - pad_x),
                    max(0, bbox[1] - pad_y),
                    min(img.width, bbox[2] + pad_x),
                    min(img.height, bbox[3] + pad_y),
                )
                cropped = img.crop(crop_box)
                buf = io.BytesIO()
                cropped.save(buf, format="PNG")
                content = buf.getvalue()
                ext = ".png"
    except Exception:
        pass  # If cropping fails, use original image
    
    url = upload_file(content, ext)
    filename = url.split("/")[-1]
    
    return {"url": url, "filename": filename}

# ==================== ADMIN STATS ====================

@app.get("/api/admin/stats")
async def admin_stats(username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    try:
        cursor = await db.execute("SELECT COUNT(*) FROM products")
        total_products = (await cursor.fetchone())[0]
        
        cursor = await db.execute("SELECT COUNT(*) FROM products WHERE condition = 'Nuevo'")
        new_count = (await cursor.fetchone())[0]
        
        cursor = await db.execute("SELECT COUNT(*) FROM products WHERE condition = 'Semi-usado'")
        used_count = (await cursor.fetchone())[0]
        
        cursor = await db.execute("SELECT COUNT(*) FROM model_bubbles")
        bubble_count = (await cursor.fetchone())[0]
        
        cursor = await db.execute("SELECT COUNT(*) FROM repair_services")
        service_count = (await cursor.fetchone())[0]
        
        cursor = await db.execute("SELECT COUNT(*) FROM categories")
        category_count = (await cursor.fetchone())[0]
        
        cursor = await db.execute("SELECT COUNT(*) FROM hero_slides")
        slides_count = (await cursor.fetchone())[0]
        
        cursor = await db.execute("SELECT COUNT(*) FROM resenas")
        reviews_count = (await cursor.fetchone())[0]
        
        return {
            "total_products": total_products,
            "new_products": new_count,
            "used_products": used_count,
            "categories": category_count,
            "bubbles": bubble_count,
            "repair_services": service_count,
            "hero_slides": slides_count,
            "reviews": reviews_count,
        }
    finally:
        await db.close()

# ==================== POPUPS (PUBLIC) ====================

@app.get("/api/popups")
async def get_popups():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM popups WHERE active = 1 ORDER BY sort_order ASC")
        rows = await cursor.fetchall()
        return {"popups": [row_to_popup(r) for r in rows]}
    finally:
        await db.close()

# ==================== ADMIN POPUPS CRUD ====================

@app.get("/api/admin/popups")
async def admin_get_popups(username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM popups ORDER BY sort_order ASC")
        rows = await cursor.fetchall()
        return {"popups": [row_to_popup(r) for r in rows]}
    finally:
        await db.close()

@app.post("/api/admin/popups")
async def admin_create_popup(popup: PopupCreate, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    try:
        cursor = await db.execute(
            "INSERT INTO popups (image, title, link, active, sort_order) VALUES (?, ?, ?, ?, ?)",
            (popup.image, popup.title, popup.link, 1 if popup.active else 0, popup.sort_order)
        )
        await db.commit()
        popup_id = cursor.lastrowid
        return {"message": "Popup creado", "id": popup_id}
    finally:
        await db.close()

@app.put("/api/admin/popups/{popup_id}")
async def admin_update_popup(popup_id: int, popup: PopupUpdate, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM popups WHERE id = ?", (popup_id,))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Popup no encontrado")
        updates = {}
        if popup.image is not None: updates["image"] = popup.image
        if popup.title is not None: updates["title"] = popup.title
        if popup.link is not None: updates["link"] = popup.link
        if popup.active is not None: updates["active"] = 1 if popup.active else 0
        if popup.sort_order is not None: updates["sort_order"] = popup.sort_order
        if updates:
            set_clause = ", ".join(f"{k} = ?" for k in updates)
            values = list(updates.values()) + [popup_id]
            await db.execute(f"UPDATE popups SET {set_clause} WHERE id = ?", values)
            await db.commit()
        return {"message": "Popup actualizado"}
    finally:
        await db.close()

@app.delete("/api/admin/popups/{popup_id}")
async def admin_delete_popup(popup_id: int, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    try:
        cursor = await db.execute("SELECT id FROM popups WHERE id = ?", (popup_id,))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Popup no encontrado")
        await db.execute("DELETE FROM popups WHERE id = ?", (popup_id,))
        await db.commit()
        return {"message": "Popup eliminado"}
    finally:
        await db.close()

@app.post("/api/admin/popups/{popup_id}/toggle")
async def admin_toggle_popup(popup_id: int, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    try:
        await db.execute("UPDATE popups SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?", (popup_id,))
        await db.commit()
        return {"message": "Popup actualizado"}
    finally:
        await db.close()

# ==================== CATEGORY BANNERS (PUBLIC) ====================

@app.get("/api/category-banners")
async def get_category_banners(category: Optional[str] = Query(None)):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        if category:
            cursor = await db.execute(
                "SELECT * FROM category_banners WHERE active = 1 AND category = ? ORDER BY sort_order ASC",
                (category,)
            )
        else:
            cursor = await db.execute("SELECT * FROM category_banners WHERE active = 1 ORDER BY sort_order ASC")
        rows = await cursor.fetchall()
        return {"banners": [row_to_category_banner(r) for r in rows]}
    finally:
        await db.close()

# ==================== ADMIN CATEGORY BANNERS CRUD ====================

@app.get("/api/admin/category-banners")
async def admin_get_category_banners(username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM category_banners ORDER BY sort_order ASC, id ASC")
        rows = await cursor.fetchall()
        return {"banners": [row_to_category_banner(r) for r in rows]}
    finally:
        await db.close()

@app.post("/api/admin/category-banners")
async def admin_create_category_banner(banner: CategoryBannerCreate, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    try:
        cursor = await db.execute(
            "INSERT INTO category_banners (category, image, title, subtitle, link, active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (banner.category, banner.image, banner.title, banner.subtitle, banner.link, 1 if banner.active else 0, banner.sort_order)
        )
        await db.commit()
        return {"message": "Portada creada", "id": cursor.lastrowid}
    finally:
        await db.close()

@app.put("/api/admin/category-banners/{banner_id}")
async def admin_update_category_banner(banner_id: int, banner: CategoryBannerUpdate, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        cursor = await db.execute("SELECT * FROM category_banners WHERE id = ?", (banner_id,))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Portada no encontrada")
        updates = {}
        if banner.category is not None: updates["category"] = banner.category
        if banner.image is not None: updates["image"] = banner.image
        if banner.title is not None: updates["title"] = banner.title
        if banner.subtitle is not None: updates["subtitle"] = banner.subtitle
        if banner.link is not None: updates["link"] = banner.link
        if banner.active is not None: updates["active"] = 1 if banner.active else 0
        if banner.sort_order is not None: updates["sort_order"] = banner.sort_order
        if updates:
            set_clause = ", ".join(f"{k} = ?" for k in updates)
            values = list(updates.values()) + [banner_id]
            await db.execute(f"UPDATE category_banners SET {set_clause} WHERE id = ?", values)
            await db.commit()
        return {"message": "Portada actualizada"}
    finally:
        await db.close()

@app.delete("/api/admin/category-banners/{banner_id}")
async def admin_delete_category_banner(banner_id: int, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    try:
        cursor = await db.execute("SELECT id FROM category_banners WHERE id = ?", (banner_id,))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Portada no encontrada")
        await db.execute("DELETE FROM category_banners WHERE id = ?", (banner_id,))
        await db.commit()
        return {"message": "Portada eliminada"}
    finally:
        await db.close()

@app.post("/api/admin/category-banners/{banner_id}/toggle")
async def admin_toggle_category_banner(banner_id: int, username: str = Depends(get_current_admin)):
    db = await aiosqlite.connect(DB_PATH)
    try:
        await db.execute("UPDATE category_banners SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?", (banner_id,))
        await db.commit()
        return {"message": "Portada actualizada"}
    finally:
        await db.close()

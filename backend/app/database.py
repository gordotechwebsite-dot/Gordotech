import aiosqlite
import os
import json

# Use /data/app.db for persistent storage in production, local for dev
DB_PATH = os.environ.get("DB_PATH", "/data/app.db") if os.path.exists("/data") else "app.db"

async def get_db():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")  # Better concurrent read performance
    await db.execute("PRAGMA synchronous=NORMAL")  # Faster writes
    await db.execute("PRAGMA cache_size=-64000")  # 64MB cache
    await db.execute("PRAGMA busy_timeout=5000")  # 5s timeout for locks
    try:
        yield db
    finally:
        await db.close()

async def init_db():
    db = await aiosqlite.connect(DB_PATH)
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA synchronous=NORMAL")
    await db.execute("PRAGMA cache_size=-64000")
    
    # Categories table
    await db.execute("""
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            image TEXT NOT NULL DEFAULT '',
            sort_order INTEGER DEFAULT 0
        )
    """)
    
    # Products table
    await db.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT '',
            condition TEXT NOT NULL DEFAULT 'Semi-usado',
            image TEXT NOT NULL DEFAULT '',
            images TEXT NOT NULL DEFAULT '[]',
            colors TEXT NOT NULL DEFAULT '[]',
            storage_options TEXT NOT NULL DEFAULT '[]',
            badge TEXT,
            available TEXT NOT NULL DEFAULT '["duitama","tunja"]',
            price TEXT DEFAULT '',
            description TEXT DEFAULT '',
            featured_recommended INTEGER DEFAULT 0,
            featured_trending INTEGER DEFAULT 0,
            sort_order INTEGER DEFAULT 0,
            model_3d TEXT DEFAULT '',
            old_price TEXT DEFAULT '',
            color_images TEXT NOT NULL DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Migration: add category column if missing
    try:
        await db.execute("SELECT category FROM products LIMIT 1")
    except Exception:
        await db.execute("ALTER TABLE products ADD COLUMN category TEXT NOT NULL DEFAULT ''")

    # Migration: add images column if missing (JSON array of image URLs)
    try:
        await db.execute("SELECT images FROM products LIMIT 1")
    except Exception:
        await db.execute("ALTER TABLE products ADD COLUMN images TEXT NOT NULL DEFAULT '[]'")

    # Migration: add model_3d column if missing
    try:
        await db.execute("SELECT model_3d FROM products LIMIT 1")
    except Exception:
        await db.execute("ALTER TABLE products ADD COLUMN model_3d TEXT DEFAULT ''")

    # Migration: add old_price column if missing
    try:
        await db.execute("SELECT old_price FROM products LIMIT 1")
    except Exception:
        await db.execute("ALTER TABLE products ADD COLUMN old_price TEXT DEFAULT ''")

    # Migration: add color_images column if missing (JSON object mapping color -> image URL)
    try:
        await db.execute("SELECT color_images FROM products LIMIT 1")
    except Exception:
        await db.execute("ALTER TABLE products ADD COLUMN color_images TEXT NOT NULL DEFAULT '{}'")

    
    # Model bubbles table
    await db.execute("""
        CREATE TABLE IF NOT EXISTS model_bubbles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            model_id TEXT NOT NULL UNIQUE,
            label TEXT NOT NULL,
            image TEXT NOT NULL DEFAULT '',
            sort_order INTEGER DEFAULT 0
        )
    """)
    
    # Admin users table
    await db.execute("""
        CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Repair services table
    await db.execute("""
        CREATE TABLE IF NOT EXISTS repair_services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            price TEXT NOT NULL DEFAULT '',
            icon TEXT NOT NULL DEFAULT 'Smartphone',
            sort_order INTEGER DEFAULT 0
        )
    """)
    
    # Site settings table
    await db.execute("""
        CREATE TABLE IF NOT EXISTS site_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL DEFAULT ''
        )
    """)

    # Hero slides table
    await db.execute("""
        CREATE TABLE IF NOT EXISTS hero_slides (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL DEFAULT '',
            subtitle TEXT NOT NULL DEFAULT '',
            image TEXT NOT NULL DEFAULT '',
            video_url TEXT NOT NULL DEFAULT '',
            link TEXT NOT NULL DEFAULT '',
            active INTEGER NOT NULL DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Migration: add video_url column to hero_slides if missing
    try:
        await db.execute("SELECT video_url FROM hero_slides LIMIT 1")
    except Exception:
        await db.execute("ALTER TABLE hero_slides ADD COLUMN video_url TEXT NOT NULL DEFAULT ''")


    # Marquee texts table
    await db.execute("""
        CREATE TABLE IF NOT EXISTS marquee_texts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL DEFAULT '',
            active INTEGER NOT NULL DEFAULT 1,
            sort_order INTEGER DEFAULT 0
        )
    """)

    # Sucursales table
    await db.execute("""
        CREATE TABLE IF NOT EXISTS sucursales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL DEFAULT '',
            slug TEXT NOT NULL DEFAULT '',
            address TEXT NOT NULL DEFAULT '',
            city TEXT NOT NULL DEFAULT '',
            image TEXT NOT NULL DEFAULT '',
            whatsapp TEXT NOT NULL DEFAULT '',
            instagram TEXT NOT NULL DEFAULT '',
            tiktok TEXT NOT NULL DEFAULT '',
            phone TEXT NOT NULL DEFAULT '',
            description TEXT NOT NULL DEFAULT '',
            sort_order INTEGER DEFAULT 0,
            active INTEGER NOT NULL DEFAULT 1
        )
    """)

    # Reviews table (resenas)
    await db.execute("""
        CREATE TABLE IF NOT EXISTS resenas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sucursal_slug TEXT NOT NULL DEFAULT '',
            customer_name TEXT NOT NULL DEFAULT '',
            rating INTEGER NOT NULL DEFAULT 5,
            text TEXT NOT NULL DEFAULT '',
            sort_order INTEGER DEFAULT 0,
            active INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Repair gallery table (photos of technician working)
    await db.execute("""
        CREATE TABLE IF NOT EXISTS repair_gallery (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            image TEXT NOT NULL DEFAULT '',
            caption TEXT NOT NULL DEFAULT '',
            sort_order INTEGER DEFAULT 0,
            active INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Popups table (promotional popup images)
    await db.execute("""
        CREATE TABLE IF NOT EXISTS popups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            image TEXT NOT NULL DEFAULT '',
            title TEXT NOT NULL DEFAULT '',
            link TEXT NOT NULL DEFAULT '',
            active INTEGER NOT NULL DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Category banners table (cover image shown on top of a category page)
    await db.execute("""
        CREATE TABLE IF NOT EXISTS category_banners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL DEFAULT '',
            image TEXT NOT NULL DEFAULT '',
            title TEXT NOT NULL DEFAULT '',
            subtitle TEXT NOT NULL DEFAULT '',
            link TEXT NOT NULL DEFAULT '',
            active INTEGER NOT NULL DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Product variants table (storage + color + price combinations)
    await db.execute("""
        CREATE TABLE IF NOT EXISTS product_variants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            storage TEXT NOT NULL DEFAULT '',
            color TEXT NOT NULL DEFAULT '',
            price TEXT NOT NULL DEFAULT '',
            sort_order INTEGER DEFAULT 0,
            active INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )
    """)
    
    await db.commit()
    await db.close()

def _load_seed_data():
    """Load seed data from seed_data.json file."""
    seed_path = os.path.join(os.path.dirname(__file__), "seed_data.json")
    if os.path.exists(seed_path):
        with open(seed_path, "r") as f:
            return json.load(f)
    return None

async def seed_default_data():
    """Seed default data only if tables are empty. Loads real product data from seed_data.json."""
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row

    seed = _load_seed_data()
    
    # Check if products exist
    cursor = await db.execute("SELECT COUNT(*) as cnt FROM products")
    row = await cursor.fetchone()
    product_count = row[0]
    
    # Seed categories if empty
    cursor = await db.execute("SELECT COUNT(*) as cnt FROM categories")
    row = await cursor.fetchone()
    cat_count = row[0]
    
    # Seed hero slides if empty
    cursor = await db.execute("SELECT COUNT(*) as cnt FROM hero_slides")
    row = await cursor.fetchone()
    slides_count = row[0]
    
    if slides_count == 0:
        if seed and seed.get("hero_slides"):
            for s in seed["hero_slides"]:
                await db.execute(
                    "INSERT INTO hero_slides (title, subtitle, image, video_url, link, active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (s.get("title", ""), s.get("subtitle", ""), s.get("image", ""), s.get("video_url", ""), s.get("link", ""), 1 if s.get("active", True) else 0, s.get("sort_order", 0))
                )
        else:
            default_slides = [
                ("iPhone 17 Pro Max", "El mas poderoso. Disponible ahora.", "https://images.unsplash.com/photo-1710023038956-3dce1ef3ac38?w=1200&h=600&fit=crop", "", "#productos", 1, 0),
                ("MacBook Air M4", "Potencia portatil. Desde $4.999.990.", "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&h=600&fit=crop", "", "#productos", 1, 1),
                ("Apple Watch Ultra 3", "Aventura sin limites.", "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=1200&h=600&fit=crop", "", "#productos", 1, 2),
                ("AirPods Pro 3", "Sonido inmersivo. Cancelacion total.", "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=1200&h=600&fit=crop", "", "#productos", 1, 3),
            ]
            for s in default_slides:
                await db.execute("INSERT INTO hero_slides (title, subtitle, image, video_url, link, active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)", s)
        await db.commit()

    # Seed marquee texts if empty
    cursor = await db.execute("SELECT COUNT(*) as cnt FROM marquee_texts")
    row = await cursor.fetchone()
    marquee_count = row[0]

    if marquee_count == 0:
        if seed and seed.get("marquee_texts"):
            for m in seed["marquee_texts"]:
                await db.execute(
                    "INSERT INTO marquee_texts (text, active, sort_order) VALUES (?, ?, ?)",
                    (m.get("text", ""), 1 if m.get("active", True) else 0, m.get("sort_order", 0))
                )
        else:
            default_marquees = [
                ("Gordotech - Tu destino Apple en Boyaca", 1, 0),
                ("Garantia en todos nuestros productos", 1, 1),
                ("Envios a toda Colombia", 1, 2),
                ("iPhone nuevos y semi-usados al mejor precio", 1, 3),
            ]
            for m in default_marquees:
                await db.execute("INSERT INTO marquee_texts (text, active, sort_order) VALUES (?, ?, ?)", m)
        await db.commit()

    if cat_count == 0:
        default_categories = [
            ("iphones", "iPhones", "https://images.unsplash.com/photo-1710023038956-3dce1ef3ac38?w=300&h=300&fit=crop", 0),
            ("ipads", "iPads", "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300&h=300&fit=crop", 1),
            ("macbook", "MacBook", "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&h=300&fit=crop", 2),
            ("airpods", "AirPods", "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=300&h=300&fit=crop", 3),
            ("apple-watch", "Apple Watch", "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=300&h=300&fit=crop", 4),
            ("accesorios", "Accesorios", "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=300&h=300&fit=crop", 5),
        ]
        for c in default_categories:
            await db.execute("INSERT INTO categories (slug, name, image, sort_order) VALUES (?, ?, ?, ?)", c)
        await db.commit()
    
    if product_count == 0:
        if seed and seed.get("products"):
            # Load real products from seed_data.json (with permanent Fly.io image URLs)
            for p in seed["products"]:
                colors = json.dumps(p.get("colors", []))
                storage = json.dumps(p.get("storage_options", []))
                available = json.dumps(p.get("available", ["duitama"]))
                images = json.dumps(p.get("images", []))
                color_images = json.dumps(p.get("color_images", {}))
                await db.execute(
                    """INSERT INTO products (name, category, condition, image, images, colors, storage_options, badge, available, price, old_price, description, featured_recommended, featured_trending, sort_order, model_3d, color_images)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        p.get("name", ""),
                        p.get("category", ""),
                        p.get("condition", "Semi-usado"),
                        p.get("image", ""),
                        images,
                        colors,
                        storage,
                        p.get("badge"),
                        available,
                        p.get("price", ""),
                        p.get("old_price", ""),
                        p.get("description", ""),
                        1 if p.get("featured_recommended") else 0,
                        1 if p.get("featured_trending") else 0,
                        p.get("sort_order", 0),
                        p.get("model_3d", ""),
                        color_images,
                    )
                )
        else:
            # Fallback: minimal placeholder products if seed_data.json not found
            fallback_products = [
                ("iPhone 17 Pro Max", "iphones", "Nuevo", "", '[]', '[]', '[]', "Nuevo", '["duitama"]', "", "", 1, 0, 100),
            ]
            for p in fallback_products:
                await db.execute(
                    """INSERT INTO products (name, category, condition, image, images, colors, storage_options, badge, available, price, description, featured_recommended, featured_trending, sort_order)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    p
                )
    
    # Check if bubbles exist
    cursor = await db.execute("SELECT COUNT(*) as cnt FROM model_bubbles")
    row = await cursor.fetchone()
    bubble_count = row[0]
    
    if bubble_count == 0:
        if seed and seed.get("bubbles"):
            for b in seed["bubbles"]:
                await db.execute(
                    "INSERT INTO model_bubbles (model_id, label, image, sort_order) VALUES (?, ?, ?, ?)",
                    (b.get("model_id", ""), b.get("label", ""), b.get("image", ""), b.get("sort_order", 0))
                )
        else:
            bubbles = [
                ("todos", "Todos", "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300&h=300&fit=crop", 0),
                ("iphones", "iPhones", "https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=300&h=300&fit=crop", 1),
                ("ipads", "iPads", "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300&h=300&fit=crop", 2),
                ("macbook", "MacBook", "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&h=300&fit=crop", 3),
                ("airpods", "AirPods", "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=300&h=300&fit=crop", 4),
                ("apple watch", "Apple Watch", "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=300&h=300&fit=crop", 5),
                ("accesorios", "Accesorios", "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=300&h=300&fit=crop", 6),
            ]
            for b in bubbles:
                await db.execute(
                    "INSERT INTO model_bubbles (model_id, label, image, sort_order) VALUES (?, ?, ?, ?)", b
                )
    
    # Check if repair services exist
    cursor = await db.execute("SELECT COUNT(*) as cnt FROM repair_services")
    row = await cursor.fetchone()
    if row[0] == 0:
        if seed and seed.get("repair_services"):
            for s in seed["repair_services"]:
                await db.execute(
                    "INSERT INTO repair_services (title, description, price, icon, sort_order) VALUES (?, ?, ?, ?, ?)",
                    (s.get("title", ""), s.get("description", ""), s.get("price", ""), s.get("icon", "Smartphone"), s.get("sort_order", 0))
                )
        else:
            services = [
                ("Cambio de Pantalla", "Pantallas originales y compatibles para todos los modelos de iPhone", "Desde $150.000", "Smartphone", 0),
                ("Cambio de Bateria", "Baterias de alta calidad con garantia de 6 meses", "Desde $120.000", "Zap", 1),
                ("Reparacion de Placa", "Microelectronica avanzada para solucionar problemas de placa", "Consultar", "Shield", 2),
                ("Diagnostico Gratis", "Te decimos exactamente que tiene tu equipo sin costo alguno", "Gratis", "Award", 3),
            ]
            for s in services:
                await db.execute(
                    "INSERT INTO repair_services (title, description, price, icon, sort_order) VALUES (?, ?, ?, ?, ?)", s
                )
    
    # Seed sucursales if empty
    cursor = await db.execute("SELECT COUNT(*) as cnt FROM sucursales")
    row = await cursor.fetchone()
    if row[0] == 0:
        if seed and seed.get("sucursales"):
            for s in seed["sucursales"]:
                await db.execute(
                    "INSERT INTO sucursales (name, slug, address, city, image, whatsapp, instagram, tiktok, phone, description, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (s.get("name", ""), s.get("slug", ""), s.get("address", ""), s.get("city", ""), s.get("image", ""), s.get("whatsapp", ""), s.get("instagram", ""), s.get("tiktok", ""), s.get("phone", ""), s.get("description", ""), s.get("sort_order", 0), 1 if s.get("active", True) else 0)
                )
        else:
            default_sucursales = [
                ("Gordotech Duitama", "duitama", "Pasaje Comercial Solano, Local 102", "Duitama", "", "573144810431", "https://www.instagram.com/gordotechduitama", "https://www.tiktok.com/@gordotech1", "+57 314 481 0431", "Tu destino Apple en Duitama", 0, 1),
                ("Gordotech Tunja", "tunja", "Av. Universitaria # 45a-40, Oficina 304, Oporto Centro de Negocios", "Tunja", "", "573219863883", "https://www.instagram.com/gordotechtunja", "https://www.tiktok.com/@gordotech1", "+57 321 986 3883", "Tu destino Apple en Tunja", 1, 1),
                ("Clinica de Celulares", "clinica", "San Andresito de la 18, Local 11", "Duitama", "", "573213815465", "", "", "+57 321 381 5465", "Reparacion profesional de iPhones - Diagnostico Gratis", 2, 1),
            ]
            for s in default_sucursales:
                await db.execute(
                    "INSERT INTO sucursales (name, slug, address, city, image, whatsapp, instagram, tiktok, phone, description, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", s
                )
        await db.commit()

    # Seed resenas if empty or if count doesn't match defaults (auto-reseed)
    cursor = await db.execute("SELECT COUNT(*) as cnt FROM resenas")
    row = await cursor.fetchone()
    current_count = row[0]
    expected_default_count = 120  # 75 Duitama + 23 Tunja + 22 Clinica
    if current_count == 0 or (current_count < expected_default_count and not (seed and seed.get("resenas"))):
        # Clear old reviews if re-seeding
        if current_count > 0:
            await db.execute("DELETE FROM resenas")
            await db.commit()
        if seed and seed.get("resenas"):
            for r in seed["resenas"]:
                await db.execute(
                    "INSERT INTO resenas (sucursal_slug, customer_name, rating, text, sort_order, active) VALUES (?, ?, ?, ?, ?, ?)",
                    (r.get("sucursal_slug", ""), r.get("customer_name", ""), r.get("rating", 5), r.get("text", ""), r.get("sort_order", 0), 1 if r.get("active", True) else 0)
                )
        else:
            default_resenas = [
                # Duitama (75 reviews)
                ("duitama", "Marcela Rodriguez", 5, "Muy buena atención y exelente servicio", 0, 1),
                ("duitama", "Unplugged Banda", 5, "La mejor tienda de Boyacá", 1, 1),
                ("duitama", "Fabian Bonilla", 5, "Cool como te atienden Gracias por todo", 2, 1),
                ("duitama", "felipe archila alvarez", 5, "Excelente atención, productos de calidad y variedad.", 3, 1),
                ("duitama", "Sofia Leon", 5, "Super recomendados, 100 por ciento confiables y excelente atención", 4, 1),
                ("duitama", "Juan León", 5, "excelente servicio, equipos de calidad 100% recomendado .", 5, 1),
                ("duitama", "Héctor Niño", 5, "Compré mi celular allí en seminuevo y me ha salido super bueno, 100% garantizados", 6, 1),
                ("duitama", "Deyanira Gaitan", 5, "He comprado en Gordotech Duitama y tiene excelentes equipos con muy buenos precios y garantizados, además me asesoraron muy bien con las dudas que tenia sobre los equipos, para decidirme por el mejor según mi presupuesto.", 7, 1),
                ("duitama", "Fabian Alvarez", 5, "Ahí compré mi teléfono excelente servicio", 8, 1),
                ("duitama", "Maria Angarita", 5, "Excelentes equipos y muy buena atención", 9, 1),
                ("duitama", "Sandra Silva", 5, "El mejor lugar y super confiables de verdad que los super recomiendo", 10, 1),
                ("duitama", "Lina Becerra", 5, "Compre un iPhone en excelentes condiciones y entrega inmediata", 11, 1),
                ("duitama", "Danna Gómez", 5, "La atención es muy buena, compré mi celular allí y la calidad es increíble, el celular que quería ahí lo encontré mucho mejor que en otros lugares", 12, 1),
                ("duitama", "carol p", 5, "La mejor tienda Apple de Duitama", 13, 1),
                ("duitama", "Duvan Mesa Camacho", 5, "Buen servicio", 14, 1),
                ("duitama", "ricardo jose barbosa serrano", 5, "Excelente servicio muy profesionales", 15, 1),
                ("duitama", "Cesar Ferney Hurtado Estupiñan", 5, "Yo compre me samsung hace dos años, y super bueno ya toca es cambiarlo con descuento jajaaj", 16, 1),
                ("duitama", "danexi ardila garrido", 5, "Excelente servicio, buena atención 👍🏻👍🏻👍🏻…", 17, 1),
                ("duitama", "Johnnattan Latorre", 5, "Súper atentos y colaboradores con productos de calidad!", 18, 1),
                ("duitama", "Gustavo Casas", 5, "Compré un iPhone 16 pro. Muy buen equipo y lo mejor fue la atención. Tienen buen conocimiento u asesoran muy bien.", 19, 1),
                ("duitama", "Maryuri Tatiana Acosta Forero", 5, "Excelente atención , las chicas son muy amables y tienen muy buena disposición", 20, 1),
                ("duitama", "Yasmin Porras", 5, "Excelente atención .muy buena experiencia", 21, 1),
                ("duitama", "Felipe Acosta Cadena", 5, "Los mejores compré mi iPhone 17 pro Max mi iPad 16 y mi Pencil", 22, 1),
                ("duitama", "Sara Corredor", 5, "Excelente servicio , los equipos en muy buen estado , siempre te reciben con la mejor actitud .", 23, 1),
                ("duitama", "Juan Morales", 5, "Excelente atención, los dispositivos son muy confiables y muy accesibles", 24, 1),
                ("duitama", "Erik Hernandez", 5, "Excelente servicio muy serios y buena atención", 25, 1),
                ("duitama", "Andres salcedo", 5, "Excelente , equipos en buen estado, con sus garantías respectivas y en excelentes condiciones de funcionamiento", 26, 1),
                ("duitama", "SergioSalcedo Violin", 5, "Excelente servicio y muy amable la muchacha que me atendió Daniela 10/10 mi samsung 24", 27, 1),
                ("duitama", "Deisy Díaz", 5, "Tuve una experiencia muy bonita los vendedores son muy amables y le recomienda ñn cual es el mejor los felicito y los recomiendo", 28, 1),
                ("duitama", "Lucyca", 5, "Excelente servicio me sentí cómoda, voy a volver y a recomendar a mis amigos y conocidos.", 29, 1),
                ("duitama", "Santiago Centeno Agudelo", 5, "Gran servicio de Leo y su equipo!", 30, 1),
                ("duitama", "Martha Cecilia Diaz Cabra", 5, "Tuve una excelente experiencia comprando mi iPhone en esta tienda. Desde el primer momento la atención fue muy amable, me explicaron todo con paciencia y resolvieron todas mis dudas. El equipo es muy profesional y se nota que saben bastante sobre los productos que venden. Además, todo el proceso de compra fue rápido, seguro y confiable. Me sentí muy tranquila con la asesoría que recibí. Sin duda volvería a comprar aquí y también la recomiendo a quienes estén buscando un iPhone o accesorios de calidad. ¡Servicio 10/10! 👏📱", 31, 1),
                ("duitama", "Wem Mantilla", 5, "Un día viajamos de Sogamoso a Tunja en bus este tenía como cargar el celular y conectamos nuestro cargador en esas mi hijo se mareo y estaba malito y el bus paró en Duitama me baje con el para ver si el aire le ayudaba pero no se mejoro dejamos ir el bus cuando el se fue al rato me acordé del cargador y se nos quedó en el...para rematar..perdí lo de dos pasajes, mi hijo se enfermo y para rematar el cargador se queda..y el celular sin batería para avisar..me acordé de un comercial de gordotech y me acuerdo q decía al lado del inovo cogimos un taxi llegamos y si estaban ahí.. cómprame s el cargador original, buen precio excelente atención y al final todo no fue malo pude comunicarme y hoy en dia tengo ese cargador aún funcionando ..esto fue hace años y medio un abrazo..", 32, 1),
                ("duitama", "LEONARDO VALDERRAMA", 5, "Muy buena atención, yo cotize mi teléfono en muchos lugares y definitivamente aquí encontré el mejor precio !! Súper recomendado", 33, 1),
                ("duitama", "Juan esteban borda", 5, "Gran servicio, Gente muy amable", 34, 1),
                ("duitama", "GVK GROUP", 5, "La mejor tienda de productos Apple de Boyaca, van a la fija en calidad y garantía , súper recomendados.", 35, 1),
                ("duitama", "Leonardo Salcedo", 5, "Un excelente lugar, buena atención por parte de la niña Sarai Daniela cuando ella estaba , muy buena calidad de los celulares y muy buen stock manejando lo mejor de la gama alta tanto en android y iPhone.", 36, 1),
                ("duitama", "Carlos Mojica", 5, "Compré un iPhone 16 pro Max en gordotech Duitama, excelente servicio, trato muy amable, garantizado 100%", 37, 1),
                ("duitama", "Guillermo Quiroz Gomez", 5, "Buena atención, recomendado", 38, 1),
                ("duitama", "Nathalia Ochoa", 5, "Excelente servicio, excelentes precios la mejor tienda ❤️", 39, 1),
                ("duitama", "Melii Sandoval", 5, "Compré mi iPhone 16 pro Max excelente", 40, 1),
                ("duitama", "Julian Alberto Pedraza Estepa", 5, "He comprado accesorios para mi celular Samsung y no he tenido problemas. Elementos 1A.", 41, 1),
                ("duitama", "Carolina Lamilla", 5, "Compré dos relojes y la atención es súper genial y los relojes a un lo uso y no he tenido ningún problema con ellos Amo sus productos", 42, 1),
                ("duitama", "diego reyes", 5, "Compré un iPhone 14 Pro y di en parte de pago mi 12 pro Max, sin duda la mejor retoma del mercado", 43, 1),
                ("duitama", "luis Carlos Rodríguez", 5, "Compré mi iPhone 17 pro Max hace un mes, en la tienda gordotech, buen servicio, buena atención, oportuna y confiable, recomendada, los mejores equipos y precios los encuentras ahí!!!!!", 44, 1),
                ("duitama", "Valentina Valderrama", 5, "Súper recomendados! Yo compré un iPhone 16 rosado, y me ha salido muy bueno, la calidad y la atención de la tienda también son excelentes!", 45, 1),
                ("duitama", "Sebastian Valderrama", 5, "Excelentes productos, buenos precios y celulares garantizados.", 46, 1),
                ("duitama", "Cero Reportes SAS", 5, "El mejor lugar para encontrar los mejores productos Apple", 47, 1),
                ("duitama", "Jacob Matias", 5, "Excelente servicio , compré mi iPhone 16 pro Max súper feliz de comprar en gordotech 🤗✨🔥✅…", 48, 1),
                ("duitama", "Josue Daniel Cristiano Jacome", 5, "He tenido la oportunidad de comprar mi celular y IPad en Gordotech. 100% recomendado 💯…", 49, 1),
                ("duitama", "Francisco Carvajal Flechas", 5, "Compramos dos iPhone 15 pro Max cuando salieron y aún los tenemos nos han salido tan buenos que ya estamos pensando en cambiarnos al 17 pro Max con gordotech prontamente", 50, 1),
                ("duitama", "sara perez “saraperezr”", 5, "Compré un iphone15 pro nuevo. Y es una maravilla 10/10 🥳…", 51, 1),
                ("duitama", "Lorena Velandia Rincon", 5, "Excelente servicio , buena asesoría y espacios limpios y modernos .", 52, 1),
                ("duitama", "Karol Malaver", 5, "“Sin duda, Gordotech llegó a revolucionar la tecnología en Boyacá. Es un lugar que genera confianza desde el primer momento: la atención es excelente, te asesoran durante todo el proceso y ofrecen muy buenas garantías con una relación calidad–precio increíble. Además, cuentan con sedes en las principales ciudades del departamento. ¡Me encanta! ✨”", 53, 1),
                ("duitama", "FERNANDO ROJAS", 5, "Es un lugar espectacular la atención es 10 de 10 en abril de 2025 compré un iPhone 16 pro Max de 256 nuevo excelente equipo no molesta para nada y lo mejor que con las recomendaciones que me dieron en gordotech su batería sigue estando al 100%", 54, 1),
                ("duitama", "Andrea Maryel Buritica Jacome", 5, "Mi celular me ha salido súper bueno, se los súper recomiendo, no he tenido ningún problema, he comprado dos y los dos geniales, nuevos como seminuevos", 55, 1),
                ("duitama", "Sol Yuliana Jacome Candela", 5, "Súper el lugar, compré mi iPhone 17 Pro Max, súper recomendado", 56, 1),
                ("duitama", "Olmer Ruiz", 5, "Excelente servicio Adquirí un iphone nuevo y uno seminuevo y han salido 100 de 100 ✅✅", 57, 1),
                ("duitama", "Daniel Prieto", 5, "Muy serios y excelentes precios, nunca he tenido problemas con los equipos que he comprado", 58, 1),
                ("duitama", "the black suite ph", 5, "Excelente lugar no es la primera vez que compro mis equipos aquí son lo mejor en Duitama 🔥🔥🙏🏽…", 59, 1),
                ("duitama", "Judy Alejandra Flechas Mayorga", 5, "Excelente lugar, productos totalmente garantizados a muy buenos precios, super recomendado", 60, 1),
                ("duitama", "Sarai Daniela Salcedo Daza", 5, "Su telefonía como nueva y seminuevo lo mejor de lo mejor", 61, 1),
                ("duitama", "Daniela Vargas", 5, "Celulares de calidad", 62, 1),
                ("duitama", "Valeria Perez Ochoa", 5, "En el 2025 compre con gordotech dos equipos nuevos sellados/Iphone 16 pro y Samsung A56, muy buena atencion y seguridad y confianza al comprar🫡,recomendados…", 63, 1),
                ("duitama", "Diana Carolina Diaz Cabra", 5, "Excelentes Productos y buena atención", 64, 1),
                ("duitama", "Jefferson Montaña", 5, "Compré hace unos meses un IPhone 14 Semi nuevo. El servicio y la atención fue excelente.", 65, 1),
                ("duitama", "Juan Diego Alvarado Mojica", 5, "Excelente mi celular lo tengo hace dos años y cero problemas", 66, 1),
                ("duitama", "Steveen Sanabria", 5, "Buen servicio excelente atención 10/10", 67, 1),
                ("duitama", "Daniela Mejia Consuegra", 5, "Me encantó la atención, compré mi celu y me asesoraron muy bien, todo fue transparente y rápido 🔝🔝🔝🔝Súper recomendado…", 68, 1),
                ("duitama", "José Luis Gil Sosa", 5, "Facilidades de pago, precios cómodos, atención 10 de 10, garantía, no tengo queja alguna, son muy top 🔥👌…", 69, 1),
                ("duitama", "John Agredo", 5, "Compré un IPhone 16 ProMax Seminuevo, impecable estado, el precio más de 500mil pesos más económico que en cualquier otro lugar, la atención lo mejor. 200% recomendados.", 70, 1),
                ("duitama", "Anaaeiou", 5, "¡Excelente servicio! Siempre encuentro con ellos todo y a un super precio ✨", 71, 1),
                ("duitama", "Andres Mariño", 5, "Excelente atención, compré un equipo seminuevo y no ha dado lios... Recomendado.", 72, 1),
                ("duitama", "alexander quintero", 5, "La mejor tienda Apple en Boyacá 🖤🖤…", 73, 1),
                ("duitama", "Leonardo Joya", 5, "La mejor tienda Apple de Boyacá viaje desde sogamoso y conseguí todo tal cual me lo ofrecieron", 74, 1),
                # Tunja (23 reviews)
                ("tunja", "Yeferson Ortiz", 5, "Exelente atención,servicio y muy buen lugar", 0, 1),
                ("tunja", "David Reyes", 5, "Excelente precio, muy buen servicio", 1, 1),
                ("tunja", "DEIGO MESA", 5, "Excelente servicio , muy rápido y confiable 👍👍👍 todo garantizado , buenos precios…", 2, 1),
                ("tunja", "EDER SAMUEL MORENO PARRA", 5, "Excelentes precios y servicio", 3, 1),
                ("tunja", "Claudia Maritza Arenas Giraldo", 5, "Excelente atención, gran variedad de productos y tenían todo lo que yo necesitaba", 4, 1),
                ("tunja", "Maria Medina", 5, "Compré mi primer iPhone acá en la sede de Tunja", 5, 1),
                ("tunja", "Julian Alberto Pedraza Estepa", 5, "Buen local precios accesibles.", 6, 1),
                ("tunja", "Jhon Jairo Gil Hernandez", 5, "Feliz muy agradecido excelente atención super recomendados", 7, 1),
                ("tunja", "Camilo Barrera", 5, "Excelente lugar buenos teléfonos", 8, 1),
                ("tunja", "Hugo Alejandro Ramirez", 5, "Excelente servicio , calidad en productos 100% originales!!", 9, 1),
                ("tunja", "Sofía Rosas", 5, "Excelente atención,muy amables", 10, 1),
                ("tunja", "Paula Robles Serna", 5, "Excelente servicio y muy buenos precios. Las chicas muy atentas y se enfocan en ayudarte a encontrar lo que quieres 🔝🔝…", 11, 1),
                ("tunja", "sebastian Montoya", 5, "De verdad que da gusto comprar en un sitio así. La atención es espectacular, el equipo es muy profesional y se nota que les importa el cliente. Me ayudaron en todo el proceso y resolvieron todas mis dudas. 10/10 🔥…", 12, 1),
                ("tunja", "Claudia Rocio Pulido Moreno", 5, "Hoy pasé por el local a comprar un cargador para mi celular y la atención fue excelente, aparte cargadores y accesorios 100% originales, muy recomendado 👌…", 13, 1),
                ("tunja", "Leidy Pinzon", 5, "Muy amables las chicas que atienden, y los productos a muy buen precio y excelente calidad.", 14, 1),
                ("tunja", "Karen Rosas", 5, "Excelente servicio, las chicas muy atentas y eficientes! Y los productos 10/10 súper recomendado", 15, 1),
                ("tunja", "ANA GABRIELA PEREZ TORRES", 5, "Excelente servicio", 16, 1),
                ("tunja", "michael daniel garcia bernal", 5, "Compre el s26 ultra, excelente atencion y muy buen servicio total recomendacion 10/10", 17, 1),
                ("tunja", "juan fernando g c", 5, "Hoy compré un iPhone 17 pro, excelente atención de las chicas y productos totalmente originales 10/10", 18, 1),
                ("tunja", "sol jacome", 5, "Los visite en unicentro Tunja y muy buenos los precios, adquirí con ellos mi 17 pro", 19, 1),
                ("tunja", "Juanita Maria Sosa Avendaño", 5, "Súper recomendado, tienen todos los productos de Apple con excelentes precios y una buena atención", 20, 1),
                ("tunja", "Valentina Rodriguez Alba", 5, "Visité la tienda en Unicentro Tunja para ver algunas MacBook y me gustó mucho la experiencia. La atención fue buena y me explicaron sobre los equipos. El lugar es organizado y tienen muy buena tecnología. Recomendado.", 21, 1),
                ("tunja", "luis alejandro rodriguez", 5, "La atención, los precios y los equipos son los mejores. Gran axperiencia ✌️", 22, 1),
                # Clinica (22 reviews)
                ("clinica", "jose david vargas mayorga", 5, "Excelente servicio lo recomiendo viene con todo lo q dice", 0, 1),
                ("clinica", "German Adolfo Gonzalez Sanabria", 5, "Buena experiencia, productos originales ya precios accesibles.", 1, 1),
                ("clinica", "Ginita Bonita", 5, "Excelente asesoría y muy buen equipo de trabajo", 2, 1),
                ("clinica", "Sammy Rojas", 5, "Buen trabajo , increíble resultado, le metió mucho amor al teléfono Muy buenos equipos y excelente equipo de trabajo", 3, 1),
                ("clinica", "Valentina Cuervo rodriguez", 5, "Un excelente servicio y la mejor atención por parte de Daniela", 4, 1),
                ("clinica", "Juan José Cabra Núñez", 5, "Muy buena experiencia. Daniela me atendió súper bien, fue muy amable y me asesoró perfectamente. Los AirPods funcionan excelente. Recomendado", 5, 1),
                ("clinica", "jaider santiago huerfano bautista", 5, "Excelente servicio", 6, 1),
                ("clinica", "Leonela Muñoz Acevedo", 5, "Gracias por ese iPhone 17 pro y la MacBook Air ❤️ totalmente nuevos y con su garantía de 1 año. Gracias Daniela por la atención en el momento de la compra.", 7, 1),
                ("clinica", "Sleyder A", 5, "El iPhone 17 pro Max que compré con ellos salió perfecto y su garantía de un año lo mejora aún más. Daniela demostró mucha responsabilidad a la hora de la venta.", 8, 1),
                ("clinica", "Victor Navarro", 5, "Compré mi iPhone en esta tienda y la experiencia fue excelente. Desde el inicio me atendieron muy bien, resolvieron todas mis dudas y me explicaron las diferencias entre los modelos sin presión para comprar. El equipo llegó en perfecto estado, totalmente original y tal como lo describían. Además, la entrega fue rápida y bien organizada. Me dio mucha confianza la forma en que manejan todo, desde el pago hasta la garantía. Sin duda recomiendo esta tienda si estás pensando en comprar un iPhone, ya que ofrecen buen servicio, transparencia y productos de calidad. Volvería a comprar con ellos sin pensarlo.", 9, 1),
                ("clinica", "Cely Saavedra Cristian Geobanny", 5, "Exelente servicio... La atención exelente", 10, 1),
                ("clinica", "Leonardo Salcedo", 5, "Excelente servicio, buena atención, y excelente trabajo en el arreglo de mi equipo. Muchas gracias.", 11, 1),
                ("clinica", "Deybid Muñoz", 5, "Tiene buen servicio, hice un cambio de tapa de mi 14 pro Max, quedó perfecto y la calidad buena. La atención de Daniela fue perfecta.", 12, 1),
                ("clinica", "Jhoan Pinto", 5, "Efectivo y recomendado, súper me resolvió en un momento, lo había llevado a otro lugar y me dijeron que no tenía arreglo y lo traje aquí donde el gordotech y me lo arreglo en 10 minutos, buen despachador y técnico, me voy feliz y sastifecha gracias!", 13, 1),
                ("clinica", "glory man", 5, "La mejor tienda de celulares que puede existir en Boyaca, y sus mejores asesores en espacial Daniela", 14, 1),
                ("clinica", "yecid sanabria", 5, "Súper, excelente servicio", 15, 1),
                ("clinica", "Liseth gonzalez", 4, "Muy bien servicio", 16, 1),
                ("clinica", "Lisethe Vargas", 5, "Tuve buena asesoría de parte del técnico y a la chica, fueron muy sinceros si era bueno salvar mi celular, y lleve uno mejor 😅…", 17, 1),
                ("clinica", "Brayan sanchez", 4, "Excelente servicio", 18, 1),
                ("clinica", "Fabio Moreno", 5, "Hice la restauración de iPhone 13 Pro Max de visor y tapa trasera y quedó a la altura 100%recomendado", 19, 1),
                ("clinica", "Sarai Daniela Salcedo Daza", 5, "Me ayudaron a reparar la pantalla de mi teléfono, y quedó súper bien y su atención con su explicación también", 20, 1),
                ("clinica", "Sergio Melendez", 5, "Buena experiencia arreglando mi S24, Rapido y buen servicio", 21, 1),
            ]
            for r in default_resenas:
                await db.execute(
                    "INSERT INTO resenas (sucursal_slug, customer_name, rating, text, sort_order, active) VALUES (?, ?, ?, ?, ?, ?)", r
                )
        await db.commit()

    # Check if admin exists
    cursor = await db.execute("SELECT COUNT(*) as cnt FROM admin_users")
    row = await cursor.fetchone()
    if row[0] == 0:
        import bcrypt as bcrypt_lib
        password_hash = bcrypt_lib.hashpw("gordotech2024".encode('utf-8'), bcrypt_lib.gensalt()).decode('utf-8')
        await db.execute(
            "INSERT INTO admin_users (username, password_hash) VALUES (?, ?)",
            ("admin", password_hash)
        )
    
    await db.commit()
    await db.close()

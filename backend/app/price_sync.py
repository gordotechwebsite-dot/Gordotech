"""Read-only price sync from the Google Sheets price list.

The sheet is never written to: it is fetched as CSV and translated into price
updates for products that already exist in the catalog. Products, variants,
colors and storages are never created or deleted here - a row that cannot be
resolved against the catalog is reported and ignored.

A product takes part in the sync only when its `sheet_name` matches the first
column of the sheet (several names can be separated by `;`).
"""

import csv
import io
import os
import re
import unicodedata

SHEET_ID = os.environ.get("PRICE_SHEET_ID", "1n3XZBGDh41WvZ4KNE4c-7CCVtSNLId00XxniLSrMxsU")
SHEET_GID = os.environ.get("PRICE_SHEET_GID", "0")
SHEET_CSV_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&gid={SHEET_GID}"

SYNC_INTERVAL_SECONDS = int(os.environ.get("PRICE_SYNC_INTERVAL", "900"))
# The container autostops when idle, so the first sync runs right after boot.
STARTUP_DELAY_SECONDS = int(os.environ.get("PRICE_SYNC_STARTUP_DELAY", "15"))

# Largest relative price change applied automatically; anything bigger is
# reported so a human can confirm it was not a typo in the sheet.
MAX_RELATIVE_CHANGE = 0.4

# Colors are written differently in the sheet and in the catalog (the catalog
# stores some of them as hex). Each group holds equivalent spellings.
COLOR_GROUPS = [
    {"negro", "black", "jet black", "midnight", "midnigth"},
    {"blanco", "white", "starlight", "starligth"},
    {"silver", "plata"},
    {"azul", "blue"},
    {"naranja", "orange"},
    {"morado", "purple"},
    {"rosa", "pink"},
    {"borgona", "burgundy", "#492b30"},
    {"glacier", "glaciar", "#a1bbe6"},
]


def normalize(value: str) -> str:
    text = unicodedata.normalize("NFKD", (value or "").lower())
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.replace('"', " ").replace("'", " ")
    return re.sub(r"\s+", " ", text).strip()


def normalize_storage(value: str) -> str:
    return normalize(value).replace(" ", "")


def parse_price(value: str) -> int:
    digits = re.sub(r"[^0-9]", "", value or "")
    return int(digits) if digits else 0


def format_price(amount: int) -> str:
    return f"{amount:,}".replace(",", ".")


def colors_match(sheet_color: str, variant_color: str) -> bool:
    a, b = normalize(sheet_color), normalize(variant_color)
    if a == b:
        return True
    return any(a in group and b in group for group in COLOR_GROUPS)


def storage_matches(sheet_storage: str, variant_storage: str, sheet_name: str) -> bool:
    """Compare storages, tolerating catalog labels that carry the screen size.

    The sheet says `iPad AIR 13" M3` + `128gb` while the catalog variant is
    `13" 128GB`, so the extra part of the variant label must appear in the
    sheet's product name.
    """
    wanted = normalize_storage(sheet_storage)
    current = normalize_storage(variant_storage)
    if wanted == current or not wanted:
        return True
    if not current.endswith(wanted):
        return False
    extra = current[: -len(wanted)]
    tokens = re.findall(r"\d+", extra)
    name = normalize(sheet_name)
    return bool(tokens) and all(token in name for token in tokens)


def parse_sheet(csv_text: str) -> list[dict]:
    rows = []
    reader = csv.reader(io.StringIO(csv_text))
    for index, raw in enumerate(reader):
        if index == 0 or len(raw) < 4:
            continue
        name, storage, color, price = raw[0], raw[1], raw[2], raw[3]
        if not name.strip() or not parse_price(price):
            continue
        rows.append({
            "row": index + 1,
            "name": name.strip(),
            "storage": storage.strip(),
            "colors": [c.strip() for c in color.split(",") if c.strip()],
            "price": parse_price(price),
        })
    return rows


def sheet_names_of(product: dict) -> list[str]:
    return [normalize(n) for n in (product.get("sheet_name") or "").split(";") if normalize(n)]


def build_plan(sheet_rows: list[dict], products: list[dict]) -> dict:
    """Translate sheet rows into price updates against the current catalog."""
    by_sheet_name: dict[str, list[dict]] = {}
    for product in products:
        for name in sheet_names_of(product):
            by_sheet_name.setdefault(name, []).append(product)

    updates: list[dict] = []
    skipped: list[dict] = []
    single_price_rows: dict[int, list[dict]] = {}

    for row in sheet_rows:
        matched = by_sheet_name.get(normalize(row["name"]), [])
        if not matched:
            skipped.append({**row, "reason": "no esta publicado en la pagina"})
            continue
        if len(matched) > 1:
            skipped.append({
                **row,
                "reason": "hay " + str(len(matched)) + " productos con ese nombre de hoja",
            })
            continue
        product = matched[0]
        variants = [v for v in (product.get("variants") or []) if v.get("active", True)]

        if not variants:
            single_price_rows.setdefault(product["id"], []).append(row)
            continue

        # Variants that only differ by storage keep an empty color, so the colors
        # listed in the sheet share one price and must not be matched.
        has_colors = any((v.get("color") or "").strip() for v in variants)
        for color in (row["colors"] if has_colors and row["colors"] else [""]):
            matches = [
                v for v in variants
                if storage_matches(row["storage"], v["storage"], row["name"])
                and (not color or colors_match(color, v["color"]))
            ]
            if not matches:
                skipped.append({
                    **row,
                    "reason": f"{product['name']}: no hay variante {row['storage'] or 's/alm'} / {color or 's/color'}",
                })
                continue
            for variant in matches:
                updates.append({
                    "kind": "variant",
                    "product_id": product["id"],
                    "product_name": product["name"],
                    "variant_id": variant["id"],
                    "storage": variant["storage"],
                    "color": variant["color"],
                    "current": (variant["price"] or "").strip(),
                    "new": format_price(row["price"]),
                    "row": row["row"],
                })

    # Products without variants carry a single price field.
    products_by_id = {p["id"]: p for p in products}
    for product_id, rows in single_price_rows.items():
        product = products_by_id[product_id]
        options = [normalize_storage(o) for o in (product.get("storage_options") or [])]
        usable = []
        for r in rows:
            if r["storage"] and options and normalize_storage(r["storage"]) not in options:
                skipped.append({**r, "reason": f"{product['name']}: en la pagina no existe {r['storage']}"})
            else:
                usable.append(r)
        if not usable:
            continue
        prices = {r["price"] for r in usable}
        if len(prices) > 1:
            for r in usable:
                skipped.append({
                    **r,
                    "reason": f"{product['name']}: la hoja trae {len(prices)} precios distintos y el producto no tiene variantes",
                })
            continue
        row = usable[0]
        updates.append({
            "kind": "product",
            "product_id": product["id"],
            "product_name": product["name"],
            "variant_id": None,
            "storage": row["storage"],
            "color": "",
            "current": (product.get("price") or "").strip(),
            "new": format_price(row["price"]),
            "row": row["row"],
        })

    by_target: dict[tuple, list[dict]] = {}
    for update in updates:
        by_target.setdefault((update["product_id"], update["variant_id"]), []).append(update)

    changes, needs_review, unchanged = [], [], []
    for group in by_target.values():
        if len({u["new"] for u in group}) > 1:
            rows = ", ".join(str(u["row"]) for u in group)
            skipped.append({
                "row": group[0]["row"],
                "name": group[0]["product_name"],
                "storage": group[0]["storage"],
                "colors": [group[0]["color"]] if group[0]["color"] else [],
                "price": 0,
                "reason": f"filas {rows} de la hoja dan precios distintos para la misma variante",
            })
            continue
        update = group[0]
        current = parse_price(update["current"])
        new = parse_price(update["new"])
        if current == new:
            unchanged.append(update)
        elif current and abs(new - current) / current > MAX_RELATIVE_CHANGE:
            needs_review.append(update)
        else:
            changes.append(update)

    return {
        "changes": changes,
        "needs_review": needs_review,
        "unchanged": unchanged,
        "skipped": skipped,
    }

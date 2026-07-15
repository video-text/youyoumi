"""Cache EchoTik product covers as stable, optimized site assets.

EchoTik cover URLs are intentionally not public.  Its zero-credit batch cover
endpoint returns 24-hour download URLs; this script resolves those URLs in
batches of ten, downloads each image, and stores a compact WebP copy in the
site so the published page does not depend on expiring links.
"""

from __future__ import annotations

import json
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from io import BytesIO
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv
from PIL import Image, ImageOps, UnidentifiedImageError


SITE_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = SITE_ROOT.parent
DATA_PATH = SITE_ROOT / "public" / "data" / "product-analysis.json"
IMAGE_DIR = SITE_ROOT / "public" / "product-images"
ENV_PATH = WORKSPACE_ROOT / ".env"
DOWNLOAD_ENDPOINT = "https://open.echotik.live/api/v3/echotik/batch/cover/download"
SOURCE_HOST = "echosell-images.tos-ap-southeast-1.volces.com"
BATCH_SIZE = 10


def _chunks(values: list[str], size: int) -> list[list[str]]:
    return [values[index : index + size] for index in range(0, len(values), size)]


def _resolved_mapping(data: Any) -> dict[str, str]:
    if isinstance(data, dict):
        return {str(key): str(value) for key, value in data.items()}
    mapping: dict[str, str] = {}
    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict):
                mapping.update({str(key): str(value) for key, value in item.items()})
    return mapping


def _local_path(product: dict[str, Any]) -> tuple[Path, str]:
    region = str(product.get("source_region") or "XX").upper()
    product_id = str(product.get("product_id") or "unknown")
    filename = f"{region}-{product_id}.webp"
    return IMAGE_DIR / filename, f"/product-images/{filename}"


def _save_webp(content: bytes, destination: Path) -> None:
    with Image.open(BytesIO(content)) as opened:
        image = ImageOps.exif_transpose(opened)
        image.thumbnail((720, 720), Image.Resampling.LANCZOS)
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA" if "transparency" in image.info else "RGB")
        image.save(destination, "WEBP", quality=82, method=6)


def _resolve_batch(session: requests.Session, batch: list[str]) -> dict[str, str]:
    response: requests.Response | None = None
    for attempt in range(4):
        response = session.get(
            DOWNLOAD_ENDPOINT,
            params={"cover_urls": ",".join(batch)},
            timeout=(15, 90),
        )
        if response.status_code != 429:
            break
        if attempt == 3:
            break
        retry_after = response.headers.get("Retry-After")
        delay = float(retry_after) if retry_after and retry_after.isdigit() else 2 ** (attempt + 1)
        time.sleep(min(delay, 10))
    assert response is not None
    response.raise_for_status()
    body = response.json()
    if body.get("code") != 0:
        raise RuntimeError(f"EchoTik cover resolver failed: {body.get('message', 'unknown error')}")
    return _resolved_mapping(body.get("data"))


def main() -> None:
    load_dotenv(ENV_PATH)
    username = os.getenv("ECHOTIK_API_USERNAME")
    password = os.getenv("ECHOTIK_API_PASSWORD")
    if not username or not password:
        raise RuntimeError("Missing ECHOTIK_API_USERNAME / ECHOTIK_API_PASSWORD")

    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    products: list[dict[str, Any]] = payload.get("products", [])
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)

    products_by_source: dict[str, list[dict[str, Any]]] = {}
    cached_count = 0
    for product in products:
        source_url = str(product.get("cover_source_url") or product.get("cover_url") or "")
        local_path, public_path = _local_path(product)
        if local_path.exists() and local_path.stat().st_size > 0:
            product["cover_source_url"] = source_url
            product["cover_url"] = public_path
            cached_count += 1
            continue
        if SOURCE_HOST not in source_url:
            product["cover_url"] = ""
            continue
        products_by_source.setdefault(source_url, []).append(product)

    session = requests.Session()
    session.auth = (username, password)
    resolved: dict[str, str] = {}
    source_urls = list(products_by_source)
    for batch in _chunks(source_urls, BATCH_SIZE):
        resolved.update(_resolve_batch(session, batch))
        time.sleep(0.75)

    def download_source(source_url: str, matching_products: list[dict[str, Any]]) -> tuple[int, int]:
        temporary_url = resolved.get(source_url)
        if not temporary_url:
            return 0, len(matching_products)
        try:
            image_response = requests.get(temporary_url, timeout=(15, 90))
            image_response.raise_for_status()
            downloaded = 0
            for product in matching_products:
                local_path, public_path = _local_path(product)
                _save_webp(image_response.content, local_path)
                product["cover_source_url"] = source_url
                product["cover_url"] = public_path
                downloaded += 1
            return downloaded, 0
        except (requests.RequestException, OSError, UnidentifiedImageError):
            return 0, len(matching_products)

    downloaded_count = 0
    failed_count = 0
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = [
            executor.submit(download_source, source_url, matching_products)
            for source_url, matching_products in products_by_source.items()
        ]
        for future in as_completed(futures):
            downloaded, failed = future.result()
            downloaded_count += downloaded
            failed_count += failed

    products_by_id = {str(product.get("product_id")): product for product in products}
    for concept in payload.get("concepts", []):
        representative = products_by_id.get(str(concept.get("representative_product_id")), {})
        concept["cover_url"] = representative.get("cover_url", "")

    payload.setdefault("meta", {})["product_image_count"] = sum(
        1 for product in products if str(product.get("cover_url", "")).startswith("/product-images/")
    )
    DATA_PATH.write_text(json.dumps(payload, ensure_ascii=False) + "\n", encoding="utf-8")
    print(
        f"Product images ready: {payload['meta']['product_image_count']}/{len(products)} "
        f"({downloaded_count} downloaded, {cached_count} reused, {failed_count} unavailable)"
    )


if __name__ == "__main__":
    main()

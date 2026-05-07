import logging
import os
import re
import xml.etree.ElementTree as ET
import httpx
from pathlib import Path

log = logging.getLogger(__name__)

COVERS_DIR = Path(os.getenv("COVERS_DIR", "/app/data/covers"))

_OL_BOOKS = "https://openlibrary.org/api/books"
_OL_COVERS = "https://covers.openlibrary.org/b/isbn"
_GB_VOLUMES = "https://www.googleapis.com/books/v1/volumes"
_DNB_SRU = "https://services.dnb.de/sru/dnb"
_LOC_SEARCH = "https://www.loc.gov/books/"
_DC = "http://purl.org/dc/elements/1.1/"

_CLIENT = httpx.AsyncClient(timeout=30.0)
_metadata_cache: dict[str, dict] = {}


def _extract_year(date_str: str | None) -> int | None:
    if not date_str:
        return None
    m = re.search(r"\b(1[0-9]{3}|20[0-9]{2})\b", date_str)
    return int(m.group(1)) if m else None


async def fetch_isbn_metadata(isbn: str, force: bool = False) -> dict | None:
    if not force and isbn in _metadata_cache:
        return _metadata_cache[isbn]
    result = await _fetch_from_providers(isbn)
    if result is not None:
        _metadata_cache[isbn] = result
    return result


async def _fetch_from_providers(isbn: str) -> dict | None:
    try:
        r = await _CLIENT.get(
            _OL_BOOKS,
            params={"bibkeys": f"ISBN:{isbn}", "format": "json", "jscmd": "data"},
        )
        log.info("OpenLibrary status for %s: %s", isbn, r.status_code)
        r.raise_for_status()
        entry = r.json().get(f"ISBN:{isbn}")
        if entry:
            authors = ", ".join(a["name"] for a in entry.get("authors", []))
            return {
                "isbn": isbn,
                "title": entry.get("title", ""),
                "author": authors,
                "published_year": _extract_year(entry.get("publish_date")),
                "source_url": f"https://openlibrary.org/isbn/{isbn}",
            }
    except Exception as e:
        log.warning("OpenLibrary failed for %s: %s", isbn, e)

    log.info("Trying Google Books for %s", isbn)
    try:
        r = await _CLIENT.get(_GB_VOLUMES, params={"q": f"isbn:{isbn}"})
        log.info("Google Books status for %s: %s", isbn, r.status_code)
        if r.status_code == 200:
            items = r.json().get("items")
            if items:
                info = items[0].get("volumeInfo", {})
                authors = ", ".join(info.get("authors", []))
                gb_id = items[0].get("id", "")
                return {
                    "isbn": isbn,
                    "title": info.get("title", ""),
                    "author": authors,
                    "published_year": _extract_year(info.get("publishedDate")),
                    "source_url": f"https://books.google.com/books?id={gb_id}",
                }
            log.warning("Google Books returned no items for %s", isbn)
    except Exception as e:
        log.warning("Google Books failed for %s: %s", isbn, e)

    try:
        r = await _CLIENT.get(
            _DNB_SRU,
            params={
                "operation": "searchRetrieve",
                "query": f"isbn={isbn}",
                "recordSchema": "oai_dc",
                "maximumRecords": "1",
            },
        )
        log.info("DNB status for %s: %s", isbn, r.status_code)
        if r.status_code == 200:
            root = ET.fromstring(r.text)
            dc = root.find(".//{http://www.openarchives.org/OAI/2.0/oai_dc/}dc")
            if dc is not None:
                title = dc.findtext(f"{{{_DC}}}title") or ""
                creator = dc.findtext(f"{{{_DC}}}creator") or ""
                if title:
                    return {
                        "isbn": isbn,
                        "title": title,
                        "author": creator,
                        "published_year": _extract_year(dc.findtext(f"{{{_DC}}}date")),
                        "source_url": f"https://portal.dnb.de/opac/simpleSearch?query={isbn}",
                    }
            log.warning("DNB returned no record for %s", isbn)
    except Exception as e:
        log.warning("DNB failed for %s: %s", isbn, e)

    log.info("Trying Library of Congress for %s", isbn)
    try:
        r = await _CLIENT.get(_LOC_SEARCH, params={"q": isbn, "fo": "json", "c": "1"})
        log.info("LoC status for %s: %s", isbn, r.status_code)
        if r.status_code == 200:
            results = r.json().get("results")
            if results:
                item = results[0]
                title = item.get("title", "")
                contributors = item.get("contributor", [])
                author = ", ".join(contributors) if contributors else ""
                if title:
                    return {
                        "isbn": isbn,
                        "title": title,
                        "author": author,
                        "published_year": _extract_year(str(item.get("date", ""))),
                        "source_url": item.get("url"),
                    }
            log.warning("LoC returned no results for %s", isbn)
    except Exception as e:
        log.warning("LoC failed for %s: %s", isbn, e)

    return None


async def fetch_cover(isbn: str) -> Path | None:
    COVERS_DIR.mkdir(parents=True, exist_ok=True)
    path = COVERS_DIR / f"{isbn}.jpg"
    if path.exists():
        return path

    try:
        r = await _CLIENT.get(
            f"{_OL_COVERS}/{isbn}-M.jpg",
            params={"default": "false"},
            follow_redirects=True,
        )
        if r.status_code == 200:
            path.write_bytes(r.content)
            return path
    except httpx.HTTPError:
        pass

    try:
        r = await _CLIENT.get(_GB_VOLUMES, params={"q": f"isbn:{isbn}"})
        if r.status_code == 200:
            items = r.json().get("items")
            if items:
                thumbnail = (
                    items[0]
                    .get("volumeInfo", {})
                    .get("imageLinks", {})
                    .get("thumbnail")
                )
                if thumbnail:
                    img = await _CLIENT.get(thumbnail, follow_redirects=True)
                    if img.status_code == 200:
                        path.write_bytes(img.content)
                        return path
    except httpx.HTTPError:
        pass

    return None

import os
import httpx
from pathlib import Path

COVERS_DIR = Path(os.getenv("COVERS_DIR", "/app/covers"))

_OL_BOOKS = "https://openlibrary.org/api/books"
_OL_COVERS = "https://covers.openlibrary.org/b/isbn"


_CLIENT = httpx.AsyncClient(timeout=30.0)


async def fetch_isbn_metadata(isbn: str) -> dict | None:
    r = await _CLIENT.get(
        _OL_BOOKS,
        params={"bibkeys": f"ISBN:{isbn}", "format": "json", "jscmd": "data"},
    )
    r.raise_for_status()
    entry = r.json().get(f"ISBN:{isbn}")
    if not entry:
        return None

    authors = ", ".join(a["name"] for a in entry.get("authors", []))
    return {"isbn": isbn, "title": entry.get("title", ""), "author": authors}


async def fetch_cover(isbn: str) -> Path | None:
    COVERS_DIR.mkdir(parents=True, exist_ok=True)
    path = COVERS_DIR / f"{isbn}.jpg"
    if path.exists():
        return path

    r = await _CLIENT.get(
        f"{_OL_COVERS}/{isbn}-M.jpg",
        params={"default": "false"},
        follow_redirects=True,
    )
    if r.status_code != 200:
        return None
    path.write_bytes(r.content)
    return path

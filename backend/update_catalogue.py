import asyncio
import logging
from sqlalchemy.orm import Session
from backend.database import engine
from backend.models import Book
from backend.covers import fetch_isbn_metadata, fetch_cover

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger(__name__)


async def run():
    with Session(engine) as db:
        books = db.query(Book).filter(~Book.removed, Book.isbn.isnot(None)).all()
        total = len(books)
        log.info("Updating %d books…", total)
        metadata_found = 0
        covers_found = 0
        for book in books:
            log.info("[%d] %s (%s)", book.id, book.title, book.isbn)
            data = await fetch_isbn_metadata(book.isbn, force=True)
            if data is not None:
                book.title = data["title"]
                book.author = data["author"]
                book.source_url = data.get("source_url")
                book.published_year = data.get("published_year")
                metadata_found += 1
                log.info("  → metadata updated")
            else:
                log.info("  → not found in any catalog, skipping")
            cover = await fetch_cover(book.isbn)
            if cover is not None:
                covers_found += 1
        db.commit()
    log.info("-----")
    log.info("Metadata: %d / %d found", metadata_found, total)
    log.info("Covers:   %d / %d found", covers_found, total)


if __name__ == "__main__":
    asyncio.run(run())

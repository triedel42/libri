from datetime import datetime
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database import Base, engine, get_db
from backend.models import Book
from backend.covers import fetch_isbn_metadata, fetch_cover

Base.metadata.create_all(bind=engine)

app = FastAPI()

DIST = Path(__file__).parent.parent / "frontend" / "dist"


class BookResponse(BaseModel):
    id: int
    title: str
    author: str
    isbn: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class BookCreate(BaseModel):
    isbn: str


class ISBNLookup(BaseModel):
    isbn: str
    title: str
    author: str


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/book", response_model=list[BookResponse])
def list_books(
    db: Session = Depends(get_db),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    return db.query(Book).order_by(Book.id).offset(offset).limit(limit).all()


@app.get("/api/book/{book_id}", response_model=BookResponse)
def get_book(book_id: int, db: Session = Depends(get_db)):
    book = db.get(Book, book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


@app.post("/api/book", response_model=BookResponse, status_code=201)
async def create_book(body: BookCreate, db: Session = Depends(get_db)):
    data = await fetch_isbn_metadata(body.isbn)
    if data is None:
        raise HTTPException(status_code=422, detail="ISBN not found")
    book = Book(title=data["title"], author=data["author"], isbn=body.isbn)
    db.add(book)
    db.commit()
    db.refresh(book)
    return book


@app.get("/api/isbn/{isbn}", response_model=ISBNLookup)
async def lookup_isbn(isbn: str):
    data = await fetch_isbn_metadata(isbn)
    if data is None:
        raise HTTPException(status_code=404, detail="ISBN not found")
    return data


@app.get("/api/cover/{isbn}")
async def get_cover(isbn: str):
    path = await fetch_cover(isbn)
    if path is None:
        raise HTTPException(status_code=404, detail="Cover not found")
    return FileResponse(path, media_type="image/jpeg")


if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        return FileResponse(DIST / "index.html")

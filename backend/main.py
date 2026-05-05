from datetime import datetime
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.auth import (
    COOKIE_NAME,
    authorize_url,
    exchange_code,
    make_cookie,
    require_auth,
)
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
    added_by: str | None
    source_url: str | None
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


@app.get("/api/auth/login")
def login():
    return RedirectResponse(authorize_url())


@app.get("/api/auth/callback")
async def callback(code: str):
    user = await exchange_code(code)
    cookie = make_cookie(user)
    response = RedirectResponse("/")
    response.set_cookie(
        COOKIE_NAME,
        cookie,
        httponly=True,
        samesite="lax",
        secure=True,
        max_age=8 * 3600,
    )
    return response


@app.get("/api/auth/me")
def me(user: dict = Depends(require_auth)):
    return user


@app.post("/api/auth/logout")
def logout():
    response = RedirectResponse("/", status_code=303)
    response.delete_cookie(COOKIE_NAME)
    return response


@app.get("/api/book", response_model=list[BookResponse])
def list_books(
    db: Session = Depends(get_db),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=1000),
    _: dict = Depends(require_auth),
):
    return db.query(Book).order_by(Book.id).offset(offset).limit(limit).all()


@app.get("/api/book/by-isbn/{isbn}", response_model=BookResponse)
def get_book_by_isbn(
    isbn: str, db: Session = Depends(get_db), _: dict = Depends(require_auth)
):
    book = db.query(Book).filter(Book.isbn == isbn).first()
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


@app.get("/api/book/{book_id}", response_model=BookResponse)
def get_book(
    book_id: int, db: Session = Depends(get_db), _: dict = Depends(require_auth)
):
    book = db.get(Book, book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


@app.delete("/api/book/{book_id}", status_code=204)
def delete_book(
    book_id: int, db: Session = Depends(get_db), user: dict = Depends(require_auth)
):
    book = db.get(Book, book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    if book.added_by != user["login"]:
        raise HTTPException(
            status_code=403, detail="Only the user who added this book may remove it"
        )
    db.delete(book)
    db.commit()


@app.post("/api/book", response_model=BookResponse, status_code=201)
async def create_book(
    body: BookCreate, db: Session = Depends(get_db), user: dict = Depends(require_auth)
):
    data = await fetch_isbn_metadata(body.isbn)
    if data is None:
        raise HTTPException(status_code=422, detail="ISBN not found")
    book = Book(
        title=data["title"],
        author=data["author"],
        isbn=body.isbn,
        added_by=user["login"],
        source_url=data.get("source_url"),
    )
    db.add(book)
    db.commit()
    db.refresh(book)
    return book


@app.get("/api/isbn/{isbn}", response_model=ISBNLookup)
async def lookup_isbn(isbn: str, _: dict = Depends(require_auth)):
    data = await fetch_isbn_metadata(isbn)
    if data is None:
        raise HTTPException(status_code=404, detail="ISBN not found")
    return data


@app.get("/api/cover/{isbn}")
async def get_cover(isbn: str, _: dict = Depends(require_auth)):
    path = await fetch_cover(isbn)
    if path is None:
        raise HTTPException(status_code=404, detail="Cover not found")
    return FileResponse(
        path,
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        return FileResponse(DIST / "index.html")

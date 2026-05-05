from datetime import datetime
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from datetime import date
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session
from backend.auth import (
    COOKIE_NAME,
    authorize_url,
    exchange_code,
    make_cookie,
    require_auth,
)
from backend.database import Base, engine, get_db
from backend.models import Book, BookEvent
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
    owner: str | None
    borrowed_by: str | None
    removed: bool
    source_url: str | None
    events: list["BookEventResponse"] = []

    model_config = {"from_attributes": True}


class BookEventResponse(BaseModel):
    id: int
    book_id: int
    user_login: str
    event_type: str
    note: str | None
    created_at: date

    model_config = {"from_attributes": True}

    @field_validator("created_at", mode="before")
    @classmethod
    def _truncate(cls, v: object) -> object:
        if isinstance(v, datetime):
            return v.date()
        return v


class BookCreate(BaseModel):
    isbn: str


class CommentCreate(BaseModel):
    note: str


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
    return (
        db.query(Book)
        .filter(~Book.removed)
        .order_by(Book.id)
        .offset(offset)
        .limit(limit)
        .all()
    )


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
    book.removed = True
    db.add(BookEvent(book_id=book.id, user_login=user["login"], event_type="removed"))
    db.commit()


@app.post("/api/book/{book_id}/restore", response_model=BookResponse)
def restore_book(
    book_id: int, db: Session = Depends(get_db), user: dict = Depends(require_auth)
):
    book = db.get(Book, book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    if book.added_by != user["login"]:
        raise HTTPException(
            status_code=403, detail="Only the user who added this book may restore it"
        )
    book.removed = False
    db.add(BookEvent(book_id=book.id, user_login=user["login"], event_type="added"))
    db.commit()
    db.refresh(book)
    return book


@app.post("/api/book/{book_id}/borrow", response_model=BookResponse)
def borrow_book(
    book_id: int, db: Session = Depends(get_db), user: dict = Depends(require_auth)
):
    book = db.get(Book, book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    if book.borrowed_by is not None:
        raise HTTPException(status_code=409, detail="Book is already borrowed")
    book.borrowed_by = user["login"]
    db.add(BookEvent(book_id=book_id, user_login=user["login"], event_type="borrow"))
    db.commit()
    db.refresh(book)
    return book


@app.post("/api/book/{book_id}/return", response_model=BookResponse)
def return_book(
    book_id: int, db: Session = Depends(get_db), user: dict = Depends(require_auth)
):
    book = db.get(Book, book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    if book.borrowed_by != user["login"]:
        raise HTTPException(status_code=403, detail="You are not the current borrower")
    book.borrowed_by = None
    db.add(BookEvent(book_id=book_id, user_login=user["login"], event_type="return"))
    db.commit()
    db.refresh(book)
    return book


@app.get("/api/book/{book_id}/events", response_model=list[BookEventResponse])
def get_events(
    book_id: int, db: Session = Depends(get_db), _: dict = Depends(require_auth)
):
    return (
        db.query(BookEvent)
        .filter(BookEvent.book_id == book_id)
        .order_by(BookEvent.created_at)
        .all()
    )


@app.post(
    "/api/book/{book_id}/comment", response_model=BookEventResponse, status_code=201
)
def add_comment(
    book_id: int,
    body: CommentCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_auth),
):
    if db.get(Book, book_id) is None:
        raise HTTPException(status_code=404, detail="Book not found")
    event = BookEvent(
        book_id=book_id, user_login=user["login"], event_type="comment", note=body.note
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


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
    db.flush()
    db.add(BookEvent(book_id=book.id, user_login=user["login"], event_type="added"))
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

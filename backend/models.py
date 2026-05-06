from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base


class Book(Base):
    __tablename__ = "books"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    author: Mapped[str] = mapped_column(String, nullable=True)
    isbn: Mapped[str | None] = mapped_column(String, nullable=True, unique=True)
    added_by: Mapped[str | None] = mapped_column(String, nullable=True)
    owner: Mapped[str | None] = mapped_column(String, nullable=True)
    borrowed_by: Mapped[str | None] = mapped_column(String, nullable=True)
    source_url: Mapped[str | None] = mapped_column(String, nullable=True)
    published_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    removed: Mapped[bool] = mapped_column(
        Integer, default=False, nullable=False, server_default="0"
    )
    events: Mapped[list["BookEvent"]] = relationship(
        "BookEvent",
        order_by="BookEvent.created_at",
        lazy="selectin",
        cascade="all, delete-orphan",
    )


class BookEvent(Base):
    __tablename__ = "book_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    book_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("books.id", ondelete="CASCADE"), nullable=False
    )
    user_login: Mapped[str] = mapped_column(String, nullable=False)
    event_type: Mapped[str] = mapped_column(
        String, nullable=False
    )  # borrow | return | comment
    note: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

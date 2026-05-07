from sqlalchemy.orm import Session
from backend.database import engine
from backend.models import Book


def run():
    with Session(engine) as db:
        isbns = (
            db.query(Book.isbn)
            .filter(~Book.removed, Book.isbn.isnot(None))
            .order_by(Book.id)
            .all()
        )
    for (isbn,) in isbns:
        print(isbn)


if __name__ == "__main__":
    run()

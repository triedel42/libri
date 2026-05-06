from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session

engine = create_engine("sqlite:////app/data/libri.db")


class Base(DeclarativeBase):
    pass


def run_migrations():
    with engine.connect() as conn:
        columns = {
            row[1] for row in conn.execute(text("PRAGMA table_info(books)")).fetchall()
        }
        if "published_year" not in columns:
            conn.execute(text("ALTER TABLE books ADD COLUMN published_year INTEGER"))
        conn.commit()


def get_db():
    with Session(engine) as session:
        yield session

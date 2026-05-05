from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session

engine = create_engine("sqlite:////app/data/libri.db")


class Base(DeclarativeBase):
    pass


def get_db():
    with Session(engine) as session:
        yield session

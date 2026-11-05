"""Database connection setup (SQLite via SQLAlchemy)."""
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# The DB file lives next to the backend folder unless DATABASE_URL is set.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./bazardor.db")

engine = create_engine(
    DATABASE_URL,
    # SQLite needs this so FastAPI's worker threads can share the connection.
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency: open a session per request and always close it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

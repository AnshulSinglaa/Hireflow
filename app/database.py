from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
from dotenv import load_dotenv
import os

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dotenv_path = os.path.join(base_dir, ".env")
load_dotenv(dotenv_path=dotenv_path)

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,          # maintain 10 persistent connections
    max_overflow=20,       # allow 20 extra under peak load
    pool_pre_ping=True,    # test connection before using
    pool_recycle=3600,     # recycle connections every hour
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> bool:
    """Health check — verify DB is reachable"""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False

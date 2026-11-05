import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import Case


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Sembrar caso de prueba
    case = Case(id="EXP-TEST-001", title="Caso de prueba", location="Av. Reforma")
    session.add(case)
    session.commit()

    try:
        yield session
    finally:
        session.close()

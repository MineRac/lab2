from sqlalchemy import *

from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Product(Base):

    __tablename__ = "products"

    id = Column(
        Integer,
        primary_key=True
    )

    name = Column(String)

    quantity = Column(Integer)

    min_stock = Column(Integer)

    price = Column(Float)

    category = Column(String)

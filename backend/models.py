from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

# ---------------- USERS ----------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# ---------------- PRODUCTS ----------------
class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    sku = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    category = Column(String)
    price = Column(Float)

    inventory = relationship("Inventory", back_populates="product")


# ---------------- INVENTORY ----------------
class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer, default=0)
    min_stock = Column(Integer, default=0)
    location = Column(String)

    product = relationship("Product", back_populates="inventory")


# ---------------- ORDERS ----------------
class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer)
    total_price = Column(Float)
    status = Column(String)  # pending, completed, cancelled
    created_at = Column(DateTime, default=datetime.utcnow)


# ---------------- AUTO ORDERS (AI) ----------------
class AutoOrder(Base):
    __tablename__ = "auto_orders"

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer)
    ai_confidence = Column(Float)
    reason = Column(String)
    status = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


# ---------------- ML PREDICTIONS ----------------
class MLPrediction(Base):
    __tablename__ = "ml_predictions"

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    week = Column(String)
    predicted = Column(Float)
    actual = Column(Float, nullable=True)
    confidence = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Product, Inventory

router = APIRouter()


# GET все товары
@router.get("/products")
def get_products(db: Session = Depends(get_db)):
    return db.query(Product).all()


# GET склад
@router.get("/inventory")
def get_inventory(db: Session = Depends(get_db)):
    return db.query(Inventory).all()

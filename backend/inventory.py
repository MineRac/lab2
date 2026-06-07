from fastapi import APIRouter
from database import SessionLocal
from models import Inventory as InventoryModel

router = APIRouter()

@router.get("/inventory")
def get_inventory():
    db = SessionLocal()
    items = db.query(InventoryModel).all()

    return [
        {
            "id": i.id,
            "quantity": i.quantity,
            "min_stock": i.min_stock,
            "location": i.location,
            "product": {
                "name": i.name,
                "category": i.category,
                "price": i.price,
            },
        }
        for i in items
    ]
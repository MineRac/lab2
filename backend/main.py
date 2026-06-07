from fastapi import FastAPI
from database import Base, engine

from api.inventory import router as inventory_router
app.include_router(inventory_router, prefix="/api")

# создать таблицы
Base.metadata.create_all(bind=engine)

# подключаем роуты
app.include_router(inventory_router, prefix="/api")

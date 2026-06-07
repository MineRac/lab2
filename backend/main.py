from fastapi import FastAPI
from database import Base, engine
from inventory import router as inventory_router

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(inventory_router, prefix="/api")
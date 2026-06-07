import numpy as np
import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from stable_baselines3 import SAC
import os

app = FastAPI(title="Inventory ML Service")

# Глобальная модель
model = None

class RecommendRequest(BaseModel):
    product_id: str
    current_stock: int
    min_stock: int
    max_stock: int
    history: List[float]   # ежедневные продажи за последние N дней

class RecommendResponse(BaseModel):
    recommended_order: int
    confidence: float

@app.on_event("startup")
def load_model():
    global model
    model_path = os.getenv("MODEL_PATH", "sac_inventory.zip")
    if not os.path.exists(model_path):
        raise RuntimeError(f"Model not found at {model_path}")
    model = SAC.load(model_path)
    print("Model loaded")

@app.post("/recommend", response_model=RecommendResponse)
def recommend(req: RecommendRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Простейшая эвристика для преобразования в состояние среды
    # Ваша оригинальная среда использовала [inventory, backlog]
    # backlog можно оценить по неудовлетворённому спросу (если есть)
    # Для упрощения: backlog = max(0, predicted_demand - current_stock)
    predicted_demand = np.mean(req.history[-7:]) if len(req.history) >= 7 else 30
    backlog = max(0, predicted_demand - req.current_stock)

    obs = np.array([req.current_stock, backlog], dtype=np.float32).reshape(1, -1)
    action, _ = model.predict(obs, deterministic=True)
    order_qty = int(np.clip(action[0], 0, req.max_stock - req.current_stock))

    # Уверенность: чем ближе запас к min_stock, тем выше
    stock_ratio = req.current_stock / req.max_stock if req.max_stock > 0 else 0.5
    confidence = 0.9 - 0.5 * stock_ratio
    confidence = max(0.5, min(0.98, confidence))

    return RecommendResponse(recommended_order=order_qty, confidence=round(confidence, 2))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
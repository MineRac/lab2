from __future__ import annotations

from dataclasses import asdict
from typing import List, Optional

from fastapi import FastAPI
from pydantic import BaseModel, Field

from inventory_rl import RecommendationInput, model_files_exist, recommend_order


app = FastAPI(title="Inventory ML Service", version="1.0.0")


class RecommendRequest(BaseModel):
    inventory: float = Field(..., ge=0)
    backlog: float = Field(0, ge=0)
    pipeline: float = Field(0, ge=0)
    month: int = Field(1, ge=1, le=12)
    avg_demand: float = Field(32, ge=0)
    category: str = "default"
    min_stock: Optional[float] = Field(None, ge=0)
    max_order: Optional[float] = Field(None, ge=1)
    unit_price: Optional[float] = Field(None, ge=0)


@app.get("/health")
def health():
    return {
        "ok": True,
        "model_ready": model_files_exist(),
        "mode": "rl" if model_files_exist() else "baseline"
    }


@app.post("/recommend")
def recommend(payload: RecommendRequest):
    result = recommend_order(RecommendationInput(**payload.model_dump()))
    return asdict(result)


@app.post("/batch-recommend")
def batch_recommend(payload: List[RecommendRequest]):
    return [
        asdict(recommend_order(RecommendationInput(**item.model_dump())))
        for item in payload
    ]

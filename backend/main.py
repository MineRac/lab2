from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel

import numpy as np

from stable_baselines3 import SAC
from stable_baselines3.common.vec_env import (
    DummyVecEnv,
    VecNormalize
)

from inventory_env import StableInventoryEnv


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


env = DummyVecEnv([
    lambda: StableInventoryEnv()
])

env = VecNormalize.load(
    "vec_normalize.pkl",
    env
)

env.training = False
env.norm_reward = False

model = SAC.load(
    "sac_inventory"
)


class PredictionRequest(BaseModel):
    inventory: int
    backlog: int = 0


@app.get("/")
def root():

    return {
        "status": "ok"
    }


@app.post("/predict")
def predict(data: PredictionRequest):

    obs = np.array(
        [
            [
                data.inventory,
                data.backlog
            ]
        ],
        dtype=np.float32
    )

    obs = env.normalize_obs(obs)

    action, _ = model.predict(
        obs,
        deterministic=True
    )

    return {
        "inventory": data.inventory,
        "recommended_order": int(action[0])
    }

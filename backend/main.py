from fastapi import FastAPI
from pydantic import BaseModel

import numpy as np

from stable_baselines3 import SAC
from stable_baselines3.common.vec_env import (
    DummyVecEnv,
    VecNormalize
)

from inventory_env import StableInventoryEnv

app = FastAPI()

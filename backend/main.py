from fastapi import FastAPI
from stable_baselines3 import SAC
from stable_baselines3.common.vec_env import DummyVecEnv
from stable_baselines3.common.vec_env import VecNormalize

from inventory_env import StableInventoryEnv

app = FastAPI()

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

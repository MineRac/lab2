import gymnasium as gym
from gymnasium import spaces
import numpy as np
import matplotlib.pyplot as plt
import torch
from stable_baselines3 import SAC
from stable_baselines3.common.monitor import Monitor
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
class StableInventoryEnv(gym.Env):
    def __init__(
        self,
        max_inventory=500,
        max_order=150,      
        safety_stock=120,
        target_stock=220,
        holding_cost=0.01,  
        stockout_penalty=2.0,
        seed=None
    ):
        super().__init__()
        self.max_inventory = max_inventory
        self.max_order = max_order
        self.safety_stock = safety_stock
        self.target_stock = target_stock
        self.holding_cost = holding_cost
        self.stockout_penalty = stockout_penalty

        self.action_space = spaces.Box(low=0, high=max_order, shape=(1,), dtype=np.float32)
        self.observation_space = spaces.Box(
            low=np.array([0, 0]), high=np.array([max_inventory, 100]), dtype=np.float32
        )

        self.rng = np.random.default_rng(seed)
        self.reset()

    def demand(self):
        return max(0, int(self.rng.normal(30, 10)))

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        if seed is not None:
            self.rng = np.random.default_rng(seed)
        self.inventory = self.target_stock
        self.backlog = 0
        self.t = 0
        self.total_demand = 0
        self.total_fulfilled = 0
        return self._obs(), {}

    def _obs(self):
        return np.array([self.inventory, self.backlog], dtype=np.float32)

    def step(self, action):
        order = float(np.clip(action[0], 0, self.max_order))
        self.inventory = min(self.inventory + order, self.max_inventory)

        demand = self.demand()
        self.total_demand += demand
        available = self.inventory

        if self.backlog > 0:
            if available >= self.backlog:
                available -= self.backlog
                self.backlog = 0
            else:
                self.backlog -= available
                available = 0

        if available >= demand:
            fulfilled = demand
            available -= demand
            unmet = 0
        else:
            fulfilled = available
            unmet = demand - available
            available = 0
            self.backlog += unmet

        self.inventory = available
        self.total_fulfilled += fulfilled
        service_level = 1.0 if demand == 0 else fulfilled / demand
        holding_penalty = 0.1 * (self.inventory / self.max_inventory)
        excess = self.inventory - (self.safety_stock + 90)
        if excess > 0:
            holding_penalty += 0.5 * (excess / self.max_inventory)
        shortage_penalty = 0.5 * unmet / max(1, demand)
        reward = (
            1.0 * service_level
            - holding_penalty
            - shortage_penalty
        )

        self.t += 1
        done = self.t >= 200

        overall_service = 1.0 if self.total_demand == 0 else self.total_fulfilled / self.total_demand
        info = {
            "service_level": overall_service,
            "inventory": self.inventory,
            "demand": demand
        }
        return self._obs(), reward, done, False, info
def make_env():
    return Monitor(StableInventoryEnv())
N_ENVS = 4
env = DummyVecEnv([make_env for _ in range(N_ENVS)])
env = VecNormalize(env, norm_obs=True, norm_reward=False, clip_obs=10.0)
device = "cuda" if torch.cuda.is_available() else "cpu"
model = SAC(
    "MlpPolicy",
    env,
    learning_rate=1e-3,
    buffer_size=100_000,
    batch_size=256,
    gamma=0.99,
    tau=0.02,
    ent_coef=0.2,
    train_freq=1,
    gradient_steps=4,
    device=device,
    verbose=1,
)

print(f"Using device: {device}")
model.learn(total_timesteps=120000)
obs_mean = env.obs_rms.mean
obs_var = env.obs_rms.var

eval_env = DummyVecEnv([make_env])
eval_env = VecNormalize(
    eval_env, norm_obs=True, norm_reward=False, clip_obs=10.0, training=False
)
eval_env.obs_rms.mean = obs_mean
eval_env.obs_rms.var = obs_var

raw_env = eval_env.venv.envs[0].env

obs = eval_env.reset()
inventories, actions, service_levels, demands = [], [], [], []

for _ in range(500):
    action, _ = model.predict(obs, deterministic=True)
    obs, reward, done, info = eval_env.step(action)
    inventories.append(raw_env.inventory)
    actions.append(action[0][0])
    service_levels.append(info[0]["service_level"])
    demands.append(info[0]["demand"])

print("Mean Service Level:", np.mean(service_levels))
print("Min Service Level:", np.min(service_levels))
plt.figure()
plt.plot(inventories, label="Inventory")
plt.plot(actions, label="Orders")
plt.plot(demands, label="Demand", alpha=0.7, linestyle="--")
plt.legend()
plt.show()
model.save("sac_inventory")
env.save("vec_normalize.pkl")

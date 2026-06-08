"""
Inventory ML/RL module.

Главное:
- FastAPI-сервис может работать БЕЗ torch/gymnasium/stable-baselines3.
- Если модель не обучена, используется безопасный baseline.
- Тяжёлые ML-зависимости импортируются только при train/evaluate или при наличии обученной модели.

Запуск сервиса:
    python -m uvicorn ml_service:app --host 127.0.0.1 --port 8001

Fallback-рекомендация:
    python inventory_rl.py recommend --inventory 80 --backlog 0 --pipeline 30 --month 11 --avg-demand 34 --category Электроника --min-stock 120

Обучение:
    pip install -r requirements_train.txt
    python inventory_rl.py train --timesteps 250000
"""

from __future__ import annotations

import argparse
import json
import math
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Dict, Literal, Optional, Tuple


ARTIFACT_DIR = Path("ml_artifacts")
MODEL_PATH = ARTIFACT_DIR / "sac_inventory_model"
VEC_PATH = ARTIFACT_DIR / "vec_normalize.pkl"
CONFIG_PATH = ARTIFACT_DIR / "env_config.json"
METRICS_PATH = ARTIFACT_DIR / "last_eval_metrics.json"


@dataclass
class InventoryConfig:
    max_inventory: int = 500
    max_order: int = 180
    safety_stock: int = 120
    target_stock: int = 240
    base_demand_mean: float = 32.0
    demand_std: float = 9.0
    demand_spike_probability: float = 0.04
    demand_spike_multiplier: float = 2.2
    min_lead_time: int = 2
    max_lead_time: int = 6
    sale_price: float = 10.0
    unit_cost: float = 5.5
    holding_cost: float = 0.035
    stockout_penalty: float = 7.0
    backlog_penalty: float = 1.5
    fixed_order_cost: float = 8.0
    overstock_penalty: float = 0.08
    episode_days: int = 365
    seasonality: Tuple[float, ...] = (
        0.82, 0.86, 0.94, 1.00, 1.08, 1.12,
        1.18, 1.15, 1.05, 1.00, 1.22, 1.35,
    )
    category_coefficients: Dict[str, float] = field(default_factory=dict)
    demand_window: int = 14


@dataclass
class RecommendationInput:
    inventory: float
    backlog: float = 0.0
    pipeline: float = 0.0
    month: int = 1
    avg_demand: float = 32.0
    category: str = "default"
    min_stock: Optional[float] = None
    max_order: Optional[float] = None
    unit_price: Optional[float] = None


@dataclass
class RecommendationOutput:
    recommended_order: int
    policy: Literal["rl", "baseline"]
    confidence: float
    inventory: float
    backlog: float
    pipeline: float
    stock_position: float
    month: int
    avg_demand: float
    category: str
    reason: str


def clamp(value: float, low: float, high: float) -> float:
    try:
        value = float(value)
    except Exception:
        return low

    if not math.isfinite(value):
        return low

    return max(low, min(high, value))


def normalize_month(month: int) -> int:
    try:
        month = int(month)
    except Exception:
        return 1
    return int(max(1, min(12, month)))


def load_config() -> InventoryConfig:
    if not CONFIG_PATH.exists():
        return InventoryConfig()

    data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    if "seasonality" in data:
        data["seasonality"] = tuple(data["seasonality"])
    return InventoryConfig(**data)


def save_config(config: InventoryConfig) -> None:
    ARTIFACT_DIR.mkdir(exist_ok=True)
    CONFIG_PATH.write_text(json.dumps(asdict(config), ensure_ascii=False, indent=2), encoding="utf-8")


def category_factor(config: InventoryConfig, category: str) -> float:
    return float(clamp(config.category_coefficients.get(category, 1.0), 0.1, 5.0))


def model_files_exist() -> bool:
    return MODEL_PATH.with_suffix(".zip").exists() and VEC_PATH.exists()


def baseline_order(inp: RecommendationInput, config: InventoryConfig) -> int:
    max_order = inp.max_order if inp.max_order is not None else config.max_order
    max_order = clamp(float(max_order), 1.0, float(config.max_order))

    min_stock = inp.min_stock if inp.min_stock is not None else config.safety_stock
    min_stock = clamp(float(min_stock), 0.0, float(config.max_inventory))

    category_coeff = category_factor(config, inp.category)
    expected_lead_time = (config.min_lead_time + config.max_lead_time) / 2

    # Покрываем спрос на период поставки + страховой запас.
    demand_cover = inp.avg_demand * expected_lead_time * category_coeff
    target = max(config.target_stock, min_stock + demand_cover)

    stock_position = inp.inventory + inp.pipeline - inp.backlog
    order = max(0.0, target - stock_position)
    return int(round(clamp(order, 0.0, max_order)))


def make_raw_observation(inp: RecommendationInput, config: InventoryConfig):
    # Импорт numpy только при реальном использовании обученной модели.
    import numpy as np

    month = normalize_month(inp.month)
    angle = 2 * np.pi * (month - 1) / 12
    stock_position = inp.inventory + inp.pipeline - inp.backlog

    return np.array(
        [
            clamp(inp.inventory, 0.0, config.max_inventory) / config.max_inventory,
            clamp(inp.backlog, 0.0, config.max_inventory * 2) / config.max_inventory,
            clamp(inp.pipeline, 0.0, config.max_inventory * 2) / config.max_inventory,
            clamp(inp.avg_demand, 0.0, config.max_order * 3) / max(1, config.max_order),
            np.sin(angle),
            np.cos(angle),
            max(0.0, stock_position) / config.max_inventory,
            category_factor(config, inp.category) / 5.0,
        ],
        dtype=np.float32,
    )


def try_rl_recommendation(inp: RecommendationInput, config: InventoryConfig) -> Optional[int]:
    if not model_files_exist():
        return None

    try:
        from stable_baselines3 import SAC
        from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize

        # Минимальная env-фабрика нужна только чтобы VecNormalize загрузился.
        env = DummyVecEnv([lambda: StableInventoryEnv(config=config, seed=123)])
        env = VecNormalize.load(VEC_PATH, env)
        env.training = False
        env.norm_reward = False

        model = SAC.load(MODEL_PATH, env=env)

        obs_raw = make_raw_observation(inp, config)
        obs = env.normalize_obs(obs_raw.reshape(1, -1))
        action, _ = model.predict(obs, deterministic=True)
        return int(round(clamp(float(action[0][0]), 0.0, float(inp.max_order or config.max_order))))
    except Exception as error:
        print(f"[ML] RL artifacts found, but RL recommendation failed. Fallback used. Reason: {error}")
        return None


def recommend_order(inp: RecommendationInput, allow_fallback: bool = True) -> RecommendationOutput:
    config = load_config()

    inp.inventory = clamp(inp.inventory, 0.0, float(config.max_inventory))
    inp.backlog = clamp(inp.backlog, 0.0, float(config.max_inventory * 2))
    inp.pipeline = clamp(inp.pipeline, 0.0, float(config.max_inventory * 2))
    inp.avg_demand = clamp(inp.avg_demand, 0.0, float(config.max_order * 3))
    inp.month = normalize_month(inp.month)
    inp.category = inp.category or "default"

    stock_position = inp.inventory + inp.pipeline - inp.backlog

    rl_order = try_rl_recommendation(inp, config)
    baseline = baseline_order(inp, config)

    if rl_order is not None:
        if inp.inventory < (inp.min_stock or config.safety_stock) and rl_order < baseline * 0.35:
            return RecommendationOutput(
                recommended_order=baseline,
                policy="baseline",
                confidence=0.72,
                inventory=inp.inventory,
                backlog=inp.backlog,
                pipeline=inp.pipeline,
                stock_position=stock_position,
                month=inp.month,
                avg_demand=inp.avg_demand,
                category=inp.category,
                reason="RL дал слишком низкий заказ при дефиците; применён безопасный baseline.",
            )

        return RecommendationOutput(
            recommended_order=rl_order,
            policy="rl",
            confidence=0.88,
            inventory=inp.inventory,
            backlog=inp.backlog,
            pipeline=inp.pipeline,
            stock_position=stock_position,
            month=inp.month,
            avg_demand=inp.avg_demand,
            category=inp.category,
            reason="Рекомендация рассчитана обученной SAC-моделью.",
        )

    if not allow_fallback:
        raise RuntimeError("ML model is not available and fallback is disabled.")

    return RecommendationOutput(
        recommended_order=baseline,
        policy="baseline",
        confidence=0.65,
        inventory=inp.inventory,
        backlog=inp.backlog,
        pipeline=inp.pipeline,
        stock_position=stock_position,
        month=inp.month,
        avg_demand=inp.avg_demand,
        category=inp.category,
        reason="SAC-модель ещё не обучена или ML-зависимости не установлены; использована безопасная baseline-стратегия.",
    )


# Всё ниже требует тяжёлые зависимости. Они импортируются только при train/evaluate.
def build_training_env_classes():
    import gymnasium as gym
    import numpy as np
    from collections import deque
    from gymnasium import spaces
    from stable_baselines3.common.monitor import Monitor

    class StableInventoryEnv(gym.Env):
        metadata = {"render_modes": []}

        def __init__(self, config: InventoryConfig | None = None, seed: int | None = None, category: str = "default"):
            super().__init__()
            self.config = config or InventoryConfig()
            self.category = category
            self.rng = np.random.default_rng(seed)
            self.action_space = spaces.Box(
                low=np.array([0.0], dtype=np.float32),
                high=np.array([float(self.config.max_order)], dtype=np.float32),
                dtype=np.float32,
            )
            self.observation_space = spaces.Box(
                low=np.array([0, 0, 0, 0, -1, -1, 0, 0.02], dtype=np.float32),
                high=np.array([1, 2, 2, 3, 1, 1, 3, 1.0], dtype=np.float32),
                dtype=np.float32,
            )
            self.inventory = 0.0
            self.backlog = 0.0
            self.day = 0
            self.pipeline = []
            self.last_demands = deque(maxlen=self.config.demand_window)
            self.total_demand = 0.0
            self.total_fulfilled = 0.0
            self.total_profit = 0.0

        def reset(self, seed=None, options=None):
            super().reset(seed=seed)
            if seed is not None:
                self.rng = np.random.default_rng(seed)
            self.inventory = float(self.config.target_stock)
            self.backlog = 0.0
            self.day = 0
            self.pipeline = []
            self.last_demands.clear()
            self.total_demand = 0.0
            self.total_fulfilled = 0.0
            self.total_profit = 0.0
            for _ in range(self.config.demand_window):
                self.last_demands.append(self.config.base_demand_mean)
            return self._obs(), {}

        def _current_month_index(self):
            return int((self.day // 30) % 12)

        def _pipeline_quantity(self):
            return float(sum(qty for _, qty in self.pipeline))

        def _category_factor(self):
            return category_factor(self.config, self.category)

        def _sample_demand(self):
            mean = self.config.base_demand_mean * self.config.seasonality[self._current_month_index()] * self._category_factor()
            demand = self.rng.normal(mean, self.config.demand_std)
            if self.rng.random() < self.config.demand_spike_probability:
                demand *= self.config.demand_spike_multiplier
            return int(max(0, round(demand)))

        def _obs(self):
            month = self._current_month_index()
            angle = 2 * np.pi * month / 12
            pipeline_qty = self._pipeline_quantity()
            avg_demand = float(np.mean(self.last_demands)) if self.last_demands else self.config.base_demand_mean
            stock_position = self.inventory + pipeline_qty - self.backlog
            return np.array(
                [
                    self.inventory / self.config.max_inventory,
                    self.backlog / self.config.max_inventory,
                    pipeline_qty / self.config.max_inventory,
                    avg_demand / max(1, self.config.max_order),
                    np.sin(angle),
                    np.cos(angle),
                    max(0.0, stock_position) / self.config.max_inventory,
                    self._category_factor() / 5.0,
                ],
                dtype=np.float32,
            )

        def _receive_due_orders(self):
            received = 0.0
            remaining = []
            for arrival_day, qty in self.pipeline:
                if arrival_day <= self.day:
                    received += qty
                else:
                    remaining.append((arrival_day, qty))
            self.pipeline = remaining
            self.inventory = min(self.config.max_inventory, self.inventory + received)

        def step(self, action):
            order_qty = float(np.clip(action[0], 0, self.config.max_order))
            self._receive_due_orders()

            order_cost = 0.0
            if order_qty > 0.5:
                lead_time = int(self.rng.integers(self.config.min_lead_time, self.config.max_lead_time + 1))
                self.pipeline.append((self.day + lead_time, order_qty))
                order_cost = self.config.fixed_order_cost + order_qty * self.config.unit_cost

            demand = self._sample_demand()
            self.last_demands.append(float(demand))
            self.total_demand += demand

            required = self.backlog + demand
            fulfilled_total = min(self.inventory, required)
            self.inventory -= fulfilled_total

            backlog_closed = min(self.backlog, fulfilled_total)
            current_fulfilled = max(0.0, fulfilled_total - backlog_closed)
            self.backlog = max(0.0, required - fulfilled_total)

            unmet_today = max(0.0, demand - current_fulfilled)
            self.total_fulfilled += current_fulfilled

            revenue = current_fulfilled * self.config.sale_price
            holding_cost = self.inventory * self.config.holding_cost
            stockout_cost = unmet_today * self.config.stockout_penalty
            backlog_cost = self.backlog * self.config.backlog_penalty
            overstock_cost = max(0.0, self.inventory - self.config.target_stock) * self.config.overstock_penalty
            profit = revenue - order_cost - holding_cost - stockout_cost - backlog_cost - overstock_cost
            self.total_profit += profit

            reward = profit / 100.0
            self.day += 1
            terminated = self.day >= self.config.episode_days
            service_level = 1.0 if self.total_demand <= 0 else self.total_fulfilled / self.total_demand

            return self._obs(), reward, terminated, False, {
                "inventory": self.inventory,
                "backlog": self.backlog,
                "pipeline": self._pipeline_quantity(),
                "demand": demand,
                "order": order_qty,
                "total_profit": self.total_profit,
                "service_level": service_level,
            }

    def make_env(config, seed=None, category="default"):
        def _factory():
            return Monitor(StableInventoryEnv(config=config, seed=seed, category=category))
        return _factory

    return StableInventoryEnv, make_env


# Для загрузки VecNormalize нужен класс в глобальной области.
try:
    StableInventoryEnv, make_env = build_training_env_classes()
except Exception:
    StableInventoryEnv = None
    make_env = None


def train(total_timesteps: int = 250_000, n_envs: int = 4, seed: int = 42):
    import torch
    from stable_baselines3 import SAC
    from stable_baselines3.common.callbacks import CheckpointCallback, EvalCallback
    from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize

    _, make_env_local = build_training_env_classes()

    ARTIFACT_DIR.mkdir(exist_ok=True)
    config = load_config()
    save_config(config)

    env = DummyVecEnv([make_env_local(config, seed + i) for i in range(n_envs)])
    env = VecNormalize(env, norm_obs=True, norm_reward=False, clip_obs=10.0)

    eval_env = DummyVecEnv([make_env_local(config, seed + 10_000)])
    eval_env = VecNormalize(eval_env, norm_obs=True, norm_reward=False, clip_obs=10.0, training=False)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = SAC(
        "MlpPolicy",
        env,
        learning_rate=3e-4,
        buffer_size=300_000,
        batch_size=256,
        gamma=0.995,
        tau=0.01,
        ent_coef="auto",
        train_freq=1,
        gradient_steps=2,
        learning_starts=5_000,
        policy_kwargs=dict(net_arch=[256, 256]),
        seed=seed,
        device=device,
        verbose=1,
    )

    eval_callback = EvalCallback(
        eval_env,
        best_model_save_path=str(ARTIFACT_DIR / "best_model"),
        log_path=str(ARTIFACT_DIR / "logs"),
        eval_freq=10_000,
        deterministic=True,
        render=False,
    )
    checkpoint_callback = CheckpointCallback(
        save_freq=30_000,
        save_path=str(ARTIFACT_DIR / "checkpoints"),
        name_prefix="sac_inventory",
    )

    print(f"Using device: {device}")
    model.learn(total_timesteps=total_timesteps, callback=[eval_callback, checkpoint_callback])
    model.save(MODEL_PATH)
    env.save(VEC_PATH)


def evaluate(steps: int = 365):
    if not model_files_exist():
        print(json.dumps({"model_ready": False, "message": "Модель ещё не обучена"}, ensure_ascii=False, indent=2))
        return

    # Полноценную оценку можно добавить позже; сервису она не нужна.
    print(json.dumps({"model_ready": True, "message": "Модель найдена"}, ensure_ascii=False, indent=2))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["train", "evaluate", "recommend"])
    parser.add_argument("--timesteps", type=int, default=250_000)
    parser.add_argument("--steps", type=int, default=365)
    parser.add_argument("--inventory", type=float, default=100)
    parser.add_argument("--backlog", type=float, default=0)
    parser.add_argument("--pipeline", type=float, default=0)
    parser.add_argument("--month", type=int, default=1)
    parser.add_argument("--avg-demand", type=float, default=32)
    parser.add_argument("--category", type=str, default="default")
    parser.add_argument("--min-stock", type=float, default=None)
    parser.add_argument("--max-order", type=float, default=None)
    args = parser.parse_args()

    if args.mode == "train":
        train(total_timesteps=args.timesteps)
    elif args.mode == "evaluate":
        evaluate(steps=args.steps)
    else:
        result = recommend_order(RecommendationInput(
            inventory=args.inventory,
            backlog=args.backlog,
            pipeline=args.pipeline,
            month=args.month,
            avg_demand=args.avg_demand,
            category=args.category,
            min_stock=args.min_stock,
            max_order=args.max_order,
        ))
        print(json.dumps(asdict(result), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

from __future__ import annotations

import csv
import random
from datetime import date, timedelta
from pathlib import Path

PRODUCTS = [
    ("SKU001", "Беспроводная мышь Logitech", "Электроника", 1490, 0.58, 28),
    ("SKU002", "Клавиатура механическая Redragon", "Электроника", 3990, 0.55, 16),
    ("SKU003", "Монитор 24 дюйма Samsung", "Электроника", 12990, 0.72, 7),
    ("SKU004", "USB-C кабель 1м", "Аксессуары", 390, 0.42, 44),
    ("SKU005", "Power Bank 20000 mAh", "Аксессуары", 2490, 0.57, 18),
    ("SKU006", "Картридж HP 305", "Расходники", 1590, 0.47, 24),
    ("SKU007", "Бумага А4 500 листов", "Канцтовары", 420, 0.62, 52),
    ("SKU008", "Ручки шариковые комплект", "Канцтовары", 240, 0.39, 36),
    ("SKU009", "SSD 1TB Kingston", "Комплектующие", 6490, 0.68, 11),
    ("SKU010", "Оперативная память 16GB DDR4", "Комплектующие", 3790, 0.63, 13),
    ("SKU011", "Роутер TP-Link Archer", "Сетевое оборудование", 3290, 0.61, 12),
    ("SKU012", "Коммутатор 8 портов", "Сетевое оборудование", 2190, 0.60, 9),
    ("SKU013", "Наушники JBL", "Электроника", 2990, 0.56, 15),
    ("SKU014", "Веб-камера Full HD", "Электроника", 2190, 0.54, 10),
    ("SKU015", "Коврик для мыши XL", "Аксессуары", 790, 0.45, 22),
]

SEASONALITY = {
    "Электроника": [0.82, 0.86, 0.95, 1.00, 1.04, 1.08, 1.14, 1.10, 1.02, 1.05, 1.28, 1.45],
    "Аксессуары": [0.90, 0.92, 1.00, 1.03, 1.08, 1.12, 1.20, 1.16, 1.05, 1.07, 1.24, 1.38],
    "Расходники": [1.05, 1.00, 1.02, 1.00, 0.98, 0.96, 0.92, 0.94, 1.12, 1.08, 1.04, 1.00],
    "Канцтовары": [0.92, 0.96, 1.05, 1.08, 1.02, 0.90, 0.82, 1.35, 1.55, 1.10, 1.00, 0.95],
    "Комплектующие": [0.88, 0.90, 0.98, 1.00, 1.04, 1.10, 1.12, 1.08, 1.02, 1.06, 1.22, 1.34],
    "Сетевое оборудование": [0.92, 0.92, 1.00, 1.04, 1.08, 1.10, 1.14, 1.20, 1.12, 1.05, 1.08, 1.18],
}

def sql_value(value):
    if isinstance(value, str):
        return "'" + value.replace("'", "''") + "'"
    return str(value)

def main():
    random.seed(42)
    out_dir = Path(__file__).parent
    start_date = date.today() - timedelta(days=730)
    end_date = date.today() - timedelta(days=1)
    rows = []
    idx = 1
    current = start_date

    while current <= end_date:
        weekday_factor = 0.72 if current.weekday() >= 5 else 1.0
        trend_factor = 1.0 + ((current - start_date).days / 730) * 0.18

        for product_id, name, category, price, cost_ratio, base_daily_demand in PRODUCTS:
            season = SEASONALITY[category][current.month - 1]
            noise = random.lognormvariate(0, 0.25)
            promo_factor = random.uniform(1.8, 3.2) if random.random() < 0.018 else 1.0

            expected = base_daily_demand * season * weekday_factor * trend_factor * noise * promo_factor
            if price > 5000 and random.random() < 0.22:
                quantity = 0
            else:
                quantity = max(0, int(round(random.gauss(expected, max(1.5, expected * 0.18)))))

            if quantity <= 0:
                continue

            discount = random.choice([0, 0, 0, 0.03, 0.05, 0.07])
            actual_price = round(price * (1 - discount), 2)
            revenue = round(quantity * actual_price, 2)
            cost = round(quantity * price * cost_ratio, 2)
            sold_at = f"{current.isoformat()} {random.randint(9, 20):02d}:{random.choice([0, 10, 20, 30, 40, 50]):02d}:00+00"

            rows.append({
                "id": f"SALE{idx:06d}",
                "product_id": product_id,
                "product_name": name,
                "category": category,
                "quantity": quantity,
                "revenue": revenue,
                "cost": cost,
                "sold_at": sold_at,
            })
            idx += 1

        current += timedelta(days=1)

    csv_path = out_dir / "sales_history_2y.csv"
    with csv_path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys(), delimiter=";")
        writer.writeheader()
        writer.writerows(rows)

    chunks = []
    for i in range(0, len(rows), 500):
        values = []
        for r in rows[i:i+500]:
            values.append(
                f"({sql_value(r['id'])}, {sql_value(r['product_id'])}, {sql_value(r['product_name'])}, {sql_value(r['category'])}, "
                f"{r['quantity']}, {r['revenue']:.2f}, {r['cost']:.2f}, {sql_value(r['sold_at'])}::timestamptz)"
            )
        chunks.append(
            "insert into public.sales_history (id, product_id, product_name, category, quantity, revenue, cost, sold_at)\\nvalues\\n"
            + ",\\n".join(values)
            + "\\non conflict (id) do update set product_id = excluded.product_id, product_name = excluded.product_name, category = excluded.category, quantity = excluded.quantity, revenue = excluded.revenue, cost = excluded.cost, sold_at = excluded.sold_at;\\n"
        )

    sql = f"-- Seed sales_history за 2 года. Записей: {len(rows)}\\ntruncate table public.sales_history;\\n\\n" + "\\n".join(chunks)
    (out_dir / "sales_history_2y_seed.sql").write_text(sql, encoding="utf-8")
    print(f"Generated {len(rows)} rows")

if __name__ == "__main__":
    main()

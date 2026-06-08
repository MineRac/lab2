-- Seed товаров, которые соответствуют sales_history_2y.
-- Выполнить после server/supabase-schema.sql.
-- Можно выполнять после загрузки sales_history.
-- Важно: product_id в sales_history совпадает с inventory.id: SKU001...SKU015.

insert into public.categories (id, name)
values
('CAT-001', 'Аксессуары'),
('CAT-002', 'Канцтовары'),
('CAT-003', 'Комплектующие'),
('CAT-004', 'Расходники'),
('CAT-005', 'Сетевое оборудование'),
('CAT-006', 'Электроника')
on conflict (name) do update set name = excluded.name;

insert into public.inventory (id, name, category, quantity, min_stock, price, status, location)
values
('SKU001', 'Беспроводная мышь Logitech', 'Электроника', 180, 70, 1490.00, 'В наличии', 'A1-01'),
('SKU002', 'Клавиатура механическая Redragon', 'Электроника', 95, 40, 3990.00, 'В наличии', 'A1-02'),
('SKU003', 'Монитор 24 дюйма Samsung', 'Электроника', 42, 18, 12990.00, 'В наличии', 'A2-01'),
('SKU004', 'USB-C кабель 1м', 'Аксессуары', 260, 120, 390.00, 'В наличии', 'B1-01'),
('SKU005', 'Power Bank 20000 mAh', 'Аксессуары', 110, 45, 2490.00, 'В наличии', 'B1-02'),
('SKU006', 'Картридж HP 305', 'Расходники', 120, 50, 1590.00, 'В наличии', 'C1-01'),
('SKU007', 'Бумага А4 500 листов', 'Канцтовары', 360, 160, 420.00, 'В наличии', 'C2-01'),
('SKU008', 'Ручки шариковые комплект', 'Канцтовары', 220, 90, 240.00, 'В наличии', 'C2-02'),
('SKU009', 'SSD 1TB Kingston', 'Комплектующие', 75, 30, 6490.00, 'В наличии', 'D1-01'),
('SKU010', 'Оперативная память 16GB DDR4', 'Комплектующие', 88, 35, 3790.00, 'В наличии', 'D1-02'),
('SKU011', 'Роутер TP-Link Archer', 'Сетевое оборудование', 70, 28, 3290.00, 'В наличии', 'E1-01'),
('SKU012', 'Коммутатор 8 портов', 'Сетевое оборудование', 54, 22, 2190.00, 'В наличии', 'E1-02'),
('SKU013', 'Наушники JBL', 'Электроника', 100, 38, 2990.00, 'В наличии', 'A2-02'),
('SKU014', 'Веб-камера Full HD', 'Электроника', 66, 24, 2190.00, 'В наличии', 'A2-03'),
('SKU015', 'Коврик для мыши XL', 'Аксессуары', 145, 60, 790.00, 'В наличии', 'B1-03')
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  quantity = excluded.quantity,
  min_stock = excluded.min_stock,
  price = excluded.price,
  status = excluded.status,
  location = excluded.location,
  updated_at = now();

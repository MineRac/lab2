# Как загрузить sales_history за 2 года, если SQL Editor пишет Query is too large

Supabase SQL Editor не принимает большой файл целиком, поэтому seed разбит на части.

## Вариант 1 — через SQL Editor

Открой папку:

```txt
server/seed/sales_history_2y_split
```

Выполняй файлы по очереди:

1. `00_clear_sales_history.sql`
2. `01_sales_history_insert.sql`
3. `02_sales_history_insert.sql`
4. и так далее до последнего файла.

Всего insert-файлов: 11.

## Вариант 2 — через Supabase Table Editor / Import CSV

Можно импортировать CSV-файлы из папки:

```txt
server/seed/sales_history_2y_csv_split
```

Таблица:

```txt
sales_history
```

Разделитель CSV:

```txt
;
```

## Вариант 3 — через psql

Если установлен psql, можно выполнить большой файл напрямую:

```bash
psql "postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres" -f server/seed/sales_history_2y_seed.sql
```

Но проще для тебя сейчас — Вариант 1, потому что он работает прямо через Supabase SQL Editor.

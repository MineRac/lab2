# Inventory ML Service

## Важно для Windows

`npm run ml` больше не требует глобальный `uvicorn`. Скрипт использует Python из:

```txt
ml/.venv/Scripts/python.exe
```

## Быстрый запуск сервиса без тяжёлого обучения

Из корня проекта:

```powershell
cd ml
py -3.11 -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements_service.txt
cd ..
npm run dev:all:ml:win
```

Если Python 3.11 не установлен, можно временно попробовать:

```powershell
cd ml
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements_service.txt
cd ..
npm run dev:all:ml:win
```

В этом режиме сервис работает через baseline-рекомендации. Это нормально.

## Проверка

```powershell
curl http://127.0.0.1:8001/health
```

Ожидаемый ответ:

```json
{
  "ok": true,
  "model_ready": false,
  "mode": "baseline"
}
```

## Обучение SAC-модели

Для обучения лучше Python 3.11.

```powershell
cd ml
.venv\Scripts\activate
pip install -r requirements_train.txt
python inventory_rl.py train --timesteps 250000
```

После обучения `model_ready` станет `true`, если появились файлы в `ml/ml_artifacts`.

## Рекомендация вручную

```powershell
python inventory_rl.py recommend --inventory 80 --backlog 0 --pipeline 30 --month 11 --avg-demand 34 --category Электроника --min-stock 120
```

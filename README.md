# Crypto Trading Bot Orchestrator

> **Chief Architect + Worker Pool** — визуальная оркестрация ИИ-агентов для разработки торгового бота с контролем лимитов и бюджета.

## 🎯 Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                     VISUAL ORCHESTRATOR                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  CHIEF   │──▶│RESEARCHER│  │  CODER   │  │ REVIEWER │       │
│  │ ARCHITECT│   │(DeepSeek)│  │ (GLM-5.2)│  │ (Kimi)   │       │
│  └──────────┘   └──────────┘  └──────────┘  └──────────┘       │
│       │            │             │             │                 │
│       ▼            ▼             ▼             ▼                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              TASK GRAPH (React Flow)                     │   │
│  │  [Research API] → [Design Arch] → [Implement] → [Test]   │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ LIMITS   │ │ TOKENS   │ │ COST     │ │ QUEUE    │          │
│  │ $42/$60  │ │ 1.2M/5M  │ │ $18.50   │ │ 3 pending│          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### Роли агентов

| Агент | Модель (Go) | Специализация |
|-------|-------------|---------------|
| **Chief Architect** | `kimi-k3` (1M ctx) | Планирование, декомпозиция, назначение, ревью |
| **Researcher** | `deepseek-v4-pro` | API docs, best practices, технические отчёты |
| **Coder** | `glm-5.2` (high) | Production код, async, типизация, рефакторинг |
| **Reviewer** | `kimi-k2.7-code` | Code review, security, performance, vision |
| **Tester** | `deepseek-v4.1-flash` (max) | Unit/integration тесты, моки, coverage |
| **Documenter** | `glm-5.3-flash` (low) | README, ARCHITECTURE.md, API docs |

---

## 🚀 Быстрый старт

### Требования
- **Python 3.11+** (backend)
- **Node 18+** (frontend)
- **OpenCode CLI** (или используйте `--mock` для тестов)

### Установка

```bash
# 1. Клонировать
git clone https://github.com/Gustafor/crypto-trading-bot.git
cd crypto-trading-bot

# 2. Установить зависимости
npm run install:all

# 3. Запустить (dev режим с моком)
npm run dev

# Или по отдельности:
npm run dev:backend  # http://localhost:8000
npm run dev:frontend # http://localhost:5173
```

### Продакшн (с реальным OpenCode)

```bash
# Настроить OpenCode Go подписку
opencode login
# или подключить через /connect в TUI

# Запуск без мока
cd orchestrator/backend
python -m src.orchestrator.main  # без --mock
```

---

## 🎮 Интерфейс

### Graph View (`/graph`)
Визуальный граф задач в стиле **n8n/Flower**:
- 🟣 **Chief** — центральный узел, пульсирует при планировании
- 🔵 **Workers** — цветные по типу, показывают текущую задачу
- 🟢 **Tasks** — прямоугольники с прогрессом, токенами, стоимостью
- 🟡 **Artifacts** — ромбы (файлы, созданные задачами)
- 🔴 **Errors** — красные, клик = детали ошибки

**Элементы управления:**
- Панорамирование/зум (колесико/перетаскивание)
- Minimap (правый нижний угол)
- Fit View / Reset / Layout кнопки
- Легенда (правый нижний угол)

### Tasks View (`/tasks`)
Таблица задач с фильтрами:
- Поиск по названию/промпту
- Фильтр по статусу и типу
- Сортировка по дате/приоритету/статусу
- Клик → открывает детали в правой панели

### Workers View (`/workers`)
Статус пула воркеров:
- Загрузка каждого (idle/busy/offline)
- Метрики: completed, failed, tokens, cost
- Текущая задача с анимацией

### Limits View (`/limits`)
Детальная аналитика бюджета:
- Круговая диаграмма расхода ($42/$60)
- Таблица по моделям (requests, tokens, cost, % бюджета)
- Алерты при 80% лимита
- Бесплатные модели (unlimited)

### Logs View (`/logs`)
Поток логов в реальном времени:
- Фильтр по уровню (info/warning/error/debug)
- Поиск по тексту
- Auto-scroll, копирование, сохранение

---

## 📁 Структура проекта

```
crypto-trading-bot/
├── config/
│   ├── orchestrator.yaml      # Chief + Workers конфиг
│   └── model_matrix.yaml      # Task Type → Model mapping
├── orchestrator/
│   ├── backend/               # FastAPI + SQLite + WebSocket
│   │   ├── src/orchestrator/
│   │   │   ├── api/           # REST + WS endpoints
│   │   │   ├── chief.py       # Chief Architect
│   │   │   ├── worker_pool.py # Worker management
│   │   │   ├── task_queue.py  # SQLite queue с DAG
│   │   │   ├── model_registry.py # Pricing, limits, selection
│   │   │   ├── opencode_wrapper.py # OpenCode CLI wrapper
│   │   │   └── state.py       # Graph snapshots для UI
│   │   └── pyproject.toml
│   └── frontend/              # React + React Flow + Tailwind
│       ├── src/
│       │   ├── nodes/         # Chief, Worker, Task, Artifact
│       │   ├── edges/         # Delegation, Dependency, Artifact
│       │   ├── panels/        # Limits, Queue, Logs, Details
│       │   ├── views/         # Graph, Tasks, Workers, Limits, Logs
│       │   ├── store.ts       # Zustand state
│       │   └── api.ts         # Axios + WS hook
│       └── package.json
├── package.json               # Root workspace
└── README.md
```

---

## ⚙️ Конфигурация

### `config/orchestrator.yaml`
```yaml
chief:
  model: "opencode-go/kimi-k3"
  variant: "high"
  max_concurrent_tasks: 3

workers:
  - id: "coder"
    model: "opencode-go/glm-5.2"
    variant: "high"
    max_concurrent: 3
    capabilities: ["code_generation", "refactoring", "debugging"]

limits:
  go_monthly_usd: 60
  alert_threshold_pct: 80
  auto_fallback_to_free: true
```

### `config/model_matrix.yaml`
Маппинг типа задачи → модели:
- `architecture_design` → `kimi-k3` (high, 1M ctx)
- `core_implementation` → `glm-5.2` (high, 1M ctx)
- `strategy_implementation` → `deepseek-v4-pro` (max, 1M ctx)
- `quick_fix` → `beam-free` (low, free)
- `chart_analysis` → `kimi-k2.7-code` (vision)

---

## 🔌 API Endpoints

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/status` | Общий статус |
| `GET` | `/api/graph` | Граф для React Flow |
| `POST` | `/api/goal` | Задать цель Chief'у |
| `POST` | `/api/tasks` | Создать задачу |
| `GET` | `/api/tasks` | Список задач |
| `POST` | `/api/tasks/{id}/retry` | Повторить задачу |
| `GET` | `/api/workers` | Список воркеров |
| `POST` | `/api/models/select` | Рекомендация модели |
| `GET` | `/api/limits` | Использование лимитов |
| `WS` | `/ws` | Live updates |

---

## 💰 Лимиты и стоимость (OpenCode Go $10/мес)

| Модель | Контекст | In/Out $/1M | Лимит Go | Приватность |
|--------|----------|-------------|----------|-------------|
| GLM-5.2 | 1M | $1.40/$4.40 | **$60** | Zero retention |
| Kimi K3 | 1M | $3.00/$15.00 | $15 | Zero retention |
| DeepSeek V4.1 Flash | 1M | $0.15/$0.60* | **$80** | Zero retention* |
| Kimi K2.7 Code | 262K | $0.95/$4.00 | **$60** | Zero retention + Vision |
| Beam Free | 1M | **Free** | Unlimited | 30 дней retention |

*Off-peak тариф. Peak: $0.30/$1.20.

**Стратегия:** Chief использует лучшие модели для планирования, Worker'ы — оптимальные по цене/качеству. При исчерпании лимита — авто-фоллбек на бесплатные.

---

## 🛠 Разработка

### Backend
```bash
cd orchestrator/backend
uv pip install -e .[dev]
pytest                    # тесты
ruff check .              # линт
mypy src                  # типы
python -m src.orchestrator.main --mock
```

### Frontend
```bash
cd orchestrator/frontend
npm run dev               # dev server
npm run build             # production build
npm run lint              # eslint
```

### База данных
SQLite в `orchestrator/backend/data/orchestrator.db`. Сброс:
```bash
npm run db:reset
```

---

## 🔐 Приватность

| Tier | Модели | Retention | Training |
|------|--------|-----------|----------|
| **Zero** | GLM, Kimi, DeepSeek, MiniMax, LongCat | 0 дней | Нет |
| **30 дней** | Beam, Grok, GPT Luna, Claude Haiku | 30 дней | Нет |
| **Training** | Gemini Argon, Muse Spark | Не ZDR | **Да** |

**Для проприетарных стратегий** — используйте только Zero Retention модели.

---

## 📝 Roadmap

- [ ] **Trading Bot Core** — exchange adapters, order manager, risk engine
- [ ] **Strategies** — технические индикаторы, ML сигналы, бэктестинг
- [ ] **Data Pipeline** — OHLCV коллектор, feature store, TimescaleDB
- [ ] **Deploy** — Docker, K8s, мониторинг, алерты
- [ ] **Multi-tenancy** — изоляция проектов, RBAC

---

## 📄 Лицензия

MIT — используйте свободно для коммерческих и личных проектов.

---

## 🤝 Контрибьюция

1. Fork репозитория
2. Создайте feature branch
3. Запустите тесты (`npm run test:backend && npm run lint:frontend`)
4. Откройте PR

---

**Built with** ❤️ **using** OpenCode, FastAPI, React Flow, Tailwind, Zustand
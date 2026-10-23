# RabbitMQ Designer — Monorepo

Репозиторий содержит два проекта:

| Проект | Папка | URL после деплоя | Технологии |
|--------|-------|------------------|------------|
| **Лэндинг** | `landing/` | https://gustafor.github.io/ | Astro 7, TypeScript, CSS |
| **Приложение (Designer)** | `designer/` | https://gustafor.github.io/designer/ | (добавить ваш стек) |

---

## Быстрый старт

### 1. Лэндинг (Astro)

```bash
cd landing
npm ci
npm run dev        # http://localhost:4321
npm run build      # собирает в landing/dist
npm run preview    # предпросмотр сборки
```

### 2. Приложение (Designer)

```bash
cd designer
# Добавьте сюда свой package.json и исходники
# npm ci && npm run build
```

---

## Деплой на GitHub Pages

Настроен **GitHub Actions** (`.github/workflows/deploy.yml`):

- **Триггер**: пуш в `main` или `master`
- **Собирает**: только `landing/`
- **Артефакт**: `landing/dist`
- **Публикует**: на корень GitHub Pages → https://gustafor.github.io/

### Ручной запуск
1. Actions → `Deploy to GitHub Pages` → `Run workflow`

### Настройка GitHub Pages
Settings → Pages → **Build and deployment** → Source: **GitHub Actions**

---

## Структура репозитория

```
MQ-Designer.github.io/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD для лэндинга
├── landing/                    # Лэндинг (Astro)
│   ├── src/
│   │   ├── components/         # UI-компоненты
│   │   ├── layouts/            # Layouts
│   │   ├── pages/              # Страницы (index, tools, program, etc.)
│   │   ├── styles/             # global.css, tokens.css
│   │   └── data/               # course.ts (контент, контакты)
│   ├── public/                 # Статика (images, screenshots, favicon)
│   ├── astro.config.mjs
│   ├── package.json
│   └── tsconfig.json
├── designer/                   # Приложение (добавить свой код)
│   └── README.md
└── .github/workflows/deploy.yml
```

---

## Основные команды

| Действие | Команда |
|----------|---------|
| Разработка лэндинга | `cd landing && npm run dev` |
| Сборка лэндинга | `cd landing && npm run build` |
| Проверка типов | `cd landing && npx astro check` |
| Линт/формат | `cd landing && npx prettier --check .` |

---

## Контакты и конфигурация

Основные настройки лэндинга — в `landing/src/data/course.ts`:

```ts
export const site = {
  name: "RabbitMQ Designer",
  appUrl: "https://gustafor.github.io/MQ-Designer.github.io/",  // ссылка на приложение
  githubUrl: "https://github.com/Gustafor/MQ-Designer.github.io",
  email: "hello@example.ru",
  telegram: "https://t.me/example",
  // ...
};
```

> **Важно**: перед релизом замените placeholder-контакты (`example.ru`, `t.me/example`) на реальные.

---

## Добавление приложения (Designer)

1. Добавьте исходники в `designer/`
2. Создайте `designer/package.json` со скриптом `build`
3. Расширьте `.github/workflows/deploy.yml` — добавьте вторую job для сборки `designer/` и деплоя в `designer/` подпапку Pages

Пример расширения workflow:

```yaml
jobs:
  build-landing:
    # ... текущая job для landing

  build-designer:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: designer/package-lock.json
      - working-directory: ./designer
        run: |
          npm ci
          npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./designer/dist
          name: designer-artifact

  deploy:
    needs: [build-landing, build-designer]
    # ... настройка деплоя двух артефактов
```

---

## Лицензия

MIT — для лэндинга и приложения.
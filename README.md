# WebNetChecker

Веб-приложение для проверки доступности доменов, сервисов и файлов в интернете. Вдохновлено bash-скриптом, параллельно пингующим сервисы (Telegram, GitHub, ChatGPT, YouTube и др.) и выводящим статус: **ДОСТУПЕН / ЗАБЛОКИРОВАН**.

## Возможности

- **Параллельные HTTP-проверки** с настраиваемым таймаутом (по умолчанию 3 с) и пулом конкурентности (10).
- **NDJSON-стриминг** результатов в реальном времени — карточки обновляются по мере завершения каждого чека.
- **SSRF-защита** на уровне DNS-lookup (undici Agent с кастомным `connect.lookup`), блокировка приватных диапазонов, cloud metadata, localhost.
- **Rate limiting** (10 сканов/мин с IP) — in-memory за интерфейсом, легко заменить на Redis/Upstash.
- **Тёмный техно-дашборд**: карточки с цветовыми статусами, терминальный режим (лог как в консоли), фильтры, поиск, сортировка.
- **Seed-каталог** из 60+ сервисов в 11 категориях (мессенджеры, разработка, ИИ, соцсети, стриминг, финансы, базовые).
- **Пользовательские цели**: добавление одной цели, массовая загрузка списком или из `.txt/.csv`, удаление.
- **История проверок** (localStorage, последние 20 запусков).
- **Экспорт** результатов в JSON, CSV и копирование в буфер в текстовом виде (как вывод bash-скрипта).
- **Автообновление** с интервалами: выкл / 30 с / 1 мин / 5 мин.
- **Security headers** (CSP, HSTS, X-Frame-Options, и др.), SEO (sitemap, robots, Open Graph).
- **WCAG 2.1 AA**: контраст, фокус, `prefers-reduced-motion`, ARIA.

## Технологии

- **Next.js 16.3.5** (App Router, React Server Components, Server Actions)
- **React 19**, **TypeScript strict** (noUncheckedIndexedAccess, no any)
- **Tailwind CSS v4** (CSS-first конфигурация через `@theme`)
- **Zod** для валидации ввода и env
- **Zustand 5** для клиентского стейта
- **Undici** для HTTP-чеков с keep-alive и кастомным DNS-lookup
- **Vitest + React Testing Library** (unit), **Playwright** (e2e)
- **ESLint 9 (flat)** + **Prettier**

## Быстрый старт

```bash
# Установка зависимостей
npm install

# Копирование примера env
cp .env.example .env.local

# Запуск в dev-режиме
npm run dev
```

Откройте <http://localhost:3000>.

## Команды

| Команда | Описание |
|---------|----------|
| `npm run dev` | Dev-сервер с Turbopack |
| `npm run build` | Продакшн-сборка (Turbopack) |
| `npm run start` | Запуск продакшн-сервера |
| `npm run lint` | ESLint (flat config) |
| `npm run lint:fix` | Автофикс линтера |
| `npm run format` | Prettier |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Unit-тесты (Vitest) |
| `npm run test:e2e` | E2E-тесты (Playwright) |

## Переменные окружения

Скопируйте `.env.example` в `.env.local` и при необходимости измените:

```env
CHECK_TIMEOUT_MS=3000       # таймаут HTTP-запроса (мс)
SCAN_MAX_TARGETS=50         # макс. целей за один скан
SCAN_CONCURRENCY=10         # пул конкурентности
RATE_LIMIT_SCANS=10         # сканов в минуту с IP
RATE_LIMIT_WINDOW_MS=60000  # окно rate-limit (мс)
CHECK_RETRIES=1             # ретраи при таймауте
SCAN_API_KEY=               # опционально: защита эндпоинта /api/scan
UPSTASH_REDIS_REST_URL=     # для распределённого rate-limit на Vercel
UPSTASH_REDIS_REST_TOKEN=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Добавление сервисов в конфиг

Seed-каталог хранится в `src/lib/config/services.ts` и `src/lib/config/categories.ts`.

### Добавление новой категории

```ts
// src/lib/config/categories.ts
export const CATEGORIES = [
  // ... существующие
  { id: "my-category", label: "Мои сервисы", icon: "Star" },
] as const satisfies readonly Category[];
```

### Добавление сервиса в категорию

```ts
// src/lib/config/services.ts
export const SEED_CATALOG: readonly SeedCategory[] = [
  // ... существующие
  {
    id: "my-category",
    services: [
      { name: "Мой сервис", url: "https://example.com" },
    ],
  },
];
```

После изменений перезапустите dev-сервер — типы подхватятся автоматически (Zod-схемы генерируются из `as const`).

## Архитектура ядра

```
src/
├── app/
│   ├── api/
│   │   ├── scan/route.ts        # POST → NDJSON-стрим проверок
│   │   ├── scan/latest/route.ts # GET  → кэш последнего скана
│   │   └── seed/route.ts        # GET  → seed-каталог
│   └── page.tsx                 # дашборд (client component)
├── lib/
│   ├── checker/
│   │   ├── ssrf-guard.ts        # SSRF: undici Agent + guarded lookup
│   │   ├── fetch-checker.ts     # HEAD/GET с ретраями, только заголовки
│   │   ├── classify.ts          # классификация ошибок (DNS/SSL/timeout/…)
│   │   ├── pool.ts              # bounded concurrency (async generator)
│   │   ├── normalize-url.ts     # Zod-схема + нормализация URL
│   │   └── scan-stream.ts       # оркестратор стрима
│   ├── rate-limit.ts            # in-memory rate limiter (interface-based)
│   ├── cache.ts                 # in-memory кэш последнего скана
│   ├── export.ts                # JSON/CSV/text + clipboard/download
│   └── cn.ts                    # clsx + tailwind-merge
├── store/scan-store.ts          # zustand: targets, results, filters, mode
├── hooks/
│   ├── useScan.ts               # fetch + NDJSON reader + AbortController
│   ├── useFilters.ts            # derived filtered+sorted entries
│   ├── useAutoRefresh.ts        # интервальный повтор скана
│   └── useHistory.ts            # localStorage история (20 записей)
├── components/                  # ServiceCard, StatusBadge, FilterBar,
│                                 # TerminalView, Toolbar, ExportMenu,
│                                 # AddTargetDialog, CategorySection…
├── types/
│   ├── checker.ts               # CheckResult, Target, Category, statuses
│   ├── scan.ts                  # ScanEvent, CachedScan, ScanSummary
│   └── seed.ts                  # SeedResponse
└── config/
    ├── categories.ts            # CATEGORIES (id, label, icon)
    ├── services.ts              # SEED_CATALOG, SEED_TARGETS
    └── env.ts                   # env-схема (Zod)
```

## Breaking Changes Next 16.x и решения

| Изменение | Влияние | Решение в проекте |
|-----------|---------|-------------------|
| **Async `params`/`searchParams`/`cookies`/`headers`** в Server Components | Код, читающий их синхронно, ломается | Все API routes используют `Request` напрямую; в клиенте — `useSearchParams` |
| **Turbopack по умолчанию** | Быстрее dev/build, другие предупреждения | Используем без изменений, все предупреждения адресованы |
| **React 19** | Новые хуки, изменения в типизации форм | Используем современные паттерны (`useActionState` не требуется) |
| **Tailwind v4 (CSS-first)** | `@import "tailwindcss"`, конфиг в `@theme` | `globals.css` с `@theme` токенами, `postcss.config.mjs` → `@tailwindcss/postcss` |
| **ESLint 9 flat config** | Старый `extends` не работает | `eslint.config.mjs` импортирует `eslint-config-next/core-web-vitals` и `typescript` как flat-массивы |
| **Edge Runtime deprecated** | `export const runtime = "edge"` даёт warning | Переключили `opengraph-image.tsx` на `nodejs` runtime (или приняли warning) |
| **`maxRedirections` удалён из undici `request`** | TS-ошибка | Убрали — 3xx трактуются как `available`, редиректы не следуем |
| **`noUncheckedIndexedAccess`** | Деструктуризация массивов даёт `undefined` | Явные индексы с `?? 0` вместо деструктуризации |

## Рекомендации по расширению

1. **БД для истории** — заменить `localStorage` на PostgreSQL/SQLite (Prisma/Drizzle) + миграции. Интерфейс `ScanCache` в `lib/cache.ts` уже изолирован.
2. **Распределённый rate-limit** — подключить Upstash Redis: задать `UPSTASH_REDIS_REST_URL/TOKEN` и реализовать `RateLimiter` на базе Redis (используя тот же интерфейс).
3. **Cron-мониторинг** — добавить `next-cron` или внешний планировщик (GitHub Actions, cron-job.org), вызывающий `/api/scan` с `x-scan-key`.
4. **Уведомления** — вебхуки (Telegram/Slack/Discord) при смене статуса критических сервисов.
5. **Мультитенантность** — добавить авторизацию (NextAuth), изолировать каталоги и историю по пользователям.
6. **Продвинутая диагностика** — TLS fingerprint, DNSSEC, HTTP/3, Certificate Transparency логи.
7. **Метрики / Observability** — OpenTelemetry + Prometheus/Grafana для latency, error rates, uptime SLA.

## Лицензия

MIT — свободно используйте и модифицируйте.
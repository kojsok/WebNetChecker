# Деплой WebNetChecker

Приложение **stateless**: БД нет, история проверок живёт в localStorage браузера, кэш последнего скана — в памяти процесса. Деплой = окружение Node.js ≥ 20.9 (рекомендуется 22 LTS) + переменные окружения из [`.env.example`](.env.example).

Поддерживаемые сценарии: [Vercel](#vercel) и [Docker / VPS](#docker--vps). Полный список переменных — в [README.md](README.md#переменные-окружения).

---

## Vercel

1. Импортируйте репозиторий, preset **Next.js** — билд-команды по умолчанию (`next build`).
2. Задайте переменные окружения (Project → Settings → Environment Variables):

   ```env
   NEXT_PUBLIC_SITE_URL=https://ваш-домен
   TRUST_PROXY=1        # Vercel — доверенный прокси: реальный IP клиента в x-forwarded-for
   SCAN_API_KEY=<длинный секрет>   # защита внешних вызовов POST /api/scan (cron, скрипты)
   ```

   Дашборду ключ не нужен: UI вызывает same-origin `POST /api/scan/run`, где ключ применяется на сервере.
3. Домен: Settings → Domains. Metadata / Open Graph / sitemap подхватят `NEXT_PUBLIC_SITE_URL`.

### Нюансы на серверлесс

- **Rate limiting — in-memory per-instance.** Интерфейс `RateLimiter` (`src/lib/rate-limit.ts`) изолирован, но реализация на Upstash Redis в код пока не включена (env-переменные `UPSTASH_REDIS_REST_*` — задел). На нескольких инстансах лимиты считаются отдельно на каждом.
- **Кэш `/api/scan/latest`** тоже in-memory и per-instance — hydrate отдаёт последний скан конкретного инстанса. Для этого приложения это приемлемо.
- **Cron**: Vercel Cron делает только GET, а скан — POST. Для периодических прогонов используйте внешний планировщик (GitHub Actions, cron-job.org) с `POST /api/scan` и заголовком `x-scan-key`:

  ```yaml
  # .github/workflows/scan-cron.yml (фрагмент)
  - run: |
      curl -sS -X POST "$SITE_URL/api/scan" \
        -H "content-type: application/json" \
        -H "x-scan-key: $SCAN_API_KEY" \
        -d '{"targets":[{"url":"https://api.telegram.org"},{"url":"https://github.com"}]}'
    env:
      SITE_URL: ${{ secrets.SITE_URL }}
      SCAN_API_KEY: ${{ secrets.SCAN_API_KEY }}
  ```

Проверка после деплоя:

```bash
curl -si https://ваш-домен/api/scan/latest | head -1   # HTTP/2 200 + cache-control: no-store
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://ваш-домен/api/scan \
  -H "content-type: application/json" -d '{"targets":[{"url":"example.com"}]}'   # 401 без ключа
```

---

## Docker / VPS

Файлы: [`Dockerfile`](Dockerfile), [`.dockerignore`](.dockerignore), [`docker-compose.yml`](docker-compose.yml). Образ использует `output: "standalone"` из `next.config.ts`.

### 1. Запуск

```bash
cp .env.example .env    # отредактируйте значения
docker compose up -d --build
```

Приложение слушает `127.0.0.1:3000` — наружу его отдаёт reverse-proxy, а не сам контейнер.

### 2. nginx (реальный IP + стриминг)

```nginx
server {
    listen 443 ssl http2;
    server_name checker.example.com;
    # ssl_certificate ... (certbot)

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # Реальный IP клиента — nginx добавляет его в конец цепочки;
        # при TRUST_PROXY=1 приложение читает ПОСЛЕДНИЙ элемент x-forwarded-for.
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # NDJSON-стриминг скана: без буферизации и длинным таймаутом чтения.
        proxy_buffering off;
        proxy_read_timeout 120s;
    }
}
```

В `.env` при этом: `TRUST_PROXY=1`. Если прокси нет и контейнер открыт напрямую (`ports: "3000:3000"`), оставьте `TRUST_PROXY=0` — заголовки клиента считаются недоверенными, а барьером служит глобальный резервный бакет `RATE_LIMIT_GLOBAL`.

### 3. systemd (без Docker)

```ini
# /etc/systemd/system/webnetchecker.service
[Unit]
Description=WebNetChecker
After=network-online.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/webnetchecker
Environment=NODE_ENV=production PORT=3000 HOSTNAME=127.0.0.1
EnvironmentFile=/opt/webnetchecker/.env
ExecStart=/usr/bin/node .next/standalone/server.js
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Подготовка каталога:

```bash
sudo mkdir -p /opt/webnetchecker && sudo chown www-data: /opt/webnetchecker
git clone <repo> /opt/webnetchecker && cd /opt/webnetchecker
npm ci && npm run build
# standalone-сервер и статика уже в .next/standalone после build
sudo systemctl enable --now webnetchecker
```

### 4. Обновления

```bash
git pull && npm ci && npm run build
sudo systemctl restart webnetchecker      # или: docker compose up -d --build
```

Гейты перед обновлением: `npm run typecheck && npm run lint && npm test && npm run build`.

### 5. Бэкапы и мониторинг

- Состояния на диске нет — бэкапить нечего; сохраните только `.env` (секреты).
- Лёгкий health-check для uptime-бота: `GET /api/scan/latest` (200 даже с `"data":null`).
- Логи: `docker compose logs -f` / `journalctl -u webnetchecker -f`.

### 6. Чек-лист после деплоя

- [ ] `GET /` открывается, скан из UI работает (кнопка «Запустить проверку»)
- [ ] `POST /api/scan` без ключа → `401`, с `x-scan-key` → NDJSON-стрим
- [ ] UI-скан работает при включённом `SCAN_API_KEY` (через `/api/scan/run`)
- [ ] 11-й скан подряд с одного IP → `429` + `retry-after`
- [ ] За nginx: в логах видно реальный IP клиента (не адрес прокси)
- [ ] `GET /api/scan/latest` → `200` + `cache-control: no-store`

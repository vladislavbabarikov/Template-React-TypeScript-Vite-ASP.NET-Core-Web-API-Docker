> # Шаблон: React + TypeScript (Vite) + ASP.NET Core Web API + Docker
> 🌐 Читать на другом языке: [English](README.md)

Этот репозиторий содержит CLI-скрипт для генерации **full-stack проекта**, который включает:

- **Frontend**: React + TypeScript + Vite (с выбором между Babel и SWC).
- **Backend**: ASP.NET Core Web API (.NET 8).
- **Swagger UI** для API-документации.
- **Docker и docker-compose** для продакшен окружения.
- **Конфигурацию VS Code** (tasks + launch).
- **Dev и Prod режимы запуска** (локально или в контейнерах).
- **Root package.json** со скриптами.

---

## Системные требования

Перед использованием убедитесь, что на вашей системе установлено:

1. **Node.js 18+** (проверить: `node -v`)
2. **npm 9+** (проверить: `npm -v`)
3. **.NET SDK 8.0** (проверить: `dotnet --version`)
4. **Docker** и **docker-compose**
5. **Git Bash** или **WSL** (для Windows), чтобы работали bash-команды

---

## Установка и создание проекта

```bash
# Скачайте скрипт
curl -O https://raw.githubusercontent.com/vladislavbabarikov/Template-React-TypeScript-Vite-ASP.NET-Core-Web-API-Docker/refs/heads/main/create-aspnet-react-docker.js
chmod +x create-aspnet-react-docker.js

# Запустите генерацию
./create-aspnet-react-docker.js
```
## 💡 Windows

Если вы используете Windows и запускаете скрипт из VS Code, убедитесь, что используете **Git Bash** или **WSL** в терминале.
Если вы работаете через PowerShell, используйте следующую команду:

```powershell
# Скачать скрипт
Invoke-WebRequest -Uri https://raw.githubusercontent.com/vladislavbabarikov/Template-React-TypeScript-Vite-ASP.NET-Core-Web-API-Docker/refs/heads/main/create-aspnet-react-docker.js -OutFile create-aspnet-react-docker.js

# Запустить скрипт
node .\create-aspnet-react-docker.js
```

Далее скрипт спросит:
- Название проекта (если не указано)
- Какой шаблон React использовать (Babel или SWC)

---

## Режимы запуска

### 🧪 Dev режим (локальный)

```bash
cd my-app
npm run dev
```

Откроется:
- API: `http://localhost:5000/swagger`
- Client: `http://localhost:5173`

---

### 🚀 Prod режим (через Docker)

```bash
npm run prod:up
```

Откроется:
- API: `http://localhost:8080/swagger`
- Client: `http://localhost:8081`

Остановка:

```bash
npm run prod:down
```

---

## Структура проекта

```
my-app/
├── client/             # React + Vite
│   ├── Dockerfile
│   ├── nginx.conf
│   └── ...
├── server/             # ASP.NET Core Web API
│   ├── Controllers/
│   ├── Program.cs
│   └── Dockerfile
├── docker-compose.yml
├── docker-compose.prod.yml
├── package.json
└── .vscode/            # VS Code конфиги
```

---

## VS Code

В `.vscode/launch.json` уже преднастроены конфигурации:

- **Dev: Client + Server** — локальный запуск API и клиента
- **Prod: Client + Server (Docker)** — запуск контейнеров через docker-compose

---

## Swagger

Swagger UI доступен по:

- Dev: `http://localhost:5000/swagger`
- Prod: `http://localhost:8080/swagger`

---

## CI/CD и деплой на сервер

На проде можно просто прокинуть порты через nginx:

```nginx
server {
  listen 80;
  server_name example.com;

  location /api {
    proxy_pass http://localhost:8080;
  }

  location / {
    proxy_pass http://localhost:8081;
  }
}
```

Также можно подключить CI/CD (например GitHub Actions) для автоматического деплоя.

---

## Лицензия

> # Template: React + TypeScript (Vite) + ASP.NET Core Web API + Docker  
> 🌐 Read in other language: [Русский](README.ru.md)

This repository contains a CLI script that generates a **full-stack project**, including:

- **Frontend**: React + TypeScript + Vite (choose Babel or SWC).
- **Backend**: ASP.NET Core Web API (.NET 8).
- **Swagger UI** for API documentation.
- **Docker and docker-compose** for production setup.
- **VS Code configuration** (tasks + launch).
- **Dev and Prod run modes** (locally or containerized).
- A **root package.json** with scripts.

---

## System Requirements

Before using, ensure the following are installed:

1. **Node.js 18+** (`node -v`)
2. **npm 9+** (`npm -v`)
3. **.NET SDK 8.0** (`dotnet --version`)
4. **Docker** and **docker-compose**
5. **Git Bash** or **WSL** (for Windows), for Bash command support

---

## Installation & Project Creation

```bash
# Download the script
curl -O https://raw.githubusercontent.com/vladislavbabarikov/Template-React-TypeScript-Vite-ASP.NET-Core-Web-API-Docker/refs/heads/main/create-aspnet-react-docker.js
chmod +x create-aspnet-react-docker.js

# Run the generator
./create-aspnet-react-docker.js myapp
```
##  Windows

If you're using Windows and running the script from VS Code, make sure your terminal is set to **Git Bash** or **WSL**.

If you're using PowerShell, use the following alternative:

```powershell
# Download the script
Invoke-WebRequest -Uri https://raw.githubusercontent.com/vladislavbabarikov/Template-React-TypeScript-Vite-ASP.NET-Core-Web-API-Docker/refs/heads/main/create-aspnet-react-docker.js -OutFile create-aspnet-react-docker.js

# Run the script
node .\create-aspnet-react-docker.js my-app
```

> The `chmod` command and `./script.js` execution work only in Bash environments (Git Bash, WSL, or Linux/macOS).

The script will ask:
- Project name (if not provided)
- Which React template to use (Babel or SWC)

---

## Run Modes

### 🧪 Dev Mode (local)

```bash
cd my-app
npm run dev
```

Available at:
- API: `http://localhost:5000/swagger`
- Client: `http://localhost:5173`

---

### 🚀 Prod Mode (Docker)

```bash
npm run prod:up
```

Available at:
- API: `http://localhost:8080/swagger`
- Client: `http://localhost:8081`

To stop:

```bash
npm run prod:down
```

---

## Project Structure

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
└── .vscode/            # VS Code configs
```

---

## VS Code

`.vscode/launch.json` includes preconfigured launch settings:

- **Dev: Client + Server** — local run of API and frontend
- **Prod: Client + Server (Docker)** — run containers via docker-compose

---

## Swagger

Swagger UI is available at:

- Dev: `http://localhost:5000/swagger`
- Prod: `http://localhost:8080/swagger`

---

## CI/CD & Deployment

On production, use Nginx to forward ports:

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

You can also integrate CI/CD (e.g., GitHub Actions) for automated deployment.

---

## License

MIT

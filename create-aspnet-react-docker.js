#!/usr/bin/env node
/* eslint-disable no-console */
const { spawn } = require("child_process");
const fsp = require("fs/promises");
const path = require("path");
const readline = require("readline");

const args = process.argv.slice(2);
const positional = args.find(a => !a.startsWith("-"));
const flags = new Set(args.filter(a => a.startsWith("-")));
const runInstall = !flags.has("--no-install");
const skipDocker = flags.has("--skip-docker");
const skipVSCode = flags.has("--skip-vscode");
const forcedSwc = flags.has("--swc") ? true : (flags.has("--no-swc") ? false : undefined);

function run(cmd, cmdArgs, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, cmdArgs, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32"
    });
    child.on("close", code =>
      code === 0 ? resolve() : reject(new Error(`${cmd} ${cmdArgs.join(" ")} failed (${code})`))
    );
  });
}
async function ensureDir(p) { await fsp.mkdir(path.dirname(p), { recursive: true }); }
async function write(p, content) { await ensureDir(p); await fsp.writeFile(p, content, "utf8"); }
async function exists(p) { try { await fsp.access(p); return true; } catch { return false; } }
function log(s) { console.log(`\n=== ${s} ===`); }
function toPkgName(s) {
  return (s || "")
    .trim().toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9\-._~]/g, "")
    .replace(/^-+/, "").replace(/-+$/, "") || "app";
}

// ---- prompts ----
function ask(question, def = "") {
  if (!process.stdin.isTTY) return Promise.resolve(def);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans || def); }));
}

async function selectArrows(question, items, initial = 0) {
  if (!process.stdin.isTTY) return { index: initial, value: items[initial] };

  console.log(question);
  let idx = Math.max(0, Math.min(items.length - 1, initial));

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  readline.emitKeypressEvents(process.stdin, rl);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);

  function render(first = false) {
    const lines = items.map((c, i) => `${i === idx ? "›" : " "} ${c}`).join("\n");
    if (!first) process.stdout.write(`\x1b[${items.length}A`); // cursor up
    process.stdout.write(lines + "\n");
  }

  process.stdout.write("\x1b[?25l"); // hide cursor
  render(true);

  return new Promise(resolve => {
    const onKey = (_str, key) => {
      if (!key) return;
      if (key.name === "down") { idx = (idx + 1) % items.length; render(); }
      else if (key.name === "up") { idx = (idx - 1 + items.length) % items.length; render(); }
      else if (key.name === "return") { cleanup(); resolve({ index: idx, value: items[idx] }); }
      else if (key.name === "c" && key.ctrl) { cleanup(); process.exit(1); }
    };
    function cleanup() {
      process.stdin.off("keypress", onKey);
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      rl.close();
      process.stdout.write("\x1b[?25h"); // show cursor
    }
    process.stdin.on("keypress", onKey);
  });
}

(async () => {
  // --- Step 1: project folder ---
  // If user presses Enter -> use current directory (no new folder)
  let projectDir = positional;
  if (!projectDir || projectDir === ".") {
    const input = await ask("Project name (folder) [empty = current]: ", "");
    projectDir = input.trim();
  }
  const ROOT = projectDir ? path.resolve(process.cwd(), toPkgName(projectDir)) : process.cwd();

  if (await exists(path.join(ROOT, "client")) || await exists(path.join(ROOT, "server"))) {
    console.error("Folders 'client' or 'server' already exist in the target directory. Choose an empty project folder.");
    process.exit(1);
  }
  await fsp.mkdir(ROOT, { recursive: true });

  // --- Step 2: React template (Babel vs SWC) ---
  let useSwc = forcedSwc;
  if (useSwc === undefined) {
    const { index } = await selectArrows(
      "Which React template do you want?",
      ["React + TypeScript (Babel)", "React + TypeScript (SWC)"],
      1 // default to SWC
    );
    useSwc = index === 1;
  }
  const viteTemplate = useSwc ? "react-swc-ts" : "react-ts";
  const reactPluginPkg = useSwc ? "@vitejs/plugin-react-swc" : "@vitejs/plugin-react";

  // 1) CLIENT
  log(`Creating Vite client (${viteTemplate})`);
  await run("npx", ["--yes", "create-vite@latest", "client", "--template", viteTemplate], ROOT);

  if (runInstall) {
    log("npm install in client");
    await run("npm", ["install"], path.join(ROOT, "client"));
  }

  await write(path.join(ROOT, "client", "vite.config.ts"), `
import { defineConfig } from "vite";
import react from "${reactPluginPkg}";
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: true, proxy: { "/api": "http://localhost:5000" } },
  build: { outDir: "dist", emptyOutDir: true }
});
`.trimStart());

  // 2) SERVER (.NET 8)
  log("Creating ASP.NET Core Web API server (.NET 8)");
  await run("dotnet", ["new", "webapi", "-o", "server", "-f", "net8.0"], ROOT);

  const csprojPath = path.join(ROOT, "server", "server.csproj");
  try {
    const csproj = await fsp.readFile(csprojPath, "utf8");
    const updated = csproj.replace(
      /<TargetFramework>[\s\S]*?<\/TargetFramework>/,
      "<TargetFramework>net8.0</TargetFramework>"
    );
    if (updated !== csproj) await write(csprojPath, updated);
  } catch { /* ignore if file not found */ }

  await fsp.rm(path.join(ROOT, "server", "WeatherForecast.cs"), { force: true }).catch(()=>{});
  await fsp.rm(path.join(ROOT, "server", "Controllers", "WeatherForecastController.cs"), { force: true }).catch(()=>{});
  await write(path.join(ROOT, "server", "Controllers", "HelloController.cs"), `
using Microsoft.AspNetCore.Mvc;
namespace server.Controllers;
[ApiController]
[Route("api/[controller]")]
public class HelloController : ControllerBase { [HttpGet] public object Get() => new { message = "ok" }; }
`.trimStart());

  await write(path.join(ROOT, "server", "Program.cs"), `
// <auto-generated/>
using Microsoft.OpenApi.Models;
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddCors(o => o.AddPolicy("Client", p =>
    p.WithOrigins("http://localhost:5173", "http://localhost:8081").AllowAnyHeader().AllowAnyMethod()
));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c => c.SwaggerDoc("v1", new OpenApiInfo { Title = "server", Version = "v1" }));
var app = builder.Build();
app.UseCors("Client");
bool enableSwagger = app.Environment.IsDevelopment() ||
    string.Equals(Environment.GetEnvironmentVariable("ENABLE_SWAGGER"), "true", StringComparison.OrdinalIgnoreCase);
if (enableSwagger) {
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "server v1"));
    if (app.Environment.IsDevelopment())
        app.MapGet("/", ctx => { ctx.Response.Redirect("/swagger"); return Task.CompletedTask; });
}
app.MapControllers();
app.Run();
`.trimStart());

  await run("dotnet", ["add", "package", "Swashbuckle.AspNetCore"], path.join(ROOT, "server"));

  // 3) Docker
  if (!skipDocker) {
    log("Adding Dockerfiles and compose");
    await write(path.join(ROOT, "server", "Dockerfile"), `
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY server/server.csproj server/
RUN dotnet restore server/server.csproj
COPY server/ ./server/
WORKDIR /src/server
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "server.dll"]
`.trimStart());

    await write(path.join(ROOT, "client", "nginx.conf"), `
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  location / { try_files $uri /index.html; }
}
`.trimStart());

    await write(path.join(ROOT, "client", "Dockerfile"), `
FROM node:20-alpine AS build
WORKDIR /app
COPY client/package*.json ./
RUN npm ci || npm install
COPY client/. .
ARG VITE_API_URL
RUN echo "VITE_API_URL=\${VITE_API_URL:-http://server:8080}" > .env.production
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
`.trimStart());

    await write(path.join(ROOT, "docker-compose.yml"), `
services:
  server:
    build: { context: ., dockerfile: server/Dockerfile }
    image: app-server:dev
    environment:
      ASPNETCORE_ENVIRONMENT: Development
      ENABLE_SWAGGER: "true"
    ports: [ "8080:8080" ]
  client:
    build:
      context: .
      dockerfile: client/Dockerfile
      args: { VITE_API_URL: http://server:8080 }
    image: app-client:dev
    depends_on: [ server ]
    ports: [ "8081:80" ]
`.trimStart());

    await write(path.join(ROOT, "docker-compose.prod.yml"), `
services:
  server:
    environment:
      ASPNETCORE_ENVIRONMENT: Production
      ENABLE_SWAGGER: "true"   # change to "false" if not needed in prod
  client:
    ports: [ "8081:80" ]
`.trimStart());

    await write(path.join(ROOT, ".dockerignore"), `
**/bin
**/obj
**/node_modules
**/.vite
**/dist
.git
.gitignore
.vscode
`.trimStart());
  }

  // 4) VS Code
  if (!skipVSCode) {
    log("Adding VS Code configs");
    await write(path.join(ROOT, ".vscode", "tasks.json"), `
{
  "version": "2.0.0",
  "tasks": [
    { "label": "build-server", "type": "process", "command": "dotnet", "args": ["build", "\${workspaceFolder}/server/server.csproj"] },
    {
      "label": "wait-api",
      "type": "shell",
      "command": "bash",
      "args": ["-lc", "until curl -fsS http://localhost:5000/api/hello >/dev/null 2>&1; do sleep 1; done"],
      "windows": {
        "command": "powershell",
        "args": ["-NoProfile","-Command","while ($true) { try { Invoke-WebRequest -Uri http://localhost:5000/api/hello -TimeoutSec 2 | Out-Null; break } catch { Start-Sleep -Seconds 1 } }"]
      },
      "presentation": { "reveal": "never", "panel": "dedicated", "clear": true },
      "problemMatcher": []
    },
    { "label": "compose-up-prod", "type": "shell", "command": "docker", "args": ["compose", "-f", "docker-compose.yml", "-f", "docker-compose.prod.yml", "up", "-d", "--build"], "problemMatcher": [] },
    { "label": "compose-down",    "type": "shell", "command": "docker", "args": ["compose", "down"], "problemMatcher": [] }
  ]
}
`.trimStart());

    await write(path.join(ROOT, ".vscode", "launch.json"), `
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Server (.NET)",
      "type": "coreclr",
      "request": "launch",
      "program": "\${workspaceFolder}/server/bin/Debug/net8.0/server.dll",
      "cwd": "\${workspaceFolder}/server",
      "preLaunchTask": "build-server",
      "env": { "ASPNETCORE_ENVIRONMENT": "Development", "ASPNETCORE_URLS": "http://localhost:5000" },
      "serverReadyAction": { "action": "openExternally", "pattern": "Now listening on: (https?://\\\\S+)", "uriFormat": "%s/swagger" },
      "presentation": { "hidden": true }
    },
    {
      "name": "Client (Vite)",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev",
      "preLaunchTask": "wait-api",
      "cwd": "\${workspaceFolder}/client",
      "presentation": { "hidden": true }
    },
    {
      "name": "Prod: Client + Server (Docker)",
      "type": "node-terminal",
      "request": "launch",
      "command": "bash",
      "args": ["-lc", "echo 'Containers (prod) are running. Press Enter to stop...' ; read"],
      "windows": { "command": "powershell", "args": ["-NoProfile","-Command","Write-Host 'Containers (prod) are running. Press Enter to stop...'; Read-Host"] },
      "preLaunchTask": "compose-up-prod",
      "postDebugTask": "compose-down"
    }
  ],
  "compounds": [
    { "name": "Dev: Client + Server", "configurations": ["Server (.NET)", "Client (Vite)"] }
  ]
}
`.trimStart());
  }

  // 5) Root package.json
  const pkgName = toPkgName(path.basename(ROOT));
  log("Adding root package.json with scripts");
  await write(path.join(ROOT, "package.json"), JSON.stringify({
    name: pkgName,
    private: true,
    scripts: {
      "dev": "concurrently -k -n API,WEB \"dotnet run --project server/server.csproj --urls http://localhost:5000\" \"npm run dev --prefix client\"",
      "prod:up": "docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build",
      "prod:down": "docker compose down"
    },
    devDependencies: { concurrently: "^8.2.2" }
  }, null, 2));

  if (runInstall) {
    log("Installing dev dependencies at root (concurrently)");
    await run("npm", ["install"], ROOT);
  }

  console.log("\nDone ✅");
  console.log(`Project created at: ${ROOT}`);
  console.log("\nNext steps:");
  console.log("  Dev:   npm run dev    → http://localhost:5173 and http://localhost:5000/swagger");
  console.log("  Prod:  npm run prod:up → http://localhost:8081 (client), http://localhost:8080/swagger (server)");
  console.log("  Stop prod: npm run prod:down");
})().catch(err => {
  console.error("\nGeneration failed:", err.message);
  process.exit(1);
});

# Development Scripts

This directory contains scripts to manage the Todo App development environment.

## Available Scripts

### 🚀 `start-dev.sh`

Starts both frontend and backend development servers with automatic port cleanup.

**Features:**
- Automatically kills any existing processes on ports 3000 (frontend) and 3001 (backend)
- Installs dependencies if needed
- Starts both servers in parallel using `pnpm dev`
- **Enhanced logging mode** with colored, prefixed output for better debugging
- Provides colored output for better visibility
- Handles graceful shutdown with Ctrl+C

**Usage:**
```bash
# Standard mode (shows combined output)
./scripts/start-dev.sh

# Enhanced logging mode (colored, prefixed logs)
./scripts/start-dev.sh --logs
./scripts/start-dev.sh --verbose
./scripts/start-dev.sh -v

# Show help
./scripts/start-dev.sh --help
```

**Logging Modes:**
- **Standard mode**: Uses `pnpm dev` to show combined logs from both servers
- **Enhanced mode** (`--logs`): Runs servers separately with colored prefixes:
  - `[FRONTEND]` - Next.js logs in cyan
  - `[BACKEND]` - Express/tsx logs in magenta

**What it does:**
1. Checks if you're in the correct project directory
2. Verifies pnpm is installed
3. Kills any existing processes on ports 3000 and 3001
4. Installs dependencies if node_modules are missing
5. Starts development servers (with or without enhanced logging)

### 🔄 `restart-dev.sh`

Restarts both development servers by stopping existing ones and starting fresh.

**Usage:**
```bash
# Standard restart
./scripts/restart-dev.sh

# Restart with enhanced logging
./scripts/restart-dev.sh --logs
./scripts/restart-dev.sh --verbose
./scripts/restart-dev.sh -v

# Show help
./scripts/restart-dev.sh --help
```

**What it does:**
1. Stops all processes on ports 3000 and 3001
2. Calls `start-dev.sh` with the same options to start fresh servers
3. Handles interruption gracefully
4. Passes through all logging options to the start script

### 🛑 `stop-dev.sh`

Stops all development servers and related processes.

**Features:**
- Stops processes on specific ports (3000, 3001)
- Searches for and stops related Node.js processes
- Uses graceful shutdown (TERM) followed by force kill (KILL) if needed

**Usage:**
```bash
./scripts/stop-dev.sh
```

**What it does:**
1. Kills processes on frontend port (3000)
2. Kills processes on backend port (3001)
3. Searches for additional related processes and stops them
4. Provides feedback on what was stopped

## Quick Start

1. **First time setup:**
   ```bash
   ./scripts/start-dev.sh
   ```

2. **Start with enhanced logging (recommended for development):**
   ```bash
   ./scripts/start-dev.sh --logs
   ```

3. **Restart servers:**
   ```bash
   ./scripts/restart-dev.sh
   ```

4. **Restart with enhanced logging:**
   ```bash
   ./scripts/restart-dev.sh --logs
   ```

5. **Stop servers:**
   ```bash
   ./scripts/stop-dev.sh
   ```

## Enhanced Logging Benefits

When using `--logs` flag, you get:

- **Clear separation** between frontend and backend logs
- **Color-coded output** for easy identification:
  - 🔵 Frontend logs (Next.js) - prefixed with `[FRONTEND]`
  - 🟣 Backend logs (Express/tsx) - prefixed with `[BACKEND]`
- **Better debugging** - easier to trace issues to specific server
- **Real-time visibility** of both servers simultaneously

**Example output with --logs:**
```
[FRONTEND] ready - started server on 0.0.0.0:3000
[FRONTEND] event - compiled client and server successfully
[BACKEND] Server starting on port 3001
[BACKEND] Database connected successfully
[FRONTEND] wait  - compiling /api/hello (client and server)...
[BACKEND] GET /api/lists 200 - - 15.234 ms
```

## Ports

- **Frontend (Next.js):** http://localhost:3000
- **Backend (Express):** http://localhost:3001

## Requirements

- **pnpm** must be installed globally
- Scripts must be run from the project root directory
- **macOS/Linux** - scripts use bash and Unix tools like `lsof`

## Troubleshooting

### "Port already in use" errors
The scripts automatically handle this by killing existing processes, but if you still encounter issues:

```bash
# Manual port cleanup
lsof -ti:3000 | xargs kill -9  # Frontend
lsof -ti:3001 | xargs kill -9  # Backend
```

### "Permission denied" errors
Make sure scripts are executable:

```bash
chmod +x scripts/*.sh
```

### "pnpm not found" errors
Install pnpm globally:

```bash
npm install -g pnpm
```

## Script Features

- **Colored output** for better readability
- **Error handling** with proper exit codes
- **Signal handling** for graceful shutdown
- **Port conflict resolution** with automatic cleanup
- **Dependency checking** and installation
- **Process cleanup** to prevent zombie processes

## Integration with Package.json

You can also add these scripts to your root `package.json` for convenience:

```json
{
  "scripts": {
    "dev:start": "./scripts/start-dev.sh",
    "dev:restart": "./scripts/restart-dev.sh",
    "dev:stop": "./scripts/stop-dev.sh"
  }
}
```

Then use:
```bash
pnpm dev:start
pnpm dev:restart
pnpm dev:stop
```
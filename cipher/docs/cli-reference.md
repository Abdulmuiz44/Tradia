# CLI Reference

Complete command-line interface reference for Cipher, covering all modes, options, and commands.

## Basic Usage

<details>
<summary>Basic usage (terminal)</summary>

```bash
# Interactive CLI mode
cipher

# One-shot command
cipher "Your prompt here"

# Server modes  
cipher --mode api        # REST API server
cipher --mode mcp        # MCP server  
cipher --mode ui         # Web UI server
```

</details>


## Global Options

### Core Options

| Option | Description | Example |
|--------|-------------|---------|
| `--mode <mode>` | Execution mode: `cli`, `api`, `mcp`, `ui` | `cipher --mode api` |
| `--agent <path>` | Custom configuration file path | `cipher --agent /path/to/config.yml` |
| `--new-session [id]` | Start with new session | `cipher --new-session project-alpha` |
| `--strict` | Strict MCP connections only | `cipher --mode mcp --strict` |
| `--help` | Show help information | `cipher --help` |
| `--version` | Show version information | `cipher --version` |

### API Mode Options

| Option | Description | Default | Example |
|--------|-------------|---------|---------|
| `--port <number>` | API server port | 3000 | `cipher --mode api --port 8080` |
| `--host <address>` | API server host | localhost | `cipher --mode api --host 0.0.0.0` |
| `--cors` | Enable CORS | false | `cipher --mode api --cors` |

### MCP Mode Options  

| Option | Description | Default | Example |
|--------|-------------|---------|---------|
| `--mcp-transport-type <type>` | Transport: `stdio`, `sse`, `streamable-http` | stdio | `cipher --mode mcp --mcp-transport-type sse` |
| `--mcp-port <number>` | MCP server port (for `sse`/`streamable-http`) | 3000 (sse), 3001 (http) | `cipher --mode mcp --mcp-transport-type sse --mcp-port 4000` |
| `--mcp-host <host>` | MCP server host (for `sse`/`streamable-http`) | localhost | `cipher --mode mcp --mcp-host 0.0.0.0 --mcp-transport-type sse` |
| `--mcp-dns-rebinding-protection` | Enable DNS rebinding protection | false | `cipher --mode mcp --mcp-transport-type sse --mcp-dns-rebinding-protection` |
| `--timeout <ms>` | Tool execution timeout | 60000 | `cipher --mode mcp --timeout 120000` |

### UI Mode Options

| Option | Description | Default | Example |
|--------|-------------|---------|---------|
| `--ui-port <number>` | Web UI port | 3001 | `cipher --mode ui --ui-port 8080` |
| `--ui-host <address>` | Web UI host | localhost | `cipher --mode ui --ui-host 0.0.0.0` |

## Execution Modes

### CLI Mode (Default)

Interactive command-line interface:

<details>
<summary>CLI mode examples</summary>

```bash
# Start interactive mode
cipher

# Direct prompt execution
cipher "Add this to memory: CORS issues in Vite are usually solved by configuring the proxy"

# With custom config
cipher --agent ./my-config.yml "What do I know about authentication?"
```

</details>

**Features:**
- Interactive chat interface
- Session management
- Memory integration
- Tool access

### API Mode

RESTful HTTP API server:

<details>
<summary>API mode examples</summary>

```bash
# Basic API server
cipher --mode api

# Custom port and host
cipher --mode api --port 8080 --host 0.0.0.0 --cors

# With custom agent config
cipher --mode api --agent ./production-config.yml
```

</details>

**API Endpoints:**
- `POST /api/chat` - Send messages
- `GET /api/sessions` - List sessions
- `POST /api/sessions` - Create session
- `GET /api/config` - Get configuration

### MCP Mode

Model Context Protocol server:

<details>
<summary>MCP mode examples</summary>

```bash
# Standard MCP server (stdio transport - default)
cipher --mode mcp

# Explicit stdio transport
cipher --mode mcp --mcp-transport-type stdio

# SSE transport (HTTP server)
cipher --mode mcp --mcp-transport-type sse --mcp-port 3000

# Streamable-HTTP transport (HTTP server)
cipher --mode mcp --mcp-transport-type streamable-http --mcp-port 3001

# Strict mode (reject invalid connections)
cipher --mode mcp --strict
```

</details>

**Transport Types:**
- **stdio**: Direct process communication (default).
- **sse**: Server-Sent Events over HTTP. Endpoint: `/sse`.
- **streamable-http**: HTTP request/response with streaming. Endpoint: `/http`.

**Environment Variables for MCP:**
<details>
<summary>MCP environment variables</summary>

```bash
# MCP server behavior
export MCP_SERVER_MODE=aggregator  # or 'default'
export AGGREGATOR_CONFLICT_RESOLUTION=prefix  # 'first-wins', 'error'
export AGGREGATOR_TIMEOUT=60000
```

</details>

### UI Mode

Web interface server:

<details>
<summary>UI mode examples</summary>

```bash
# Start web UI
cipher --mode ui

# Custom port
cipher --mode ui --ui-port 8080

# Accessible from network
cipher --mode ui --ui-host 0.0.0.0 --ui-port 3001
```

</details>

**Access:** Open `http://localhost:3001` in your browser

## Interactive CLI Commands

When running in CLI mode, use these commands within the session:

### Session Management

| Command | Description | Example |
|---------|-------------|---------|
| `/session list` | List all sessions | `/session list` |
| `/session new [id]` | Create new session | `/session new project-beta` |
| `/session switch <id>` | Switch to session | `/session switch default` |
| `/session delete <id>` | Delete session | `/session delete old-session` |
| `/session rename <old> <new>` | Rename session | `/session rename temp project-final` |

### System Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/config` | Show current configuration | `/config` |
| `/stats` | Show usage statistics | `/stats` |
| `/help` | Show help | `/help` |
| `/clear` | Clear screen | `/clear` |
| `/exit` | Exit Cipher | `/exit` |

### Available CLI Commands (Actual Implementation)

| Command | Description | Example |
|---------|-------------|---------|
| `/help [command]` | Show help information | `/help session` |
| `/exit` | Exit the CLI session | `/exit` |
| `/clear` | Reset conversation history for current session | `/clear` |
| `/config` | Display current configuration | `/config` |
| `/stats` | Show system statistics and metrics | `/stats` |
| `/tools` | List all available tools | `/tools` |
| `/prompt` | Display current system prompt | `/prompt` |
| `/session <subcommand>` | Manage conversation sessions | `/session list` |

### Session Management Subcommands

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/session list` | List all sessions with status and activity | `/session list` |
| `/session new [name]` | Create new session (optional custom name) | `/session new project-alpha` |
| `/session switch <id>` | Switch to different session | `/session switch default` |
| `/session current` | Show current session info | `/session current` |
| `/session delete <id>` | Delete session (cannot delete active) | `/session delete old-session` |
| `/session delete all` | Delete all sessions except active | `/session delete all` |

### Advanced Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/prompt-stats` | Show system prompt performance statistics | `/prompt-stats --detailed` |
| `/prompt-providers <subcommand>` | Manage system prompt providers | `/prompt-providers list` |
| `/show-prompt` | Display system prompt with enhanced formatting | `/show-prompt --detailed` |

## Configuration File

Specify custom configuration with `--agent`:

<details>
<summary>Using a custom configuration file</summary>

```bash
cipher --agent /path/to/custom-config.yml
```

</details>

**Default locations:**
1. `./memAgent/cipher.yml`
2. `~/.config/cipher/cipher.yml` 
3. `/etc/cipher/cipher.yml`

## Environment Variables

Set these in your `.env` file or environment:

### Core Settings
<details>
<summary>Core environment variables</summary>

```bash
# LLM Configuration
OPENAI_API_KEY=sk-your-key
ANTHROPIC_API_KEY=sk-ant-your-key

# Memory Settings  
USE_WORKSPACE_MEMORY=true
DISABLE_REFLECTION_MEMORY=true  # default: true

# Vector Store
VECTOR_STORE_TYPE=qdrant
VECTOR_STORE_URL=your-endpoint

# Chat History
CIPHER_PG_URL=postgresql://user:pass@host:5432/db
```

</details>

### MCP-Specific Settings
<details>
<summary>MCP-specific environment variables</summary>

```bash
# MCP server mode
MCP_SERVER_MODE=aggregator  # or 'default'
AGGREGATOR_CONFLICT_RESOLUTION=prefix
AGGREGATOR_TIMEOUT=60000

# Transport settings
MCP_TRANSPORT_TYPE=stdio     # stdio, sse, or streamable-http
MCP_PORT=3000               # HTTP server port for sse/streamable-http transports
```

</details>

## Examples

### Development Setup
<details>
<summary>Examples: Development setup</summary>

```bash
# Start with in-memory storage for testing
VECTOR_STORE_TYPE=in-memory cipher

# Start API server for development
cipher --mode api --port 8080 --cors

# Test MCP integration
cipher --mode mcp

# Test MCP with SSE transport
cipher --mode mcp --mcp-transport-type sse --mcp-port 4000

# Test MCP with streamable-HTTP transport  
cipher --mode mcp --mcp-transport-type streamable-http --mcp-port 5000
```

</details>

### Production Deployment
<details>
<summary>Examples: Production deployment</summary>

```bash
# Production API server
cipher --mode api --port 3000 --host 0.0.0.0 --agent /etc/cipher/production.yml

# MCP server with custom timeout (stdio)
cipher --mode mcp --timeout 120000 --agent /etc/cipher/mcp-config.yml

# Production MCP server with SSE transport
cipher --mode mcp --mcp-transport-type sse --mcp-port 3000 --agent /etc/cipher/mcp-config.yml

# Production MCP server with streamable-HTTP transport
cipher --mode mcp --mcp-transport-type streamable-http --mcp-port 3001 --agent /etc/cipher/mcp-config.yml

# Web UI for team access
cipher --mode ui --ui-port 80 --ui-host 0.0.0.0
```

</details>

### Team Collaboration
<details>
<summary>Examples: Team collaboration</summary>

```bash
# Start workspace memory session
USE_WORKSPACE_MEMORY=true cipher --new-session team-project

# Switch between team sessions
cipher
> /session switch team-frontend
> /session switch team-backend
```

</details>

### Memory Management
<details>
<summary>Examples: Memory management</summary>

```bash
# Search specific memories
cipher "What do I know about React hooks?"

# Add structured knowledge
cipher "Remember: Next.js 13+ uses app directory structure with layout.tsx and page.tsx files"

# Memory statistics
cipher
> /memory stats
> /stats
```

</details>

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Configuration error |
| 3 | Connection error |
| 4 | Authentication error |
| 5 | Permission error |

## Troubleshooting

### Common Issues

**Command not found:**
<details>
<summary>Troubleshooting: Command not found</summary>

```bash
# Install globally
npm install -g @byterover/cipher

# Or use npx
npx @byterover/cipher --help
```

</details>

**Configuration errors:**
<details>
<summary>Troubleshooting: Configuration errors</summary>

```bash
# Check configuration
cipher --config

# Use verbose logging
DEBUG=cipher:* cipher --mode api
```

</details>

**MCP connection issues:**
<details>
<summary>Troubleshooting: MCP connection issues</summary>

```bash  
# Test MCP server with custom timeout
cipher --mode mcp --timeout 120000

# Test specific transport types
cipher --mode mcp --mcp-transport-type sse --mcp-port 3000
cipher --mode mcp --mcp-transport-type streamable-http --mcp-port 3001

# Check HTTP endpoints
# SSE (establish stream)
curl -N -H "Accept: text/event-stream" http://localhost:3000/sse
# Streamable-HTTP (client must send Accept headers)
curl -sS -X POST \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":"1","method":"ping","params":{}}' \
  http://localhost:3001/http
```

</details>

## Related Documentation

- [Configuration](./configuration.md) - Main configuration options
- [MCP Integration](./mcp-integration.md) - MCP server setup and usage  
- [Chat History](./chat-history.md) - Session storage and management
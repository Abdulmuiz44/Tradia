# Examples

Explore practical implementations and use cases with Cipher across different environments and integrations.

## Available Examples

### 1. Kimi K2 Coding Assistant
**Path:** [`examples/01-kimi-k2-coding-assistant/`](../examples/01-kimi-k2-coding-assistant/)

Integration with Kimi K2 AI coding assistant for enhanced development workflows.

**Features:**
- AI-powered code assistance with persistent memory
- Context-aware code suggestions 
- Memory integration for coding patterns

**Configuration:**
```yaml
# cipher.yml
llm:
  provider: openai
  model: gpt-4-turbo
  apiKey: $OPENAI_API_KEY

systemPrompt: 'You are a coding assistant with memory capabilities.'
```

### 2. CLI Coding Agents  
**Path:** [`examples/02-cli-coding-agents/`](../examples/02-cli-coding-agents/)

Complete setup guide for integrating Cipher with CLI-based coding agents like Claude Code.

**Features:**
- MCP integration setup
- Persistent memory across coding sessions
- Command-line interface optimization
- Memory storage and retrieval for code patterns

**Key Components:**
- MCP server configuration
- Environment variable setup
- Session management
- Memory optimization for coding workflows

### 3. Strict Memory Layer
**Path:** [`examples/03-strict-memory-layer/`](../examples/03-strict-memory-layer/)

Demonstrates strict memory management with controlled access and precise memory operations.

**Features:**
- Strict memory validation
- Controlled memory access patterns
- Error handling and validation
- Memory integrity checks

**Configuration:**
```yaml
# cipher.yml  
llm:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
  apiKey: $ANTHROPIC_API_KEY

# Strict memory settings
embedding:
  type: openai
  model: text-embedding-3-small
  apiKey: $OPENAI_API_KEY
```

### 4. MCP Aggregator Hub
**Path:** [`examples/04-mcp-aggregator-hub/`](../examples/04-mcp-aggregator-hub/)

Advanced MCP integration showcasing the aggregator mode with multiple tool exposure.

**Features:**
- MCP aggregator mode demonstration
- Multiple MCP server integration
- Tool conflict resolution
- Advanced MCP server configuration

**Key Concepts:**
- Tool prefixing and namespacing
- Conflict resolution strategies
- Multiple server coordination
- Advanced MCP client configuration

**Configuration:**
```yaml
# cipher.yml with MCP servers
mcpServers:
  filesystem:
    type: stdio
    command: npx
    args: ['-y', '@modelcontextprotocol/server-filesystem', '.']
```

### 5. Workspace Memory Team Progress
**Path:** [`examples/05-workspace-memory-team-progress/`](../examples/05-workspace-memory-team-progress/)

Team collaboration features with workspace memory for tracking project progress and team activities.

**Features:**
- Team-aware memory system
- Project progress tracking
- Collaborative context sharing
- Real-time team activity monitoring

**Configuration:**
```yaml
# cipher.yml
llm:
  provider: openai
  model: gpt-4-turbo
  apiKey: $OPENAI_API_KEY

# Workspace memory enabled
systemPrompt: 'You are a team-aware AI assistant with workspace memory.'
```

**Environment Variables:**
```bash
# .env
USE_WORKSPACE_MEMORY=true
WORKSPACE_VECTOR_STORE_COLLECTION=team_progress
DISABLE_DEFAULT_MEMORY=false
```

## Common Use Cases

### 1. Personal Coding Assistant
- Use Example #2 (CLI Coding Agents)
- Single-user memory with local storage
- Basic MCP integration

### 2. Team Development Environment
- Use Example #5 (Workspace Memory)
- Shared PostgreSQL storage
- Cloud vector store
- Team memory features

### 3. Multi-Tool Integration
- Use Example #4 (MCP Aggregator Hub)
- Multiple MCP servers
- Tool aggregation and conflict resolution

### 4. Strict Enterprise Setup
- Use Example #3 (Strict Memory Layer)
- Enhanced security and validation
- Controlled memory access

## Related Documentation

- [Configuration](./configuration.md) - Main configuration guide
- [MCP Integration](./mcp-integration.md) - MCP server setup
- [Workspace Memory](./workspace-memory.md) - Team memory features
- [CLI Reference](./cli-reference.md) - Command-line usage

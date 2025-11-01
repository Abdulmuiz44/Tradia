# Kimi K2 Coding Assistant

> 🚀 **Advanced coding companion powered by Moonshot AI's Kimi K2 model with comprehensive development tools**

## Overview

This configuration showcases Cipher as a high-performance coding assistant using Moonshot AI's Kimi K2 model via OpenRouter. 

Kimi K2 is Moonshot AI's latest model that delivers exceptional performance in coding tasks and tool calling. Learn more about Kimi K2 on [GitHub](https://github.com/MoonshotAI/Kimi-K2).

Key advantages of Kimi K2:
- **Superior Code Comprehension**: Deep understanding of programming patterns, frameworks, and best practices
- **Tool Integration**: Native optimization for seamless integration with development tools and APIs
- **Multi-language Expertise**: Strong performance across Python, JavaScript, TypeScript, Go, Rust, and more


## Prerequisites

**Required API Keys:**

1. **OpenRouter API Key** - Get from [openrouter.ai](https://openrouter.ai)
2. **Firecrawl API Key** - Get from [firecrawl.dev](https://firecrawl.dev)

## Setup

### 1. Environment Setup

Set your API keys:
```bash
export OPENROUTER_API_KEY=your_openrouter_api_key
export FIRECRAWL_API_KEY=your_firecrawl_api_key
```

### 2. Launch the Assistant

```bash
# Navigate to the example directory
cd examples/01-kimi-k2-coding-assistant

# Start Cipher with this configuration
cipher --agent ./cipher.yml
```

### 3. Test the Setup

```bash
# Test file system access
cipher> Analyze the structure of my current project

# Test web research
cipher> Research React Server Components best practices

# Test memory
cipher> Remember I prefer TypeScript with strict mode
```

## Configuration

The `cipher.yml` file includes key settings you can customize:

### LLM Model
```yaml
llm:
  provider: openrouter
  model: moonshotai/kimi-k2  # Can change to other OpenRouter models
  maxIterations: 75          # Increase for complex tasks, decrease for speed
```

### File System Access
```yaml
filesystem:
  args:
    - /Users  # Change to your workspace directory (e.g., /home/user/projects)
```

### MCP Servers
The configuration includes:
- **filesystem**: For reading/writing project files
- **firecrawl**: For web research and documentation lookup

You can add more MCP servers by extending the `mcpServers` section in `cipher.yml`.

## Usage Examples

**Code Analysis:**
```bash
cipher> Review the authentication middleware in src/middleware/auth.js
```

**Research-Driven Development:**
```bash
cipher> Research WebSocket vs Server-Sent Events for real-time notifications in React
```

**Architecture Analysis:**
```bash
cipher> Analyze my authentication system and suggest improvements
```

**Performance Optimization:**
```bash
cipher> Analyze React performance bottlenecks and suggest optimizations
```

## Troubleshooting

**Connection Issues:**
```bash
# Verify MCP servers
npx -y @modelcontextprotocol/server-filesystem --help
npx -y firecrawl-mcp --help
```

**Common Solutions:**
- Check API keys are set correctly
- Ensure sufficient credits on OpenRouter and Firecrawl
- Verify internet connectivity for npm packages

---

This setup provides a powerful coding assistant with Kimi K2's advanced reasoning, file system access, and web research capabilities.

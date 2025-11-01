# Configuration Guide

This guide covers the complete configuration options for Cipher, including agent setup, embedding configuration, and vector store settings.

## Agent Configuration (memAgent/cipher.yml)

The main configuration file for Cipher is located at `memAgent/cipher.yml`. Here's the basic structure:

```yaml
# LLM Configuration
llm:
  provider: openai # openai, anthropic, openrouter, ollama, qwen
  model: gpt-4-turbo
  apiKey: $OPENAI_API_KEY

# System Prompt
systemPrompt: 'You are a helpful AI assistant with memory capabilities.'

# MCP Servers (optional)
mcpServers:
  filesystem:
    type: stdio
    command: npx
    args: ['-y', '@modelcontextprotocol/server-filesystem', '.']
```

## Embedding Configuration

Configure embeddings in `memAgent/cipher.yml`. If not specified, uses automatic fallback based on your LLM provider. Below is the table of fallback embedding models:

### Supported Providers

| Provider         | Config              | Fallback Model                 | Fixed Dimensions           |
| ---------------- | ------------------- | ------------------------------ | -------------------------- |
| **OpenAI**       | `type: openai`      | `text-embedding-3-small`       | No                         |
| **Gemini**       | `type: gemini`      | `gemini-embedding-001`         | No                         |
| **Qwen**         | `type: qwen`        | `text-embedding-v3`            | Yes (1024, 768, 512)       |
| **Voyage**       | `type: voyage`      | `voyage-3-large`               | Yes (1024 only)            |
| **AWS Bedrock**  | `type: aws-bedrock` | `amazon.titan-embed-text-v2:0` | Yes (1024, 512, 256)       |
| **Azure OpenAI** | `type: openai`      | `text-embedding-3-small`       | No                         |
| **Ollama**       | `type: ollama`      | `nomic-embed-text`             | No                         |

### Configuration Examples

```yaml
# OpenAI
embedding:
  type: openai
  model: text-embedding-3-small
  apiKey: $OPENAI_API_KEY

# Qwen (fixed dimensions - must specify)
embedding:
  type: qwen
  model: text-embedding-v3
  apiKey: $QWEN_API_KEY
  dimensions: 1024  # Required: 1024, 768, or 512

# AWS Bedrock (fixed dimensions - must specify)
embedding:
  type: aws-bedrock
  model: amazon.titan-embed-text-v2:0
  region: $AWS_REGION
  accessKeyId: $AWS_ACCESS_KEY_ID
  secretAccessKey: $AWS_SECRET_ACCESS_KEY
  dimensions: 1024  # Required: 1024, 512, or 256

# Azure OpenAI
embedding:
  type: openai
  model: text-embedding-3-small
  apiKey: $AZURE_OPENAI_API_KEY
  baseUrl: $AZURE_OPENAI_ENDPOINT

# Voyage (fixed dimensions - always 1024)
embedding:
  type: voyage
  model: voyage-3-large
  apiKey: $VOYAGE_API_KEY
  # Note: Voyage models use fixed 1024 dimensions

# LM Studio (local, no API key required)
embedding:
  type: lmstudio
  model: nomic-embed-text-v1.5  # or bge-large, bge-base, bge-small
  baseUrl: http://localhost:1234/v1  # Optional, defaults to this
  # dimensions: 768  # Optional, auto-detected based on model

# Disable embeddings (chat-only mode)
embedding:
  disabled: true
```

**Note:** Setting `embedding: disabled: true` disables all memory-related tools (`cipher_memory_search`, `cipher_extract_and_operate_memory`, etc.) and operates in chat-only mode.

### Automatic Fallback

If no embedding config is specified, automatically uses your LLM provider's embedding:

- **Anthropic LLM** → Voyage embedding (needs `VOYAGE_API_KEY`)
- **AWS LLM** → AWS Bedrock embedding (uses same credentials)
- **Azure LLM** → Azure OpenAI embedding (uses same endpoint)
- **Qwen LLM** → Qwen embedding (uses same API key)
- **LM Studio LLM** → LM Studio embedding (tries same model first, then dedicated embedding model, finally OpenAI)
- **Ollama LLM** → Ollama embedding (uses same local server)
- **OpenAI/Gemini/Ollama** → Same provider embedding

**Note:** For providers with fixed dimensions (Qwen, Voyage, AWS), you must specify `dimensions:` in the config to override the default value in `.env`.

## Vector Store Configuration

Cipher supports three vector databases for storing embeddings. Configure in `.env`:

### Supported Vector Stores

**Qdrant** ([Qdrant Cloud](https://qdrant.tech/))

```bash
# Remote (Qdrant Cloud)
VECTOR_STORE_TYPE=qdrant
VECTOR_STORE_URL=your-qdrant-endpoint
VECTOR_STORE_API_KEY=your-qdrant-api-key

# Local (Docker)
VECTOR_STORE_TYPE=qdrant
VECTOR_STORE_HOST=localhost
VECTOR_STORE_PORT=6333
VECTOR_STORE_URL=http://localhost:6333
```

**Milvus** ([Zilliz Cloud](https://zilliz.com/))

```bash
# Remote (Zilliz Cloud)
VECTOR_STORE_TYPE=milvus
VECTOR_STORE_URL=your-milvus-cluster-endpoint
VECTOR_STORE_USERNAME=your-zilliz-username
VECTOR_STORE_PASSWORD=your-zilliz-password

# Local (Docker)
VECTOR_STORE_TYPE=milvus
VECTOR_STORE_HOST=localhost
VECTOR_STORE_PORT=19530
```

### Additional Vector Store Settings

```bash
# Collection configuration
VECTOR_STORE_COLLECTION=knowledge_memory
VECTOR_STORE_DIMENSION=1536
VECTOR_STORE_DISTANCE=Cosine

# Reflection memory (optional)
REFLECTION_VECTOR_STORE_COLLECTION=reflection_memory
DISABLE_REFLECTION_MEMORY=true  # default: true
```

## Related Documentation

- [LLM Providers](./llm-providers.md) - Detailed configuration for all supported LLM providers
- [Embedding Configuration](./embedding-configuration.md) - Advanced embedding setup
- [Vector Stores](./vector-stores.md) - Detailed vector database configurations
- [Workspace Memory](./workspace-memory.md) - Team-aware memory system configuration
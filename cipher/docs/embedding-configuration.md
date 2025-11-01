# Embedding Configuration

Cipher uses embeddings to store and retrieve information from vector databases. This guide covers all supported embedding providers and their configuration options.

## Overview

Embeddings convert text into numerical vectors that represent semantic meaning. Cipher uses these embeddings to:
- Store memories in vector databases
- Search for relevant information
- Enable semantic similarity matching

## Supported Embedding Providers

| Provider         | Config              | Fallback Model                 | Fixed Dimensions           |
| ---------------- | ------------------- | ------------------------------ | -------------------------- |
| **OpenAI**       | `type: openai`      | `text-embedding-3-small`       | No                         |
| **Gemini**       | `type: gemini`      | `gemini-embedding-001`         | No                         |
| **Qwen**         | `type: qwen`        | `text-embedding-v3`            | Yes (1024, 768, 512)       |
| **Voyage**       | `type: voyage`      | `voyage-3-large`               | Yes (1024 only)            |
| **AWS Bedrock**  | `type: aws-bedrock` | `amazon.titan-embed-text-v2:0` | Yes (1024, 512, 256)       |
| **Azure OpenAI** | `type: openai`      | `text-embedding-3-small`       | No                         |
| **Ollama**       | `type: ollama`      | `nomic-embed-text`             | No                         |
| **LM Studio**    | `type: lmstudio`    | `nomic-embed-text-v1.5`        | No                         |

## Configuration Examples

Add embedding configuration to your `memAgent/cipher.yml` file:

### OpenAI

```yaml
embedding:
  type: openai
  model: text-embedding-3-small
  apiKey: $OPENAI_API_KEY
```

**Supported Models:**
- `text-embedding-3-small` (1536 dimensions, cost-effective)
- `text-embedding-3-large` (3072 dimensions, higher quality)
- `text-embedding-ada-002` (1536 dimensions, legacy)

### Gemini

```yaml
embedding:
  type: gemini
  model: gemini-embedding-001
  apiKey: $GEMINI_API_KEY
```

**Supported Models:**
- `gemini-embedding-001` (768 dimensions)
- `text-embedding-004` (768 dimensions, latest)

### Qwen (Fixed Dimensions)

```yaml
embedding:
  type: qwen
  model: text-embedding-v3
  apiKey: $QWEN_API_KEY
  dimensions: 1024  # Required: 1024, 768, or 512
```

**Important:** Qwen requires you to specify dimensions. Supported values:
- `1024` - Highest quality
- `768` - Balanced
- `512` - Compact

### Voyage AI (Fixed Dimensions)

```yaml
embedding:
  type: voyage
  model: voyage-3-large
  apiKey: $VOYAGE_API_KEY
  # Note: Voyage models use fixed 1024 dimensions
```

**Supported Models:**
- `voyage-3-large` - Best performance
- `voyage-3-medium` - Balanced
- `voyage-3-small` - Compact

**Dimensions:** Fixed at 1024 (automatically configured)

### AWS Bedrock (Fixed Dimensions)

```yaml
embedding:
  type: aws-bedrock
  model: amazon.titan-embed-text-v2:0
  region: $AWS_REGION
  accessKeyId: $AWS_ACCESS_KEY_ID
  secretAccessKey: $AWS_SECRET_ACCESS_KEY
  dimensions: 1024  # Required: 1024, 512, or 256
```

**Supported Models:**
- `amazon.titan-embed-text-v2:0` - Latest Titan model
- `amazon.titan-embed-text-v1` - Legacy version

**Dimensions:** Must specify one of: `1024`, `512`, `256`

### Azure OpenAI

```yaml
embedding:
  type: openai
  model: text-embedding-3-small
  apiKey: $AZURE_OPENAI_API_KEY
  baseUrl: $AZURE_OPENAI_ENDPOINT
```

Use the same models as OpenAI, but with your Azure endpoint.

### Ollama (Local)

```yaml
embedding:
  type: ollama
  model: nomic-embed-text
  baseUrl: http://localhost:11434  # Optional, defaults to this
```

**Supported Models:**
- `nomic-embed-text` - Default, good quality
- `mxbai-embed-large` - High performance
- `all-minilm` - Lightweight

**Setup:**
1. Install Ollama
2. Pull embedding model: `ollama pull nomic-embed-text`
3. Model will auto-start when needed

### LM Studio (Local)

```yaml
embedding:
  type: lmstudio
  model: nomic-embed-text-v1.5  # or bge-large, bge-base, bge-small
  baseUrl: http://localhost:1234/v1  # Optional, defaults to this
  # dimensions: 768  # Optional, auto-detected based on model
```

**Supported Models:**
- `nomic-embed-text-v1.5` - Recommended
- `bge-large` - High performance
- `bge-base` - Balanced
- `bge-small` - Compact

**Smart Fallback Logic:**
1. **First try**: Uses the same model loaded for LLM as the embedding model (many models support both)
2. **Second try**: Falls back to `nomic-embed-text-v1.5` if the LLM model doesn't support embeddings
3. **Final fallback**: Uses OpenAI embeddings when available

## Automatic Fallback System

If no embedding configuration is specified, Cipher automatically selects an embedding provider based on your LLM provider:

```yaml
# Example: Only LLM configured, embedding auto-selected
llm:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
  apiKey: $ANTHROPIC_API_KEY
# No embedding config = auto-fallback to Voyage
```

## Disabling Embeddings (Chat-Only Mode)

To disable all memory functionality and run in chat-only mode:

```yaml
embedding:
  disabled: true
```

**Effect:**
- Disables all memory-related tools
- No vector database connection required
- Cipher functions as a standard chat assistant

## Environment Variables

Set the following environment variables in your `.env` file:

```bash
# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# Gemini
GEMINI_API_KEY=your-gemini-api-key

# Qwen
QWEN_API_KEY=your-qwen-api-key

# Voyage AI
VOYAGE_API_KEY=your-voyage-key

# AWS Bedrock
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Azure OpenAI
AZURE_OPENAI_API_KEY=your-azure-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
```

## Troubleshooting

### Common Issues

**Fixed Dimensions Error**
```
Error: Provider requires fixed dimensions
```
**Solution:** Add `dimensions:` field to your config for Qwen, Voyage, or AWS Bedrock.

**Embedding Model Not Found**
```
Error: Model not available
```
**Solution:** Check model name spelling and provider availability.

**API Key Issues**
```
Error: Authentication failed
```
**Solution:** Verify your API key is correct and has embedding permissions.

**Local Model Issues (Ollama/LM Studio)**
```
Error: Connection refused
```
**Solution:** Ensure the local service is running and accessible.

### Performance Tips

1. **Choose appropriate dimensions:**
   - Higher dimensions = better quality, more storage
   - Lower dimensions = faster processing, less storage

2. **Local vs Cloud:**
   - Local (Ollama/LM Studio) = No API costs, privacy
   - Cloud = Better performance, no local setup

3. **Model selection:**
   - `text-embedding-3-small` - Good balance of cost/performance
   - `voyage-3-large` - High quality for critical applications
   - `nomic-embed-text` - Excellent free local option

## Related Documentation

- [Configuration](./configuration.md) - Main configuration guide
- [LLM Providers](./llm-providers.md) - LLM configuration
- [Vector Stores](./vector-stores.md) - Vector database setup
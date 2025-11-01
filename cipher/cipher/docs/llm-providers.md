# LLM Providers

Cipher supports multiple LLM providers for flexible deployment options. Configure your preferred provider in `memAgent/cipher.yml`:

## OpenAI

```yaml
llm:
  provider: openai
  model: gpt-4-turbo
  apiKey: $OPENAI_API_KEY
```

All OpenAI models are supported. Visit [OpenAI API documentation](https://platform.openai.com/docs/models) for the complete list of available models.

## Anthropic Claude

```yaml
llm:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
  apiKey: $ANTHROPIC_API_KEY
```

All Anthropic Claude models are supported. Visit [Anthropic documentation](https://docs.anthropic.com/en/docs/about-claude/models) for the complete list of available models.

## OpenRouter

Access to 200+ models through OpenRouter's unified API:

```yaml
llm:
  provider: openrouter
  model: openai/gpt-4-turbo # Any OpenRouter model
  apiKey: $OPENROUTER_API_KEY
```

All models available through OpenRouter are supported. Visit [OpenRouter Models](https://openrouter.ai/models) for the complete list of available models and their specifications.

## Ollama (Self-Hosted, No API Key)

Run models locally with Ollama:

```yaml
llm:
  provider: ollama
  model: qwen2.5:32b # Recommended for best performance
  baseURL: $OLLAMA_BASE_URL
```

All Ollama models are supported. Visit [Ollama Models](https://ollama.com/models) to browse available models or use `ollama list` to see installed models.

**Setup:**
1. Install Ollama: `curl -fsSL https://ollama.com/install.sh | sh`
2. Pull a model: `ollama pull <model-name>`
3. Start Ollama: `ollama serve`

## LM Studio (Self-Hosted, No API Key - Now with Embedding Support!)

```yaml
llm:
  provider: lmstudio
  model: hermes-2-pro-llama-3-8b # e.g. TheBloke/Mistral-7B-Instruct-v0.2-GGUF
  # No apiKey required
  # Optionally override the baseURL if not using the default
  # baseURL: http://localhost:1234/v1

# OPTIONAL: Configure specific embedding model
# If not specified, Cipher will automatically try:
# 1. Same model as LLM (if it supports embeddings)
# 2. Default embedding model
# 3. OpenAI fallback (if OPENAI_API_KEY available)
embedding:
  provider: lmstudio
  model: your-embedding-model # Optional - smart fallback if not specified
  # baseURL: http://localhost:1234/v1
```

> **Note:** LM Studio is fully OpenAI-compatible and now supports both LLM and embedding models! By default, Cipher will connect to LM Studio at `http://localhost:1234/v1`. No API key is required.
>
> **Model Support**: All models available in LM Studio are supported, including both LLM and embedding models in GGUF format.
>
> **Smart Fallback Logic:**
>
> 1. **First try**: Uses the same model loaded for LLM as the embedding model (many models support both)
> 2. **Second try**: Falls back to a default embedding model if the LLM model doesn't support embeddings
> 3. **Final fallback**: Uses OpenAI embeddings when available

## Alibaba Cloud Qwen

```yaml
llm:
  provider: qwen
  model: qwen2.5-72b-instruct
  apiKey: $QWEN_API_KEY
  qwenOptions:
    enableThinking: true # Enable Qwen's thinking mode
    thinkingBudget: 1000 # Thinking budget for complex reasoning
```

All Qwen models available through DashScope are supported. Visit [Qwen documentation](https://help.aliyun.com/zh/dashscope/developer-reference/model-square) for the complete list.

- **Thinking Mode**: Enable deep reasoning with `enableThinking: true`
- **Thinking Budget**: Control reasoning depth with `thinkingBudget`

## AWS Bedrock (Amazon Bedrock)

```yaml
llm:
  provider: aws
  model: meta.llama3-1-70b-instruct-v1:0 # Or another Bedrock-supported model
  maxIterations: 50
  aws:
    region: $AWS_REGION
    accessKeyId: $AWS_ACCESS_KEY_ID
    secretAccessKey: $AWS_SECRET_ACCESS_KEY
    # sessionToken: $AWS_SESSION_TOKEN   # (uncomment if needed)
```

> **Required environment variables:**
>
> - `AWS_REGION`
> - `AWS_ACCESS_KEY_ID`
> - `AWS_SECRET_ACCESS_KEY`
> - `AWS_SESSION_TOKEN` (optional, for temporary credentials)

All models available on AWS Bedrock are supported. Visit [AWS Bedrock documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids.html) for the complete list of available models.

## Azure OpenAI

```yaml
llm:
  provider: azure
  model: gpt-4o-mini # Or your Azure deployment/model name
  apiKey: $AZURE_OPENAI_API_KEY
  maxIterations: 50
  azure:
    endpoint: $AZURE_OPENAI_ENDPOINT
    deploymentName: gpt-4o-mini # Optional, defaults to model name
```

> **Required environment variables:**
>
> - `AZURE_OPENAI_API_KEY`
> - `AZURE_OPENAI_ENDPOINT`

**Setup Notes:**
- Use your Azure deployment name as the model
- The `deploymentName` field is optional and defaults to the model name
- Ensure your deployment has sufficient quota

## Environment Variables

Create a `.env` file in your project root with the necessary API keys:

```bash
# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# Anthropic
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# OpenRouter
OPENROUTER_API_KEY=sk-or-your-openrouter-key

# Qwen
QWEN_API_KEY=your-qwen-api-key

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Azure
AZURE_OPENAI_API_KEY=your-azure-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com

# Ollama (optional, defaults to localhost)
OLLAMA_BASE_URL=http://localhost:11434

# Voyage (for embedding fallback)
VOYAGE_API_KEY=your-voyage-key
```

## Related Documentation

- [Configuration](./configuration.md) - Main configuration guide
- [Embedding Configuration](./embedding-configuration.md) - Embedding setup for each provider
- [Vector Stores](./vector-stores.md) - Vector database configuration
# Workspace Memory for Team Progress Tracking

> 🚀 **Smart team collaboration with automatic progress tracking and context sharing**

Workspace memory transforms Cipher into your team's shared brain, automatically tracking who's working on what, project progress, bug reports, and team context across all development activities.

## Key Benefits

- **Automatic Progress Tracking**: Captures team member activities, feature progress, and completion status
- **Intelligent Bug Monitoring**: Tracks bugs encountered, fixes implemented, and severity levels
- **Project Context Awareness**: Understands repositories, branches, and project relationships
- **Cross-Session Memory**: Maintains team knowledge across different conversations and sessions
- **Natural Language Interface**: Just talk about your work - no special formatting required

## Configuration

Use the provided `mcp.example.json` configuration. You can replace `OPENAI_API_KEY` with other supported providers:

```json
{
  "mcpServers": {
    "cipher": {
      "command": "/path/to/cipher/dist/src/app/index.cjs",
      "args": [
        "--mode", "mcp",
        "--agent", "/path/to/cipher/examples/05-workspace-memory-team-progress/cipher.yml"
      ],
      "env": {
        "MCP_SERVER_MODE": "aggregator",
        "USE_WORKSPACE_MEMORY": "true",
        "DISABLE_DEFAULT_MEMORY": "true",
        "OPENAI_API_KEY": "your_openai_api_key",
        "WORKSPACE_VECTOR_STORE_COLLECTION": "workspace_memory",
        "WORKSPACE_SEARCH_THRESHOLD": "0.4",
        "WORKSPACE_VECTOR_STORE_TYPE": "qdrant",
        "WORKSPACE_VECTOR_STORE_DIMENSION": "1536",
        "WORKSPACE_VECTOR_STORE_MAX_VECTORS": "10000",
        "WORKSPACE_VECTOR_STORE_HOST": "localhost",
        "WORKSPACE_VECTOR_STORE_PORT": "6333",
        "WORKSPACE_VECTOR_STORE_URL": "http://localhost:6333",
        "USE_ASK_CIPHER": "false"  # default: false
      }
    }
  }
}
```
Above are the main environment variables for `workspace memory` in your mcp config. For more environment variable config, you can see here [README](https://github.com/campfirein/cipher/blob/main/README.md) or [.env.example](https://github.com/campfirein/cipher/blob/main/.env.example) :

> **💡 Note:** Note that on `aggregator` mode, the llm set in [cipher.yml](https://github.com/campfirein/cipher/blob/main/examples/05-workspace-memory-team-progress/cipher.yml) is only used for `ask_cipher` tool since your agents directly call all the other tools. So if `USE_ASK_CIPHER=false` like avoe, this disables the llm usage entirely.
>
> However, the reason we still need an API key is for **the embedding model**. If you don't set the embedding model in [cipher.yml](https://github.com/campfirein/cipher/blob/main/examples/05-workspace-memory-team-progress/cipher.yml), it uses the a default embedding of the same provider as the llm. For example, if the llm is from `openai`, the default embedding is `text-embedding-3-small`.
## Tool Availability

Workspace memory provides two specialized tools for team progress tracking:

### 1. `cipher_workspace_search`
Searches team progress, member activities, and project context.

### 2. `cipher_workspace_store` 
Automatically stores team progress information in the background after conversations.


## Recommended Rules for AI Agents

For optimal workspace memory integration with Cursor, Claude Code, and other AI assistants:

```
+ When users are about to implement a new feature in the project, please use `cipher_workspace_search` to get the latest updates on the project's progress across the team.

+ When users finished a new feature or implemented it partially, ideally at the end of that generation, store the progress using `cipher_workspace_memory`. Remember to provide sufficient information for the storage payload

+ When users ask for team members' progress, provide enough context for the `cipher_workspace_search` tool, such as project name, repository, and present the results in a table format.
```
## Examples

### Progress Updates
```bash
# Input
"Alice completed the payment integration yesterday"

# Automatically extracts
- teamMember: "Alice"
- feature: "payment integration" 
- status: "completed"
```

### Bug Tracking
```bash
# Input
"Mike found a critical issue with login validation, still working on it"

# Automatically extracts
- teamMember: "Mike"
- bug: "login validation issue"
- severity: "critical"
- status: "in-progress"
```

### Team Progress Queries
```bash
# Query
"Show me what the backend team accomplished this week"

# Returns organized table with:
| Team Member | Feature/Task | Status | Completion | Notes |
|-------------|--------------|--------|------------|-------|
| Sarah       | API Gateway  | Completed | 100% | Deployed to staging |
| Mike        | Authentication | In Progress | 75% | Testing phase |
```

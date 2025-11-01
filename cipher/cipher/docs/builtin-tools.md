# Built-in Tools in Cipher

This page summarizes the built-in tools that ship with Cipher, grouped by category. It shows each tool’s purpose at a glance and how it’s typically used. Some tools are internal-only; others are agent-accessible.

Notes
- Some tools depend on embeddings. If embeddings are disabled or unavailable, those tools are skipped automatically.
- Workspace Memory tools require `USE_WORKSPACE_MEMORY=true`.
- Knowledge Graph tools require `KNOWLEDGE_GRAPH_ENABLED=true`.

## Memory Tools
- `cipher_extract_and_operate_memory`:
  - Extracts knowledge from interactions and immediately applies ADD/UPDATE/DELETE/NONE as one atomic operation. Embedding-dependent.
- `cipher_memory_search`:
  - Semantic search over stored knowledge to retrieve relevant facts/code patterns. Embedding-dependent.
- `cipher_store_reasoning_memory`:
  - Stores high-quality reasoning traces for future analysis (append-only reflection memory). Embedding-dependent.

## Reasoning (Reflection) Tools
- `cipher_extract_reasoning_steps` (internal):
  - Extracts structured reasoning steps from user input (explicit and implicit patterns).
- `cipher_evaluate_reasoning` (internal):
  - Evaluates a reasoning trace for quality and generates improvement suggestions.
- `cipher_search_reasoning_patterns` (agent-accessible):
  - Searches reflection memory for relevant reasoning patterns; supports optional query refinement.

## Workspace Memory Tools (team context)
- `cipher_workspace_search`:
  - Searches team/project workspace memory for progress, bugs, PR summaries, and collaboration context. Embedding-dependent.
- `cipher_workspace_store`:
  - Background tool capturing team and project signals into workspace memory. Embedding-dependent.

## Knowledge Graph Tools
- `cipher_add_node`, `cipher_update_node`, `cipher_delete_node`:
  - Manage entities (nodes) in the knowledge graph.
- `cipher_add_edge`:
  - Create relationships between entities.
- `cipher_search_graph`, `cipher_enhanced_search`:
  - Search the graph with basic and enhanced strategies.
- `cipher_get_neighbors`:
  - Retrieve related entities around a node.
- `cipher_extract_entities`:
  - Extract entities for graph insertion from text.
- `cipher_query_graph`:
  - Run graph queries and retrieve structured results.
- `cipher_relationship_manager`:
  - Higher-level relationship operations and maintenance.

## System Tools
- `cipher_bash` (agent-accessible):
  - Execute bash commands. Supports one-off or persistent sessions with working dir and timeout controls.

## Operational Notes
- Embedding-dependent tools are automatically excluded in chat-only mode or when embeddings are disabled.
- Workspace tools are included only when `USE_WORKSPACE_MEMORY=true` (and can disable default memory with `DISABLE_DEFAULT_MEMORY=true`).
- Knowledge Graph tools are included only when `KNOWLEDGE_GRAPH_ENABLED=true`.

For setup and environment flags, see:
- [Configuration](./configuration.md)
- [Workspace Memory](./workspace-memory.md)
- [Vector Stores](./vector-stores.md)
- [Embedding Configuration](./embedding-configuration.md)



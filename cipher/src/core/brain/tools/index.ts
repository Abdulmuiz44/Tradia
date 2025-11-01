/**
 * Internal Tools Module
 *
 * This module provides internal tools for the Cipher agent, including
 * memory management, session control, and system operations.
 *
 * @example
 * ```typescript
 * import { InternalToolManager, InternalToolRegistry } from '@core/brain/tools';
 *
 * const manager = new InternalToolManager();
 * await manager.initialize();
 *
 * // Register a tool
 * const result = manager.registerTool(myTool);
 *
 * // Execute a tool
 * const output = await manager.executeTool('cipher_my_tool', args);
 * ```
 */

// Core types
export type {
	InternalTool,
	InternalToolSet,
	InternalToolCategory,
	InternalToolHandler,
	InternalToolManagerConfig,
	InternalToolContext,
	ToolExecutionStats,
	ToolRegistrationResult,
	IInternalToolManager,
} from './types.js';

// Constants and utilities
export { INTERNAL_TOOL_PREFIX, createInternalToolName, isInternalToolName } from './types.js';

// Core classes
export { InternalToolRegistry } from './registry.js';
export { InternalToolManager } from './manager.js';
export { UnifiedToolManager } from './unified-tool-manager.js';
export type { UnifiedToolManagerConfig, CombinedToolSet } from './unified-tool-manager.js';

// Import types for use in functions
import type { InternalToolCategory, InternalToolManagerConfig } from './types.js';
import { InternalToolManager } from './manager.js';
import { InternalToolRegistry } from './registry.js';

// Version and metadata
export const INTERNAL_TOOLS_VERSION = '1.0.0';
export const SUPPORTED_CATEGORIES: InternalToolCategory[] = ['memory', 'session', 'system'];

/**
 * Create a new internal tool manager with optional configuration
 */
export function createInternalToolManager(config?: InternalToolManagerConfig): InternalToolManager {
	return new InternalToolManager(config);
}

/**
 * Get the singleton registry instance
 */
export function getInternalToolRegistry(): InternalToolRegistry {
	return InternalToolRegistry.getInstance();
}

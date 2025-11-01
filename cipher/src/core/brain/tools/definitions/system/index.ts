/**
 * System Tools Module
 *
 * Provides system-level operations including bash command execution,
 * file operations, and system information gathering.
 */

import type { InternalToolSet } from '../../types.js';
import { bashTool } from './bash.js';

/**
 * Get all system tools
 */
export function getSystemTools(): InternalToolSet {
	return {
		[bashTool.name]: bashTool,
	};
}

export { bashTool };

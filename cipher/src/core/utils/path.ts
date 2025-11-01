import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * The default path to the agent config file
 */
export const DEFAULT_CONFIG_PATH = 'memAgent/cipher.yml';

/**
 * Resolve the configuration file path.
 * - If it's absolute, return as-is.
 * - If it's the default config, resolve relative to the package installation root.
 * - Otherwise resolve relative to the current working directory.
 *
 * @param configPath - The config path to resolve
 * @returns The resolved absolute path to the config file
 */
export function resolveConfigPath(configPath: string): string {
	// If it's an absolute path, return as-is
	if (path.isAbsolute(configPath)) {
		return configPath;
	}

	// If it's the default config path, resolve relative to package installation root
	if (configPath === DEFAULT_CONFIG_PATH) {
		// Get the directory where this module is located (src/core/utils/)
		// and navigate up to the package root
		const currentFileUrl = import.meta.url;
		const currentFilePath = fileURLToPath(currentFileUrl);
		const packageRoot = path.resolve(path.dirname(currentFilePath), '../../..');
		return path.resolve(packageRoot, configPath);
	}

	// For custom relative paths, resolve relative to current working directory
	return path.resolve(process.cwd(), configPath);
}

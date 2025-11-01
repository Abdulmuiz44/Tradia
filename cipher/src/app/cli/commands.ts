import { MemAgent } from '@core/index.js';
import { commandParser } from './parser.js';

/**
 * Cipher slash command execution
 * This function integrates with the command parser to handle slash commands
 */
export async function executeCommand(
	command: string,
	args: string[],
	agent: MemAgent
): Promise<boolean> {
	return await commandParser.executeCommand(command, args, agent);
}

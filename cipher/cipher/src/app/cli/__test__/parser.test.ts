import { describe, it, expect, beforeEach } from 'vitest';
import { CommandParser } from '../parser.js';
import { MemAgent } from '@core/index.js';
import { describe as describeMeta, it as itMeta, expect as expectMeta } from 'vitest';
import { parseMetaString } from '../cli.js';

describe('CommandParser', () => {
	let parser: CommandParser;
	let mockAgent: MemAgent;

	beforeEach(() => {
		parser = new CommandParser();
		mockAgent = {} as MemAgent; // Mock agent for testing
	});

	describe('parseInput', () => {
		it('should identify slash commands correctly', () => {
			const result = parser.parseInput('/help');
			expect(result.isCommand).toBe(true);
			expect(result.command).toBe('help');
			expect(result.args).toEqual([]);
			expect(result.rawInput).toBe('/help');
		});

		it('should parse command with arguments', () => {
			const result = parser.parseInput('/memory search test query');
			expect(result.isCommand).toBe(true);
			expect(result.command).toBe('memory');
			expect(result.args).toEqual(['search', 'test', 'query']);
		});

		it('should identify regular prompts correctly', () => {
			const result = parser.parseInput('Hello, how are you?');
			expect(result.isCommand).toBe(false);
			expect(result.command).toBeUndefined();
			expect(result.args).toBeUndefined();
			expect(result.rawInput).toBe('Hello, how are you?');
		});

		it('should handle empty commands', () => {
			const result = parser.parseInput('/');
			expect(result.isCommand).toBe(true);
			expect(result.command).toBe('');
			expect(result.args).toEqual([]);
		});

		it('should filter out empty parts', () => {
			const result = parser.parseInput('/help   arg1    arg2   ');
			expect(result.isCommand).toBe(true);
			expect(result.command).toBe('help');
			expect(result.args).toEqual(['arg1', 'arg2']);
		});
	});

	describe('getCommandSuggestions', () => {
		it('should return suggestions for partial command names', () => {
			const suggestions = parser.getCommandSuggestions('he');
			expect(suggestions.some(s => s.name === 'help')).toBe(true);
		});

		it('should return suggestions for aliases', () => {
			const suggestions = parser.getCommandSuggestions('h');
			expect(suggestions.some(s => s.name === 'h')).toBe(true);
		});

		it('should return empty array for non-matching partial', () => {
			const suggestions = parser.getCommandSuggestions('xyz');
			expect(suggestions).toEqual([]);
		});

		it('should sort suggestions alphabetically', () => {
			const suggestions = parser.getCommandSuggestions('');
			const names = suggestions.map(s => s.name);
			const sortedNames = [...names].sort();
			expect(names).toEqual(sortedNames);
		});
	});

	describe('hasCommand', () => {
		it('should return true for existing commands', () => {
			expect(parser.hasCommand('help')).toBe(true);
			expect(parser.hasCommand('clear')).toBe(true);
		});

		it('should return true for aliases', () => {
			expect(parser.hasCommand('h')).toBe(true);
			expect(parser.hasCommand('?')).toBe(true);
		});

		it('should return false for non-existing commands', () => {
			expect(parser.hasCommand('nonexistent')).toBe(false);
		});
	});

	describe('registerCommand', () => {
		it('should register new commands', () => {
			const testCommand = {
				name: 'test',
				description: 'Test command',
				handler: async () => true,
			};

			parser.registerCommand(testCommand);
			expect(parser.hasCommand('test')).toBe(true);
		});

		it('should register command aliases', () => {
			const testCommand = {
				name: 'test',
				description: 'Test command',
				aliases: ['t', 'testing'],
				handler: async () => true,
			};

			parser.registerCommand(testCommand);
			expect(parser.hasCommand('test')).toBe(true);
			expect(parser.hasCommand('t')).toBe(true);
			expect(parser.hasCommand('testing')).toBe(true);
		});
	});

	describe('formatCommandHelp', () => {
		it('should format basic help correctly', () => {
			const help = parser.formatCommandHelp('help', false);
			expect(help).toContain('/help');
			expect(help).toContain('Show help information');
		});

		it('should format detailed help correctly', () => {
			const help = parser.formatCommandHelp('help', true);
			expect(help).toContain('/help');
			expect(help).toContain('Usage:');
			expect(help).toContain('Aliases:');
		});

		it('should handle non-existent commands', () => {
			const help = parser.formatCommandHelp('nonexistent');
			expect(help).toContain('Command not found');
		});
	});

	describe('command execution', () => {
		it('should execute help command successfully', async () => {
			const result = await parser.executeCommand('help', [], mockAgent);
			expect(result).toBe(true);
		});

		it('should handle unknown commands', async () => {
			const result = await parser.executeCommand('unknown', [], mockAgent);
			expect(result).toBe(false);
		});

		it('should resolve aliases correctly', async () => {
			const result = await parser.executeCommand('h', [], mockAgent);
			expect(result).toBe(true);
		});
	});

	describe('built-in commands', () => {
		it('should have core commands registered', () => {
			const expectedCommands = ['help', 'clear', 'config', 'stats', 'tools', 'prompt', 'exit'];

			for (const cmd of expectedCommands) {
				expect(parser.hasCommand(cmd)).toBe(true);
			}
		});

		it('should have help command aliases', () => {
			expect(parser.hasCommand('h')).toBe(true);
			expect(parser.hasCommand('?')).toBe(true);
		});

		it('should have exit command aliases', () => {
			expect(parser.hasCommand('quit')).toBe(true);
			expect(parser.hasCommand('q')).toBe(true);
		});

		it('should have clear command aliases', () => {
			expect(parser.hasCommand('reset')).toBe(true);
		});
	});
});

describeMeta('parseMetaString', () => {
	itMeta('parses single key-value pair', () => {
		const result = parseMetaString('foo=bar');
		expectMeta(result).toEqual({ foo: 'bar' });
	});

	itMeta('parses multiple key-value pairs', () => {
		const result = parseMetaString('foo=bar,baz=qux');
		expectMeta(result).toEqual({ foo: 'bar', baz: 'qux' });
	});

	itMeta('trims spaces around keys and values', () => {
		const result = parseMetaString(' foo = bar , baz = qux ');
		expectMeta(result).toEqual({ foo: 'bar', baz: 'qux' });
	});

	itMeta('returns empty object for empty string', () => {
		const result = parseMetaString('');
		expectMeta(result).toEqual({});
	});

	itMeta('throws error for missing value', () => {
		expectMeta(() => parseMetaString('foo=')).toThrow();
	});

	itMeta('throws error for missing key', () => {
		expectMeta(() => parseMetaString('=bar')).toThrow();
	});

	itMeta('throws error for missing =', () => {
		expectMeta(() => parseMetaString('foobar')).toThrow();
	});
});

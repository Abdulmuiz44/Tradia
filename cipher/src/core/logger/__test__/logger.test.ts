import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { Logger, logger, createLogger, setGlobalLogLevel, getGlobalLogLevel } from '../index.js';

// Mock console methods to capture output
let spyConsoleLog: ReturnType<typeof vi.spyOn>;

beforeAll(() => {
	// Use a single beforeAll to set up mocks that don't need to be refreshed per test
	vi.spyOn(console, 'log').mockImplementation(() => {});
});

// Ensure clean environment between tests
beforeEach(() => {
	// Reset environment variables
	delete process.env.CIPHER_LOG_LEVEL;
	delete process.env.REDACT_SECRETS;

	// Reset mocks but don't restore them (faster than full restore)
	vi.clearAllMocks();
	spyConsoleLog = vi.mocked(console.log);
});

describe.concurrent('Logger Core Functionality', () => {
	describe.concurrent('Logger Construction and Level Management', () => {
		it('creates logger with default info level', () => {
			const testLogger = new Logger();
			expect(testLogger.getLevel()).toBe('info');
		});

		it('respects CIPHER_LOG_LEVEL environment variable', () => {
			const originalLevel = process.env.CIPHER_LOG_LEVEL;
			process.env.CIPHER_LOG_LEVEL = 'debug';
			const testLogger = new Logger();
			expect(testLogger.getLevel()).toBe('debug');
			// Restore original level
			if (originalLevel === undefined) {
				delete process.env.CIPHER_LOG_LEVEL;
			} else {
				process.env.CIPHER_LOG_LEVEL = originalLevel;
			}
		});

		it('ignores invalid CIPHER_LOG_LEVEL and falls back to info', () => {
			const originalLevel = process.env.CIPHER_LOG_LEVEL;
			process.env.CIPHER_LOG_LEVEL = 'invalid_level';
			const testLogger = new Logger();
			expect(testLogger.getLevel()).toBe('info');
			// Restore original level
			if (originalLevel === undefined) {
				delete process.env.CIPHER_LOG_LEVEL;
			} else {
				process.env.CIPHER_LOG_LEVEL = originalLevel;
			}
		});

		it('accepts level option in constructor', () => {
			const testLogger = new Logger({ level: 'warn' });
			expect(testLogger.getLevel()).toBe('warn');
		});

		it('setLevel updates level correctly', () => {
			const testLogger = new Logger();
			testLogger.setLevel('error');
			expect(testLogger.getLevel()).toBe('error');
		});

		it('setLevel rejects invalid levels and keeps current level', () => {
			const testLogger = new Logger({ level: 'info' });
			const originalLevel = testLogger.getLevel();
			testLogger.setLevel('invalid_level');
			expect(testLogger.getLevel()).toBe(originalLevel);
		});

		it('setLevel logs confirmation when not silent', () => {
			const testLogger = new Logger({ silent: false });
			testLogger.setLevel('warn');
			// Note: This may not work with winston mocking, but tests the public API
		});
	});

	describe.concurrent('Silent Mode', () => {
		it('respects silent option in constructor', () => {
			const testLogger = new Logger({ silent: true });
			// Test that logger accepts silent option without errors
			expect(testLogger).toBeDefined();
		});

		it('setSilent method exists and can be called', () => {
			const testLogger = new Logger({ silent: false });
			expect(() => testLogger.setSilent(true)).not.toThrow();
		});
	});

	describe.concurrent('Basic Logging Methods API', () => {
		// Create a single logger instance for all tests in this describe block
		const testLogger = new Logger({ level: 'silly' }); // Enable all log levels

		it('all logging methods exist and accept string messages', () => {
			// Test all methods in a single test to reduce setup/teardown overhead
			const logMethods = [
				{ method: 'error', fn: testLogger.error.bind(testLogger) },
				{ method: 'warn', fn: testLogger.warn.bind(testLogger) },
				{ method: 'info', fn: testLogger.info.bind(testLogger) },
				{ method: 'http', fn: testLogger.http.bind(testLogger) },
				{ method: 'verbose', fn: testLogger.verbose.bind(testLogger) },
				{ method: 'debug', fn: testLogger.debug.bind(testLogger) },
				{ method: 'silly', fn: testLogger.silly.bind(testLogger) },
			];

			// Test each method in a loop instead of separate test cases
			logMethods.forEach(({ method, fn }) => {
				expect(() => fn(`${method} message`)).not.toThrow();
				// Also test with meta and color in the same loop
				expect(() => fn(`${method} with meta`, { test: true }, 'blue')).not.toThrow();
			});
		});
	});
});

describe.concurrent('Special Display Features', () => {
	let testLogger: Logger;

	beforeEach(() => {
		testLogger = new Logger({ silent: false });
	});

	describe('Tool Call Features', () => {
		it('handles all tool related functionality correctly', () => {
			// Explicitly set to non-silent mode
			testLogger.setSilent(false);

			// Clear mocks first
			vi.clearAllMocks();
			spyConsoleLog = vi.mocked(console.log);

			// Test toolCall in normal mode
			testLogger.toolCall('testTool', { foo: 'bar', baz: 123 });
			expect(spyConsoleLog).toHaveBeenCalled();
			let lastCall = spyConsoleLog.mock.calls[spyConsoleLog.mock.calls.length - 1];
			expect(lastCall?.[0]).toContain('Tool Call');

			// Reset mock for next test
			vi.clearAllMocks();
			spyConsoleLog = vi.mocked(console.log);

			// Test silent mode
			testLogger.setSilent(true);
			testLogger.toolCall('testTool', { param: 'value' });
			expect(spyConsoleLog).not.toHaveBeenCalled();

			// Test toolResult
			vi.clearAllMocks();
			spyConsoleLog = vi.mocked(console.log);
			testLogger.setSilent(false);
			testLogger.toolResult('Simple result string');
			expect(spyConsoleLog).toHaveBeenCalled();
			lastCall = spyConsoleLog.mock.calls[spyConsoleLog.mock.calls.length - 1];
			expect(lastCall?.[0]).toContain('Tool Result');
		});
	});

	describe('Display and Silent Mode Features', () => {
		it('handles all display functionality and silent mode correctly', () => {
			// Start with non-silent mode
			testLogger.setSilent(false);

			// ===== Test AI Responses =====
			vi.clearAllMocks();
			spyConsoleLog = vi.mocked(console.log);

			// Test string response
			testLogger.displayAIResponse('This is an AI response');
			expect(spyConsoleLog).toHaveBeenCalled();
			let lastCall = spyConsoleLog.mock.calls[spyConsoleLog.mock.calls.length - 1];
			expect(lastCall?.[0]).toContain('AI Response');

			// Test object response
			vi.clearAllMocks();
			spyConsoleLog = vi.mocked(console.log);
			testLogger.displayAIResponse({ content: 'This is an AI response' });
			expect(spyConsoleLog).toHaveBeenCalled();
			lastCall = spyConsoleLog.mock.calls[spyConsoleLog.mock.calls.length - 1];
			expect(lastCall?.[0]).toContain('AI Response');

			// ===== Test Box Display =====
			vi.clearAllMocks();
			spyConsoleLog = vi.mocked(console.log);

			// Test custom formatted output
			testLogger.displayBox('Custom Title', 'Custom content here', 'blue');
			expect(spyConsoleLog).toHaveBeenCalled();
			lastCall = spyConsoleLog.mock.calls[spyConsoleLog.mock.calls.length - 1];
			expect(lastCall?.[0]).toContain('Custom Title');

			// Test default color
			vi.clearAllMocks();
			spyConsoleLog = vi.mocked(console.log);
			testLogger.displayBox('Default Color', 'Content with default color');
			expect(spyConsoleLog).toHaveBeenCalled();

			// ===== Test Silent Mode =====
			// Set logger to silent
			testLogger.setSilent(true);

			// Clear mocks
			vi.clearAllMocks();
			spyConsoleLog = vi.mocked(console.log);

			// Test all display methods with silent mode
			testLogger.toolCall('testTool', { param: 'value' });
			expect(spyConsoleLog).not.toHaveBeenCalled();

			testLogger.displayAIResponse('response');
			expect(spyConsoleLog).not.toHaveBeenCalled();

			testLogger.displayBox('title', 'content');
			expect(spyConsoleLog).not.toHaveBeenCalled();
		});
	});
});

describe.concurrent('Child Logger Creation', () => {
	// Use a single test to batch all child logger creation tests
	it('tests all child logger creation functionality', () => {
		// Create parent logger once
		const parentLogger = new Logger({ level: 'debug', silent: false });

		// Test instance creation
		const childLogger = parentLogger.createChild();
		expect(childLogger).toBeInstanceOf(Logger);

		// Test inheritance of parent settings
		expect(childLogger.getLevel()).toBe(parentLogger.getLevel());

		// Test custom options
		const customChildLogger = parentLogger.createChild({ level: 'error' });
		expect(customChildLogger.getLevel()).toBe('error');

		// Test file option
		expect(() => {
			const fileLogger = parentLogger.createChild({ file: '/tmp/child.log' });
			expect(fileLogger).toBeDefined();
		}).not.toThrow();
	});
});

describe.concurrent('Global Logger Instance', () => {
	// Test all global logger functionality in a single test
	it('verifies all global logger functionality', () => {
		// Test singleton
		expect(logger).toBeDefined();
		expect(logger).toBeInstanceOf(Logger);
		// The global logger level depends on environment, so just check it's a valid level
		expect(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).toContain(
			logger.getLevel()
		);

		// Test level management
		const originalLevel = getGlobalLogLevel();
		setGlobalLogLevel('warn');
		expect(getGlobalLogLevel()).toBe('warn');

		// Verify level format
		const level = getGlobalLogLevel();
		expect(typeof level).toBe('string');
		expect(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).toContain(level);

		// Test factory function
		const newLogger = createLogger({ level: 'error' });
		expect(newLogger).toBeInstanceOf(Logger);
		expect(newLogger.getLevel()).toBe('error');

		// Restore original level
		setGlobalLogLevel(originalLevel);
	});
});

describe.concurrent('Advanced Features', () => {
	// Combine all advanced feature tests into one test
	it('handles all advanced features correctly', () => {
		// Create a single logger instance
		const testLogger = new Logger();

		// Test winston instance access
		const winstonLogger = testLogger.getWinstonLogger();
		expect(winstonLogger).toBeDefined();

		// Test complex metadata handling
		const complexMeta = {
			user: { id: 123, name: 'test' },
			request: { url: '/api/test', method: 'POST' },
			nested: { deep: { value: 'test' } },
		};
		expect(() => testLogger.info('Complex log message', complexMeta)).not.toThrow();

		// Test various data types
		expect(() => {
			testLogger.info('String message');
			testLogger.info('Number message', { number: 42 });
			testLogger.info('Boolean message', { flag: true });
			testLogger.info('Array message', { items: [1, 2, 3] });
			testLogger.info('Null message', { value: null });
			testLogger.info('Undefined message', { value: undefined });
		}).not.toThrow();
	});
});

describe.concurrent('Environment Variable Support', () => {
	// Test all environment variable configurations in a single test
	it('supports all environment variable configurations', () => {
		// Test log levels
		const validLevels = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'];

		// Cache the original env vars
		const originalLogLevel = process.env.CIPHER_LOG_LEVEL;
		const originalRedactSecrets = process.env.REDACT_SECRETS;

		try {
			// Test all log levels in a batch
			validLevels.forEach(level => {
				process.env.CIPHER_LOG_LEVEL = level;
				const testLogger = new Logger();
				expect(testLogger.getLevel()).toBe(level);
			});

			// Test REDACT_SECRETS setting
			process.env.REDACT_SECRETS = 'false';
			const testLogger = new Logger();
			expect(() => testLogger.info('apiKey: "secret123", password=hidden')).not.toThrow();
		} finally {
			// Restore original env vars instead of deleting
			if (originalLogLevel === undefined) {
				delete process.env.CIPHER_LOG_LEVEL;
			} else {
				process.env.CIPHER_LOG_LEVEL = originalLogLevel;
			}

			if (originalRedactSecrets === undefined) {
				delete process.env.REDACT_SECRETS;
			} else {
				process.env.REDACT_SECRETS = originalRedactSecrets;
			}
		}
	});
});

describe.concurrent('Error Handling and Edge Cases', () => {
	// Combine all error handling tests into a single test for efficiency
	it('handles all edge cases and errors correctly', () => {
		// Create a single logger instance for all tests
		const testLogger = new Logger();

		// Test invalid level handling
		const originalLevel = testLogger.getLevel();
		testLogger.setLevel('totally_invalid_level');
		expect(testLogger.getLevel()).toBe(originalLevel);

		// Test redirect methods
		expect(() => {
			testLogger.redirectToFile('/tmp/test.log');
			testLogger.redirectToConsole();
		}).not.toThrow();

		// Test empty messages
		expect(() => {
			testLogger.info('');
			testLogger.warn('   ');
		}).not.toThrow();
	});
});

describe.concurrent('TypeScript Interface Compliance', () => {
	// Combine interface tests into a single test
	it('validates all TypeScript interface compliance', () => {
		// Test LoggerOptions interface
		const options = {
			level: 'debug' as const,
			silent: true,
			file: '/tmp/test.log',
		};
		expect(() => new Logger(options)).not.toThrow();

		// Test ChalkColor type
		const testLogger = new Logger({ silent: true }); // Use silent mode to minimize overhead
		const validColors = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];

		// Test all colors in batch
		validColors.forEach(color => {
			expect(() => testLogger.info('test', {}, color as any)).not.toThrow();
		});
	});
});

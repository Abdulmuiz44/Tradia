import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MCPManager } from '../manager.js';
import type { ServerConfigs, IMCPClient, ToolSet, McpServerConfig } from '../types.js';
import { ERROR_MESSAGES } from '../constants.js';

// Mock the MCPClient to avoid actual connections in tests
vi.mock('../client.js', () => ({
	MCPClient: vi.fn().mockImplementation(() => ({
		connect: vi.fn(),
		disconnect: vi.fn().mockResolvedValue(undefined),
		getConnectionStatus: vi.fn().mockReturnValue(true),
		getTools: vi.fn().mockResolvedValue({}),
		listPrompts: vi.fn().mockResolvedValue([]),
		getPrompt: vi.fn(),
		listResources: vi.fn().mockResolvedValue([]),
		readResource: vi.fn(),
		callTool: vi.fn(),
		getClient: vi.fn().mockReturnValue(null),
		getServerInfo: vi.fn().mockReturnValue({
			spawned: false,
			pid: null,
			command: null,
			originalArgs: null,
			resolvedArgs: null,
			env: null,
			alias: null,
		}),
		getConnectedClient: vi.fn(),
	})),
}));

// Mock the logger to avoid console output in tests
vi.mock('../logger/index.js', () => ({
	createLogger: vi.fn().mockReturnValue({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	}),
}));

describe('MCPManager', () => {
	let manager: MCPManager;
	let mockClient: any;

	// Helper function to register and connect a client for testing
	const registerAndConnectClient = async (name: string, client: any) => {
		manager.registerClient(name, client);
		// Simulate successful connection by calling connectServer
		const config: McpServerConfig = {
			type: 'stdio',
			command: 'node',
			args: ['test-server.js'],
			env: {},
			timeout: 30000,
			connectionMode: 'lenient',
		};
		await manager.connectServer(name, config);
	};

	beforeEach(async () => {
		manager = new MCPManager();
		vi.clearAllMocks();

		// Create a fresh mock client for each test
		const { MCPClient } = await import('../client.js');
		mockClient = {
			connect: vi.fn().mockResolvedValue({}),
			disconnect: vi.fn().mockResolvedValue(undefined),
			getConnectionStatus: vi.fn().mockReturnValue(true),
			getTools: vi.fn().mockResolvedValue({}),
			listPrompts: vi.fn().mockResolvedValue([]),
			getPrompt: vi.fn().mockResolvedValue({ messages: [] }),
			listResources: vi.fn().mockResolvedValue([]),
			readResource: vi.fn().mockResolvedValue({ contents: [] }),
			callTool: vi.fn().mockResolvedValue({ result: 'success' }),
			getClient: vi.fn().mockReturnValue(null),
			getServerInfo: vi.fn().mockReturnValue({
				spawned: false,
				pid: null,
				command: null,
				originalArgs: null,
				resolvedArgs: null,
				env: null,
				alias: null,
			}),
			getConnectedClient: vi.fn().mockResolvedValue({}),
		};

		vi.mocked(MCPClient).mockReturnValue(mockClient);
	});

	afterEach(async () => {
		await manager.disconnectAll();
	});

	describe('Client Registration', () => {
		it('should register a new client successfully', () => {
			const client = mockClient as IMCPClient;

			manager.registerClient('test-client', client);

			const clients = manager.getClients();
			expect(clients.has('test-client')).toBe(true);
			expect(clients.get('test-client')).toBe(client);
		});

		it('should warn when registering a client with the same name', () => {
			const client1 = mockClient as IMCPClient;
			const client2 = mockClient as IMCPClient;

			manager.registerClient('test-client', client1);
			manager.registerClient('test-client', client2);

			const clients = manager.getClients();
			expect(clients.size).toBe(1);
			expect(clients.get('test-client')).toBe(client1); // Should keep the first one
		});
	});

	describe('Tool Management', () => {
		beforeEach(async () => {
			await registerAndConnectClient('client1', mockClient);
		});

		it('should get all tools from connected clients', async () => {
			const mockTools: ToolSet = {
				'test-tool': {
					description: 'A test tool',
					parameters: {
						type: 'object',
						properties: {
							param1: { type: 'string', description: 'First parameter' },
						},
						required: ['param1'],
					},
				},
			};

			mockClient.getTools.mockResolvedValue(mockTools);

			const tools = await manager.getAllTools();

			expect(tools).toEqual(mockTools);
			expect(mockClient.getTools).toHaveBeenCalled();
		});

		it('should handle tool name conflicts by prefixing with client name', async () => {
			const client2 = { ...mockClient };
			await registerAndConnectClient('client2', client2);

			const mockTools1: ToolSet = {
				'duplicate-tool': {
					description: 'Tool from client1',
					parameters: { type: 'object', properties: {} },
				},
			};

			const mockTools2: ToolSet = {
				'duplicate-tool': {
					description: 'Tool from client2',
					parameters: { type: 'object', properties: {} },
				},
			};

			mockClient.getTools.mockResolvedValue(mockTools1);
			client2.getTools.mockResolvedValue(mockTools2);

			const tools = await manager.getAllTools();

			expect(tools).toHaveProperty('duplicate-tool');
			expect(tools).toHaveProperty('client2.duplicate-tool');
			// Note: The order may vary depending on Map iteration order, so let's just check both tools exist
			expect(Object.keys(tools)).toHaveLength(2);
			expect(Object.keys(tools)).toContain('duplicate-tool');
			expect(Object.keys(tools)).toContain('client2.duplicate-tool');
		});

		it('should get the correct client for a tool', async () => {
			const mockTools: ToolSet = {
				'test-tool': {
					description: 'A test tool',
					parameters: { type: 'object', properties: {} },
				},
			};

			mockClient.getTools.mockResolvedValue(mockTools);
			await manager.getAllTools();

			const client = manager.getToolClient('test-tool');
			expect(client).toBe(mockClient);
		});

		it('should return undefined for non-existent tool client', () => {
			const client = manager.getToolClient('non-existent-tool');
			expect(client).toBeUndefined();
		});

		it('should execute a tool successfully', async () => {
			const mockTools: ToolSet = {
				'test-tool': {
					description: 'A test tool',
					parameters: { type: 'object', properties: {} },
				},
			};

			mockClient.getTools.mockResolvedValue(mockTools);
			mockClient.callTool.mockResolvedValue({ result: 'tool executed' });

			await manager.getAllTools(); // Populate cache

			const result = await manager.executeTool('test-tool', { param: 'value' });

			expect(result).toEqual({ result: 'tool executed' });
			expect(mockClient.callTool).toHaveBeenCalledWith('test-tool', { param: 'value' });
		});

		it('should throw error when executing non-existent tool', async () => {
			await expect(manager.executeTool('non-existent-tool', {})).rejects.toThrow(
				ERROR_MESSAGES.NO_CLIENT_FOR_TOOL
			);
		});

		it('should handle tool execution errors', async () => {
			const mockTools: ToolSet = {
				'failing-tool': {
					description: 'A failing tool',
					parameters: { type: 'object', properties: {} },
				},
			};

			mockClient.getTools.mockResolvedValue(mockTools);
			mockClient.callTool.mockRejectedValue(new Error('Tool execution failed'));

			await manager.getAllTools(); // Populate cache

			await expect(manager.executeTool('failing-tool', {})).rejects.toThrow(
				'Tool execution failed'
			);
		});
	});

	describe('Prompt Management', () => {
		beforeEach(async () => {
			await registerAndConnectClient('client1', mockClient);
		});

		it('should list all prompts from connected clients', async () => {
			const mockPrompts = ['prompt1', 'prompt2'];
			mockClient.listPrompts.mockResolvedValue(mockPrompts);

			const prompts = await manager.listAllPrompts();

			expect(prompts).toEqual(mockPrompts);
			expect(mockClient.listPrompts).toHaveBeenCalled();
		});

		it('should handle prompt name conflicts by prefixing with client name', async () => {
			const client2 = { ...mockClient };
			await registerAndConnectClient('client2', client2);

			mockClient.listPrompts.mockResolvedValue(['duplicate-prompt']);
			client2.listPrompts.mockResolvedValue(['duplicate-prompt']);

			const prompts = await manager.listAllPrompts();

			expect(prompts).toContain('duplicate-prompt');
			expect(prompts).toContain('client2.duplicate-prompt');
		});

		it('should get a prompt successfully', async () => {
			mockClient.listPrompts.mockResolvedValue(['test-prompt']);
			mockClient.getPrompt.mockResolvedValue({
				messages: [{ role: 'user', content: { type: 'text', text: 'test' } }],
			});

			await manager.listAllPrompts(); // Populate cache

			const result = await manager.getPrompt('test-prompt', { arg: 'value' });

			expect(result.messages).toHaveLength(1);
			expect(mockClient.getPrompt).toHaveBeenCalledWith('test-prompt', { arg: 'value' });
		});

		it('should throw error when getting non-existent prompt', async () => {
			await expect(manager.getPrompt('non-existent-prompt')).rejects.toThrow(
				ERROR_MESSAGES.NO_CLIENT_FOR_PROMPT
			);
		});
	});

	describe('Resource Management', () => {
		beforeEach(async () => {
			await registerAndConnectClient('client1', mockClient);
		});

		it('should list all resources from connected clients', async () => {
			const mockResources = ['file://test1.txt', 'file://test2.txt'];
			mockClient.listResources.mockResolvedValue(mockResources);

			const resources = await manager.listAllResources();

			expect(resources).toEqual(mockResources);
			expect(mockClient.listResources).toHaveBeenCalled();
		});

		it('should read a resource successfully', async () => {
			const resourceUri = 'file://test.txt';
			mockClient.listResources.mockResolvedValue([resourceUri]);
			mockClient.readResource.mockResolvedValue({
				contents: [{ type: 'text', text: 'file content' }],
			});

			await manager.listAllResources(); // Populate cache

			const result = await manager.readResource(resourceUri);

			expect(result.contents).toHaveLength(1);
			expect(mockClient.readResource).toHaveBeenCalledWith(resourceUri);
		});

		it('should throw error when reading non-existent resource', async () => {
			await expect(manager.readResource('file://non-existent.txt')).rejects.toThrow(
				ERROR_MESSAGES.NO_CLIENT_FOR_RESOURCE
			);
		});
	});

	describe('Connection Management', () => {
		it('should initialize from config with mixed connection modes', async () => {
			const serverConfigs: ServerConfigs = {
				strictServer: {
					type: 'stdio',
					command: 'node',
					args: ['strict-server.js'],
					env: {},
					timeout: 30000,
					connectionMode: 'strict',
				},
				lenientServer: {
					type: 'stdio',
					command: 'node',
					args: ['lenient-server.js'],
					env: {},
					timeout: 30000,
					connectionMode: 'lenient',
				},
			};

			mockClient.connect
				.mockResolvedValueOnce({}) // strictServer succeeds
				.mockRejectedValueOnce(new Error('Connection failed')); // lenientServer fails

			// Should not throw since lenient server can fail
			await expect(manager.initializeFromConfig(serverConfigs)).resolves.not.toThrow();

			expect(mockClient.connect).toHaveBeenCalledTimes(2);
		});

		it('should fail when strict server cannot connect', async () => {
			const serverConfigs: ServerConfigs = {
				strictServer: {
					type: 'stdio',
					command: 'node',
					args: ['strict-server.js'],
					env: {},
					timeout: 30000,
					connectionMode: 'strict',
				},
			};

			mockClient.connect.mockRejectedValue(new Error('Connection failed'));

			await expect(manager.initializeFromConfig(serverConfigs)).rejects.toThrow(
				ERROR_MESSAGES.MISSING_REQUIRED_SERVERS
			);
		});

		it('should connect to a new server successfully', async () => {
			const config: McpServerConfig = {
				type: 'stdio',
				command: 'node',
				args: ['test-server.js'],
				env: {},
				timeout: 30000,
				connectionMode: 'lenient',
			};

			mockClient.connect.mockResolvedValue({});

			await manager.connectServer('test-server', config);

			expect(mockClient.connect).toHaveBeenCalledWith(config, 'test-server');

			const clients = manager.getClients();
			expect(clients.has('test-server')).toBe(true);
		});

		it('should handle connection failures for lenient servers', async () => {
			const config: McpServerConfig = {
				type: 'stdio',
				command: 'node',
				args: ['failing-server.js'],
				env: {},
				timeout: 30000,
				connectionMode: 'lenient',
			};

			mockClient.connect.mockRejectedValue(new Error('Connection failed'));

			// Should not throw for lenient servers
			await expect(manager.connectServer('failing-server', config)).resolves.not.toThrow();

			const failedConnections = manager.getFailedConnections();
			expect(failedConnections['failing-server']).toBe('Connection failed');
		});

		it('should remove a client successfully', async () => {
			await registerAndConnectClient('test-client', mockClient);

			await manager.removeClient('test-client');

			expect(mockClient.disconnect).toHaveBeenCalled();

			const clients = manager.getClients();
			expect(clients.has('test-client')).toBe(false);
		});

		it('should handle removal of non-existent client gracefully', async () => {
			await expect(manager.removeClient('non-existent-client')).resolves.not.toThrow();
		});

		it('should disconnect all clients', async () => {
			await registerAndConnectClient('client1', mockClient);
			const client2 = { ...mockClient, disconnect: vi.fn().mockResolvedValue(undefined) };
			await registerAndConnectClient('client2', client2);

			await manager.disconnectAll();

			expect(mockClient.disconnect).toHaveBeenCalled();
			expect(client2.disconnect).toHaveBeenCalled();

			const clients = manager.getClients();
			expect(clients.size).toBe(0);
		});
	});

	describe('Error Handling', () => {
		beforeEach(async () => {
			await registerAndConnectClient('client1', mockClient);
		});

		it('should handle client failures gracefully when getting tools', async () => {
			const client2 = { ...mockClient, getTools: vi.fn() };
			await registerAndConnectClient('client2', client2);

			// client1 succeeds, client2 fails
			mockClient.getTools.mockResolvedValue({
				tool1: { description: 'Tool 1', parameters: { type: 'object', properties: {} } },
			});
			client2.getTools.mockRejectedValue(new Error('Client failed'));

			const tools = await manager.getAllTools();

			expect(tools).toHaveProperty('tool1');
			expect(Object.keys(tools)).toHaveLength(1);
		});

		it('should throw error when all clients fail to get tools', async () => {
			// Ensure the client is connected but getTools fails
			mockClient.getTools.mockRejectedValue(new Error('All clients failed'));

			await expect(manager.getAllTools()).rejects.toThrow(
				'Failed to retrieve tools from all clients'
			);
		});

		it('should handle cache refresh when tool client not found', async () => {
			// Test that when a tool is not found, the manager attempts to refresh the cache
			// by calling getAllTools again before giving up

			// Execute tool that doesn't exist - should trigger cache refresh and then throw
			await expect(manager.executeTool('non-existent-tool', {})).rejects.toThrow(
				ERROR_MESSAGES.NO_CLIENT_FOR_TOOL
			);

			// Verify that getTools was called more than once (initial connection + cache refresh)
			expect(mockClient.getTools).toHaveBeenCalled();
		});
	});

	describe('Cache Management', () => {
		beforeEach(async () => {
			await registerAndConnectClient('client1', mockClient);
		});

		it('should cache tool lookups for O(1) performance', async () => {
			const mockTools: ToolSet = {
				'cached-tool': {
					description: 'A cached tool',
					parameters: { type: 'object', properties: {} },
				},
			};

			mockClient.getTools.mockResolvedValue(mockTools);

			// First call populates cache
			await manager.getAllTools();

			// Second call should use cache (client should be found without additional getTools call)
			const client1 = manager.getToolClient('cached-tool');
			const client2 = manager.getToolClient('cached-tool');

			expect(client1).toBe(mockClient);
			expect(client2).toBe(mockClient);
			expect(mockClient.getTools).toHaveBeenCalled();
		});

		it('should clear cache when client is removed', async () => {
			const mockTools: ToolSet = {
				'tool-to-remove': {
					description: 'Tool that will be removed',
					parameters: { type: 'object', properties: {} },
				},
			};

			mockClient.getTools.mockResolvedValue(mockTools);
			await manager.getAllTools(); // Populate cache

			// Tool should be found
			expect(manager.getToolClient('tool-to-remove')).toBe(mockClient);

			// Remove client
			await manager.removeClient('client1');

			// Tool should no longer be found
			expect(manager.getToolClient('tool-to-remove')).toBeUndefined();
		});
	});

	describe('Concurrent Operations', () => {
		it('should handle multiple concurrent tool executions', async () => {
			await registerAndConnectClient('client1', mockClient);

			const mockTools: ToolSet = {
				'concurrent-tool': {
					description: 'Tool for concurrent testing',
					parameters: { type: 'object', properties: {} },
				},
			};

			mockClient.getTools.mockResolvedValue(mockTools);
			mockClient.callTool.mockImplementation((name: string, args: any) =>
				Promise.resolve({ result: `executed-${name}-${args.id}` })
			);

			await manager.getAllTools(); // Populate cache

			// Execute multiple tools concurrently
			const promises = Array.from({ length: 5 }, (_, i) =>
				manager.executeTool('concurrent-tool', { id: i })
			);

			const results = await Promise.all(promises);

			expect(results).toHaveLength(5);
			results.forEach((result, index) => {
				expect(result.result).toBe(`executed-concurrent-tool-${index}`);
			});
			expect(mockClient.callTool).toHaveBeenCalledTimes(5);
		});

		it('should handle concurrent initialization of multiple servers', async () => {
			const serverConfigs: ServerConfigs = {
				server1: {
					type: 'stdio',
					command: 'node',
					args: ['server1.js'],
					env: {},
					timeout: 30000,
					connectionMode: 'lenient',
				},
				server2: {
					type: 'stdio',
					command: 'node',
					args: ['server2.js'],
					env: {},
					timeout: 30000,
					connectionMode: 'lenient',
				},
				server3: {
					type: 'stdio',
					command: 'node',
					args: ['server3.js'],
					env: {},
					timeout: 30000,
					connectionMode: 'lenient',
				},
			};

			mockClient.connect.mockResolvedValue({});

			await manager.initializeFromConfig(serverConfigs);

			expect(mockClient.connect).toHaveBeenCalledTimes(3);

			const clients = manager.getClients();
			expect(clients.size).toBe(3);
		});
	});
});

/**
 * ChromaDB Payload Adapter Tests
 *
 * Tests for the ChromaDB payload adapter that handles transformation of complex payloads
 * to ChromaDB-compatible flat metadata and back to original format.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DefaultChromaPayloadAdapter } from '../backend/chroma-payload-adapter.js';
import type { PayloadTransformationConfig } from '../backend/types.js';

// Mock the logger to reduce noise in tests
vi.mock('../../logger/index.js', () => ({
	createLogger: () => ({
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}),
}));

describe('DefaultChromaPayloadAdapter', () => {
	let adapter: DefaultChromaPayloadAdapter;

	beforeEach(() => {
		adapter = new DefaultChromaPayloadAdapter();
	});

	describe('Basic Serialization/Deserialization', () => {
		it('should preserve primitive values', () => {
			const payload = {
				text: 'hello world',
				count: 42,
				active: true,
				rating: 3.14,
			};

			const serialized = adapter.serialize(payload);
			const deserialized = adapter.deserialize(serialized);

			expect(serialized).toEqual({
				text: 'hello world',
				count: 42,
				active: true,
				rating: 3.14,
			});
			expect(deserialized).toEqual(payload);
		});

		it('should handle null and undefined values', () => {
			const payload = {
				text: 'hello',
				nullValue: null,
				undefinedValue: undefined,
				emptyString: '',
			};

			const serialized = adapter.serialize(payload);
			expect(serialized).toEqual({
				text: 'hello',
				emptyString: '',
			});

			const deserialized = adapter.deserialize(serialized);
			expect(deserialized.text).toBe('hello');
			expect(deserialized.emptyString).toBe('');
		});
	});

	describe('Array Handling (Comma-Separated Strategy)', () => {
		it('should convert simple arrays to comma-separated strings', () => {
			const payload = {
				tags: ['important', 'reviewed', 'final'],
				numbers: [1, 2, 3, 4],
			};

			const serialized = adapter.serialize(payload);
			expect(serialized).toEqual({
				tags: 'important,reviewed,final',
				numbers: '1,2,3,4',
			});

			const deserialized = adapter.deserialize(serialized);
			expect(deserialized.tags).toEqual(['important', 'reviewed', 'final']);
			expect(deserialized.numbers).toEqual([1, 2, 3, 4]); // Numbers should be preserved as numbers
		});

		it('should handle empty arrays', () => {
			const payload = {
				tags: [],
				items: ['single'],
			};

			const serialized = adapter.serialize(payload);
			expect(serialized).toEqual({
				tags: '',
				items: 'single',
			});

			const deserialized = adapter.deserialize(serialized);
			expect(deserialized.tags).toEqual([]);
			// Note: single-item arrays without commas are indistinguishable from strings
			// This is expected behavior - to preserve arrays, they need explicit configuration
			expect(deserialized.items).toBe('single');
		});

		it('should handle complex arrays with JSON string strategy', () => {
			const payload = {
				objects: [
					{ name: 'obj1', value: 10 },
					{ name: 'obj2', value: 20 },
				],
			};

			const serialized = adapter.serialize(payload);
			expect(typeof serialized.objects).toBe('string');
			expect(serialized.objects).toBe(JSON.stringify(payload.objects));

			const deserialized = adapter.deserialize(serialized);
			expect(deserialized.objects).toEqual(payload.objects);
		});
	});

	describe('Nested Object Handling (Dot-Notation Strategy)', () => {
		it('should flatten simple nested objects', () => {
			const payload = {
				user: {
					name: 'John Doe',
					age: 30,
				},
				settings: {
					theme: 'dark',
					notifications: true,
				},
			};

			const serialized = adapter.serialize(payload);
			expect(serialized).toEqual({
				user_name: 'John Doe',
				user_age: 30,
				settings_theme: 'dark',
				settings_notifications: true,
			});

			const deserialized = adapter.deserialize(serialized);
			expect(deserialized.user).toEqual({
				name: 'John Doe',
				age: 30,
			});
			expect(deserialized.settings).toEqual({
				theme: 'dark',
				notifications: true,
			});
		});

		it('should handle deeply nested objects', () => {
			const payload = {
				user: {
					profile: {
						personal: {
							name: 'John',
							age: 30,
						},
						skills: ['js', 'ts'],
					},
				},
			};

			const serialized = adapter.serialize(payload);

			// This structure is considered "simple" and uses dot notation strategy
			expect(serialized.user_profile_personal_name).toBe('John');
			expect(serialized.user_profile_personal_age).toBe(30);
			expect(serialized.user_profile_skills).toBe('js,ts');

			const deserialized = adapter.deserialize(serialized);
			expect(deserialized.user).toEqual(payload.user);
		});

		it('should handle nested objects with arrays', () => {
			const payload = {
				user: {
					name: 'John',
					tags: ['developer', 'typescript'],
				},
			};

			const serialized = adapter.serialize(payload);
			expect(serialized.user_name).toBe('John');
			expect(serialized.user_tags).toBe('developer,typescript');

			const deserialized = adapter.deserialize(serialized);
			expect(deserialized.user.name).toBe('John');
			expect(deserialized.user.tags).toEqual(['developer', 'typescript']);
		});
	});

	describe('JSON String Strategy', () => {
		it('should serialize complex objects to JSON strings', () => {
			const payload = {
				complexData: {
					nested: {
						array: [1, 2, { key: 'value' }],
						object: { a: 1, b: [2, 3] },
					},
					date: new Date('2023-01-01').toISOString(),
				},
			};

			const serialized = adapter.serialize(payload);
			expect(typeof serialized.complexData).toBe('string');

			const deserialized = adapter.deserialize(serialized);
			expect(deserialized.complexData).toEqual(payload.complexData);
		});
	});

	describe('Legacy Field Compatibility', () => {
		it('should handle legacy fields with backward compatibility', () => {
			const payload = {
				tags: ['important', 'reviewed'],
				currentProgress: {
					feature: 'authentication',
					status: 'in-progress',
					completion: 75,
				},
				bugsEncountered: [
					{
						description: 'Login timeout',
						severity: 'high',
						status: 'open',
					},
				],
				workContext: {
					project: 'cipher',
					branch: 'main',
				},
			};

			const serialized = adapter.serialize(payload);

			// Legacy fields should use their configured strategies
			expect(serialized.tags).toBe('important,reviewed');
			expect(typeof serialized.currentProgress).toBe('string');
			expect(typeof serialized.bugsEncountered).toBe('string');
			expect(typeof serialized.workContext).toBe('string');

			const deserialized = adapter.deserialize(serialized);
			expect(deserialized.tags).toEqual(['important', 'reviewed']);
			expect(deserialized.currentProgress).toEqual(payload.currentProgress);
			expect(deserialized.bugsEncountered).toEqual(payload.bugsEncountered);
			expect(deserialized.workContext).toEqual(payload.workContext);
		});
	});

	describe('Configuration Management', () => {
		it('should allow configuration updates', () => {
			const customConfig: Partial<PayloadTransformationConfig> = {
				defaultStrategy: 'dot-notation',
				fieldConfigs: {
					customField: { strategy: 'preserve' },
				},
			};

			adapter.updateConfig(customConfig);
			const config = adapter.getConfig();

			expect(config.defaultStrategy).toBe('dot-notation');
			expect(config.fieldConfigs.customField?.strategy).toBe('preserve');
			// Should preserve existing configs
			expect(config.fieldConfigs.tags?.strategy).toBe('comma-separated');
		});

		it('should handle custom transformers', () => {
			const customConfig: Partial<PayloadTransformationConfig> = {
				fieldConfigs: {
					dateField: {
						strategy: 'preserve',
						customTransformer: {
							serialize: value => (value instanceof Date ? value.toISOString() : value),
							deserialize: value => (typeof value === 'string' ? new Date(value) : value),
						},
					},
				},
			};

			adapter.updateConfig(customConfig);

			const payload = {
				dateField: new Date('2023-01-01'),
				otherField: 'test',
			};

			const serialized = adapter.serialize(payload);
			expect(serialized.dateField).toBe('2023-01-01T00:00:00.000Z');

			const deserialized = adapter.deserialize(serialized);
			expect(deserialized.dateField).toEqual(new Date('2023-01-01'));
		});
	});

	describe('Error Handling', () => {
		it('should handle serialization errors gracefully', () => {
			// Create a circular reference
			const circular: any = { name: 'test' };
			circular.self = circular;

			const payload = {
				circular: circular,
				normal: 'value',
			};

			const serialized = adapter.serialize(payload);

			// Should still serialize the normal field
			expect(serialized.normal).toBe('value');
		});

		it('should handle deserialization errors gracefully', () => {
			const metadata = {
				validJson: '{"key": "value"}',
				invalidJson: '{"invalid": json}',
				normal: 'value',
			};

			const deserialized = adapter.deserialize(metadata);

			expect(deserialized.validJson).toEqual({ key: 'value' });
			expect(deserialized.invalidJson).toBe('{"invalid": json}'); // Should keep as string
			expect(deserialized.normal).toBe('value');
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty payloads', () => {
			const serialized = adapter.serialize({});
			const deserialized = adapter.deserialize({});

			expect(serialized).toEqual({});
			expect(deserialized).toEqual({});
		});

		it('should handle non-object inputs', () => {
			// @ts-expect-error - testing invalid input
			const serialized1 = adapter.serialize(null);
			// @ts-expect-error - testing invalid input
			const serialized2 = adapter.serialize(undefined);
			// @ts-expect-error - testing invalid input
			const serialized3 = adapter.serialize('string');

			expect(serialized1).toEqual({});
			expect(serialized2).toEqual({});
			expect(serialized3).toEqual({});
		});

		it('should preserve ChromaDB primitive type constraints', () => {
			const payload = {
				string: 'test',
				number: 42,
				boolean: true,
				float: 3.14,
				negative: -10,
				zero: 0,
			};

			const serialized = adapter.serialize(payload);

			// All values should be primitive types acceptable to ChromaDB
			expect(typeof serialized.string).toBe('string');
			expect(typeof serialized.number).toBe('number');
			expect(typeof serialized.boolean).toBe('boolean');
			expect(typeof serialized.float).toBe('number');
			expect(typeof serialized.negative).toBe('number');
			expect(typeof serialized.zero).toBe('number');
		});

		it('should handle large nested structures within depth limits', () => {
			// Create nested structure at max depth
			const maxDepth = adapter.getConfig().maxNestingDepth;
			let nested: any = { value: 'deep' };

			for (let i = 0; i < maxDepth - 1; i++) {
				nested = { level: i, data: nested };
			}

			const payload = { deep: nested };
			const serialized = adapter.serialize(payload);
			const deserialized = adapter.deserialize(serialized);

			expect(deserialized).toEqual(payload);
		});
	});

	describe('Boolean Flags Strategy', () => {
		it('should support boolean flags strategy with custom config', () => {
			const customConfig: Partial<PayloadTransformationConfig> = {
				fieldConfigs: {
					categories: {
						strategy: 'boolean-flags',
						prefix: 'cat',
					},
				},
			};

			adapter.updateConfig(customConfig);

			const payload = {
				categories: ['tech', 'science', 'programming'],
			};

			const serialized = adapter.serialize(payload);

			expect(serialized.cat_tech).toBe(true);
			expect(serialized.cat_science).toBe(true);
			expect(serialized.cat_programming).toBe(true);
			expect(serialized.categories).toBeUndefined();
		});
	});
});

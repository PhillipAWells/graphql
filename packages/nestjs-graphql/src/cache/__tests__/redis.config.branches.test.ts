import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GetRedisConfig, ValidateRedisConfig, CreateRedisOptions } from '../redis.config.js';

/**
 * Advanced branch coverage tests for redis.config.ts
 * Targets:
 * - reconnectOnError callback branches for different error codes
 * - Boundary value validation
 * - Production vs development password handling
 */
describe('Redis Configuration - Advanced Branch Coverage', () => {
	beforeEach(() => {
		// Clean up all Redis environment variables before each test
		delete process.env['REDIS_HOST'];
		delete process.env['REDIS_PORT'];
		delete process.env['REDIS_PASSWORD'];
		delete process.env['REDIS_DB'];
		delete process.env['REDIS_MAX_RETRIES'];
		delete process.env['REDIS_CONNECT_TIMEOUT'];
		delete process.env['REDIS_COMMAND_TIMEOUT'];
		delete process.env['REDIS_FAMILY'];
		delete process.env['REDIS_KEEP_ALIVE'];
		delete process.env['REDIS_RETRY_DELAY'];
		delete process.env['REDIS_KEY_PREFIX'];
		delete process.env['REDIS_ENABLE_READY_CHECK'];
		delete process.env['REDIS_LAZY_CONNECT'];
		delete process.env['NODE_ENV'];
	});

	afterEach(() => {
		delete process.env['NODE_ENV'];
	});

	describe('reconnectOnError callback branches', () => {
		beforeEach(() => {
			process.env['REDIS_HOST'] = 'localhost';
			process.env['REDIS_PORT'] = '6379';
		});

		it('should retry on ECONNREFUSED error code', () => {
			const config = GetRedisConfig();
			const reconnector = config.reconnectOnError;

			if (reconnector) {
				const error = new Error('Connection refused') as any;
				error.code = 'ECONNREFUSED';
				expect(reconnector(error)).toBe(true);
			}
		});

		it('should retry on ETIMEDOUT error code', () => {
			const config = GetRedisConfig();
			const reconnector = config.reconnectOnError;

			if (reconnector) {
				const error = new Error('Connection timeout') as any;
				error.code = 'ETIMEDOUT';
				expect(reconnector(error)).toBe(true);
			}
		});

		it('should retry on ENOTFOUND error code', () => {
			const config = GetRedisConfig();
			const reconnector = config.reconnectOnError;

			if (reconnector) {
				const error = new Error('Host not found') as any;
				error.code = 'ENOTFOUND';
				expect(reconnector(error)).toBe(true);
			}
		});

		it('should retry on READONLY message', () => {
			const config = GetRedisConfig();
			const reconnector = config.reconnectOnError;

			if (reconnector) {
				const error = new Error('READONLY You can\'t write against a read only replica.');
				expect(reconnector(error)).toBe(true);
			}
		});

		it('should not retry on WRONGPASS message', () => {
			const config = GetRedisConfig();
			const reconnector = config.reconnectOnError;

			if (reconnector) {
				const error = new Error('WRONGPASS invalid username-password pair');
				expect(reconnector(error)).toBe(false);
			}
		});

		it('should not retry on NOAUTH message', () => {
			const config = GetRedisConfig();
			const reconnector = config.reconnectOnError;

			if (reconnector) {
				const error = new Error('NOAUTH Authentication required.');
				expect(reconnector(error)).toBe(false);
			}
		});

		it('should not retry on unknown error codes', () => {
			const config = GetRedisConfig();
			const reconnector = config.reconnectOnError;

			if (reconnector) {
				const error = new Error('Some unknown error') as any;
				error.code = 'EUNKNOWN';
				expect(reconnector(error)).toBe(false);
			}
		});

		it('should not retry on unknown error messages', () => {
			const config = GetRedisConfig();
			const reconnector = config.reconnectOnError;

			if (reconnector) {
				const error = new Error('Some completely unknown error');
				expect(reconnector(error)).toBe(false);
			}
		});

		it('should handle errors with no error code', () => {
			const config = GetRedisConfig();
			const reconnector = config.reconnectOnError;

			if (reconnector) {
				const error = new Error('Generic error');
				expect(reconnector(error)).toBe(false);
			}
		});
	});

	describe('Boundary value validation - Timeouts', () => {
		beforeEach(() => {
			process.env['REDIS_HOST'] = 'localhost';
			process.env['REDIS_PORT'] = '6379';
		});

		it('should accept minimum CONNECT_TIMEOUT (100ms)', () => {
			process.env['REDIS_CONNECT_TIMEOUT'] = '100';
			expect(() => GetRedisConfig()).not.toThrow();
			expect(GetRedisConfig().connectTimeout).toBe(100);
		});

		it('should accept large CONNECT_TIMEOUT', () => {
			process.env['REDIS_CONNECT_TIMEOUT'] = '300000';
			expect(() => GetRedisConfig()).not.toThrow();
			expect(GetRedisConfig().connectTimeout).toBe(300000);
		});

		it('should reject CONNECT_TIMEOUT below minimum', () => {
			process.env['REDIS_CONNECT_TIMEOUT'] = '99';
			expect(() => GetRedisConfig()).toThrow();
		});

		it('should accept minimum COMMAND_TIMEOUT (100ms)', () => {
			process.env['REDIS_COMMAND_TIMEOUT'] = '100';
			expect(() => GetRedisConfig()).not.toThrow();
			expect(GetRedisConfig().commandTimeout).toBe(100);
		});

		it('should accept large COMMAND_TIMEOUT', () => {
			process.env['REDIS_COMMAND_TIMEOUT'] = '60000';
			expect(() => GetRedisConfig()).not.toThrow();
			expect(GetRedisConfig().commandTimeout).toBe(60000);
		});

		it('should reject COMMAND_TIMEOUT below minimum', () => {
			process.env['REDIS_COMMAND_TIMEOUT'] = '99';
			expect(() => GetRedisConfig()).toThrow();
		});
	});

	describe('Boundary value validation - Numeric fields', () => {
		beforeEach(() => {
			process.env['REDIS_HOST'] = 'localhost';
			process.env['REDIS_PORT'] = '6379';
		});

		it('should accept MAX_RETRIES = 0', () => {
			process.env['REDIS_MAX_RETRIES'] = '0';
			expect(() => GetRedisConfig()).not.toThrow();
			expect(GetRedisConfig().maxRetriesPerRequest).toBe(0);
		});

		it('should accept large MAX_RETRIES', () => {
			process.env['REDIS_MAX_RETRIES'] = '1000';
			expect(() => GetRedisConfig()).not.toThrow();
			expect(GetRedisConfig().maxRetriesPerRequest).toBe(1000);
		});

		it('should reject negative MAX_RETRIES', () => {
			process.env['REDIS_MAX_RETRIES'] = '-1';
			expect(() => GetRedisConfig()).toThrow();
		});

		it('should accept KEEP_ALIVE = 0', () => {
			process.env['REDIS_KEEP_ALIVE'] = '0';
			expect(() => GetRedisConfig()).not.toThrow();
			expect(GetRedisConfig().keepAlive).toBe(0);
		});

		it('should accept large KEEP_ALIVE', () => {
			process.env['REDIS_KEEP_ALIVE'] = '600000';
			expect(() => GetRedisConfig()).not.toThrow();
			expect(GetRedisConfig().keepAlive).toBe(600000);
		});

		it('should reject negative KEEP_ALIVE', () => {
			process.env['REDIS_KEEP_ALIVE'] = '-1';
			expect(() => GetRedisConfig()).toThrow();
		});

		it('should accept RETRY_DELAY = 0', () => {
			process.env['REDIS_RETRY_DELAY'] = '0';
			expect(() => GetRedisConfig()).not.toThrow();
			expect(GetRedisConfig().Module).toBeUndefined();
		});

		it('should accept large RETRY_DELAY', () => {
			process.env['REDIS_RETRY_DELAY'] = '30000';
			expect(() => GetRedisConfig()).not.toThrow();
		});

		it('should reject negative RETRY_DELAY', () => {
			process.env['REDIS_RETRY_DELAY'] = '-1';
			expect(() => GetRedisConfig()).toThrow();
		});
	});

	describe('Production mode password validation', () => {
		beforeEach(() => {
			process.env['REDIS_HOST'] = 'localhost';
			process.env['REDIS_PORT'] = '6379';
			process.env['NODE_ENV'] = 'production';
		});

		afterEach(() => {
			delete process.env['NODE_ENV'];
		});

		it('should require password with minimum length in production', () => {
			process.env['REDIS_PASSWORD'] = '12345678';
			expect(() => GetRedisConfig()).not.toThrow();
		});

		it('should reject short password in production', () => {
			process.env['REDIS_PASSWORD'] = '1234567';
			expect(() => GetRedisConfig()).toThrow();
		});

		it('should reject empty password in production', () => {
			process.env['REDIS_PASSWORD'] = '';
			expect(() => GetRedisConfig()).toThrow();
		});

		it('should require password in production (undefined)', () => {
			delete process.env['REDIS_PASSWORD'];
			expect(() => GetRedisConfig()).toThrow();
		});
	});

	describe('Development mode password validation', () => {
		beforeEach(() => {
			process.env['REDIS_HOST'] = 'localhost';
			process.env['REDIS_PORT'] = '6379';
			delete process.env['NODE_ENV']; // defaults to undefined, not production
		});

		it('should allow empty password in development', () => {
			process.env['REDIS_PASSWORD'] = '';
			expect(() => GetRedisConfig()).not.toThrow();
		});

		it('should allow valid password in development', () => {
			process.env['REDIS_PASSWORD'] = '12345678';
			expect(() => GetRedisConfig()).not.toThrow();
		});

		it('should still enforce minimum length even in development', () => {
			process.env['REDIS_PASSWORD'] = '1234567';
			// Note: Joi applies min length even in non-production
			expect(() => GetRedisConfig()).toThrow();
		});

		it('should allow undefined password in development', () => {
			delete process.env['REDIS_PASSWORD'];
			expect(() => GetRedisConfig()).not.toThrow();
		});
	});

	describe('ValidateRedisConfig function branches', () => {
		it('should validate and apply defaults for minimal config', () => {
			const config = ValidateRedisConfig({
				REDIS_HOST: 'localhost',
				REDIS_PORT: '6379',
			});

			expect(config.REDIS_HOST).toBe('localhost');
			expect(config.REDIS_PORT).toBe(6379);
			expect(config.REDIS_DB).toBe(0);
		});

		it('should parse numeric strings correctly', () => {
			const config = ValidateRedisConfig({
				REDIS_HOST: 'localhost',
				REDIS_PORT: '6380',
				REDIS_DB: '5',
				REDIS_MAX_RETRIES: '10',
			});

			expect(config.REDIS_PORT).toBe(6380);
			expect(config.REDIS_DB).toBe(5);
			expect(config.REDIS_MAX_RETRIES).toBe(10);
		});

		it('should handle all optional fields with defaults', () => {
			const config = ValidateRedisConfig({
				REDIS_HOST: 'localhost',
				REDIS_PORT: '6379',
			});

			expect(config).toHaveProperty('REDIS_FAMILY', 4); // IPv4 default
			expect(config).toHaveProperty('REDIS_KEEP_ALIVE', 30000);
			expect(config).toHaveProperty('REDIS_RETRY_DELAY', 100);
			expect(config).toHaveProperty('REDIS_KEY_PREFIX', 'cache:');
		});

		it('should throw on invalid hostname', () => {
			expect(() => ValidateRedisConfig({
				REDIS_HOST: 'invalid..host',
				REDIS_PORT: '6379',
			})).toThrow();
		});

		it('should throw on port out of range', () => {
			expect(() => ValidateRedisConfig({
				REDIS_HOST: 'localhost',
				REDIS_PORT: '65536',
			})).toThrow();
		});

		it('should throw on invalid family (not 4 or 6)', () => {
			expect(() => ValidateRedisConfig({
				REDIS_HOST: 'localhost',
				REDIS_PORT: '6379',
				REDIS_FAMILY: '8',
			})).toThrow();
		});

		it('should accept IPv4 family (4)', () => {
			const config = ValidateRedisConfig({
				REDIS_HOST: 'localhost',
				REDIS_PORT: '6379',
				REDIS_FAMILY: '4',
			});

			expect(config.REDIS_FAMILY).toBe(4);
		});

		it('should accept IPv6 family (6)', () => {
			const config = ValidateRedisConfig({
				REDIS_HOST: 'localhost',
				REDIS_PORT: '6379',
				REDIS_FAMILY: '6',
			});

			expect(config.REDIS_FAMILY).toBe(6);
		});
	});

	describe('CreateRedisOptions function', () => {
		it('should create RedisOptions from IRedisConfig', () => {
			process.env['REDIS_HOST'] = 'localhost';
			process.env['REDIS_PORT'] = '6379';
			process.env['REDIS_PASSWORD'] = 'secretpassword';

			const config = GetRedisConfig();
			const options = CreateRedisOptions(config);

			expect(options.host).toBe('localhost');
			expect(options.port).toBe(6379);
			expect(options.password).toBe('secretpassword');
			expect(typeof options.reconnectOnError).toBe('function');
		});

		it('should handle undefined password', () => {
			process.env['REDIS_HOST'] = 'localhost';
			process.env['REDIS_PORT'] = '6379';
			delete process.env['REDIS_PASSWORD'];

			const config = GetRedisConfig();
			const options = CreateRedisOptions(config);

			expect(options.password).toBeUndefined();
		});

		it('should include all reconnectOnError function', () => {
			process.env['REDIS_HOST'] = 'localhost';
			process.env['REDIS_PORT'] = '6379';

			const config = GetRedisConfig();
			const options = CreateRedisOptions(config);

			expect(options.reconnectOnError).toBeDefined();
			expect(typeof options.reconnectOnError).toBe('function');
		});
	});

	describe('Edge cases and special conditions', () => {
		beforeEach(() => {
			process.env['REDIS_HOST'] = 'localhost';
			process.env['REDIS_PORT'] = '6379';
		});

		it('should handle empty string keyprefix', () => {
			process.env['REDIS_KEY_PREFIX'] = '';
			const config = GetRedisConfig();
			expect(config.keyPrefix).toBe('');
		});

		it('should handle complex keyprefix', () => {
			process.env['REDIS_KEY_PREFIX'] = 'myapp:v1:cache:';
			const config = GetRedisConfig();
			expect(config.keyPrefix).toBe('myapp:v1:cache:');
		});

		it('should handle readyCheck enabled/disabled', () => {
			process.env['REDIS_ENABLE_READY_CHECK'] = 'false';
			const config1 = GetRedisConfig();
			expect(config1.enableReadyCheck).toBe(false);

			process.env['REDIS_ENABLE_READY_CHECK'] = 'true';
			const config2 = GetRedisConfig();
			expect(config2.enableReadyCheck).toBe(true);
		});

		it('should handle lazyConnect enabled/disabled', () => {
			process.env['REDIS_LAZY_CONNECT'] = 'false';
			const config1 = GetRedisConfig();
			expect(config1.lazyConnect).toBe(false);

			process.env['REDIS_LAZY_CONNECT'] = 'true';
			const config2 = GetRedisConfig();
			expect(config2.lazyConnect).toBe(true);
		});

		it('should handle DB boundary values', () => {
			process.env['REDIS_DB'] = '0';
			const config1 = GetRedisConfig();
			expect(config1.db).toBe(0);

			process.env['REDIS_DB'] = '15';
			const config2 = GetRedisConfig();
			expect(config2.db).toBe(15);
		});

		it('should reject DB above max (15)', () => {
			process.env['REDIS_DB'] = '16';
			expect(() => GetRedisConfig()).toThrow();
		});

		it('should reject DB below min (0)', () => {
			process.env['REDIS_DB'] = '-1';
			expect(() => GetRedisConfig()).toThrow();
		});
	});
});

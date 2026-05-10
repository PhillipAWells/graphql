import Joi from 'joi';
import { RedisOptions } from 'ioredis';
import {
	REDIS_MAX_PORT,
	REDIS_DEFAULT_PORT,
	REDIS_MIN_DB,
	REDIS_MAX_DB,
	REDIS_DEFAULT_DB,
	REDIS_MIN_PASSWORD_LENGTH,
	REDIS_DEFAULT_MAX_RETRIES,
	REDIS_DEFAULT_CONNECT_TIMEOUT,
	REDIS_MIN_TIMEOUT,
	REDIS_DEFAULT_COMMAND_TIMEOUT,
	REDIS_IPV4_FAMILY,
	REDIS_IPV6_FAMILY,
	REDIS_DEFAULT_FAMILY,
	REDIS_DEFAULT_KEEP_ALIVE,
	REDIS_DEFAULT_RETRY_DELAY,
	REDIS_DEFAULT_KEY_PREFIX,
} from './constants/redis.constants.js';

/**
 * Redis connection configuration interface
 */
export interface IRedisConfig {
	host: string;
	port: number;
	password?: string;
	db?: number;
	keyPrefix?: string;
	enableReadyCheck?: boolean;
	maxRetriesPerRequest?: number;
	lazyConnect?: boolean;
	reconnectOnError?: (err: Error) => boolean;
	connectTimeout?: number;
	commandTimeout?: number;
	family?: number;
	keepAlive?: number;
}

/**
 * Redis connection options for cache-manager-redis-store
 */
export interface IRedisConnectionOptions {
	host: string;
	port: number;
	password?: string;
	db?: number;
	ttl?: number;
	keyPrefix?: string;
	enableReadyCheck?: boolean;
	maxRetriesPerRequest?: number;
	lazyConnect?: boolean;
	reconnectOnError?: (err: Error) => boolean;
	connectTimeout?: number;
	commandTimeout?: number;
	family?: number;
	keepAlive?: number;
}

/**
 * Validate Redis configuration against Joi schema
 *
 * Validates all Redis environment variable configuration options and applies defaults.
 * Uses Joi for schema validation with strict type checking and range validation on
 * numeric values (ports, timeouts, etc.).
 *
 * @param config Configuration object containing Redis environment variables
 * @returns Validated configuration object with applied defaults
 * @throws Error if any configuration value fails validation (e.g., port out of range, invalid hostname)
 *
 * @example
 * ```typescript
 * const config = validateRedisConfig({
 *   REDIS_HOST: 'localhost',
 *   REDIS_PORT: '6379',
 *   REDIS_PASSWORD: 'secret',
 * });
 * ```
 */
interface IValidatedRedisConfig {
	REDIS_HOST: string;
	REDIS_PORT: number;
	REDIS_PASSWORD: string;
	REDIS_DB: number;
	REDIS_MAX_RETRIES: number;
	REDIS_CONNECT_TIMEOUT: number;
	REDIS_COMMAND_TIMEOUT: number;
	REDIS_FAMILY: number;
	REDIS_KEEP_ALIVE: number;
	REDIS_RETRY_DELAY: number;
	REDIS_KEY_PREFIX: string;
}

export function ValidateRedisConfig(config: Record<string, unknown>): IValidatedRedisConfig {
	// Allow undefined values - they will use defaults
	// SECURITY: In production, require non-empty password; in dev/test, allow empty password
	const PasswordSchema = process.env['NODE_ENV'] === 'production'
		? Joi.string().required().min(REDIS_MIN_PASSWORD_LENGTH)
		: Joi.string().allow('').min(REDIS_MIN_PASSWORD_LENGTH).default('');

	const Schema = Joi.object({
		REDIS_HOST: Joi.string().hostname().default('localhost'),
		REDIS_PORT: Joi.number().integer().min(1).max(REDIS_MAX_PORT).default(REDIS_DEFAULT_PORT),
		REDIS_PASSWORD: PasswordSchema,
		REDIS_DB: Joi.number().integer().min(REDIS_MIN_DB).max(REDIS_MAX_DB).default(REDIS_DEFAULT_DB),
		REDIS_MAX_RETRIES: Joi.number().integer().min(0).default(REDIS_DEFAULT_MAX_RETRIES),
		REDIS_CONNECT_TIMEOUT: Joi.number().integer().min(REDIS_MIN_TIMEOUT).default(REDIS_DEFAULT_CONNECT_TIMEOUT),
		REDIS_COMMAND_TIMEOUT: Joi.number().integer().min(REDIS_MIN_TIMEOUT).default(REDIS_DEFAULT_COMMAND_TIMEOUT),
		REDIS_FAMILY: Joi.number().integer().valid(REDIS_IPV4_FAMILY, REDIS_IPV6_FAMILY).default(REDIS_DEFAULT_FAMILY),
		REDIS_KEEP_ALIVE: Joi.number().integer().min(0).default(REDIS_DEFAULT_KEEP_ALIVE),
		REDIS_RETRY_DELAY: Joi.number().integer().min(0).default(REDIS_DEFAULT_RETRY_DELAY),
		REDIS_KEY_PREFIX: Joi.string().allow('').default(REDIS_DEFAULT_KEY_PREFIX),
	});

	const { error, value } = Schema.validate(config, { allowUnknown: true });
	if (error) {
		throw new Error(`Redis configuration validation failed: ${error.message}`);
	}
	return value as IValidatedRedisConfig;
}

/**
 * Get Redis configuration from environment variables with defaults
 * @returns IRedisConfig object
 */
export function GetRedisConfig(): IRedisConfig {
	// Validate environment variables - Joi will handle optional fields properly
	const EnvVars: Record<string, unknown> = {
		REDIS_HOST: process.env['REDIS_HOST'],
		REDIS_PORT: process.env['REDIS_PORT'],
		REDIS_PASSWORD: process.env['REDIS_PASSWORD'],
		REDIS_DB: process.env['REDIS_DB'],
		REDIS_MAX_RETRIES: process.env['REDIS_MAX_RETRIES'],
		REDIS_CONNECT_TIMEOUT: process.env['REDIS_CONNECT_TIMEOUT'],
		REDIS_COMMAND_TIMEOUT: process.env['REDIS_COMMAND_TIMEOUT'],
		REDIS_FAMILY: process.env['REDIS_FAMILY'],
		REDIS_KEEP_ALIVE: process.env['REDIS_KEEP_ALIVE'],
		REDIS_RETRY_DELAY: process.env['REDIS_RETRY_DELAY'],
		REDIS_KEY_PREFIX: process.env['REDIS_KEY_PREFIX'],
	};

	const Validated = ValidateRedisConfig(EnvVars);

	return {
		host: Validated.REDIS_HOST,
		port: Validated.REDIS_PORT,
		password: Validated.REDIS_PASSWORD || undefined,
		db: Validated.REDIS_DB,
		keyPrefix: Validated.REDIS_KEY_PREFIX,
		enableReadyCheck: process.env['REDIS_ENABLE_READY_CHECK'] !== 'false',
		maxRetriesPerRequest: Validated.REDIS_MAX_RETRIES,
		lazyConnect: process.env['REDIS_LAZY_CONNECT'] === 'true',
		// SECURITY: Use error code classification instead of fragile message-string matching
		// This prevents ReDoS attacks and improves reliability of error detection
		reconnectOnError: (err: Error) => {
			// Retry on connection/network errors (safe to retry)
			const ErrorCode = (err as { code?: string }).code;
			if (ErrorCode === 'ECONNREFUSED' || ErrorCode === 'ETIMEDOUT' || ErrorCode === 'ENOTFOUND') {
				return true;
			}
			// Retry on Redis read-only mode (safe to retry)
			if (err.message.includes('READONLY')) {
				return true;
			}
			// Don't retry auth errors (infinite loop risk)
			if (err.message.includes('WRONGPASS') || err.message.includes('NOAUTH')) {
				return false;
			}
			// Conservative default: don't retry unknown errors
			return false;
		},
		connectTimeout: Validated.REDIS_CONNECT_TIMEOUT,
		commandTimeout: Validated.REDIS_COMMAND_TIMEOUT,
		family: Validated.REDIS_FAMILY,
		keepAlive: Validated.REDIS_KEEP_ALIVE,
	};
}

/**
 * Get Redis connection options for cache-manager-redis-store
 * @returns IRedisConnectionOptions object
 */
export function GetRedisConnectionOptions(): IRedisConnectionOptions {
	const Config = GetRedisConfig();
	return {
		...Config,
		ttl: parseInt(process.env['REDIS_CACHE_TTL'] ?? '3600', 10),
	};
}

/**
 * Create RedisOptions for ioredis client
 * @param config IRedisConfig
 * @returns RedisOptions
 */
export function CreateRedisOptions(config: IRedisConfig): RedisOptions {
	return {
		host: config.host,
		port: config.port,
		password: config.password,
		db: config.db,
		keyPrefix: config.keyPrefix,
		enableReadyCheck: config.enableReadyCheck,
		maxRetriesPerRequest: config.maxRetriesPerRequest,
		lazyConnect: config.lazyConnect,
		reconnectOnError: config.reconnectOnError,
		connectTimeout: config.connectTimeout,
		commandTimeout: config.commandTimeout,
		family: config.family,
		keepAlive: config.keepAlive,
	} as RedisOptions;
}

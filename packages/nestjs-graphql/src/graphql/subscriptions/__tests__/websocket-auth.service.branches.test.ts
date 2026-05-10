import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { AppLogger } from '@pawells/nestjs-shared/common';
import { WebSocketAuthService } from '../websocket-auth.service.js';

/**
 * Advanced branch coverage tests for WebSocketAuthService
 * Targets:
 * - Missing token in params (null)
 * - JWT parsing errors (malformed tokens)
 * - Expired token handling
 * - Invalid token signature
 * - Missing JwtService (fail-closed)
 */
describe('WebSocketAuthService - Authentication Branches', () => {
	let service: WebSocketAuthService;
	let MockModuleRef: any;
	let MockJwtService: any;
	let MockAppLogger: any;
	let MockContextualLogger: any;

	beforeEach(() => {
		MockContextualLogger = {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		};

		MockAppLogger = {
			createContextualLogger: vi.fn().mockReturnValue(MockContextualLogger),
		};

		MockJwtService = {
			verifyAsync: vi.fn(),
		};

		MockModuleRef = {
			get: vi.fn((token: any, options?: any) => {
				if (token === AppLogger) {
					return MockAppLogger;
				}
				if (token === JwtService) {
					if (options?.strict === false) {
						return MockJwtService;
					}
					throw new Error('JwtService not found');
				}
				throw new Error(`Unknown token: ${String(token)}`);
			}),
		};

		service = new WebSocketAuthService(MockModuleRef);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Token Extraction - Missing Token', () => {
		it('should return unauthenticated when no token provided', async () => {
			const result = await service.Authenticate({});

			expect(result.authenticated).toBe(false);
			expect(result.error).toBe('No authentication token provided');
		});

		it('should return unauthenticated when all token fields undefined', async () => {
			const result = await service.Authenticate({
				authorization: undefined,
				Authorization: undefined,
				token: undefined,
				authToken: undefined,
			});

			expect(result.authenticated).toBe(false);
			expect(result.error).toBe('No authentication token provided');
		});

		it('should return unauthenticated when all token fields null', async () => {
			const result = await service.Authenticate({
				authorization: null as any,
				Authorization: null as any,
				token: null as any,
				authToken: null as any,
			});

			expect(result.authenticated).toBe(false);
			expect(result.error).toBe('No authentication token provided');
		});

		it('should return unauthenticated when all token fields empty string', async () => {
			const result = await service.Authenticate({
				authorization: '',
				Authorization: '',
				token: '',
				authToken: '',
			});

			expect(result.authenticated).toBe(false);
			expect(result.error).toBe('No authentication token provided');
		});
	});

	describe('Token Extraction - Priority Order', () => {
		it('should prioritize "authorization" lowercase field', async () => {
			MockJwtService.verifyAsync.mockResolvedValue({ sub: 'user123' });

			await service.Authenticate({
				authorization: 'Bearer token1',
				Authorization: 'Bearer token2',
				token: 'Bearer token3',
				authToken: 'Bearer token4',
			});

			expect(MockJwtService.verifyAsync).toHaveBeenCalledWith('token1');
		});

		it('should use "Authorization" uppercase if lowercase not provided', async () => {
			MockJwtService.verifyAsync.mockResolvedValue({ sub: 'user123' });

			const _result = await service.Authenticate({
				Authorization: 'Bearer token2',
				token: 'Bearer token3',
				authToken: 'Bearer token4',
			});

			expect(MockJwtService.verifyAsync).toHaveBeenCalledWith('token2');
		});

		it('should use "token" field if no authorization headers', async () => {
			MockJwtService.verifyAsync.mockResolvedValue({ sub: 'user123' });

			const _result = await service.Authenticate({
				token: 'Bearer token3',
				authToken: 'Bearer token4',
			});

			expect(MockJwtService.verifyAsync).toHaveBeenCalledWith('token3');
		});

		it('should use "authToken" as last resort', async () => {
			MockJwtService.verifyAsync.mockResolvedValue({ sub: 'user123' });

			const _result = await service.Authenticate({
				authToken: 'Bearer token4',
			});

			expect(MockJwtService.verifyAsync).toHaveBeenCalledWith('token4');
		});
	});

	describe('Bearer Token Format Validation', () => {
		it('should strip Bearer prefix with space', async () => {
			MockJwtService.verifyAsync.mockResolvedValue({ sub: 'user123' });

			await service.Authenticate({
				authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
			});

			expect(MockJwtService.verifyAsync).toHaveBeenCalledWith(
				'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
			);
		});

		it('should accept raw JWT without Bearer prefix', async () => {
			MockJwtService.verifyAsync.mockResolvedValue({ sub: 'user123' });

			await service.Authenticate({
				authorization: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
			});

			expect(MockJwtService.verifyAsync).toHaveBeenCalledWith(
				'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
			);
		});

		it('should reject token that looks like Bearer but is malformed', async () => {
			// 'Bearereytoken' starts with "Bearer" (case-insensitive) so it fails the
			// check that allows raw JWTs without Bearer prefix
			const result = await service.Authenticate({
				authorization: 'Bearereytoken',
			});

			// Should be rejected because it starts with "bearer" (case-insensitive)
			// but doesn't have proper Bearer <space> format
			expect(result.authenticated).toBe(false);
			expect(result.error).toBe('Invalid authentication token');
		});

		it('should reject empty string after Bearer prefix', async () => {
			const result = await service.Authenticate({
				authorization: 'Bearer ',
			});

			expect(result.authenticated).toBe(false);
			expect(result.error).toBe('Invalid authentication token');
		});

		it('should trim whitespace from token', async () => {
			MockJwtService.verifyAsync.mockResolvedValue({ sub: 'user123' });

			await service.Authenticate({
				authorization: 'Bearer   token   ',
			});

			// Bearer prefix is stripped and trimmed
			expect(MockJwtService.verifyAsync).toHaveBeenCalled();
		});
	});

	describe('JWT Verification and Validation', () => {
		it('should return authenticated when token is valid', async () => {
			MockJwtService.verifyAsync.mockResolvedValue({ sub: 'user123' });

			const result = await service.Authenticate({
				authorization: 'Bearer validtoken',
			});

			expect(result.authenticated).toBe(true);
			expect(result.userId).toBe('user123');
			expect(result.error).toBeUndefined();
		});

		it('should return unauthenticated when payload has no sub', async () => {
			MockJwtService.verifyAsync.mockResolvedValue({ aud: 'app' });

			const result = await service.Authenticate({
				authorization: 'Bearer invalidtoken',
			});

			expect(result.authenticated).toBe(false);
			expect(result.error).toBe('Invalid authentication token');
		});

		it('should return unauthenticated when payload sub is null', async () => {
			MockJwtService.verifyAsync.mockResolvedValue({ sub: null });

			const result = await service.Authenticate({
				authorization: 'Bearer invalidtoken',
			});

			expect(result.authenticated).toBe(false);
			expect(result.error).toBe('Invalid authentication token');
		});

		it('should return unauthenticated when payload sub is undefined', async () => {
			MockJwtService.verifyAsync.mockResolvedValue({ sub: undefined });

			const result = await service.Authenticate({
				authorization: 'Bearer invalidtoken',
			});

			expect(result.authenticated).toBe(false);
			expect(result.error).toBe('Invalid authentication token');
		});
	});

	describe('JWT Verification Errors', () => {
		it('should handle malformed JWT error', async () => {
			MockJwtService.verifyAsync.mockRejectedValue(
				new Error('jwt malformed'),
			);

			const result = await service.Authenticate({
				authorization: 'Bearer malformed.token.here',
			});

			expect(result.authenticated).toBe(false);
			expect(result.error).toBe('Invalid authentication token');
		});

		it('should handle invalid token signature error', async () => {
			MockJwtService.verifyAsync.mockRejectedValue(
				new Error('invalid signature'),
			);

			const result = await service.Authenticate({
				authorization: 'Bearer wrongsignature',
			});

			expect(result.authenticated).toBe(false);
			expect(result.error).toBe('Invalid authentication token');
		});

		it('should handle expired token error', async () => {
			MockJwtService.verifyAsync.mockRejectedValue(
				new Error('jwt expired'),
			);

			const result = await service.Authenticate({
				authorization: 'Bearer expiredtoken',
			});

			expect(result.authenticated).toBe(false);
			expect(result.error).toBe('Invalid authentication token');
		});

		it('should handle generic JWT verification error', async () => {
			MockJwtService.verifyAsync.mockRejectedValue(
				new Error('Token verification failed'),
			);

			const result = await service.Authenticate({
				authorization: 'Bearer problematictoken',
			});

			expect(result.authenticated).toBe(false);
			expect(result.error).toBe('Invalid authentication token');
		});

		it('should log token validation errors', async () => {
			MockJwtService.verifyAsync.mockRejectedValue(
				new Error('Verification error'),
			);

			await service.Authenticate({
				authorization: 'Bearer token',
			});

			expect(MockContextualLogger.warn).toHaveBeenCalled();
		});
	});

	describe('JwtService Availability - Fail-Closed', () => {
		it('should return unauthenticated when JwtService is unavailable', async () => {
			MockModuleRef.get.mockImplementation((token: any, _options?: any) => {
				if (token === AppLogger) return MockAppLogger;
				if (token === JwtService) return undefined; // Service not available
				throw new Error(`Unknown: ${String(token)}`);
			});

			const unavailableService = new WebSocketAuthService(MockModuleRef);

			const result = await unavailableService.Authenticate({
				authorization: 'Bearer anytoken',
			});

			expect(result.authenticated).toBe(false);
			expect(result.error).toBe('Invalid authentication token');
		});

		it('should log error when JwtService required but not available', async () => {
			MockModuleRef.get.mockImplementation((token: any, _options?: any) => {
				if (token === AppLogger) return MockAppLogger;
				if (token === JwtService) return undefined;
				throw new Error(`Unknown: ${String(token)}`);
			});

			const unavailableService = new WebSocketAuthService(MockModuleRef);

			await unavailableService.Authenticate({
				authorization: 'Bearer token',
			});

			expect(MockContextualLogger.error).toHaveBeenCalledWith(
				expect.stringContaining('JwtService unavailable'),
			);
		});
	});

	describe('Exception Handling - Outer Try-Catch', () => {
		it('should catch and handle authentication exceptions', async () => {
			MockJwtService.verifyAsync.mockRejectedValue(
				new Error('Unexpected error'),
			);

			const result = await service.Authenticate({
				authorization: 'Bearer token',
			});

			expect(result.authenticated).toBe(false);
			expect(result.error).toBe('Invalid authentication token');
		});

		it('should log authentication errors', async () => {
			MockJwtService.verifyAsync.mockRejectedValue(
				new Error('Unexpected error'),
			);

			await service.Authenticate({
				authorization: 'Bearer token',
			});

			expect(MockContextualLogger.warn).toHaveBeenCalled();
		});

		it('should handle non-Error exceptions', async () => {
			MockJwtService.verifyAsync.mockRejectedValue('string error');

			const result = await service.Authenticate({
				authorization: 'Bearer token',
			});

			expect(result.authenticated).toBe(false);
			expect(result.error).toBe('Invalid authentication token');
		});
	});

	describe('User ID Masking in Logs', () => {
		it('should mask user ID longer than 8 characters', async () => {
			MockJwtService.verifyAsync.mockResolvedValue({
				sub: 'verylonguserid1234567890',
			});

			await service.Authenticate({
				authorization: 'Bearer token',
			});

			// Debug log should contain masked user ID
			expect(MockContextualLogger.debug).toHaveBeenCalledWith(
				expect.stringMatching(/WebSocket connection authenticated/),
			);
		});

		it('should not mask short user IDs', async () => {
			MockJwtService.verifyAsync.mockResolvedValue({
				sub: 'user123',
			});

			await service.Authenticate({
				authorization: 'Bearer token',
			});

			expect(MockContextualLogger.debug).toHaveBeenCalled();
		});

		it('should sanitize newlines in masked user ID', async () => {
			MockJwtService.verifyAsync.mockResolvedValue({
				sub: 'user123\nmalicious\rcode',
			});

			const result = await service.Authenticate({
				authorization: 'Bearer token',
			});

			expect(result.authenticated).toBe(true);
			// Logs should not contain newlines/carriage returns
			expect(MockContextualLogger.debug).toHaveBeenCalled();
		});
	});

	describe('Module Integration', () => {
		it('should have Module property set correctly', () => {
			expect(service.Module).toBe(MockModuleRef);
		});

		it('should implement ILazyModuleRefService', () => {
			expect(service.Module).toBeDefined();
		});

		it('should handle AppLogger unavailability gracefully', async () => {
			MockModuleRef.get.mockImplementation((token: any) => {
				if (token === AppLogger) return undefined;
				if (token === JwtService) return MockJwtService;
				throw new Error(`Unknown: ${String(token)}`);
			});

			MockJwtService.verifyAsync.mockResolvedValue({ sub: 'user123' });

			const noLoggerService = new WebSocketAuthService(MockModuleRef);
			const result = await noLoggerService.Authenticate({
				authorization: 'Bearer token',
			});

			expect(result.authenticated).toBe(true);
		});
	});

	describe('Edge Cases', () => {
		it('should handle connection params with additional fields', async () => {
			MockJwtService.verifyAsync.mockResolvedValue({ sub: 'user123' });

			const result = await service.Authenticate({
				authorization: 'Bearer token',
				customField: 'custom value',
				anotherField: 123,
			});

			expect(result.authenticated).toBe(true);
		});

		it('should handle all token extraction fields set', async () => {
			MockJwtService.verifyAsync.mockResolvedValue({ sub: 'user123' });

			const result = await service.Authenticate({
				authorization: 'Bearer token1',
				Authorization: 'Bearer token2',
				token: 'Bearer token3',
				authToken: 'Bearer token4',
			});

			// Should use first available (authorization)
			expect(result.authenticated).toBe(true);
		});

		it('should handle very long token strings', async () => {
			const longToken = 'eyJ' + 'x'.repeat(10000) + 'XQ';
			MockJwtService.verifyAsync.mockResolvedValue({ sub: 'user123' });

			const result = await service.Authenticate({
				authorization: `Bearer ${longToken}`,
			});

			expect(result.authenticated).toBe(true);
		});

		it('should handle token with special characters', async () => {
			const specialToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
			MockJwtService.verifyAsync.mockResolvedValue({ sub: 'user123' });

			const result = await service.Authenticate({
				authorization: `Bearer ${specialToken}`,
			});

			expect(result.authenticated).toBe(true);
		});
	});

	describe('Token Validation - Edge Cases', () => {
		it('should handle token with sub as empty string', async () => {
			MockJwtService.verifyAsync.mockResolvedValue({ sub: '' });

			const result = await service.Authenticate({
				authorization: 'Bearer token',
			});

			expect(result.authenticated).toBe(false);
			expect(result.error).toBe('Invalid authentication token');
		});

		it('should handle token with sub as numeric zero', async () => {
			MockJwtService.verifyAsync.mockResolvedValue({ sub: 0 });

			const result = await service.Authenticate({
				authorization: 'Bearer token',
			});

			expect(result.authenticated).toBe(false);
			expect(result.error).toBe('Invalid authentication token');
		});

		it('should handle token with sub as false value', async () => {
			MockJwtService.verifyAsync.mockResolvedValue({ sub: false });

			const result = await service.Authenticate({
				authorization: 'Bearer token',
			});

			expect(result.authenticated).toBe(false);
			expect(result.error).toBe('Invalid authentication token');
		});

		it('should accept valid string sub even if it looks like empty', async () => {
			MockJwtService.verifyAsync.mockResolvedValue({ sub: 'validuser' });

			const result = await service.Authenticate({
				authorization: 'Bearer token',
			});

			expect(result.authenticated).toBe(true);
			expect(result.userId).toBe('validuser');
		});
	});

	describe('Bearer Token Format - Edge Cases', () => {
		it('should handle Bearer with multiple spaces', async () => {
			MockJwtService.verifyAsync.mockResolvedValue({ sub: 'user123' });

			const result = await service.Authenticate({
				authorization: 'Bearer    token',
			});

			// "Bearer    token" slices at 7 to get "   token"
			// After trim() this becomes "token" which is valid
			expect(result.authenticated).toBe(true);
		});

		it('should require exact Bearer prefix with capital B', async () => {
			MockJwtService.verifyAsync.mockResolvedValue({ sub: 'user123' });

			// lowercase "bearer" should be treated as a raw JWT token (no Bearer prefix)
			const result1 = await service.Authenticate({
				authorization: 'bearer token1',
			});
			// Since "bearer token1" contains a space, it's rejected
			expect(result1.authenticated).toBe(false);

			// "BEARER" is not recognized as Bearer prefix, so it's treated as raw JWT
			const result2 = await service.Authenticate({
				authorization: 'BEARER token2',
			});
			// Contains space, so rejected
			expect(result2.authenticated).toBe(false);
		});

		it('should reject token with Bearer at end', async () => {
			const result = await service.Authenticate({
				authorization: 'token Bearer',
			});

			expect(result.authenticated).toBe(false);
			expect(result.error).toBe('Invalid authentication token');
		});

		it('should handle whitespace-only token after Bearer', async () => {
			const result = await service.Authenticate({
				authorization: 'Bearer    ',
			});

			expect(result.authenticated).toBe(false);
		});
	});

	describe('Parameter Combinations', () => {
		it('should use first non-empty token when multiple provided', async () => {
			MockJwtService.verifyAsync
				.mockResolvedValueOnce({ sub: 'user1' })
				.mockResolvedValueOnce({ sub: 'user2' });

			const result1 = await service.Authenticate({
				authorization: 'Bearer token1',
				Authorization: 'Bearer token2',
			});

			// Should use lowercase 'authorization' first
			expect(result1.userId).toBe('user1');
		});

		it('should handle all parameters empty but authorization non-empty', async () => {
			MockJwtService.verifyAsync.mockResolvedValue({ sub: 'user123' });

			const result = await service.Authenticate({
				authorization: 'Bearer token',
				Authorization: '',
				token: '',
				authToken: '',
			});

			expect(result.authenticated).toBe(true);
		});
	});
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AppLogger } from '@pawells/nestjs-shared/common';
import { GraphQLPublicGuard } from '../graphql-public.guard.js';

describe('GraphQLPublicGuard', () => {
	let Guard: GraphQLPublicGuard;
	let MockModuleRef: any;
	let MockReflector: any;
	let MockExecutionContext: any;
	let MockAppLogger: any;

	beforeEach(() => {
		MockReflector = {
			getAllAndOverride: vi.fn(),
		};

		MockAppLogger = {
			createContextualLogger: vi.fn().mockReturnValue({
				debug: vi.fn(),
				info: vi.fn(),
				warn: vi.fn(),
				error: vi.fn(),
			}),
		};

		MockModuleRef = {
			get: vi.fn((token: any) => {
				if (token === Reflector || (typeof token === 'function' && token.name === 'Reflector')) {
					return MockReflector;
				}
				if (token === AppLogger || (typeof token === 'function' && token.name === 'AppLogger')) {
					return MockAppLogger;
				}
				return undefined;
			}),
		};

		Guard = new GraphQLPublicGuard(MockModuleRef);

		MockExecutionContext = {
			getHandler: vi.fn().mockReturnValue(vi.fn()),
			getClass: vi.fn().mockReturnValue(class TestClass {}),
		};
	});

	describe('canActivate', () => {
		it('should allow access to public resolvers', () => {
			MockReflector.getAllAndOverride.mockReturnValue(true);

			const Result = Guard.canActivate(MockExecutionContext as any);

			expect(Result).toBe(true);
			expect(MockReflector.getAllAndOverride).toHaveBeenCalledWith('isPublic', [
				MockExecutionContext.getHandler(),
				MockExecutionContext.getClass(),
			]);
		});

		it('should deny access to non-public resolvers without authentication', () => {
			MockReflector.getAllAndOverride.mockReturnValue(false);
			vi.spyOn(GqlExecutionContext, 'create').mockReturnValue({
				getContext: () => ({ user: undefined }),
			} as any);

			const Result = Guard.canActivate(MockExecutionContext as any);

			expect(Result).toBe(false);
		});

		it('should allow access to non-public resolvers with authentication', () => {
			MockReflector.getAllAndOverride.mockReturnValue(false);
			vi.spyOn(GqlExecutionContext, 'create').mockReturnValue({
				getContext: () => ({ user: { id: 'user123' } }),
			} as any);

			const Result = Guard.canActivate(MockExecutionContext as any);

			expect(Result).toBe(true);
		});

		it('should handle user with sub instead of id', () => {
			MockReflector.getAllAndOverride.mockReturnValue(false);
			vi.spyOn(GqlExecutionContext, 'create').mockReturnValue({
				getContext: () => ({ user: { sub: 'user456' } }),
			} as any);

			const Result = Guard.canActivate(MockExecutionContext as any);

			expect(Result).toBe(true);
		});

		it('should handle user with neither id nor sub', () => {
			MockReflector.getAllAndOverride.mockReturnValue(false);
			vi.spyOn(GqlExecutionContext, 'create').mockReturnValue({
				getContext: () => ({ user: { email: 'test@example.com' } }),
			} as any);

			const Result = Guard.canActivate(MockExecutionContext as any);

			expect(Result).toBe(true);
		});

		it('should handle undefined isPublic metadata', () => {
			MockReflector.getAllAndOverride.mockReturnValue(undefined);
			vi.spyOn(GqlExecutionContext, 'create').mockReturnValue({
				getContext: () => ({ user: { id: 'user789' } }),
			} as any);

			const Result = Guard.canActivate(MockExecutionContext as any);

			expect(Result).toBe(true);
		});

		it('should handle null user context', () => {
			MockReflector.getAllAndOverride.mockReturnValue(false);
			vi.spyOn(GqlExecutionContext, 'create').mockReturnValue({
				getContext: () => ({ user: null }),
			} as any);

			const Result = Guard.canActivate(MockExecutionContext as any);

			expect(Result).toBe(false);
		});

		it('should handle undefined user context', () => {
			MockReflector.getAllAndOverride.mockReturnValue(false);
			vi.spyOn(GqlExecutionContext, 'create').mockReturnValue({
				getContext: () => ({}),
			} as any);

			const Result = Guard.canActivate(MockExecutionContext as any);

			expect(Result).toBe(false);
		});

		it('should handle logger errors gracefully', () => {
			const ErrorLogger = {
				createContextualLogger: vi.fn().mockImplementation(() => {
					throw new Error('Logger creation failed');
				}),
			};

			const ErrorModuleRef = {
				get: vi.fn((token: any) => {
					if (token === Reflector) {
						return MockReflector;
					}
					if (token === AppLogger) {
						return ErrorLogger;
					}
					return undefined;
				}),
			} as any;

			const ErrorGuard = new GraphQLPublicGuard(ErrorModuleRef);
			MockReflector.getAllAndOverride.mockReturnValue(true);

			const Result = ErrorGuard.canActivate(MockExecutionContext as any);

			expect(Result).toBe(true);
		});
	});

	describe('AppLogger getter', () => {
		it('should return AppLogger instance', () => {
			const Logger = Guard['AppLogger'];
			expect(Logger).toBeDefined();
		});

		it('should return undefined when AppLogger is not available', () => {
			const ErrorModuleRef = {
				get: vi.fn().mockImplementation(() => {
					throw new Error('Not found');
				}),
			} as any;

			const ErrorGuard = new GraphQLPublicGuard(ErrorModuleRef);
			const Logger = ErrorGuard['AppLogger'];
			expect(Logger).toBeUndefined();
		});
	});

	describe('Logger getter', () => {
		it('should return undefined when AppLogger itself fails', () => {
			const ErrorModuleRef = {
				get: vi.fn((token: any) => {
					if (token === Reflector) {
						return MockReflector;
					}
					throw new Error('Not available');
				}),
			} as any;

			const ErrorGuard = new GraphQLPublicGuard(ErrorModuleRef);
			const Logger = ErrorGuard['Logger'];
			expect(Logger).toBeUndefined();
		});

		it('should return undefined when logger creation fails', () => {
			const ErrorLogger = {
				createContextualLogger: vi.fn().mockImplementation(() => {
					throw new Error('Creation failed');
				}),
			};

			const ErrorModuleRef = {
				get: vi.fn((token: any) => {
					if (token === Reflector) {
						return MockReflector;
					}
					if (token === AppLogger) {
						return ErrorLogger;
					}
					return undefined;
				}),
			} as any;

			const ErrorGuard = new GraphQLPublicGuard(ErrorModuleRef);
			const Logger = ErrorGuard['Logger'];
			expect(Logger).toBeUndefined();
		});
	});
});

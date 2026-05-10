import { describe,it,expect } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { GraphQLErrorFormatter } from '../error-formatter.js';
import { GraphQLErrorCode } from '../error-codes.js';

describe('GraphQLErrorFormatter', () => {
	describe('formatError', () => {
		it('should format a basic GraphQL error', () => {
			const formatter = new GraphQLErrorFormatter();
			const error = new GraphQLError('Test error');

			const formatted = formatter.FormatError(error);

			expect(formatted.message).toBeDefined();
			expect((formatted.extensions as any)).toBeDefined();
			expect((formatted.extensions as any).code).toBeDefined();
			expect((formatted.extensions as any).timestamp).toBeDefined();
		});

		it('should include user context in error object', () => {
			const formatter = new GraphQLErrorFormatter();
			const error = new GraphQLError('Test error');
			const request = {
				user: { id: 'user_123', email: 'test@example.com' },
				operationName: 'GetUser',
			} as any;

			const formatted = formatter.FormatError(error, request);

			expect((formatted.extensions as any)).toBeDefined();
			expect((formatted.extensions as any).userId).toBe('user_123');
			expect((formatted.extensions as any).operationName).toBe('GetUser');
			expect((formatted.extensions as any).timestamp).toBeDefined();
		});

		it('should include error code in extensions', () => {
			const formatter = new GraphQLErrorFormatter();
			const error = new GraphQLError('Invalid input');
			(error as any).originalError = new BadRequestException('Invalid input');
			const request = {} as any;

			const formatted = formatter.FormatError(error, request);

			expect((formatted.extensions as any).code).toBeDefined();
			expect((formatted.extensions as any).statusCode).toBeDefined();
		});

		it('should handle missing user context gracefully', () => {
			const formatter = new GraphQLErrorFormatter();
			const error = new GraphQLError('Test error');
			const request = {
				operationName: 'GetUser',
			} as any;

			const formatted = formatter.FormatError(error, request);

			expect((formatted.extensions as any)).toBeDefined();
			expect((formatted.extensions as any).userId).toBeUndefined();
			expect((formatted.extensions as any).operationName).toBe('GetUser');
		});

		it('should handle missing operationName gracefully', () => {
			const formatter = new GraphQLErrorFormatter();
			const error = new GraphQLError('Test error');
			const request = {
				user: { id: 'user_456' },
			} as any;

			const formatted = formatter.FormatError(error, request);

			expect((formatted.extensions as any)).toBeDefined();
			expect((formatted.extensions as any).userId).toBe('user_456');
			expect((formatted.extensions as any).operationName).toBeUndefined();
		});

		it('should include timestamp in all errors', () => {
			const formatter = new GraphQLErrorFormatter();
			const error = new GraphQLError('Test error');
			const request = {} as any;

			const formatted = formatter.FormatError(error, request);

			expect((formatted.extensions as any).timestamp).toBeDefined();
			expect(typeof (formatted.extensions as any).timestamp).toBe('string');
		});

		it('should handle null/undefined context', () => {
			const formatter = new GraphQLErrorFormatter();
			const error = new GraphQLError('Test error');

			const formatted = formatter.FormatError(error, undefined);

			expect((formatted.extensions as any)).toBeDefined();
			expect((formatted.extensions as any).timestamp).toBeDefined();
		});

		it('should extract user id from nested user object', () => {
			const formatter = new GraphQLErrorFormatter();
			const error = new GraphQLError('Test error');
			const request = {
				user: { id: 'nested_user_id', name: 'John' },
			} as any;

			const formatted = formatter.FormatError(error, request);

			expect((formatted.extensions as any).userId).toBe('nested_user_id');
		});

		it('should preserve other extensions when adding context', () => {
			const formatter = new GraphQLErrorFormatter();
			const error = new GraphQLError('Test error');
			(error as any).originalError = new BadRequestException('Bad request');
			const request = {
				user: { id: 'user_789' },
				operationName: 'CreateUser',
			} as any;

			const formatted = formatter.FormatError(error, request);

			expect((formatted.extensions as any).userId).toBe('user_789');
			expect((formatted.extensions as any).operationName).toBe('CreateUser');
			expect((formatted.extensions as any).timestamp).toBeDefined();
		});
	});

	describe('formatError - application errors', () => {
		it('should detect and format application errors with code', () => {
			const error = new GraphQLError('App error');
			(error as any).originalError = { code: GraphQLErrorCode.INTERNAL_ERROR, message: 'Internal error' };

			const formatter = new GraphQLErrorFormatter();
			const formatted = formatter.FormatError(error);

			expect((formatted.extensions as any).code).toBe(GraphQLErrorCode.INTERNAL_ERROR);
		});

		it('should format application errors with details', () => {
			const error = new GraphQLError('App error');
			(error as any).originalError = {
				code: GraphQLErrorCode.INTERNAL_ERROR,
				message: 'Internal error',
				details: { reason: 'test' },
			};

			const formatter = new GraphQLErrorFormatter();
			const formatted = formatter.FormatError(error);

			expect((formatted.extensions as any).details).toBeDefined();
			expect((formatted.extensions as any).details.reason).toBe('test');
		});
	});

	describe('formatError - validation errors', () => {
		it('should detect and format validation errors with message', () => {
			const error = new GraphQLError('Validation error');
			(error as any).originalError = { message: 'validation failed' };

			const formatter = new GraphQLErrorFormatter();
			const formatted = formatter.FormatError(error);

			expect((formatted.extensions as any).code).toBe(GraphQLErrorCode.BAD_USER_INPUT);
			expect(formatted.message).toContain('Validation');
		});

		it('should detect validation errors with errors array', () => {
			const error = new GraphQLError('Validation error');
			(error as any).originalError = {
				errors: [
					{ property: 'email', constraints: { isEmail: 'invalid' } },
				],
			};

			const formatter = new GraphQLErrorFormatter();
			const formatted = formatter.FormatError(error);

			expect((formatted.extensions as any).code).toBe(GraphQLErrorCode.BAD_USER_INPUT);
			expect((formatted.extensions as any).validationErrors).toBeDefined();
		});

		it('should extract validation errors with property', () => {
			const error = new GraphQLError('Validation error');
			(error as any).originalError = {
				errors: [
					{ property: 'username', constraints: { minLength: 'too short' } },
					{ property: 'password', constraints: { required: 'required' } },
				],
			};

			const formatter = new GraphQLErrorFormatter();
			const formatted = formatter.FormatError(error);

			expect((formatted.extensions as any).validationErrors.length).toBe(2);
			expect((formatted.extensions as any).validationErrors[0].field).toBe('username');
		});
	});

	describe('formatError - authentication errors', () => {
		it('should detect UnauthorizedException by name', () => {
			const error = new GraphQLError('Auth error');
			(error as any).originalError = { name: 'UnauthorizedException', message: 'Not authenticated' };

			const formatter = new GraphQLErrorFormatter();
			const formatted = formatter.FormatError(error);

			expect((formatted.extensions as any).code).toBe(GraphQLErrorCode.UNAUTHENTICATED);
		});

		it('should detect authentication errors by message', () => {
			const error = new GraphQLError('Auth error');
			(error as any).originalError = { message: 'authentication failed' };

			const formatter = new GraphQLErrorFormatter();
			const formatted = formatter.FormatError(error);

			expect((formatted.extensions as any).code).toBe(GraphQLErrorCode.UNAUTHENTICATED);
		});

		it('should detect token errors by message', () => {
			const error = new GraphQLError('Auth error');
			(error as any).originalError = { message: 'invalid token' };

			const formatter = new GraphQLErrorFormatter();
			const formatted = formatter.FormatError(error);

			expect((formatted.extensions as any).code).toBe(GraphQLErrorCode.UNAUTHENTICATED);
		});
	});

	describe('formatError - authorization errors', () => {
		it('should detect ForbiddenException by name', () => {
			const error = new GraphQLError('Authz error');
			(error as any).originalError = { name: 'ForbiddenException', message: 'Forbidden' };

			const formatter = new GraphQLErrorFormatter();
			const formatted = formatter.FormatError(error);

			expect((formatted.extensions as any).code).toBe(GraphQLErrorCode.FORBIDDEN);
		});

		it('should detect authorization errors by permission message', () => {
			const error = new GraphQLError('Authz error');
			(error as any).originalError = { message: 'permission denied' };

			const formatter = new GraphQLErrorFormatter();
			const formatted = formatter.FormatError(error);

			expect((formatted.extensions as any).code).toBe(GraphQLErrorCode.FORBIDDEN);
		});

		it('should detect authorization errors by forbidden message', () => {
			const error = new GraphQLError('Authz error');
			(error as any).originalError = { message: 'forbidden' };

			const formatter = new GraphQLErrorFormatter();
			const formatted = formatter.FormatError(error);

			expect((formatted.extensions as any).code).toBe(GraphQLErrorCode.FORBIDDEN);
		});
	});

	describe('formatError - rate limit errors', () => {
		it('should detect RateLimitException by name', () => {
			const error = new GraphQLError('Rate limit error');
			(error as any).originalError = { name: 'RateLimitException', message: 'Too many requests' };

			const formatter = new GraphQLErrorFormatter();
			const formatted = formatter.FormatError(error);

			expect((formatted.extensions as any).code).toBe(GraphQLErrorCode.RATE_LIMIT_EXCEEDED);
		});

		it('should detect rate limit errors by rate limit message', () => {
			const error = new GraphQLError('Rate limit error');
			(error as any).originalError = { message: 'rate limit exceeded' };

			const formatter = new GraphQLErrorFormatter();
			const formatted = formatter.FormatError(error);

			expect((formatted.extensions as any).code).toBe(GraphQLErrorCode.RATE_LIMIT_EXCEEDED);
		});

		it('should detect rate limit errors by too many requests message', () => {
			const error = new GraphQLError('Rate limit error');
			(error as any).originalError = { message: 'too many requests' };

			const formatter = new GraphQLErrorFormatter();
			const formatted = formatter.FormatError(error);

			expect((formatted.extensions as any).code).toBe(GraphQLErrorCode.RATE_LIMIT_EXCEEDED);
		});
	});

	describe('formatError - generic errors', () => {
		it('should handle errors without originalError', () => {
			const error = new GraphQLError('Generic error');

			const formatter = new GraphQLErrorFormatter();
			const formatted = formatter.FormatError(error);

			expect((formatted.extensions as any).code).toBe(GraphQLErrorCode.INTERNAL_ERROR);
		});

		it('should extract status code from originalError getStatus method', () => {
			const error = new GraphQLError('Error with status');
			(error as any).originalError = {
				getStatus: () => 500,
				message: 'Server error',
			};

			const formatter = new GraphQLErrorFormatter();
			const formatted = formatter.FormatError(error);

			expect((formatted.extensions as any).statusCode).toBe(500);
		});

		it('should extract status code from originalError status property', () => {
			const error = new GraphQLError('Error with status');
			(error as any).originalError = {
				status: 400,
				message: 'Bad request',
			};

			const formatter = new GraphQLErrorFormatter();
			const formatted = formatter.FormatError(error);

			expect((formatted.extensions as any).statusCode).toBe(400);
		});

		it('should extract status code from originalError statusCode property', () => {
			const error = new GraphQLError('Error with statusCode');
			(error as any).originalError = {
				statusCode: 403,
				message: 'Forbidden',
			};

			const formatter = new GraphQLErrorFormatter();
			const formatted = formatter.FormatError(error);

			expect((formatted.extensions as any).statusCode).toBe(403);
		});
	});

	describe('extractValidationErrors', () => {
		it('should handle array of errors with constraints', () => {
			const error = new GraphQLError('Validation error');
			(error as any).originalError = {
				errors: [
					{ property: 'field1', constraints: { required: 'Field required' } },
					{ property: 'field2', constraints: { min: 'Minimum value is 0' } },
				],
			};

			const formatter = new GraphQLErrorFormatter();
			const formatted = formatter.FormatError(error);

			expect((formatted.extensions as any).validationErrors).toHaveLength(2);
		});

		it('should handle direct array wrapped in errors property', () => {
			const error = new GraphQLError('Validation error');
			(error as any).originalError = {
				errors: [
					{ property: 'email', constraints: { isEmail: 'Invalid email' } },
				],
			};

			const formatter = new GraphQLErrorFormatter();
			const formatted = formatter.FormatError(error);

			expect((formatted.extensions as any).validationErrors).toBeDefined();
			expect((formatted.extensions as any).validationErrors[0].field).toBe('email');
		});

		it('should handle error without errors property', () => {
			const error = new GraphQLError('Validation error');
			(error as any).originalError = {
				message: 'validation failed',
			};

			const formatter = new GraphQLErrorFormatter();
			const formatted = formatter.FormatError(error);

			expect((formatted.extensions as any).validationErrors).toBeDefined();
			expect((formatted.extensions as any).validationErrors[0].message).toBe('validation failed');
		});
	});
});

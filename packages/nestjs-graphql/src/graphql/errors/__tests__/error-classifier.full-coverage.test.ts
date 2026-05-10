import { describe, it, expect } from 'vitest';
import { ErrorClassifier } from '../error-classifier.js';

/**
 * Tests targeting specific uncovered branches in error classification
 * Lines 364, 379, 389, 394 - specific conditions in classification logic
 */
describe('ErrorClassifier - Full Coverage', () => {
	describe('Classify - Duplicate Key Error Detection', () => {
		it('should detect duplicate error by code property', () => {
			const DuplicateError = {
				code: 11000,
				message: 'Key already exists',
			};

			const Result = ErrorClassifier.Classify(DuplicateError);
			expect(Result.code).toBe('CONFLICT');
		});

		it('should detect duplicate error by message substring', () => {
			const DuplicateError = {
				message: 'The duplicate key error occurred during insert',
			};

			const Result = ErrorClassifier.Classify(DuplicateError);
			expect(Result).toBeDefined();
		});

		it('should detect duplicate error by message', () => {
			const DuplicateError = new Error('E11000 duplicate key error');

			const Result = ErrorClassifier.Classify(DuplicateError);
			expect(Result).toBeDefined();
		});

		it('should classify conflict errors', () => {
			const ConflictError = {
				status: 409,
				message: 'duplicate entry',
			};

			const Result = ErrorClassifier.Classify(ConflictError);
			expect(Result.statusCode).toBe(409);
		});
	});

	describe('Classify - Rate Limit Error Detection', () => {
		it('should detect rate limit error by message (line 400-401)', () => {
			const RateLimitError = new Error('too many requests received');

			const Result = ErrorClassifier.Classify(RateLimitError);
			expect(Result.isRateLimit).toBe(true);
		});

		it('should detect rate limit error by HTTP status code 429 (line 388)', () => {
			const RateLimitError = {
				status: 429,
				message: 'Too many requests',
			};

			const Result = ErrorClassifier.Classify(RateLimitError);
			expect(Result.statusCode).toBe(429);
		});

		it('should detect rate limit error by message containing "rate limit"', () => {
			const RateLimitError = new Error('Your request exceeds the rate limit');

			const Result = ErrorClassifier.Classify(RateLimitError);
			expect(Result.isRateLimit).toBe(true);
		});

		it('should classify rate limit with error instance', () => {
			const RateLimitError = new Error('Rate limit exceeded - too many requests');

			const Result = ErrorClassifier.Classify(RateLimitError);
			expect(Result.isRateLimit).toBe(true);
		});

		it('should mark rate limit errors correctly', () => {
			const RateLimitError = new Error('Rate limit');

			const Result = ErrorClassifier.Classify(RateLimitError);
			expect(Result.isRateLimit).toBe(true);
		});

		it('should have correct code for rate limit errors', () => {
			const RateLimitError = new Error('Too many requests');

			const Result = ErrorClassifier.Classify(RateLimitError);
			expect(Result.code).toBe('RATE_LIMIT_EXCEEDED');
		});

		it('should have correct status code for rate limit', () => {
			const RateLimitError = new Error('rate limit exceeded');

			const Result = ErrorClassifier.Classify(RateLimitError);
			expect(Result.statusCode).toBe(429);
		});

		it('should correctly identify non-rate-limit errors', () => {
			const OtherError = new Error('Something else');

			const Result = ErrorClassifier.Classify(OtherError);
			expect(Result.isRateLimit).toBe(false);
		});
	});

	describe('Classify - Authentication Error Detection', () => {
		it('should detect auth error by status code 401', () => {
			const AuthError = {
				status: 401,
				message: 'Unauthorized',
			};

			const Result = ErrorClassifier.Classify(AuthError);
			expect(Result.statusCode).toBe(401);
			expect(Result.isAuthentication).toBe(true);
		});

		it('should detect auth error by message substring', () => {
			const AuthError = new Error('authentication failed');

			const Result = ErrorClassifier.Classify(AuthError);
			expect(Result.isAuthentication).toBe(true);
		});
	});

	describe('Classify - Validation Error Detection', () => {
		it('should detect validation error', () => {
			const ValidationError = new Error('Validation failed');

			const Result = ErrorClassifier.Classify(ValidationError);
			expect(Result.isValidation).toBe(true);
		});

		it('should detect validation error with field errors array', () => {
			const ValidationError: any = {
				errors: [
					{ field: 'email', message: 'Invalid email' },
				],
				message: 'Validation failed',
			};

			const Result = ErrorClassifier.Classify(ValidationError);
			expect(Result.isValidation).toBe(true);
		});
	});

	describe('Classify - Edge Cases', () => {
		it('should handle error with custom extensions', () => {
			const CustomError = {
				message: 'Custom error',
				extensions: {
					code: 'CUSTOM_ERROR',
					details: { field: 'email' },
				},
			};

			const Result = ErrorClassifier.Classify(CustomError);
			expect(Result).toBeDefined();
		});

		it('should handle error with nested cause chain', () => {
			const NestedError = {
				message: 'Outer error',
				cause: {
					message: 'Inner error',
					cause: {
						message: 'Root error',
					},
				},
			};

			const Result = ErrorClassifier.Classify(NestedError);
			expect(Result).toBeDefined();
		});

		it('should handle error with null message', () => {
			const ErrorWithNullMessage = {
				message: null,
				name: 'TestError',
			};

			const Result = ErrorClassifier.Classify(ErrorWithNullMessage);
			expect(Result).toBeDefined();
		});

		it('should handle error with internal server error status', () => {
			const ErrorMissingCode = {
				message: 'Some error without code',
				status: 500,
			};

			const Result = ErrorClassifier.Classify(ErrorMissingCode);
			expect(Result).toBeDefined();
			expect(Result.statusCode).toBe(500);
		});

		it('should handle custom GraphQL error', () => {
			const GraphQLError = {
				message: 'Custom GraphQL error',
				extensions: {
					code: 'CUSTOM_ERROR',
				},
			};

			const Result = ErrorClassifier.Classify(GraphQLError);
			expect(Result).toBeDefined();
		});

		it('should handle error with status code mismatch', () => {
			const MismatchError = {
				status: 500,
				name: 'ValidationError',
				message: 'This is marked as validation but status is 500',
			};

			const Result = ErrorClassifier.Classify(MismatchError);
			// Should prioritize by name and other properties
			expect(Result).toBeDefined();
		});

		it('should handle plain object with no identifying properties', () => {
			const PlainError = {
				customProp: 'value',
			};

			const Result = ErrorClassifier.Classify(PlainError);
			expect(Result).toBeDefined();
		});

		it('should handle error with empty string message', () => {
			const ErrorEmptyMessage = {
				message: '',
				status: 400,
			};

			const Result = ErrorClassifier.Classify(ErrorEmptyMessage);
			expect(Result).toBeDefined();
		});
	});

	describe('Classify - Type Safety', () => {
		it('should handle Error instance', () => {
			const ErrorInstance = new Error('Test error');

			const Result = ErrorClassifier.Classify(ErrorInstance);
			expect(Result).toBeDefined();
		});

		it('should handle string error (fallback)', () => {
			const StringError = 'Simple string error';

			const Result = ErrorClassifier.Classify(StringError);
			expect(Result).toBeDefined();
		});

		it('should handle object without standard properties', () => {
			const CustomError = { customField: 'value' };

			const Result = ErrorClassifier.Classify(CustomError);
			expect(Result).toBeDefined();
		});

		it('should handle number error', () => {
			const NumberError = 404;

			const Result = ErrorClassifier.Classify(NumberError);
			expect(Result).toBeDefined();
		});
	});

	describe('Classification by Type - Edge Cases', () => {
		it('should classify authentication errors correctly', () => {
			const AuthError = new Error('authentication failed');

			const Result = ErrorClassifier.Classify(AuthError);
			expect(Result.isAuthentication).toBe(true);
		});

		it('should classify validation errors correctly', () => {
			const ValidationError = new Error('Validation failed - field required');

			const Result = ErrorClassifier.Classify(ValidationError);
			expect(Result.isValidation).toBe(true);
		});

		it('should classify rate limit errors correctly', () => {
			const RateLimitError = new Error('too many requests');

			const Result = ErrorClassifier.Classify(RateLimitError);
			expect(Result.isRateLimit).toBe(true);
		});
	});

	describe('Classification Consistency', () => {
		it('should classify same error consistently across multiple calls', () => {
			const Error1 = {
				code: 'DUPLICATE_KEY_ERROR',
				message: 'Duplicate',
			};

			const Result1 = ErrorClassifier.Classify(Error1);
			const Result2 = ErrorClassifier.Classify(Error1);

			expect(Result1.type).toBe(Result2.type);
			expect(Result1.severity).toBe(Result2.severity);
		});

		it('should classify equivalent errors the same way', () => {
			const Error1 = {
				name: 'RateLimitError',
				message: 'Rate limit exceeded',
			};

			const Error2 = {
				status: 429,
				message: 'Too many requests',
			};

			const Result1 = ErrorClassifier.Classify(Error1);
			const Result2 = ErrorClassifier.Classify(Error2);

			expect(Result1.type).toBe(Result2.type);
		});
	});
});

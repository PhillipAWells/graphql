import { Injectable, PipeTransform, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';
import xss from 'xss';
import { AppLogger } from '@pawells/nestjs-shared/common';
import type { IContextualLogger } from '@pawells/nestjs-shared/common';

// Maximum allowed JSON-serialized input size in characters (approx. 100KB)
const MAX_GRAPHQL_INPUT_SIZE = 100_000;

/**
 * GraphQL Input Validation Pipe
 *
 * Specialized validation pipe for GraphQL input objects.
 * Validates nested objects, provides detailed field-level error messages,
 * and performs XSS security checks on string fields.
 *
 * @example
 * ```typescript
 * @UsePipes(GraphqlInputValidationPipe)
 * @Mutation(() => IUser, { name: 'UpdateUser' })
 * async updateUser(@Args('input') input: UpdateUserInput): Promise<IUser> {
 *   // Nested input validation with detailed errors
 * }
 * ```
 */
@Injectable()
export class GraphQLInputValidationPipe implements PipeTransform<unknown> {
	// eslint-disable-next-line @typescript-eslint/prefer-readonly
	private ModuleRef?: ModuleRef;

	private get AppLogger(): AppLogger | undefined {
		return this.ModuleRef?.get(AppLogger, { strict: false });
	}

	private get Logger(): IContextualLogger | undefined {
		return this.AppLogger?.createContextualLogger(GraphQLInputValidationPipe.name);
	}

	constructor(moduleRef?: ModuleRef) {
		this.ModuleRef = moduleRef;
	}

	private readonly MAX_INPUT_SIZE = MAX_GRAPHQL_INPUT_SIZE;

	// XSS-specific patterns only — SQL/NoSQL injection protection is handled by
	// parameterized queries at the database layer, not by input string matching.
	private readonly XSS_PATTERNS = [
		/<script\b[^>]*>/i,       // Script tag injection
		/javascript\s*:/i,        // JavaScript protocol in URLs
		/on(?:error|load|click|mouse\w+|focus|blur)\s*=/i, // Event handler injection
	];

	/**
	 * Transforms and validates GraphQL input data
	 *
	 * @param value - The input value to validate
	 * @param metadata - Metadata about the argument
	 * @returns The validated and transformed value
	 */
	public async transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
		const { metatype } = metadata;

		// Skip validation for primitive types and null/undefined
		if (!metatype || !this.ShouldValidate(metatype) || value === null) {
			return value;
		}

		// Perform security checks before validation
		this.PerformSecurityChecks(value);

		// Transform plain object to class instance
		const TransformedObject = plainToClass(metatype, value);

		// Validate with nested validation enabled
		const Errors = await validate(TransformedObject, {
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
			skipMissingProperties: false,
			stopAtFirstError: false,
		});

		if (Errors.length > 0) {
			const FormattedErrors = this.FormatDetailedErrors(Errors);
			this.Logger?.warn(`Input validation failed: ${JSON.stringify(FormattedErrors)}`);

			throw new BadRequestException({
				message: 'Input validation failed',
				code: 'VALIDATION_ERROR',
				errors: FormattedErrors,
			});
		}

		return TransformedObject;
	}

	/**
	 * Performs security checks on input data to detect XSS patterns
	 *
	 * @param value - The input value to check
	 * @throws BadRequestException if suspicious patterns detected
	 */
	private PerformSecurityChecks(value: unknown): void {
		// Check for circular references before attempting JSON.stringify
		if (this.HasCircularReferences(value)) {
			this.Logger?.warn('Circular reference detected in input data');
			throw new BadRequestException({
				message: 'Invalid input structure detected',
				code: 'CIRCULAR_REFERENCE_DETECTED',
			});
		}

		// Check input size
		let InputSize: number;
		try {
			InputSize = Buffer.byteLength(JSON.stringify(value), 'utf8');
		} catch (error) {
			// Fallback error handling if JSON.stringify fails despite circular check
			this.Logger?.warn(`Failed to serialize input: ${error instanceof Error ? error.message : 'Unknown error'}`);
			throw new BadRequestException({
				message: 'Invalid input structure detected',
				code: 'INVALID_INPUT_STRUCTURE',
			});
		}

		if (InputSize > this.MAX_INPUT_SIZE) {
			this.Logger?.warn(`Input size ${InputSize} exceeds maximum of ${this.MAX_INPUT_SIZE}`);
			throw new BadRequestException({
				message: 'Input data exceeds maximum size limit',
				code: 'INPUT_SIZE_EXCEEDED',
			});
		}

		// Recursively check string fields for XSS patterns
		this.CheckForXssPatterns(value);
	}

	/**
	 * Checks a string for XSS attacks using the xss library
	 *
	 * SECURITY: Uses the `xss` library to detect and prevent encoded XSS attacks
	 * that simple regex patterns might miss (e.g., unicode escapes, case variations).
	 *
	 * @param value - The string to check
	 * @param path - The path to the field (for logging)
	 * @throws BadRequestException if XSS detected
	 */
	private CheckForXssWithLibrary(value: string, path: string): void {
		try {
			const Cleaned = xss(value);
			if (Cleaned !== value) {
				// XSS library detected and modified the input
				this.Logger?.warn(`Potential XSS attack detected (via xss library) at ${path}`);
				throw new BadRequestException({
					message: 'Invalid characters or patterns detected in input',
					code: 'XSS_DETECTED',
				});
			}
		} catch (error) {
			// If xss library throws, treat as XSS detection failure
			if (error instanceof BadRequestException) {
				throw error;
			}
			this.Logger?.warn(`XSS library error at ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
			throw new BadRequestException({
				message: 'Invalid characters or patterns detected in input',
				code: 'XSS_DETECTED',
			});
		}
	}

	/**
	 * Recursively checks object properties for XSS patterns.
	 * Uses both regex patterns and the xss library for defense-in-depth.
	 * SQL/NoSQL injection is prevented at the database layer via parameterized queries.
	 */
	private CheckForXssPatterns(obj: unknown, path = ''): void {
		if (typeof obj !== 'object' || obj === null) {
			if (typeof obj === 'string') {
				// First check with regex patterns
				for (const Pattern of this.XSS_PATTERNS) {
					if (Pattern.test(obj)) {
						this.Logger?.warn(`Potential XSS attack detected (regex) at ${path}`);
						throw new BadRequestException({
							message: 'Invalid characters or patterns detected in input',
							code: 'XSS_DETECTED',
						});
					}
				}
				// Then check with xss library for encoded/variant attacks
				this.CheckForXssWithLibrary(obj, path);
			}
			return;
		}

		for (const Key in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, Key)) {
				const Value = (obj as Record<string, unknown>)[Key];
				const CurrentPath = path ? `${path}.${Key}` : Key;

				if (typeof Value === 'string') {
					// First check with regex patterns
					for (const Pattern of this.XSS_PATTERNS) {
						if (Pattern.test(Value)) {
							this.Logger?.warn(`Potential XSS attack detected (regex) at ${CurrentPath}`);
							throw new BadRequestException({
								message: 'Invalid characters or patterns detected in input',
								code: 'XSS_DETECTED',
							});
						}
					}
					// Then check with xss library for encoded/variant attacks
					this.CheckForXssWithLibrary(Value, CurrentPath);
				} else if (typeof Value === 'object' && Value !== null) {
					this.CheckForXssPatterns(Value, CurrentPath);
				}
			}
		}
	}

	/**
	 * Detects circular references in an object graph.
	 * Uses a WeakSet to track visited objects with O(1) lookup.
	 *
	 * @param obj - The object to check
	 * @param visited - WeakSet of already visited objects
	 * @returns boolean - True if a circular reference is detected
	 */
	private HasCircularReferences(obj: unknown, visited = new WeakSet<object>()): boolean {
		if (typeof obj !== 'object' || obj === null) {
			return false;
		}

		// Array types are checked as objects
		if (Array.isArray(obj)) {
			if (visited.has(obj)) {
				return true;
			}
			visited.add(obj);

			for (const Item of obj) {
				if (this.HasCircularReferences(Item, visited)) {
					return true;
				}
			}
			return false;
		}

		// Object type check
		if (visited.has(obj)) {
			return true;
		}
		visited.add(obj);

		for (const Key in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, Key)) {
				if (this.HasCircularReferences((obj as Record<string, unknown>)[Key], visited)) {
					return true;
				}
			}
		}

		return false;
	}

	/**
	 * Determines if the metatype should be validated
	 *
	 * @param metatype - The type to check
	 * @returns boolean - True if validation should be performed
	 */
	private ShouldValidate(metatype: unknown): boolean {
		const PrimitiveTypes: unknown[] = [String, Boolean, Number, Array, Object, Date];
		return !PrimitiveTypes.includes(metatype);
	}

	/**
	 * Formats validation errors with detailed field-level information
	 *
	 * @param errors - The validation errors
	 * @param parentPath - The parent path for nested errors
	 * @returns Detailed error objects
	 */
	private FormatDetailedErrors(errors: ValidationError[], parentPath = ''): Array<Record<string, unknown>> {
		const FormattedErrors: Array<Record<string, unknown>> = [];

		for (const ValidationErr of errors) {
			const FieldPath = parentPath ? `${parentPath}.${ValidationErr.property}` : ValidationErr.property;

			// Add constraints for this field
			if (ValidationErr.constraints) {
				FormattedErrors.push({
					field: FieldPath,
					value: ValidationErr.value,
					constraints: ValidationErr.constraints,
				});
			}

			// Handle nested validation errors
			if (ValidationErr.children && ValidationErr.children.length > 0) {
				const NestedErrors = this.FormatDetailedErrors(ValidationErr.children, FieldPath);
				FormattedErrors.push(...NestedErrors);
			}
		}

		return FormattedErrors;
	}
}

import { Injectable, ExecutionContext, UnauthorizedException, CanActivate } from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { ILazyModuleRefService, IContextualLogger } from '@pawells/nestjs-shared/common';
import { AppLogger } from '@pawells/nestjs-shared/common';
import { IS_PUBLIC_KEY } from '../decorators/index.js';

/**
 * GraphQL Authentication Guard
 *
 * Checks if a request has a valid Passport-authenticated user.
 * This guard does NOT verify JWT tokens itself; it assumes prior Passport middleware or guards have already validated the token and populated request.user.
 *
 * Important: This guard requires Passport authentication to be set up and executed BEFORE this guard runs.
 * If request.user is not populated (authentication not completed), this guard throws UnauthorizedException.
 *
 * @remarks
 * - Does NOT perform JWT verification directly
 * - Relies on Passport middleware/guards to populate request.user
 * - Throws UnauthorizedException (401) if user is not authenticated
 * - Use alongside @pawells/nestjs-auth module which provides Passport integration
 *
 * @example
 * ```typescript
 * // AuthModule.forRoot() must be imported first to set up Passport
 * // Then this guard can be used to enforce authentication
 * @UseGuards(GraphQLAuthGuard)
 * @Query(() => IUser, { name: 'GetUser' })
 * async getUser(@CurrentUser() user: IUser): Promise<IUser> {
 *   // This resolver is protected and requires valid authentication
 *   return user;
 * }
 * ```
 */
@Injectable()
export class GraphQLAuthGuard implements CanActivate, ILazyModuleRefService {
	public readonly Module: ModuleRef;

	private get AppLogger(): AppLogger | undefined {
		try {
			return this.Module.get(AppLogger, { strict: false });
		} catch {
			return undefined;
		}
	}

	private get Logger(): IContextualLogger | undefined {
		try {
			return this.AppLogger?.createContextualLogger(GraphQLAuthGuard.name);
		} catch {
			return undefined;
		}
	}

	private readonly Reflector: Reflector;

	constructor(moduleRef: ModuleRef, reflector: Reflector) {
		this.Module = moduleRef;
		this.Reflector = reflector;
	}

	/**
	 * Determines if the current request can proceed
	 *
	 * @param context - The execution context
	 * @returns boolean - True if authenticated or public, throws exception otherwise
	 */
	public canActivate(context: ExecutionContext): boolean {
		// Check if resolver is marked as @Public() - skip authentication
		const IsPublic = this.Reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (IsPublic) {
			return true;
		}

		// Extract GraphQL context
		const GqlContext = GqlExecutionContext.create(context);
		const Request = GqlContext.getContext().req;

		// Extract token from Authorization header
		const Token = this.ExtractTokenFromHeader(Request);

		if (!Token) {
			this.Logger?.warn('No authentication token provided');
			throw new UnauthorizedException('Authentication required');
		}

		// Verify request.user is populated (set by a Passport strategy upstream)
		const { user } = Request;
		if (!user) {
			this.Logger?.warn('Authentication token invalid: user not found on request');
			throw new UnauthorizedException('Invalid authentication token');
		}

		// Propagate user into GraphQL context for resolvers
		GqlContext.getContext().user = user;

		return true;
	}

	/**
	 * Extracts JWT token from Authorization header
	 *
	 * SECURITY: Uses strict space-only splitting (not /\s+/) to prevent header injection
	 * via tab, newline, or other whitespace characters. Also validates token presence
	 * and bounds before returning.
	 *
	 * @param request - The HTTP request object
	 * @returns string | null - The extracted token or null
	 */
	protected ExtractTokenFromHeader(
		request: { headers?: { authorization?: string } },
	): string | null {
		const AuthHeader: unknown = request.headers?.authorization;

		if (AuthHeader && typeof AuthHeader === 'string') {
			// SECURITY: Use strict space-only split, not /\s+/ which allows tab/newline injection
			const Parts = AuthHeader.split(' ');
			if (Parts.length === 2 && Parts[0]?.toLowerCase() === 'bearer' && Parts[1]) {
				return Parts[1];
			}
		}

		return null;
	}
}

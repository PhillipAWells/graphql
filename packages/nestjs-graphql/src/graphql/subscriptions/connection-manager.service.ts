declare global {
	namespace NodeJS {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		interface Timeout {}
	}
}

import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { ILazyModuleRefService } from '@pawells/nestjs-shared/common';
import { AppLogger } from '@pawells/nestjs-shared/common';
import { WebSocket } from 'ws';
import type { ISubscriptionConfig } from './subscription-config.interface.js';
import { MAX_WEBSOCKET_CONNECTIONS } from '../constants/subscriptions.constants.js';

/**
 * WebSocket-like type for connection tracking
 * Allows both real WebSocket instances and mock objects with id property (for testing)
 */
type TWebSocketLike = WebSocket | (Record<string, unknown> & { id?: string });

/**
 * Service for managing WebSocket connections and subscriptions
 */
@Injectable()
export class ConnectionManagerService implements ILazyModuleRefService {
	public readonly Module: ModuleRef;
	private readonly Logger: AppLogger;

	private readonly Connections = new Map<string, Set<TWebSocketLike>>();

	private readonly Subscriptions = new Map<string, Set<string>>();

	/**
	 * Stores connection creation timestamps for consolidated timeout check
	 * Changed from NodeJS.Timeout to number (timestamp) since we use a shared interval now
	 */
	private readonly ConnectionTimers = new Map<string, number>();

	private readonly ConnectionIdMap = new WeakMap<TWebSocketLike, string>();

	private ConnectionCounter = 0;

	/**
	 * Running counters for O(1) stats gathering
	 * Instead of iterating all connections/subscriptions to count them,
	 * maintain running totals updated on add/remove operations
	 */
	private TotalConnectionsCount = 0;
	private TotalSubscriptionsCount = 0;

	/**
	 * Consolidated connection timeout handler using single background interval
	 * Instead of setTimeout per connection (thousands at scale), check all connections' ages once per interval
	 * Reduces system timer overhead from O(n) individual timers to O(1) shared interval
	 */
	// eslint-disable-next-line no-undef
	private ConnectionTimeoutCheckInterval?: NodeJS.Timeout;

	public get SubscriptionConfig(): ISubscriptionConfig {
		try {
			const Config = this.Module.get<ISubscriptionConfig>('SUBSCRIPTION_CONFIG', { strict: false });
			if (!Config) {
				throw new Error('SUBSCRIPTION_CONFIG not found in module');
			}
			return Config;
		} catch (error: unknown) {
			throw new Error(
				`Failed to get SUBSCRIPTION_CONFIG: ${error instanceof Error ? error.message : 'unknown error'}`,
				{ cause: error },
			);
		}
	}

	constructor(moduleRef: ModuleRef) {
		this.Module = moduleRef;
		this.Logger = new AppLogger(undefined, ConnectionManagerService.name);
		this.StartConnectionTimeoutCheck();
	}

	/**
	 * Generate a unique key for a connection based on userId and the ws object
	 * If ws has an id property, use it; otherwise use the object counter
	 */
	private GetConnectionKey(ws: TWebSocketLike, userId: string): string {
		// If WebSocket has an id property, use it for stability across object instances
		if (ws && typeof ws === 'object' && 'id' in ws) {
			return `${userId}:${ws.id}`;
		}
		// Check if we've already assigned a key to this object
		if (ws && typeof ws === 'object' && this.ConnectionIdMap.has(ws)) {
			const Existing = this.ConnectionIdMap.get(ws);
			if (Existing !== undefined) {
				return Existing;
			}
		}
		// Generate a new key for this object
		return `${userId}:${this.ConnectionCounter++}`;
	}

	/**
   * Adds a new WebSocket connection
   * Increments running counter for O(1) stats gathering
   * Uses consolidated timeout check instead of individual setTimeout (reduces system timers)
   * @param ws WebSocket connection
   * @param userId User ID
   * @param authenticatedUserId Authenticated user ID from token verification — must match userId
   */
	public AddConnection(ws: TWebSocketLike, userId: string, authenticatedUserId: string): void {
		// Verify the authenticated user matches the requested userId
		if (userId !== authenticatedUserId) {
			const SafeAuth = authenticatedUserId ? authenticatedUserId.replace(/[\n\r]/g, ' ') : 'unknown';
			const SafeUser = userId ? userId.replace(/[\n\r]/g, ' ') : 'unknown';
			this.Logger.warn(`Connection rejected: authenticated user ${SafeAuth} attempted to connect as ${SafeUser}`);
			throw new Error(`Unauthorized: cannot create connection for user ${userId}`);
		}

		if (!this.Connections.has(userId)) {
			this.Connections.set(userId, new Set());
		}
		this.Connections.get(userId)?.add(ws);

		// Increment running counter (O(1) instead of O(n) scan)
		this.TotalConnectionsCount++;

		// Generate unique connection ID using helper method
		const ConnectionId = this.GetConnectionKey(ws, userId);

		// Track the ConnectionId in WeakMap for later retrieval (only if object)
		if (ws && typeof ws === 'object' && !('id' in ws)) {
			this.ConnectionIdMap.set(ws, ConnectionId);
		}

		// Store connection creation time for consolidated timeout check (not individual setTimeout)
		// Avoids creating thousands of individual timers at scale
		const ConnectionCreatedAt = Date.now();
		this.ConnectionTimers.set(ConnectionId, ConnectionCreatedAt);

		this.Logger.debug(`Added connection for user: ${userId ? userId.replace(/[\n\r]/g, ' ') : 'unknown'}`);
	}

	/**
   * Removes a WebSocket connection
   * Decrements running counter for O(1) stats gathering
   * @param ws WebSocket connection
   * @param userId User ID
   */
	public RemoveConnection(ws: TWebSocketLike, userId: string): void {
		const UserConnections = this.Connections.get(userId);
		let Removed = false;

		if (UserConnections) {
			// If ws has an id property, match by id
			if (ws && typeof ws === 'object' && 'id' in ws) {
				for (const Connection of UserConnections) {
					if (Connection && typeof Connection === 'object' && 'id' in Connection && Connection.id === ws.id) {
						UserConnections.delete(Connection);
						Removed = true;
						break;
					}
				}
			} else {
				// Otherwise match by object reference
				Removed = UserConnections.delete(ws);
			}

			if (UserConnections.size === 0) {
				this.Connections.delete(userId);
			}
		}

		// Decrement running counter only if we actually removed a connection (O(1))
		if (Removed) {
			this.TotalConnectionsCount = Math.max(0, this.TotalConnectionsCount - 1);
		}

		// Clear timeout entry (now just a timestamp, not a timer)
		const ConnectionId = this.GetConnectionKey(ws, userId);
		this.ConnectionTimers.delete(ConnectionId);

		// Clean up WeakMap if applicable
		if (ws && typeof ws === 'object' && !('id' in ws)) {
			this.ConnectionIdMap.delete(ws);
		}

		// Remove all subscriptions for this connection
		this.RemoveAllSubscriptionsForUser(userId);

		this.Logger.debug(`Removed connection for user: ${userId ? userId.replace(/[\n\r]/g, ' ') : 'unknown'}`);
	}

	/**
   * Checks if a user can accept a new connection
   * @param userId User ID
   * @returns True if connection can be accepted
   */
	public CanAcceptConnection(userId: string): boolean {
		const UserConnections = this.Connections.get(userId);
		const CurrentCount = UserConnections ? UserConnections.size : 0;
		return CurrentCount < (this.SubscriptionConfig.websocket.maxConnections ?? MAX_WEBSOCKET_CONNECTIONS);
	}

	/**
   * Adds a subscription for a user
   * Increments running counter for O(1) stats gathering
   * @param userId User ID
   * @param subscriptionId Subscription ID
   */
	public AddSubscription(userId: string, subscriptionId: string): void {
		if (!this.Subscriptions.has(userId)) {
			this.Subscriptions.set(userId, new Set());
		}
		const UserSubs = this.Subscriptions.get(userId);
		if (UserSubs && !UserSubs.has(subscriptionId)) {
			UserSubs.add(subscriptionId);
			// Increment running counter only if new subscription added (O(1))
			this.TotalSubscriptionsCount++;
		}

		const SafeSub = subscriptionId ? subscriptionId.replace(/[\n\r]/g, ' ') : 'unknown';
		const SafeUsr = userId ? userId.replace(/[\n\r]/g, ' ') : 'unknown';
		this.Logger.debug(`Added subscription ${SafeSub} for user: ${SafeUsr}`);
	}

	/**
   * Removes a subscription for a user
   * Decrements running counter for O(1) stats gathering
   * @param userId User ID
   * @param subscriptionId Subscription ID
   */
	public RemoveSubscription(userId: string, subscriptionId: string): void {
		const UserSubscriptions = this.Subscriptions.get(userId);
		let Removed = false;

		if (UserSubscriptions) {
			Removed = UserSubscriptions.delete(subscriptionId);
			if (UserSubscriptions.size === 0) {
				this.Subscriptions.delete(userId);
			}
		}

		// Decrement running counter only if we actually removed a subscription (O(1))
		if (Removed) {
			this.TotalSubscriptionsCount = Math.max(0, this.TotalSubscriptionsCount - 1);
		}

		const SafeSub2 = subscriptionId ? subscriptionId.replace(/[\n\r]/g, ' ') : 'unknown';
		const SafeUsr2 = userId ? userId.replace(/[\n\r]/g, ' ') : 'unknown';
		this.Logger.debug(`Removed subscription ${SafeSub2} for user: ${SafeUsr2}`);
	}

	/**
   * Checks if a user can accept a new subscription
   * @param userId User ID
   * @returns True if subscription can be accepted
   */
	public CanAcceptSubscription(userId: string): boolean {
		const UserSubscriptions = this.Subscriptions.get(userId);
		const CurrentCount = UserSubscriptions ? UserSubscriptions.size : 0;
		return CurrentCount < this.SubscriptionConfig.connection.maxSubscriptionsPerUser;
	}

	/**
   * Gets the total number of active connections
   * O(1) operation using running counter (previously O(n))
   * @returns Number of connections
   */
	public GetConnectionCount(): number {
		return this.TotalConnectionsCount;
	}

	/**
   * Gets the total number of active subscriptions
   * O(1) operation using running counter (previously O(n))
   * @returns Number of subscriptions
   */
	public GetSubscriptionCount(): number {
		return this.TotalSubscriptionsCount;
	}

	/**
   * Gets connection statistics
   * Uses running counters for O(1) total computation, still O(n) for per-user breakdown
   * @returns Statistics object
   */
	public GetStats(): {
		totalConnections: number;
		totalSubscriptions: number;
		connectionsByUser: Record<string, number>;
		subscriptionsByUser: Record<string, number>;
	} {
		const ConnectionsByUser: Record<string, number> = {};
		const SubscriptionsByUser: Record<string, number> = {};

		for (const [UserId, Connections] of this.Connections) {
			ConnectionsByUser[UserId] = Connections.size;
		}

		for (const [UserId, Subs] of this.Subscriptions) {
			SubscriptionsByUser[UserId] = Subs.size;
		}

		return {
			totalConnections: this.TotalConnectionsCount,
			totalSubscriptions: this.TotalSubscriptionsCount,
			connectionsByUser: ConnectionsByUser,
			subscriptionsByUser: SubscriptionsByUser,
		};
	}

	/**
   * Removes all subscriptions for a user
   * @param userId User ID
   */
	private RemoveAllSubscriptionsForUser(userId: string): void {
		const UserSubscriptions = this.Subscriptions.get(userId);
		if (UserSubscriptions) {
			// Decrement counter by the number of subscriptions being removed
			this.TotalSubscriptionsCount = Math.max(0, this.TotalSubscriptionsCount - UserSubscriptions.size);
		}
		this.Subscriptions.delete(userId);
	}

	/**
	 * Starts consolidated connection timeout check
	 * O(k) per check interval where k = active connections
	 * Instead of O(n) individual timers where n = total possible connections
	 */
	private StartConnectionTimeoutCheck(): void {
		// Check every 5 seconds if any connections have exceeded timeout
		const CHECK_INTERVAL_MS = 5000;

		this.ConnectionTimeoutCheckInterval = setInterval(() => {
			const Now = Date.now();
			const TimeoutMs = this.SubscriptionConfig.connection.timeout;
			const ConnectionsToRemove: Array<[TWebSocketLike, string]> = [];

			// O(k) iteration over active connections only
			for (const [UserId, Connections] of this.Connections) {
				for (const Ws of Connections) {
					const ConnectionId = this.GetConnectionKey(Ws, UserId);
					const CreatedAt = this.ConnectionTimers.get(ConnectionId);

					// Check if connection has exceeded timeout threshold
					if (CreatedAt !== undefined && Now - CreatedAt > TimeoutMs) {
						ConnectionsToRemove.push([Ws, UserId]);
					}
				}
			}

			// Remove timed-out connections
			for (const [Ws, UserId] of ConnectionsToRemove) {
				this.RemoveConnection(Ws, UserId);
			}
		}, CHECK_INTERVAL_MS);
	}

	/**
   * Cleanup method called when module is destroyed
   */
	public onModuleDestroy(): void {
		this.Logger.info('Destroying connection manager');

		// Clear consolidated timeout check interval
		if (this.ConnectionTimeoutCheckInterval) {
			clearInterval(this.ConnectionTimeoutCheckInterval);
			this.ConnectionTimeoutCheckInterval = undefined;
		}

		// Clear all connection timestamps
		this.ConnectionTimers.clear();

		// Clear all connections and subscriptions
		this.Connections.clear();
		this.Subscriptions.clear();

		// Reset running counters
		this.TotalConnectionsCount = 0;
		this.TotalSubscriptionsCount = 0;

		this.Logger.info('Connection manager destroyed');
	}
}

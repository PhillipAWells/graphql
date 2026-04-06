import { PubSub, type PubSubEngine } from 'graphql-subscriptions';
import { randomUUID } from 'node:crypto';

const _DefaultPubSub = new PubSub();

/**
 * PubSub-backed event emitter for GraphQL subscriptions.
 * Wraps a graphql-subscriptions PubSubEngine to emit and subscribe to events.
 * @template TObject - Type of object that triggers the event.
 * @template TEvent - Type of event emitted.
 */
export class GraphQLEventHandler<TObject extends object, TEvent> {
	private readonly _TopicKey: string;
	private readonly _PubSub: PubSubEngine;

	/**
	 * Create an event handler.
	 * @param name - Handler name (reserved for future use).
	 * @param pubSub - Optional PubSubEngine (uses module-level default if not provided).
	 */
	constructor(name: string, pubSub?: PubSubEngine) {
		// name parameter is reserved for future use in custom topic naming
		this._TopicKey = randomUUID();
		this._PubSub = pubSub ?? _DefaultPubSub;
	}

	/**
	 * Get an async iterable for subscribing to events (for @Subscription resolvers).
	 * @returns AsyncIterable of events.
	 */
	public GetAsyncIterator(): AsyncIterable<TEvent> {
		return this._PubSub.asyncIterableIterator<TEvent>(this._TopicKey) as AsyncIterable<TEvent>;
	}

	/**
	 * Publish an event (fire-and-forget; errors are silently ignored).
	 * @param data - Event data.
	 */
	public Trigger(data: TObject): void {
		void this._PubSub.publish(this._TopicKey, data);
	}

	/**
	 * Low-level subscribe to events.
	 * @param handler - Event handler function.
	 * @returns Subscription ID (number or Promise<number>).
	 */
	public Subscribe(handler: (...args: unknown[]) => void): Promise<number> | number {
		return this._PubSub.subscribe(this._TopicKey, handler, {});
	}

	/**
	 * Unsubscribe from events by subscription ID.
	 * @param id - Subscription ID.
	 */
	public Unsubscribe(id: number): void {
		this._PubSub.unsubscribe(id);
	}
}

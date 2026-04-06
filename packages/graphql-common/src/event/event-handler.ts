import { PubSub, type PubSubEngine } from 'graphql-subscriptions';
import { randomUUID } from 'node:crypto';

const _DefaultPubSub = new PubSub();

export class GraphQLEventHandler<TObject extends object, TEvent> {
	private readonly _TopicKey: string;
	private readonly _PubSub: PubSubEngine;
	private readonly _Name: string;

	constructor(name: string, pubSub?: PubSubEngine) {
		this._Name = name;
		this._TopicKey = randomUUID();
		this._PubSub = pubSub ?? _DefaultPubSub;
	}

	public GetAsyncIterator(): AsyncIterable<TEvent> {
		return this._PubSub.asyncIterableIterator<TEvent>(this._TopicKey) as AsyncIterable<TEvent>;
	}

	public Trigger(data: TObject): void {
		void this._PubSub.publish(this._TopicKey, { [this._Name]: data });
	}

	public Subscribe(handler: (...args: unknown[]) => void): Promise<number> | number {
		return this._PubSub.subscribe(this._TopicKey, handler, {});
	}

	public Unsubscribe(id: number): void {
		this._PubSub.unsubscribe(id);
	}
}

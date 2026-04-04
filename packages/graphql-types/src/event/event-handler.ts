import { PubSub, type PubSubEngine } from 'graphql-subscriptions';
import { randomUUID } from 'node:crypto';

const _defaultPubSub = new PubSub();

export class GraphQLEventHandler<TObject extends object, TEvent> {
	private readonly _topicKey: string;
	private readonly _pubSub: PubSubEngine;
	private readonly name: string;

	constructor(name: string, pubSub?: PubSubEngine) {
		this.name = name;
		this._topicKey = randomUUID();
		this._pubSub = pubSub ?? _defaultPubSub;
	}

	public GetAsyncIterator(): AsyncIterable<TEvent> {
		return this._pubSub.asyncIterableIterator<TEvent>(this._topicKey) as AsyncIterable<TEvent>;
	}

	public Trigger(data: TObject): void {
		void this._pubSub.publish(this._topicKey, { [this.name]: data });
	}

	public async Subscribe(handler: (...args: unknown[]) => void): Promise<number> {
		return this._pubSub.subscribe(this._topicKey, handler, {});
	}

	public Unsubscribe(id: number): void {
		this._pubSub.unsubscribe(id);
	}
}

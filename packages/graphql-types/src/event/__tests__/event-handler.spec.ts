import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GraphQLEventHandler } from '../event-handler';
import { PubSub } from 'graphql-subscriptions';

describe('GraphQLEventHandler', () => {
	let pubSub: PubSub;

	beforeEach(() => {
		pubSub = new PubSub();
	});

	it('should create event handler with name', () => {
		const handler = new GraphQLEventHandler<{ id: string }, { test: string }>('TestEvent', pubSub);
		expect(handler).toBeDefined();
	});

	it('should trigger event', async () => {
		const handler = new GraphQLEventHandler<{ id: string }, { test: string }>('TestEvent', pubSub);
		const data = { id: 'test-123' };

		expect(() => {
			handler.Trigger(data);
		}).not.toThrow();
	});

	it('should subscribe to events', async () => {
		const handler = new GraphQLEventHandler<{ id: string }, { test: string }>('TestEvent', pubSub);
		const mockHandler = vi.fn();

		const subscriptionId = await handler.Subscribe(mockHandler);
		expect(subscriptionId).toBeGreaterThan(0);
	});

	it('should unsubscribe from events', async () => {
		const handler = new GraphQLEventHandler<{ id: string }, { test: string }>('TestEvent', pubSub);
		const mockHandler = vi.fn();

		const subscriptionId = await handler.Subscribe(mockHandler);
		expect(() => {
			handler.Unsubscribe(subscriptionId);
		}).not.toThrow();
	});

	it('should get async iterator', () => {
		const handler = new GraphQLEventHandler<{ id: string }, { test: string }>('TestEvent', pubSub);
		const iterable = handler.GetAsyncIterator();

		expect(iterable).toBeDefined();
	});

	it('should isolate topics between different handlers with same name', async () => {
		const handler1 = new GraphQLEventHandler<{ id: string }, { test: string }>('TestEvent', pubSub);
		const handler2 = new GraphQLEventHandler<{ id: string }, { test: string }>('TestEvent', pubSub);

		const mockHandler1 = vi.fn();
		const mockHandler2 = vi.fn();

		const subscriptionId1 = await handler1.Subscribe(mockHandler1);
		const subscriptionId2 = await handler2.Subscribe(mockHandler2);

		handler1.Trigger({ id: 'from-handler1' });

		// Give async operations time to complete
		await new Promise(resolve => setTimeout(resolve, 100));

		// handler1's subscription should receive the event
		expect(mockHandler1).toHaveBeenCalled();
		// handler2's subscription should NOT receive handler1's event (different topics)
		expect(mockHandler2).not.toHaveBeenCalled();

		handler1.Unsubscribe(subscriptionId1);
		handler2.Unsubscribe(subscriptionId2);
	});

	it('should use default PubSub when not provided', () => {
		const handler = new GraphQLEventHandler<{ id: string }, { test: string }>('TestEvent');
		expect(() => {
			handler.Trigger({ id: 'test' });
		}).not.toThrow();
	});
});

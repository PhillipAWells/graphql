import { describe, it, expect } from 'vitest';
import { GraphQLConnectionState } from '../types';

describe('GraphQLConnectionState', () => {
	it('should have all five connection states', () => {
		expect(GraphQLConnectionState.Connecting).toBe('Connecting');
		expect(GraphQLConnectionState.Connected).toBe('Connected');
		expect(GraphQLConnectionState.Reconnecting).toBe('Reconnecting');
		expect(GraphQLConnectionState.Disconnected).toBe('Disconnected');
		expect(GraphQLConnectionState.Error).toBe('Error');
	});

	it('should have unique state values', () => {
		const states = [
			GraphQLConnectionState.Connecting,
			GraphQLConnectionState.Connected,
			GraphQLConnectionState.Reconnecting,
			GraphQLConnectionState.Disconnected,
			GraphQLConnectionState.Error,
		];
		const uniqueStates = new Set(states);
		expect(uniqueStates.size).toBe(5);
	});

	it('should distinguish between Connecting and Reconnecting', () => {
		expect(GraphQLConnectionState.Connecting).not.toBe(GraphQLConnectionState.Reconnecting);
	});
});

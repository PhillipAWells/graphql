import { describe, it, expect } from 'vitest';
import type { GraphQLConnectionState, GraphQLConnectionEvent } from '../types';

describe('GraphQLConnectionState', () => {
	it('should accept "Connecting" state', () => {
		const state: GraphQLConnectionState = 'Connecting';
		expect(state).toBe('Connecting');
	});

	it('should accept "Opened" state', () => {
		const state: GraphQLConnectionState = 'Opened';
		expect(state).toBe('Opened');
	});

	it('should accept "Connected" state', () => {
		const state: GraphQLConnectionState = 'Connected';
		expect(state).toBe('Connected');
	});

	it('should accept "Closed" state', () => {
		const state: GraphQLConnectionState = 'Closed';
		expect(state).toBe('Closed');
	});

	it('should accept "Error" state', () => {
		const state: GraphQLConnectionState = 'Error';
		expect(state).toBe('Error');
	});

	it('should accept undefined state', () => {
		const state: GraphQLConnectionState = undefined;
		expect(state).toBeUndefined();
	});
});

describe('GraphQLConnectionEvent', () => {
	it('should have State property', () => {
		const event: GraphQLConnectionEvent = {
			State: 'Connected',
		};
		expect(event.State).toBe('Connected');
	});

	it('should support optional Error property', () => {
		const error = new Error('Test error');
		const event: GraphQLConnectionEvent = {
			State: 'Error',
			Error: error,
		};
		expect(event.State).toBe('Error');
		expect(event.Error).toBe(error);
	});

	it('should support Error as any type', () => {
		const event: GraphQLConnectionEvent = {
			State: 'Error',
			Error: 'String error message',
		};
		expect(event.Error).toBe('String error message');
	});

	it('should allow State with undefined', () => {
		const event: GraphQLConnectionEvent = {
			State: undefined,
		};
		expect(event.State).toBeUndefined();
	});
});

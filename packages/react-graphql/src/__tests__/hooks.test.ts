import { describe, it, expect, vi } from 'vitest';
import { useConnectionState, useGraphQLReconnect } from '../hooks';

vi.mock('../provider', () => ({
	useGraphQLContext: vi.fn(() => {
		throw new Error('useGraphQLContext must be used inside GraphQLProvider');
	}),
}));

describe('useConnectionState', () => {
	it('should throw when used outside GraphQLProvider', () => {
		expect(() => useConnectionState()).toThrow('useGraphQLContext must be used inside GraphQLProvider');
	});
});

describe('useGraphQLReconnect', () => {
	it('should throw when used outside GraphQLProvider', () => {
		expect(() => useGraphQLReconnect()).toThrow('useGraphQLContext must be used inside GraphQLProvider');
	});
});

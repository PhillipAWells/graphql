/**
 * A read-only key-value pair.
 */
export class KeyValuePair {
	/** The key. */
	public readonly Key: string;
	/** The value. */
	public readonly Value: unknown;

	constructor(key: string = '', value: unknown = null) {
		this.Key = key;
		this.Value = value;
	}
}

/**
 * A key-value pair for use as a GraphQL input type.
 * Same shape as KeyValuePair.
 */
export class KeyValuePairInput {
	public readonly Key: string;
	public readonly Value: unknown;

	constructor(key: string = '', value: unknown = null) {
		this.Key = key;
		this.Value = value;
	}
}

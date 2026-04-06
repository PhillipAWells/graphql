export class KeyValuePair {
	public readonly Key: string;
	public readonly Value: unknown;

	constructor(key: string = '', value: unknown = null) {
		this.Key = key;
		this.Value = value;
	}
}

export class KeyValuePairInput {
	public readonly Key: string;
	public readonly Value: unknown;

	constructor(key: string = '', value: unknown = null) {
		this.Key = key;
		this.Value = value;
	}
}

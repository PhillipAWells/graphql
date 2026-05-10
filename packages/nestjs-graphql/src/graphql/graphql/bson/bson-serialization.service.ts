import { Injectable } from '@nestjs/common';
import { getErrorMessage } from '@pawells/nestjs-shared/common';
import type { BSON, Document } from 'bson';

/**
 * Service for BSON serialization and deserialization
 * Wraps the bson npm package with lazy loading and error handling
 */
@Injectable()
export class BsonSerializationService {
	private BsonLib: typeof BSON | null = null;
	private LoadPromise: Promise<typeof BSON> | null = null;
	private IsAvailableCache: boolean | null = null;

	/**
	 * Check if bson package is available (cached after first check)
	 * Returns true only if already loaded; does not attempt to load synchronously
	 */
	public IsAvailable(): boolean {
		if (this.IsAvailableCache !== null) {
			return this.IsAvailableCache;
		}

		// Check if library is already loaded (from previous async load or initial module discovery)
		if (this.BsonLib) {
			this.IsAvailableCache = true;
			return true;
		}

		// Don't attempt synchronous require—this would block the event loop.
		// Return false; GetBson() will handle availability when actually needed.
		this.IsAvailableCache = false;
		return false;
	}

	/**
	 * Lazy load the bson library
	 */
	// eslint-disable-next-line require-await
	private async GetBson(): Promise<typeof BSON> {
		if (this.BsonLib) {
			return this.BsonLib;
		}

		if (this.LoadPromise) {
			return this.LoadPromise;
		}

		this.LoadPromise = (async () => {
			try {
				// Dynamic import to load bson
				const Bson = await import('bson');
				this.BsonLib = Bson;
				return Bson;
			} catch (error) {
				// Clear LoadPromise on failure so the next call gets a fresh attempt
				this.LoadPromise = null;
				throw new Error(
					'BSON package is not installed. Please install it with: npm install bson or yarn add bson',
					{ cause: error },
				);
			}
		})();

		return this.LoadPromise;
	}

	/**
	 * Serialize data to BSON buffer
	 * @param data The data to serialize
	 * @returns BSON buffer
	 * @throws Error if bson is not available or serialization fails
	 */
	public async Serialize(data: unknown): Promise<Buffer> {
		try {
			const Bson = await this.GetBson();
			// Use BSON.serialize to convert object to buffer
			return Buffer.from(Bson.serialize(data as Document));
		} catch (error) {
			throw new Error(
				`Failed to serialize to BSON: ${getErrorMessage(error)}`,
				{ cause: error },
			);
		}
	}

	/**
	 * Deserialize BSON buffer to data
	 * @param buffer The BSON buffer to deserialize
	 * @returns Deserialized data
	 * @throws Error if bson is not available or deserialization fails
	 */
	public async Deserialize(buffer: Buffer): Promise<unknown> {
		try {
			const Bson = await this.GetBson();
			// Use BSON.deserialize to convert buffer back to object
			return Bson.deserialize(buffer);
		} catch (error) {
			throw new Error(
				`Failed to deserialize BSON: ${getErrorMessage(error)}`,
				{ cause: error },
			);
		}
	}
}

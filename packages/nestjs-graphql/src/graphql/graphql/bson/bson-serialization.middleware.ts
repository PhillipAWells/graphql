import { Injectable, NestMiddleware } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Request, Response, NextFunction } from 'express';
import type { ILazyModuleRefService } from '@pawells/nestjs-shared/common';
import { getErrorMessage } from '@pawells/nestjs-shared/common';
import { BsonSerializationService } from './bson-serialization.service.js';

declare module 'express' {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	interface Request {
		_bsonRequest?: boolean;
	}
}

// Status code for client errors
const HTTP_STATUS_BAD_REQUEST = 400;

/**
 * Middleware for handling BSON request bodies
 * Deserializes incoming BSON data to JSON before GraphQL processing
 */
@Injectable()
export class BsonSerializationMiddleware implements NestMiddleware, ILazyModuleRefService {
	public readonly Module: ModuleRef;

	public get BsonSerializationService(): BsonSerializationService {
		return this.Module.get(BsonSerializationService, { strict: false });
	}

	constructor(moduleRef: ModuleRef) {
		this.Module = moduleRef;
	}

	/**
	 * Handle incoming request
	 * If Content-Type is application/bson, deserialize and mark request
	 */
	public use(req: Request, res: Response, next: NextFunction): void {
		const ContentType = req.get('content-type')?.toLowerCase() ?? '';

		// If not a BSON request, pass through
		if (!ContentType.startsWith('application/bson')) {
			next();
			return;
		}

		// Collect raw body chunks
		const Chunks: Buffer[] = [];

		// Handle data events
		const OnData = (chunk: Buffer): void => {
			Chunks.push(chunk);
		};

		const RemoveListeners = (): void => {
			if (typeof req.removeListener === 'function') {
				req.removeListener('data', OnData);
				req.removeListener('end', OnEnd);
				req.removeListener('error', OnError);
				req.removeListener('close', OnClose);
			}
		};

		// Handle end event — async with proper error handling and listener cleanup
		const OnEnd = (): void => {
			const SerializedBuffer = Buffer.concat(Chunks);
			this.BsonSerializationService.Deserialize(SerializedBuffer).then(
				(body) => {
					RemoveListeners();
					req.body = body;
					req._bsonRequest = true;
					next();
				},
				(error: unknown) => {
					RemoveListeners();
					try {
						res.status(HTTP_STATUS_BAD_REQUEST).json({
							errors: [
								{
									message: 'Failed to parse BSON body',
									extensions: {
										code: 'BAD_REQUEST',
										details: getErrorMessage(error),
									},
								},
							],
						});
					} catch (err) {
						// If res.json() fails (e.g., headers already sent), call next with error
						next(err as Error);
					}
				},
			);
		};

		// Handle error event
		const OnError = (err: Error): void => {
			RemoveListeners();
			try {
				res.status(HTTP_STATUS_BAD_REQUEST).json({
					errors: [
						{
							message: 'Request body read error',
							extensions: {
								code: 'BAD_REQUEST',
								details: err.message,
							},
						},
					],
				});
			} catch (sendErr) {
				// If res.json() fails (e.g., headers already sent), call next with error
				next(sendErr as Error);
			}
		};

		// Handle close event (fires on both normal and abrupt close)
		const OnClose = (): void => {
			RemoveListeners();
		};

		// Attach listeners
		req.on('data', OnData);
		req.on('end', OnEnd);
		req.on('error', OnError);
		req.on('close', OnClose);
	}
}

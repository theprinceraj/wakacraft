/**
 * HTTP errors thrown from domain services and turned into responses by `route()`.
 * Stands in for the Nest `*Exception` classes so services keep the same "throw, don't return" style.
 */
export class HttpError extends Error {
	public constructor(
		public readonly status: number,
		message: string,
		/** Field → messages, rendered as WakaTime's `{ errors: { field: [msg] } }` shape. */
		public readonly errors?: Record<string, string[]>,
	) {
		super(message);
		this.name = 'HttpError';
	}
}

export class BadRequestException extends HttpError {
	public constructor(message = 'Bad Request', errors?: Record<string, string[]>) {
		super(400, message, errors);
	}
}

export class UnauthorizedException extends HttpError {
	public constructor(message = 'Unauthorized') {
		super(401, message);
	}
}

export class ForbiddenException extends HttpError {
	public constructor(message = 'Forbidden') {
		super(403, message);
	}
}

export class NotFoundException extends HttpError {
	public constructor(message = 'Not Found') {
		super(404, message);
	}
}

export class TooManyRequestsException extends HttpError {
	public constructor(
		message = 'Too Many Requests',
		/** Seconds until the client may retry, sent as `Retry-After`. */
		public readonly retryAfter?: number,
	) {
		super(429, message);
	}
}

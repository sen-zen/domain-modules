import { CoreError } from '../../infrastructure/core-errors';

/**
 * Base error for domain validation failures
 */
export class ValidationError extends CoreError {
    constructor(
        message: string,
        readonly field?: string | null,
        readonly details?: Record<string, unknown> | null
    ) {
        super(`Validation failed: ${message}`);

        Error.captureStackTrace(this, ValidationError);
    }
}

import { ApplicationError } from './ApplicationError';

export class UseCaseError extends ApplicationError {
    constructor(
        message: string,
        code?: string,
        metadata?: Record<string, unknown>
    ) {
        super(message, code || 'USE_CASE_ERROR', metadata);
        this.name = 'UseCaseError';

        Object.setPrototypeOf(this, UseCaseError.prototype);
    }
}

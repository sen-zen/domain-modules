import { DomainError } from './DomainError';

export class UnauthorizedError extends DomainError {
    constructor(
        message: string = 'Unauthorized',
        metadata?: Record<string, unknown>
    ) {
        super(message, 'UNAUTHORIZED', metadata);
        this.name = 'UnauthorizedError';

        Object.setPrototypeOf(this, UnauthorizedError.prototype);
    }
}

import { DomainError } from './DomainError';

export class ValidationError extends DomainError {
    constructor(
        message: string,
        public readonly field?: string,
        metadata?: Record<string, unknown>
    ) {
        super(message, 'VALIDATION_ERROR', metadata);
        this.name = 'ValidationError';

        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

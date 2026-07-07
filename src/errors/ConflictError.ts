import { DomainError } from './DomainError';

export class ConflictError extends DomainError {
    constructor(
        message: string = 'Unauthorized',
        metadata?: Record<string, unknown>
    ) {
        super(message, 'CONFLICT_ERROR', metadata);
        this.name = 'ConflictError';
    }
}

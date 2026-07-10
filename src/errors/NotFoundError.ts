import { DomainError } from './DomainError';

export class NotFoundError extends DomainError {
    constructor(
        entity: string,
        id?: string,
        metadata?: Record<string, unknown>
    ) {
        super(
            `${entity} not found${id ? ` with id: ${id}` : ''}`,
            'NOT_FOUND',
            { entity, id, ...metadata }
        );
        this.name = 'NotFoundError';

        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}
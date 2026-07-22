import { ApplicationError } from "./ApplicationError";

export type RefreshTokenErrorCode =
    | 'INVALID_TOKEN'
    | 'TOKEN_EXPIRED'
    | 'TOKEN_NOT_FOUND'
    | 'TOKEN_REVOKED'
    | 'TOKEN_STOLEN'
    | 'GENERATION_FAILED';

export class RefreshTokenError extends ApplicationError {
    constructor(
        message: string,
        public readonly code: RefreshTokenErrorCode,
        public readonly metadata?: Record<string, unknown>
    ) {
        super(message, code, metadata);
    }
}

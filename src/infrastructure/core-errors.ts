/**
 * Базовый класс всех ошибок приложения
 */
export class CoreError extends Error {
    constructor(message: string, public readonly code?: string) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, CoreError);
    }
}

/**
 * Базовый класс для бизнес-ошибок
 */
export class BusinessException extends CoreError {
    constructor(
        message: string,
        public readonly code: string = 'BUSINESS_ERROR'
    ) {
        super(message, code);
    }
}

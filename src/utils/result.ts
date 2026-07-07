import { DomainError } from '../errors/DomainError';
import { ApplicationError } from '../errors/ApplicationError';

export class Result<T> {
    private constructor(
        private readonly _isSuccess: boolean,
        private readonly _value?: T,
        private readonly _error?: Error | string
    ) { }

    get isSuccess(): boolean {
        return this._isSuccess;
    }

    get isFailure(): boolean {
        return !this._isSuccess;
    }

    get value(): T {
        if (this.isFailure) {
            throw new Error('Cannot get value from failed result');
        }
        return this._value as T;
    }

    get error(): Error | string {
        if (this.isSuccess) {
            throw new Error('Cannot get error from successful result');
        }
        return this._error as Error | string;
    }

    static ok<T>(value: T): Result<T> {
        return new Result<T>(true, value);
    }

    static fail<T>(error: Error | string): Result<T> {
        return new Result<T>(false, undefined, error);
    }

    onSuccess(fn: (value: T) => void): Result<T> {
        if (this.isSuccess) {
            fn(this._value as T);
        }
        return this;
    }

    onFailure(fn: (error: Error | string) => void): Result<T> {
        if (this.isFailure) {
            fn(this._error as Error | string);
        }
        return this;
    }

    toJSON(): {
        success: boolean;
        value?: T;
        error?: string;
        errorType?: string;
        stack?: string;
    } {
        if (this.isSuccess) {
            return {
                success: true,
                value: this._value,
            };
        }
        const error = this._error as Error | string;
        return {
            success: false,
            error: typeof error === 'string' ? error : error.message,
            errorType: error instanceof Error ? error.constructor.name : 'Error',
            stack: error instanceof Error ? error.stack : undefined,
        };
    }

    isDomainError(): boolean {
        if (this.isSuccess) {
            return false;
        }
        const error = this._error as Error | string;
        return error instanceof Error && error instanceof DomainError;
    }

    isApplicationError(): boolean {
        if (this.isSuccess) {
            return false;
        }
        const error = this._error as Error | string;
        return error instanceof Error && error instanceof ApplicationError;
    }
}

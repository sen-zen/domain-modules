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
        if (typeof error === 'string') {
            return new Result<T>(false, undefined, new Error(error));
        }
        return new Result<T>(false, undefined, error);
    }

    get errorMessage(): string {
        if (this.isSuccess) {
            return '';
        }
        return this._error instanceof Error
            ? this._error.message
            : String(this._error);
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
            errorType: error.constructor.name,
            stack: error instanceof Error ? error.stack : undefined,
        };
    }

    isCoreError(): boolean {
        if (this.isSuccess) {
            return false;
        }
        const error = this._error as Error | string;
        return error.constructor.name === 'CoreError';
    }

    isBusinessError(): boolean {
        if (this.isSuccess) {
            return false;
        }
        const error = this._error as Error | string;
        return error.constructor.name === 'BusinessException';
    }
}

import { Result } from '../../utils/result';

export abstract class UseCase<TInput, TOutput> {
    /**
     * Основной метод выполнения Use Case
     * Должен быть реализован в наследнике
     */
    abstract execute(input: TInput): Promise<Result<TOutput>>;

    /**
     * Создает успешный результат
     */
    protected ok<TOutput>(value: TOutput): Result<TOutput> {
        return Result.ok(value);
    }

    /**
     * Создает результат с ошибкой
     */
    protected fail<TOutput>(error: Error | string): Result<TOutput> {
        return Result.fail(error);
    }

    protected tryCatch<T>(fn: () => T): Result<T> {
        try {
            return this.ok(fn());
        } catch (error) {
            return this.fail(error instanceof Error ? error : String(error));
        }
    }

    protected async tryCatchAsync<T>(fn: () => Promise<T>): Promise<Result<T>> {
        try {
            const result = await fn();
            return this.ok(result);
        } catch (error) {
            return this.fail(error instanceof Error ? error : String(error));
        }
    }
}
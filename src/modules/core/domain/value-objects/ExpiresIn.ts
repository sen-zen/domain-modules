import type { SignOptions } from 'jsonwebtoken';
import { ValidationError } from '../../../../errors';

type ExpiresInInput = NonNullable<SignOptions['expiresIn']>;


/**
 * Value Object для работы с временем жизни токенов
 * 
 * 🎯 Задача: 
 * - Парсинг строковых форматов ("15m", "7d", "30s", "2h")
 * - Преобразование в секунды
 * - Валидация форматов
 * - Типобезопасное использование
 */
export class ExpiresIn {
    private static readonly UNIT_MAP: Record<string, number> = {
        's': 1,
        'm': 60,
        'h': 3600,
        'd': 86400,
    };

    private constructor(
        private readonly _seconds: number,
        private readonly _unit: string,
        private readonly _value: number
    ) { }

    /**
     * Создает ExpiresIn из строки формата "15m", "7d", "30s", "2h"
     */
    static create(input: ExpiresInInput): ExpiresIn {
        if (typeof input === 'number') {
            return ExpiresIn.fromSeconds(input);
        }

        if (typeof input === 'string') {
            return ExpiresIn.fromString(input);
        }

        throw new ValidationError(`Invalid expiresIn format`, 'expiresIn', { value: input });
    }

    /**
     * Создает ExpiresIn из строки
     */
    static fromString(duration: string): ExpiresIn {
        const match = duration.match(/^(\d+)([smhd])$/);
        if (!match || !match[1]) {
            throw new ValidationError(`Invalid duration format`, 'expiresIn', { value: duration });
        }

        const value = parseInt(match[1], 10);
        const unit = match[2];

        if (!unit || !ExpiresIn.UNIT_MAP[unit]) {
            throw new ValidationError(`Unknown unit`, 'expiresIn', { value: unit, supported: ['s', 'm', 'h', 'd'] });
        }

        const seconds = value * ExpiresIn.UNIT_MAP[unit];

        return new ExpiresIn(seconds, unit, value);
    }

    /**
     * Создает ExpiresIn из секунд
     */
    static fromSeconds(seconds: number): ExpiresIn {
        if (!Number.isFinite(seconds) || seconds < 0) {
            throw new ValidationError(`Invalid seconds`, 'expiresIn', { value: seconds });
        }

        const units = Object.keys(ExpiresIn.UNIT_MAP);
        for (const unit of units) {
            const unitSeconds = ExpiresIn.UNIT_MAP[unit];
            if (unitSeconds && seconds % unitSeconds === 0 && seconds / unitSeconds >= 1) {
                return new ExpiresIn(seconds, unit, seconds / unitSeconds);
            }
        }

        return new ExpiresIn(seconds, 's', seconds);
    }

    get seconds(): number {
        return this._seconds;
    }

    get minutes(): number {
        return this._seconds / 60;
    }

    get hours(): number {
        return this._seconds / 3600;
    }

    get days(): number {
        return this._seconds / 86400;
    }

    toString(): string {
        return `${this._value}${this._unit}`;
    }

    toDate(from: Date = new Date()): Date {
        return new Date(from.getTime() + this._seconds * 1000);
    }

    toISOString(from: Date = new Date()): string {
        return this.toDate(from).toISOString();
    }

    toJWT(): ExpiresInInput {
        return this.toString() as ExpiresInInput;
    }

    /**
     * Проверяет, истекло ли время
     */
    isExpired(from: Date = new Date()): boolean {
        const createdAt = from.getTime() / 1000;
        const now = Date.now() / 1000;
        return now - createdAt > this._seconds;
    }

    /**
     * Вычисляет дату истечения
     */
    getExpirationDate(from: Date = new Date()): Date {
        return new Date(from.getTime() + this._seconds * 1000);
    }

    /**
     * Возвращает JSON представление
     */
    toJSON(): {
        seconds: number;
        string: string;
    } {
        return {
            seconds: this._seconds,
            string: this.toString()
        };
    }

    /**
     * Преобразует в примитивы для хранения
     */
    toPrimitives(): {
        seconds: number;
        string: string;
    } {
        return {
            seconds: this._seconds,
            string: this.toString(),
        };
    }
}

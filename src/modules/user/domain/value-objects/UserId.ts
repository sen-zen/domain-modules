import { ValidationError } from '@/errors';

export class UserId {
    private constructor(private readonly _value: string) {
        if (!_value || _value.trim().length === 0) {
            throw new ValidationError('UserId cannot be empty', 'userId');
        }
    }

    get value(): string {
        return this._value;
    }

    static create(value: string): UserId {
        return new UserId(value);
    }

    static generate(): UserId {
        return new UserId(crypto.randomUUID());
    }

    equals(other: UserId): boolean {
        return this._value === other._value;
    }

    toString(): string {
        return this._value;
    }
}

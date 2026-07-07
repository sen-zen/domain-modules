import { ValidationError } from '../../errors';

export class Email {
    private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    private constructor(private readonly _value: string) {
        if (!Email.isValid(_value)) {
            throw new ValidationError(`Invalid email address: ${_value}`, 'email');
        }
        this._value = _value.toLowerCase().trim();
    }

    get value(): string {
        return this._value;
    }

    static isValid(email: string): boolean {
        return Email.EMAIL_REGEX.test(email);
    }

    static create(email: string): Email {
        return new Email(email);
    }

    equals(other: Email): boolean {
        return this._value === other._value;
    }

    toString(): string {
        return this._value;
    }
}

import { hashSync, compareSync } from 'bcryptjs';
import { ValidationError } from '../../errors';

export class Password {
    private static readonly MIN_LENGTH = 6;

    private constructor(private readonly _hash: string | null) {
        if (!_hash || _hash.length === 0) {
            throw new ValidationError('Password hash cannot be empty', 'hash');
        }
    }

    get value(): string | null {
        return this._hash;
    }

    static create(plain: string): Password {
        if (!Password.isValid(plain)) {
            throw new ValidationError(`Password must be at least ${Password.MIN_LENGTH} characters`, 'password');
        }

        const hash = Password.hash(plain);
        return new Password(hash);
    }

    static fromHash(hash: string | null): Password {
        return new Password(hash);
    }

    static isValid(password: string): boolean {
        return password.length >= Password.MIN_LENGTH;
    }

    static hash(plain: string): string {
        return hashSync(plain, 12);
    }

    verify(plain: string): boolean {
        return this._hash ? compareSync(plain, this._hash) : false;
    }
}

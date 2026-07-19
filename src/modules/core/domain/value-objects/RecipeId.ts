import { ValidationError } from '@/errors';

export class RecipeId {
    private constructor(private readonly _value: string) {
        if (!_value || _value.trim().length === 0) {
            throw new ValidationError('RecipeId cannot be empty', 'recipeId');
        }
    }

    get value(): string {
        return this._value;
    }

    static create(value: string): RecipeId {
        return new RecipeId(value);
    }

    static generate(): RecipeId {
        return new RecipeId(crypto.randomUUID());
    }

    equals(other: RecipeId): boolean {
        return this._value === other._value;
    }

    toString(): string {
        return this._value;
    }
}

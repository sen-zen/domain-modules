import { ExpiresIn } from "./ExpiresIn";
import { ValidationError } from "@/errors";

export class ExpiresAt {
    private constructor(private readonly _value: Date) { }

    static create(value: Date): ExpiresAt {
        if (value < new Date()) {
            throw new ValidationError('Expiration date cannot be in the past', 'expiresAt');
        }
        return new ExpiresAt(value);
    }

    static fromNow(expiresIn: ExpiresIn | number): ExpiresAt {
        const now = Date.now();
        if (expiresIn instanceof ExpiresIn) {
            return new ExpiresAt(new Date(now + expiresIn.seconds * 1000));
        } else {
            return new ExpiresAt(new Date(now + expiresIn * 1000));
        }
    }

    static fromDate(date: Date): ExpiresAt {
        return new ExpiresAt(date);
    }

    static fromISOString(isoString: string): ExpiresAt {
        return new ExpiresAt(new Date(isoString));
    }

    get value(): Date {
        return this._value;
    }

    get isExpired(): boolean {
        return this._value < new Date();
    }

    get secondsRemaining(): number {
        return Math.max(0, (this._value.getTime() - Date.now()) / 1000);
    }

    isExpiredAt(date: Date = new Date()): boolean {
        return this._value < date;
    }

    toISOString(): string {
        return this._value.toISOString();
    }

    toJSON(): { date: string, isExpired: boolean } {
        return {
            date: this.toISOString(),
            isExpired: this.isExpired
        };
    }
}

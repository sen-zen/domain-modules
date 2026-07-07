import { UserId } from '../../value-objects/UserId';

export interface SessionPrimitives {
    userId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    deviceName?: string;
    ipAddress?: string;
    userAgent?: string;
}

export class Session {
    private constructor(
        public readonly userId: UserId,
        public readonly accessToken: string,
        public readonly refreshToken: string,
        private _expiresAt: Date,
        private _deviceName: string | null,
        private _ipAddress: string | null,
        private _userAgent: string | null
    ) { }

    static create(data: {
        userId: UserId;
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        deviceName?: string;
        ipAddress?: string;
        userAgent?: string;
    }): Session {
        const expiresAt = new Date(Date.now() + data.expiresIn * 1000);

        return new Session(
            data.userId,
            data.accessToken,
            data.refreshToken,
            expiresAt,
            data.deviceName || null,
            data.ipAddress || null,
            data.userAgent || null
        );
    }

    get expiresAt(): Date {
        return this._expiresAt;
    }

    get deviceName(): string | null {
        return this._deviceName;
    }

    get ipAddress(): string | null {
        return this._ipAddress;
    }

    get userAgent(): string | null {
        return this._userAgent;
    }

    get isExpired(): boolean {
        return new Date() > this._expiresAt;
    }

    get isValid(): boolean {
        return !this.isExpired;
    }

    toPrimitives(): SessionPrimitives {
        return {
            userId: this.userId.value,
            accessToken: this.accessToken,
            refreshToken: this.refreshToken,
            expiresAt: this._expiresAt,
            deviceName: this._deviceName || undefined,
            ipAddress: this._ipAddress || undefined,
            userAgent: this._userAgent || undefined,
        };
    }
}

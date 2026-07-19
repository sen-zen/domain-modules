import { UserId } from '@user/domain/value-objects/UserId';
import { ExpiresIn } from '@core/domain/value-objects/ExpiresIn';
import { ExpiresAt } from '@core/domain/value-objects/ExpiresAt';

export interface RefreshTokenPrimitives {
    id: string;
    token: string;
    familyId: string;
    userId: string;
    expiresAt: Date;
    revokedAt: Date | null;
    replacedBy: string | null;
    userAgent: string | null;
    ipAddress: string | null;
    deviceName: string | null;
    createdAt: Date;
    lastUsedAt: Date;
}

export class RefreshToken {

    private constructor(
        public readonly id: string,
        public readonly token: string,
        public readonly familyId: string,
        private _expiresAt: ExpiresAt,
        private _userId: UserId,
        public readonly createdAt: Date,
        private _revokedAt: Date | null = null,
        private _replacedBy: string | null = null,
        private _userAgent: string | null = null,
        private _ipAddress: string | null = null,
        private _deviceName: string | null = null,
        private _lastUsedAt: Date
    ) { }

    static create(data: {
        token: string;
        familyId: string;
        userId: UserId | string;
        expiresIn: number | ExpiresIn;
        userAgent?: string;
        ipAddress?: string;
        deviceName?: string;
    }): RefreshToken {
        const now = new Date();
        return new RefreshToken(
            crypto.randomUUID(),
            data.token,
            data.familyId,
            ExpiresAt.fromNow(data.expiresIn),
            typeof data.userId === 'string' ? UserId.create(data.userId) : data.userId,
            now,
            null,
            null,
            data.userAgent || null,
            data.ipAddress || null,
            data.deviceName || null,
            now
        );
    }

    static reconstitute(primitives: RefreshTokenPrimitives): RefreshToken {
        return new RefreshToken(
            primitives.id,
            primitives.token,
            primitives.familyId,
            ExpiresAt.create(primitives.expiresAt),
            UserId.create(primitives.userId),
            new Date(primitives.createdAt),
            primitives.revokedAt || null,
            primitives.replacedBy,
            primitives.userAgent,
            primitives.ipAddress,
            primitives.deviceName,
            new Date(primitives.lastUsedAt)
        );
    }

    get userId(): UserId {
        return this._userId;
    }

    get revokedAt(): Date | null {
        return this._revokedAt;
    }

    get replacedBy(): string | null {
        return this._replacedBy;
    }

    get userAgent(): string | null {
        return this._userAgent;
    }

    get ipAddress(): string | null {
        return this._ipAddress;
    }

    get deviceName(): string | null {
        return this._deviceName;
    }

    get lastUsedAt(): Date {
        return this._lastUsedAt;
    }

    get isRevoked(): boolean {
        return this._revokedAt !== null;
    }

    get isExpired(): boolean {
        return this._expiresAt.isExpired;
    }

    get isActive(): boolean {
        return !this.isRevoked && !this.isExpired;
    }

    revoke(): void {
        this._revokedAt = new Date();
    }

    revokeAndReplace(newTokenId: string): void {
        this._revokedAt = new Date();
        this._replacedBy = newTokenId;
    }

    use(): void {
        this._lastUsedAt = new Date();
    }

    updateDeviceInfo(data: {
        userAgent?: string;
        ipAddress?: string;
        deviceName?: string;
    }): void {
        if (data.userAgent !== undefined) this._userAgent = data.userAgent;
        if (data.ipAddress !== undefined) this._ipAddress = data.ipAddress;
        if (data.deviceName !== undefined) this._deviceName = data.deviceName;
    }

    toPrimitives(): RefreshTokenPrimitives {
        return {
            id: this.id,
            token: this.token,
            familyId: this.familyId,
            userId: this._userId.value,
            expiresAt: this._expiresAt.value,
            revokedAt: this._revokedAt,
            replacedBy: this._replacedBy,
            userAgent: this._userAgent,
            ipAddress: this._ipAddress,
            deviceName: this._deviceName,
            createdAt: new Date(this.createdAt),
            lastUsedAt: new Date(this._lastUsedAt)
        };
    }

    get expiresAt(): ExpiresIn {
        const now = new Date();
        return ExpiresIn.fromSeconds(Math.round((this._expiresAt.value.getTime() - now.getTime()) / 1000));
    }

    get expiresInSeconds(): number {
        return Math.round((this._expiresAt.value.getTime() - this.createdAt.getTime()) / 1000);
    }
}

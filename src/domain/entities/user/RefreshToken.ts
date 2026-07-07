import { UserId } from '../../value-objects/UserId';
import { ExpiresIn } from '../../value-objects/ExpiresIn';
import { ExpiresAt } from '../../value-objects/ExpiresAt';

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
        public readonly userId: UserId,
        private _expiresAt: ExpiresAt,
        private _revokedAt: Date | null,
        private _replacedBy: string | null,
        private _userAgent: string | null,
        private _ipAddress: string | null,
        private _deviceName: string | null,
        public readonly createdAt: Date,
        private _lastUsedAt: Date
    ) { }

    static create(data: {
        token: string;
        familyId: string;
        userId: UserId | string;
        expiresIn: ExpiresIn;
        userAgent?: string;
        ipAddress?: string;
        deviceName?: string;
    }): RefreshToken {
        const now = new Date();
        const expiresAt = ExpiresAt.fromNow(data.expiresIn);

        const normalizedUserId = typeof data.userId === 'string'
            ? UserId.create(data.userId)
            : data.userId;

        return new RefreshToken(
            crypto.randomUUID(),
            data.token,
            data.familyId,
            normalizedUserId,
            expiresAt,
            null,
            null,
            data.userAgent || null,
            data.ipAddress || null,
            data.deviceName || null,
            now,
            now
        );
    }

    static reconstitute(primitives: RefreshTokenPrimitives): RefreshToken {
        return new RefreshToken(
            primitives.id,
            primitives.token,
            primitives.familyId,
            UserId.create(primitives.userId),
            ExpiresAt.create(primitives.expiresAt),
            primitives.revokedAt,
            primitives.replacedBy,
            primitives.userAgent,
            primitives.ipAddress,
            primitives.deviceName,
            primitives.createdAt,
            primitives.lastUsedAt
        );
    }

    // Getters
    get expiresAt(): ExpiresAt {
        return this._expiresAt;
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
        return new Date() > this._expiresAt.value;
    }

    get isActive(): boolean {
        return !this.isRevoked && !this.isExpired;
    }

    // Business methods
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
            userId: this.userId.value,
            expiresAt: this._expiresAt.value,
            revokedAt: this._revokedAt,
            replacedBy: this._replacedBy,
            userAgent: this._userAgent,
            ipAddress: this._ipAddress,
            deviceName: this._deviceName,
            createdAt: this.createdAt,
            lastUsedAt: this._lastUsedAt,
        };
    }
}

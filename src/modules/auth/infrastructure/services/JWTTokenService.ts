import { randomBytes, createHash } from 'crypto';
import { sign, verify, decode, TokenExpiredError } from 'jsonwebtoken';
import { ExpiresIn } from '../../../core/domain/value-objects/ExpiresIn';

import type { SignOptions } from 'jsonwebtoken';
import type { JWTConfig } from '../config/JWTConfig';
import type { ITokenService } from '../../domain/services/ITokenService';
import type { TokenPair, AccessTokenPayload, RefreshTokenPayload } from '../../types';

export class JWTTokenService implements ITokenService {
    constructor(private readonly config: JWTConfig) { }

    async generateTokens(userId: string, family?: string): Promise<TokenPair> {
        const familyId = family || await this.generateFamilyId();

        const accessToken = await this.generateAccessToken(userId);
        const refreshToken = await this.generateRefreshToken(userId, familyId);

        return {
            accessToken,
            refreshToken,
            familyId,
        };
    }

    async generateFamilyId(): Promise<string> {
        return randomBytes(16).toString('hex');
    }

    async generateAccessToken(userId: string): Promise<string> {
        const jwtid = randomBytes(16).toString('hex');
        return this.generateAccessTokenWithJti(userId, jwtid);
    }

    async generateRefreshToken(userId: string, familyId: string): Promise<string> {
        const jwtid = randomBytes(16).toString('hex');
        return this.generateRefreshTokenWithJti(userId, jwtid, familyId);
    }

    async generateVerificationToken(value: string): Promise<string> {
        return Math.random().toString(12).substring(2) +
            value +
            Date.now().toString(12);
    }

    async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
        try {
            const decoded = verify(token, this.config.secret, {
                issuer: this.config.issuer,
                audience: this.config.audience,
            }) as AccessTokenPayload;

            if (!this.isAccessToken(decoded)) {
                throw new Error('Not an access token');
            }

            return decoded;
        } catch (error) {
            if (error instanceof TokenExpiredError) {
                throw new Error('Token expired');
            }
            throw error;
        }
    }

    async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
        try {
            const decoded = verify(token, this.config.secret, {
                issuer: this.config.issuer,
                audience: this.config.audience,
            }) as RefreshTokenPayload;

            if (!this.isRefreshToken(decoded)) {
                throw new Error('Not a refresh token');
            }

            return decoded;
        } catch (error) {
            if (error instanceof TokenExpiredError) {
                throw new Error('Refresh token expired');
            }
            throw error;
        }
    }

    async isTokenExpired(token: string): Promise<boolean> {
        const decoded = await this.decodeToken(token);
        if (!decoded || !decoded.exp) {
            return true;
        }
        return decoded.exp < Math.floor(Date.now() / 1000);
    }

    async decodeToken(
        token: string
    ): Promise<AccessTokenPayload | RefreshTokenPayload | null> {
        const decoded = decode(token) as AccessTokenPayload | RefreshTokenPayload;
        if (this.isAccessToken(decoded) || this.isRefreshToken(decoded)) {
            return decoded;
        }
        return null;
    }

    async hashRefreshToken(token: string): Promise<string> {
        return createHash('sha256').update(token).digest('hex');
    }

    isAccessToken(payload: unknown): payload is AccessTokenPayload {
        if (!payload || typeof payload !== 'object') {
            return false;
        }
        const p = payload as Record<string, unknown>;
        return p.type === 'access' && typeof p.sub === 'string';
    }

    isRefreshToken(payload: unknown): payload is RefreshTokenPayload {
        if (!payload || typeof payload !== 'object') {
            return false;
        }
        const p = payload as Record<string, unknown>;
        return (
            p.type === 'refresh' &&
            typeof p.sub === 'string' &&
            typeof p.familyId === 'string'
        );
    }

    async verifyVerificationToken(
        token: string
    ): Promise<{ userId: string } | null> {
        // В реальном проекте здесь будет проверка срока действия
        // и парсинг userId из токена
        try {
            const userId = token.replace(/^[a-z0-9]+/, '');
            if (!userId) {
                return null;
            }
            return { userId };
        } catch {
            return null;
        }
    }

    private async generateAccessTokenWithJti(
        userId: string,
        jwtid: string
    ): Promise<string> {
        const options: SignOptions = {
            jwtid,
            expiresIn: this.config.accessTokenExpiresIn.toJWT(),
            issuer: this.config.issuer,
            audience: this.config.audience,
            algorithm: this.config.algorithm || 'HS256',
        };

        return sign(
            { sub: userId, type: 'access' },
            this.config.secret,
            options
        );
    }

    private async generateRefreshTokenWithJti(
        userId: string,
        jwtid: string,
        familyId: string
    ): Promise<string> {
        const options: SignOptions = {
            jwtid,
            expiresIn: this.config.refreshTokenExpiresIn.toJWT(),
            issuer: this.config.issuer,
            audience: this.config.audience,
            algorithm: this.config.algorithm || 'HS256',
        };

        return sign(
            { sub: userId, type: 'refresh', familyId },
            this.config.secret,
            options
        );
    }

    getAccessTokenExpiresIn(): { seconds: number; } {
        return { seconds: this.config.accessTokenExpiresIn.seconds }
    }

    getRefreshTokenExpiresIn(): { seconds: number; } {
        return { seconds: this.config.refreshTokenExpiresIn.seconds }
    }

    getExpiresIn(): { accessTokenExpiresIn: ExpiresIn; refreshTokenExpiresIn: ExpiresIn; } {
        return {
            accessTokenExpiresIn: this.config.accessTokenExpiresIn,
            refreshTokenExpiresIn: this.config.refreshTokenExpiresIn
        }
    }
}

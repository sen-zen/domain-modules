import { ExpiresIn } from "../../../core/domain/value-objects/ExpiresIn";

export interface JWTConfig {
    secret: string;
    accessTokenExpiresIn: ExpiresIn;
    refreshTokenExpiresIn: ExpiresIn;
    issuer: string;
    audience: string;
    algorithm?: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';
}

export class JWTConfig {
    static fromEnv(): JWTConfig {
        return {
            secret: process.env.JWT_SECRET || 'default-secret',
            accessTokenExpiresIn: ExpiresIn.create(process.env.ACCESS_TOKEN_EXPIRES_IN || '15m'),
            refreshTokenExpiresIn: ExpiresIn.create(process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'),
            issuer: process.env.JWT_ISSUER || 'tastehub-api',
            audience: process.env.JWT_AUDIENCE || 'tastehub-client',
            algorithm: (process.env.JWT_ALGORITHM as any) || 'HS256',
        };
    }
}

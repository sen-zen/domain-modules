import { ExpiresIn } from '../value-objects/ExpiresIn';
import { TokenPair, AccessTokenPayload, RefreshTokenPayload } from '../../types/token';

export interface ITokenService {
    /**
     * Генерирует пару токенов (access + refresh)
     */
    generateTokens(
        userId: string,
        deviceInfo?: {
            userAgent?: string;
            ipAddress?: string;
            deviceName?: string;
        }
    ): Promise<TokenPair>;

    /**
     * Генерирует access токен
     */
    generateAccessToken(userId: string): Promise<string>;

    /**
     * Генерирует refresh токен
     */
    generateRefreshToken(userId: string, familyId: string): Promise<string>;

    /**
     * Верифицирует access токен
     * @throws {Error} Если токен невалидный или истек
     */
    verifyAccessToken(token: string): Promise<AccessTokenPayload>;

    /**
     * Верифицирует refresh токен
     * @throws {Error} Если токен невалидный или истек
     */
    verifyRefreshToken(token: string): Promise<RefreshTokenPayload>;

    /**
     * Проверяет, не истек ли токен
     */
    isTokenExpired(token: string): Promise<boolean>;

    /**
     * Декодирует токен без верификации
     */
    decodeToken(token: string): Promise<AccessTokenPayload | RefreshTokenPayload | null>;

    /**
     * Хеширует refresh токен для хранения в БД
     */
    hashRefreshToken(token: string): Promise<string>;

    /**
     * Проверяет, является ли токен access токеном
     */
    isAccessToken(payload: unknown): payload is AccessTokenPayload;

    /**
     * Проверяет, является ли токен refresh токеном
     */
    isRefreshToken(payload: unknown): payload is RefreshTokenPayload;

    /**
     * Генерирует новый familyId для refresh токена
     */
    generateFamilyId(): Promise<string>;

    /**
     * Генерирует verification token для email
     */
    generateVerificationToken(userId: string): Promise<string>;

    /**
     * Проверяет, валиден ли verification token
     */
    verifyVerificationToken(token: string): Promise<{ userId: string } | null>;


    getExpiresIn(): { accessTokenExpiresIn: ExpiresIn, refreshTokenExpiresIn: ExpiresIn };
}

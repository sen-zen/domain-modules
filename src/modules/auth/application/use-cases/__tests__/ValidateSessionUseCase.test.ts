import { ValidateSessionCommand } from '@auth/application/commands';
import { ValidateSessionUseCase } from '../ValidateSessionUseCase';
import type { ITokenService } from '@auth/domain/services/ITokenService';
import { RefreshTokenUseCase } from '../RefreshTokenUseCase';
import { Result } from '@/utils/result';
import { vi, describe, it, beforeEach, expect } from 'vitest';

describe('ValidateSessionUseCase', () => {
    let useCase: ValidateSessionUseCase;
    let mockTokenService: Partial<ITokenService>;
    let mockRefreshTokensUseCase: RefreshTokenUseCase;

    beforeEach(() => {
        mockTokenService = {
            verifyAccessToken: vi.fn(),
            isTokenExpired: vi.fn(),
            verifyRefreshToken: vi.fn(),
            getAccessTokenExpiresIn: () => ({ seconds: 3600 }),
            getRefreshTokenExpiresIn: () => ({ seconds: 7200 }),
        };

        mockRefreshTokensUseCase = new RefreshTokenUseCase(
            mockTokenService as any,
            { save: vi.fn(), findByUserIdAndFamilyId: vi.fn() } as any
        );

        // Мокируем execute для всех тестов с refresh token как успешный - возвращаем результат обновления токенов
        vi.spyOn(mockRefreshTokensUseCase, 'execute').mockResolvedValue(
            Result.ok({
                accessToken: 'new-access-token',
                refreshToken: 'new-refresh-token',
                accessTokenExpiresIn: 3600,
                refreshTokenExpiresIn: 7200,
                userId: 'user-123',
                state: 'REFRESHED' as const,
                isAuthenticated: true,
            })
        );

        useCase = new ValidateSessionUseCase(
            mockTokenService as ITokenService,
            mockRefreshTokensUseCase
        );
    });

    describe('валидация через access token', () => {
        const validAccessTokenPayload = {
            sub: 'user-123',
            type: 'access' as const,
            exp: Date.now() / 1000 + 3600,
            iat: Date.now() / 1000,
            jti: 'access-jti-123',
            iss: 'tastehub-api',
            aud: 'tastehub-client',
        };

        const expiredAccessTokenPayload = {
            sub: 'user-123',
            type: 'access' as const,
            exp: Date.now() / 1000 - 3600,
            iat: Date.now() / 1000,
            jti: 'access-jti-123',
            iss: 'tastehub-api',
            aud: 'tastehub-client',
        };

        it('должен авторизовать пользователя через валидный access token', async () => {
            mockTokenService.verifyAccessToken = vi.fn().mockResolvedValue(validAccessTokenPayload);
            mockTokenService.isTokenExpired = vi.fn().mockResolvedValue(false);

            const command = ValidateSessionCommand.create({ accessToken: 'valid-access-token' });

            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            expect(result.value.isAuthenticated).toBe(true);
            expect(result.value.state).toBe('AUTHENTICATED');
            expect(result.value.userId).toBe('user-123');
        });

        it('должен возвращать UNAUTHENTICATED если access token не передан', async () => {
            const command = ValidateSessionCommand.create({});

            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            expect(result.value.isAuthenticated).toBe(false);
            expect(result.value.state).toBe('UNAUTHENTICATED');
        });

        it('должен возвращать UNAUTHENTICATED если access token просрочен', async () => {
            mockTokenService.verifyAccessToken = vi.fn().mockResolvedValue(expiredAccessTokenPayload);
            mockTokenService.isTokenExpired = vi.fn().mockResolvedValue(true);

            const command = ValidateSessionCommand.create({ accessToken: 'expired-access-token' });

            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            expect(result.value.isAuthenticated).toBe(false);
            expect(result.value.state).toBe('UNAUTHENTICATED');
        });

        it('должен возвращать UNAUTHENTICATED при ошибке верификации токена', async () => {
            const error = new Error('Invalid token');

            mockTokenService.verifyAccessToken = vi.fn().mockRejectedValue(error);

            const command = ValidateSessionCommand.create({ accessToken: 'invalid-access-token' });

            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            expect(result.value.isAuthenticated).toBe(false);
            expect(result.value.state).toBe('UNAUTHENTICATED');
        });
    });

    describe('валидация через refresh token', () => {
        it('должен обновить токены через валидный refresh token', async () => {
            const validRefreshTokenPayload = {
                sub: 'user-123',
                type: 'refresh' as const,
                exp: Date.now() / 1000 + 7200,
                iat: Date.now() / 1000,
                jti: 'refresh-jti-456',
                iss: 'tastehub-api',
                aud: 'tastehub-client',
                familyId: 'family-123',
            };

            mockTokenService.verifyRefreshToken = vi.fn().mockResolvedValue(validRefreshTokenPayload);
            // Важно: isTokenExpired для refresh token должен возвращать false (токен не просрочен)
            mockTokenService.isTokenExpired = vi.fn().mockResolvedValue(false);

            const command = ValidateSessionCommand.create({ refreshToken: 'old-refresh-token' });

            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            expect(result.value.isAuthenticated).toBe(true);
            expect(result.value.state).toBe('REFRESHED');
            expect(result.value.userId).toBe('user-123');
        });

        it('должен возвращать UNAUTHENTICATED если refresh token не передан и верификация возвратила null', async () => {
            mockTokenService.verifyRefreshToken = vi.fn().mockResolvedValue(null);

            const command = ValidateSessionCommand.create({ refreshToken: 'dummy-refresh-token' });

            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            expect(result.value.isAuthenticated).toBe(false);
            expect(result.value.state).toBe('UNAUTHENTICATED');
        });

        it('должен возвращать REFRESH_EXPIRED если refresh token просрочен', async () => {
            const expiredRefreshTokenPayload = {
                sub: 'user-123',
                type: 'refresh' as const,
                exp: Date.now() / 1000 - 7200,
                iat: Date.now() / 1000,
                jti: 'refresh-jti-expired',
                iss: 'tastehub-api',
                aud: 'tastehub-client',
                familyId: 'family-123',
            };

            mockTokenService.verifyRefreshToken = vi.fn().mockResolvedValue(expiredRefreshTokenPayload);
            // Токен просрочен - isTokenExpired возвращает true
            mockTokenService.isTokenExpired = vi.fn().mockResolvedValue(true);

            const command = ValidateSessionCommand.create({ refreshToken: 'dummy-refresh-token' });

            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            expect(result.value.isAuthenticated).toBe(false);
            expect(result.value.state).toBe('REFRESH_EXPIRED');
        });

        it('должен возвращать REFRESH_INVALID при ошибке верификации refresh токена', async () => {
            mockTokenService.verifyRefreshToken = vi.fn().mockRejectedValue(new Error('Invalid token'));

            const command = ValidateSessionCommand.create({ refreshToken: 'dummy-refresh-token' });

            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            expect(result.value.isAuthenticated).toBe(false);
            expect(result.value.state).toBe('REFRESH_INVALID');
        });
    });

    describe('интеграционные сценарии', () => {
        const validAccessTokenPayloadForIntegration = {
            sub: 'user-123',
            type: 'access' as const,
            exp: Date.now() / 1000 + 3600,
            iat: Date.now() / 1000,
            jti: 'access-jti-integration',
            iss: 'tastehub-api',
            aud: 'tastehub-client',
        };

        const validRefreshTokenPayloadForIntegration = {
            sub: 'user-123',
            type: 'refresh' as const,
            exp: Date.now() / 1000 + 7200,
            iat: Date.now() / 1000,
            jti: 'refresh-jti-integration',
            iss: 'tastehub-api',
            aud: 'tastehub-client',
            familyId: 'family-123',
        };

        it('должен обрабатывать успешный логин с access token', async () => {
            mockTokenService.verifyAccessToken = vi.fn().mockResolvedValue(validAccessTokenPayloadForIntegration);
            mockTokenService.isTokenExpired = vi.fn().mockResolvedValue(false);

            const command = ValidateSessionCommand.create({ accessToken: 'valid-access-token' });

            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
        });

        it('должен обрабатывать случай без токенов', async () => {
            const command = ValidateSessionCommand.create({});

            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            expect(result.value.state).toBe('UNAUTHENTICATED');
        });

        it('должен обрабатывать просроченный refresh token', async () => {
            const expiredRefreshTokenPayloadForIntegration = {
                sub: 'user-123',
                type: 'refresh' as const,
                exp: Date.now() / 1000 - 7200,
                iat: Date.now() / 1000,
                jti: 'refresh-jti-expired',
                iss: 'tastehub-api',
                aud: 'tastehub-client',
                familyId: 'family-123',
            };

            mockTokenService.verifyRefreshToken = vi.fn().mockResolvedValue(expiredRefreshTokenPayloadForIntegration);
            mockTokenService.isTokenExpired = vi.fn().mockResolvedValue(true);

            const command = ValidateSessionCommand.create({ refreshToken: 'dummy-refresh-token' });

            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            expect(result.value.state).toBe('REFRESH_EXPIRED');
        });

        it('должен вызывать RefreshTokenUseCase при необходимости обновления', async () => {
            mockTokenService.verifyRefreshToken = vi.fn().mockResolvedValue(validRefreshTokenPayloadForIntegration);
            // Важно: isTokenExpired должен возвращать false для refresh token (токен не просрочен)
            mockTokenService.isTokenExpired = vi.fn().mockResolvedValue(false);

            const command = ValidateSessionCommand.create({ refreshToken: 'old-refresh-token' });

            await useCase.execute(command);

            // RefreshTokenUseCase должен быть вызван
            expect(mockRefreshTokensUseCase.execute).toHaveBeenCalled();
            expect(mockTokenService.verifyRefreshToken).toHaveBeenCalled();
        });
    });
});

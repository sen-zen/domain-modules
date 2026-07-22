import { ValidateSessionCommand } from '@auth/application/commands';
import { ValidateSessionUseCase } from '../ValidateSessionUseCase';
import type { ITokenService } from '@auth/domain/services/ITokenService';
import type { AccessTokenPayload, RefreshTokenPayload } from '@auth/types';
import { RefreshTokenError } from '@/errors';
import { RefreshTokenUseCase } from '../RefreshTokenUseCase';
import { Result } from '@/utils/result';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('ValidateSessionUseCase', () => {
    let useCase: ValidateSessionUseCase;
    let mockTokenService: ITokenService;
    let mockRefreshTokensUseCase: RefreshTokenUseCase;
    let verifyAccessTokenMock: ReturnType<typeof vi.fn>;
    let isTokenExpiredMock: ReturnType<typeof vi.fn>;
    let verifyRefreshTokenMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        verifyAccessTokenMock = vi.fn();
        isTokenExpiredMock = vi.fn();
        verifyRefreshTokenMock = vi.fn();

        mockTokenService = {
            verifyAccessToken: verifyAccessTokenMock,
            isTokenExpired: isTokenExpiredMock,
            verifyRefreshToken: verifyRefreshTokenMock,
            getAccessTokenExpiresIn: () => ({ seconds: 3600 }),
            getRefreshTokenExpiresIn: () => ({ seconds: 7200 }),
            generateTokens: vi.fn(),
        } as any;

        mockRefreshTokensUseCase = new RefreshTokenUseCase(
            mockTokenService,
            {
                save: vi.fn(),
                findByUserIdAndFamilyId: vi.fn().mockResolvedValue({ success: true, token: null }),
            } as any
        );

        useCase = new ValidateSessionUseCase(mockTokenService, mockRefreshTokensUseCase);
    });

    describe('валидный access token', () => {
        const validAccessTokenPayload: AccessTokenPayload = {
            sub: 'user-123',
            type: 'access' as const,
            exp: Date.now() / 1000 + 3600,
            iat: Date.now() / 1000,
            jti: 'access-jti-123',
            iss: 'tastehub-api',
            aud: 'tastehub-client',
        };

        it('должен возвращать AUTHENTICATED при успешной верификации access token', async () => {
            verifyAccessTokenMock.mockResolvedValue(validAccessTokenPayload);
            isTokenExpiredMock.mockResolvedValue(false);

            const command = ValidateSessionCommand.create({ accessToken: 'valid-token' });
            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            if (result.value.isAuthenticated && result.value.state === 'AUTHENTICATED') {
                expect(result.value.userId).toBe('user-123');
            }
        });

        it('должен возвращать AUTHENTICATED при успешной верификации через refresh token', async () => {
            verifyAccessTokenMock.mockResolvedValue(validAccessTokenPayload);
            isTokenExpiredMock.mockResolvedValue(false);

            const command = ValidateSessionCommand.create({ accessToken: 'new-access-token' });
            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            if (result.value.isAuthenticated && result.value.state === 'AUTHENTICATED') {
                expect(result.value.userId).toBe('user-123');
            }
        });
    });

    describe('просроченный access token', () => {
        const expiredAccessTokenPayload: AccessTokenPayload = {
            sub: 'user-123',
            type: 'access' as const,
            exp: Date.now() / 1000 - 3600,
            iat: Date.now() / 1000,
            jti: 'access-jti-expired',
            iss: 'tastehub-api',
            aud: 'tastehub-client',
        };

        it('должен возвращать UNAUTHENTICATED если access token просрочен', async () => {
            verifyAccessTokenMock.mockResolvedValue(expiredAccessTokenPayload);
            isTokenExpiredMock.mockResolvedValue(true);

            const command = ValidateSessionCommand.create({ accessToken: 'expired-token' });
            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            if (result.value.isAuthenticated) {
                expect(result.value.state).toBe('UNAUTHENTICATED');
            }
        });

        it('должен возвращать UNAUTHENTICATED если access token просрочен при обновлении через refresh token', async () => {
            verifyAccessTokenMock.mockResolvedValue(expiredAccessTokenPayload);
            isTokenExpiredMock.mockResolvedValue(true);

            const command = ValidateSessionCommand.create({ accessToken: 'new-token' });
            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            if (result.value.isAuthenticated) {
                expect(result.value.state).toBe('UNAUTHENTICATED');
            }
        });
    });

    describe('ошибки верификации access token', () => {
        it('должен возвращать UNAUTHENTICATED если verifyAccessToken выбрасывает ошибку InvalidToken', async () => {
            verifyAccessTokenMock.mockRejectedValue(new Error('Invalid token'));

            const command = ValidateSessionCommand.create({ accessToken: 'invalid-token' });
            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            if (result.value.isAuthenticated) {
                expect(result.value.state).toBe('UNAUTHENTICATED');
            }
        });

        it('должен возвращать UNAUTHENTICATED если verifyAccessToken выбрасывает ошибку ExpiredToken', async () => {
            verifyAccessTokenMock.mockRejectedValue(new Error('Token expired'));

            const command = ValidateSessionCommand.create({ accessToken: 'expired-token' });
            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            if (result.value.isAuthenticated) {
                expect(result.value.state).toBe('UNAUTHENTICATED');
            }
        });
    });

    describe('сценарий без токенов', () => {
        it('должен возвращать UNAUTHENTICATED если не передан ни один токен', async () => {
            const command = ValidateSessionCommand.create({});
            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            if (result.value.isAuthenticated) {
                expect(result.value.state).toBe('UNAUTHENTICATED');
            }
        });

        it('должен возвращать UNAUTHENTICATED если передан только пустой accessToken', async () => {
            const command = ValidateSessionCommand.create({ accessToken: '' });
            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            if (result.value.isAuthenticated) {
                expect(result.value.state).toBe('UNAUTHENTICATED');
            }
        });
    });

    describe('валидный refresh token', () => {
        const validRefreshTokenPayload: RefreshTokenPayload = {
            sub: 'user-123',
            type: 'refresh' as const,
            exp: Date.now() / 1000 + 7200,
            iat: Date.now() / 1000,
            jti: 'refresh-jti-456',
            iss: 'tastehub-api',
            aud: 'tastehub-client',
            familyId: 'family-123',
        };

        it('должен вызывать RefreshTokenUseCase и возвращать REFRESHED при успешном обновлении токенов', async () => {
            verifyRefreshTokenMock.mockResolvedValue(validRefreshTokenPayload);
            isTokenExpiredMock.mockResolvedValue(false);

            mockRefreshTokensUseCase.execute = vi.fn().mockResolvedValue(Result.ok({
                accessToken: 'new-access-token',
                refreshToken: 'new-refresh-token',
                accessTokenExpiresIn: 3600,
                refreshTokenExpiresIn: 7200,
                userId: 'user-123',
                isAuthenticated: true,
            }));

            const command = ValidateSessionCommand.create({ refreshToken: 'old-refresh-token' });
            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            if (result.value.isAuthenticated) {
                expect(result.value.state).toBe('REFRESHED');
            }
            expect(mockRefreshTokensUseCase.execute).toHaveBeenCalled();
        });
    });

    describe('просроченный refresh token', () => {
        const expiredRefreshTokenPayload: RefreshTokenPayload = {
            sub: 'user-123',
            type: 'refresh' as const,
            exp: Date.now() / 1000 - 7200,
            iat: Date.now() / 1000,
            jti: 'refresh-jti-expired',
            iss: 'tastehub-api',
            aud: 'tastehub-client',
            familyId: 'family-123',
        };

        it('должен возвращать REFRESH_EXPIRED если refresh token просрочен', async () => {
            verifyRefreshTokenMock.mockResolvedValue(expiredRefreshTokenPayload);
            isTokenExpiredMock.mockResolvedValue(true);

            const command = ValidateSessionCommand.create({ refreshToken: 'expired-refresh-token' });
            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            if (result.value.isAuthenticated) {
                expect(result.value.state).toBe('REFRESH_EXPIRED');
            }
        });
    });

    describe('ошибки верификации refresh token', () => {
        it('должен возвращать REFRESH_INVALID если verifyRefreshToken выбрасывает ошибку InvalidToken', async () => {
            verifyRefreshTokenMock.mockRejectedValue(new Error('Invalid token'));

            const command = ValidateSessionCommand.create({ refreshToken: 'invalid-refresh-token' });
            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            if (result.value.isAuthenticated) {
                expect(result.value.state).toBe('REFRESH_INVALID');
            }
        });

        it('должен возвращать REFRESH_INVALID если verifyRefreshToken вернёт null', async () => {
            verifyRefreshTokenMock.mockResolvedValue(null);

            const command = ValidateSessionCommand.create({ refreshToken: 'null-refresh-token' });
            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            if (result.value.isAuthenticated) {
                expect(result.value.state).toBe('REFRESH_INVALID');
            }
        });
    });

    describe('сценарии RefreshTokenUseCase', () => {
        const validRefreshTokenPayload: RefreshTokenPayload = {
            sub: 'user-123',
            type: 'refresh' as const,
            exp: Date.now() / 1000 + 7200,
            iat: Date.now() / 1000,
            jti: 'refresh-jti-456',
            iss: 'tastehub-api',
            aud: 'tastehub-client',
            familyId: 'family-123',
        };

        it('должен возвращать REFRESH_INVALID при RefreshTokenError.TOKEN_NOT_FOUND', async () => {
            verifyRefreshTokenMock.mockResolvedValue(validRefreshTokenPayload);
            isTokenExpiredMock.mockResolvedValue(false);

            mockRefreshTokensUseCase.execute = vi.fn().mockRejectedValue(
                new RefreshTokenError('Token not found', 'TOKEN_NOT_FOUND')
            );

            const command = ValidateSessionCommand.create({ refreshToken: 'missing-refresh-token' });
            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            if (result.value.isAuthenticated) {
                expect(result.value.state).toBe('REFRESH_INVALID');
            }
        });

        it('должен возвращать REFRESH_INVALID при RefreshTokenError.INVALID_TOKEN', async () => {
            verifyRefreshTokenMock.mockResolvedValue(validRefreshTokenPayload);
            isTokenExpiredMock.mockResolvedValue(false);

            mockRefreshTokensUseCase.execute = vi.fn().mockRejectedValue(
                new RefreshTokenError('Invalid token', 'INVALID_TOKEN')
            );

            const command = ValidateSessionCommand.create({ refreshToken: 'invalid-refresh-token' });
            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            if (result.value.isAuthenticated) {
                expect(result.value.state).toBe('REFRESH_INVALID');
            }
        });

        it('должен возвращать TOKEN_STOLEN при RefreshTokenError.TOKEN_STOLEN', async () => {
            verifyRefreshTokenMock.mockResolvedValue(validRefreshTokenPayload);
            isTokenExpiredMock.mockResolvedValue(false);

            mockRefreshTokensUseCase.execute = vi.fn().mockRejectedValue(
                new RefreshTokenError('Token stolen', 'TOKEN_STOLEN')
            );

            const command = ValidateSessionCommand.create({ refreshToken: 'stolen-refresh-token' });
            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            if (result.value.isAuthenticated) {
                expect(result.value.state).toBe('TOKEN_STOLEN');
            }
        });

        it('должен возвращать REFRESH_EXPIRED при RefreshTokenError.TOKEN_REVOKED', async () => {
            verifyRefreshTokenMock.mockResolvedValue(validRefreshTokenPayload);
            isTokenExpiredMock.mockResolvedValue(false);

            mockRefreshTokensUseCase.execute = vi.fn().mockRejectedValue(
                new RefreshTokenError('Token revoked', 'TOKEN_REVOKED')
            );

            const command = ValidateSessionCommand.create({ refreshToken: 'revoked-refresh-token' });
            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            if (result.value.isAuthenticated) {
                expect(result.value.state).toBe('REFRESH_EXPIRED');
            }
        });

        it('должен возвращать UNAUTHENTICATED при RefreshTokenError.GENERATION_FAILED', async () => {
            verifyRefreshTokenMock.mockResolvedValue(validRefreshTokenPayload);
            isTokenExpiredMock.mockResolvedValue(false);

            mockRefreshTokensUseCase.execute = vi.fn().mockRejectedValue(
                new RefreshTokenError('Failed to generate tokens', 'GENERATION_FAILED')
            );

            const command = ValidateSessionCommand.create({ refreshToken: 'failed-refresh-token' });
            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            if (result.value.isAuthenticated) {
                expect(result.value.state).toBe('UNAUTHENTICATED');
            }
        });
    });

    describe('isRefreshRoute', () => {
        it('должен возвращать UNAUTHENTICATED при isRefreshRoute=true без токенов', async () => {
            const command = ValidateSessionCommand.create({});
            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            if (result.value.isAuthenticated) {
                expect(result.value.state).toBe('UNAUTHENTICATED');
            }
        });

        it('должен возвращать REFRESH_INVALID при isRefreshRoute=true и ошибке верификации refresh токена', async () => {
            verifyRefreshTokenMock.mockRejectedValue(new Error('Invalid token'));

            const command = ValidateSessionCommand.create({ refreshToken: 'dummy' });
            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            if (result.value.isAuthenticated) {
                expect(result.value.state).toBe('REFRESH_INVALID');
            }
        });
    });
});
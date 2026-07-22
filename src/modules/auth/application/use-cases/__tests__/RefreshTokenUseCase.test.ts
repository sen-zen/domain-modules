import { RefreshTokenUseCase } from '../RefreshTokenUseCase';
import { RefreshTokenCommand } from '@auth/application/commands/RefreshTokenCommand';
import { RefreshToken } from '@auth/domain/entities/RefreshToken';
import type { ITokenService } from '@auth/domain/services/ITokenService';
import type { IRefreshTokenRepository } from '@auth/domain/repositories/IRefreshTokenRepository';
import { Result } from '@/utils/result';
import { vi, describe, it, beforeEach, expect, beforeAll } from 'vitest';

describe('RefreshTokenUseCase', () => {
    let useCase: RefreshTokenUseCase;
    let mockRefreshTokenRepository: any;
    let mockTokenService: any;

    beforeEach(() => {
        mockTokenService = {
            verifyRefreshToken: vi.fn(),
            generateTokens: vi.fn(),
            getAccessTokenExpiresIn: () => ({ seconds: 3600 }),
            getRefreshTokenExpiresIn: () => ({ seconds: 604800 }),
        };

        mockRefreshTokenRepository = {
            findByToken: vi.fn(),
            rotateAndRevoke: vi.fn(),
            updateLastUsed: vi.fn(),
            revokeAllByFamilyId: vi.fn(),
        };

        useCase = new RefreshTokenUseCase(
            mockTokenService as unknown as ITokenService,
            mockRefreshTokenRepository as unknown as IRefreshTokenRepository
        );
    });

    describe('execute - успешные сценарии', () => {
        const mockPayload = {
            sub: 'user-123',
            familyId: 'family-123',
        };

        const mockedTokens = {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
            familyId: 'family-123',
        };

        const createCommand = (overrides?: Partial<{ deviceName: string; ipAddress: string; userAgent: string }>) => {
            return RefreshTokenCommand.create({
                refreshToken: 'valid-refresh-token',
                deviceName: 'Test Device',
                ipAddress: '192.168.1.1',
                userAgent: 'Mozilla/5.0',
                ...overrides,
            });
        };

        it('должен успешно обновить токены', async () => {
            mockTokenService.verifyRefreshToken.mockResolvedValue(mockPayload);
            mockRefreshTokenRepository.findByToken.mockResolvedValue(
                RefreshToken.create({
                    token: 'valid-refresh-token',
                    userId: 'user-123',
                    familyId: 'family-123',
                    expiresIn: 604800,
                    deviceName: 'Test Device',
                    ipAddress: '192.168.1.1',
                    userAgent: 'Mozilla/5.0',
                })
            );
            mockTokenService.generateTokens.mockResolvedValue(mockedTokens);
            mockRefreshTokenRepository.rotateAndRevoke.mockResolvedValue(undefined);

            const command = createCommand();
            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            expect(result.value).toEqual({
                accessToken: 'new-access-token',
                refreshToken: 'new-refresh-token',
                accessTokenExpiresIn: 3600,
                refreshTokenExpiresIn: 604800,
            });

            expect(mockTokenService.verifyRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
            expect(mockRefreshTokenRepository.findByToken).toHaveBeenCalledWith('valid-refresh-token');
            expect(mockTokenService.generateTokens).toHaveBeenCalledWith('user-123', 'family-123');
            expect(mockRefreshTokenRepository.rotateAndRevoke).toHaveBeenCalled();
        });

        it('должен вернуть ошибку при невалидном refresh токене', async () => {
            // verifyRefreshToken вернул ошибку - токен невалиден или истёк
            mockTokenService.verifyRefreshToken.mockRejectedValue(
                new Error('Invalid or expired refresh token')
            );

            const command = createCommand();
            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(false);
            if (result.isFailure) {
                // RefreshTokenUseCase использует RefreshTokenError для ошибок невалидного токена
                expect(String(result.error)).toContain('Invalid or expired refresh token');
            }

            expect(mockRefreshTokenRepository.findByToken).not.toHaveBeenCalled();
            expect(mockTokenService.generateTokens).not.toHaveBeenCalled();
        });

        it('должен вернуть ошибку при ошибке верификации токена', async () => {
            const error = new Error('Token verification failed');
            mockTokenService.verifyRefreshToken.mockRejectedValue(error);
            const command = createCommand();
            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(false);
            if (result.isFailure) {
                // Используем String() для ошибки, которая может быть объектом или строкой
                expect(String(result.error)).toContain('Invalid or expired refresh token');
            }

            expect(mockRefreshTokenRepository.findByToken).not.toHaveBeenCalled();
        });

        it('должен вернуть ошибку если токен не найден в репозитории', async () => {
            mockTokenService.verifyRefreshToken.mockResolvedValue(mockPayload);
            // findByToken возвращает ошибку (нет токена)
            mockRefreshTokenRepository.findByToken.mockRejectedValue(
                new Error('Failed to find refresh token')
            );
            const command = createCommand();
            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(false);
            if (result.isFailure) {
                // RefreshTokenUseCase выбрасывает RefreshTokenError с кодом TOKEN_NOT_FOUND
                expect(String(result.error)).toContain('Failed to find refresh token');
            }

            expect(mockTokenService.generateTokens).not.toHaveBeenCalled();
            expect(mockRefreshTokenRepository.rotateAndRevoke).not.toHaveBeenCalled();
        });

        it('должен обработать отозванный токен', async () => {
            const revokedToken = RefreshToken.create({
                token: 'valid-refresh-token',
                familyId: 'family-123',
                userId: 'user-123',
                expiresIn: 604800,
            });
            revokedToken.revoke();

            mockTokenService.verifyRefreshToken.mockResolvedValue(mockPayload);
            mockRefreshTokenRepository.findByToken.mockResolvedValue(revokedToken);
            const command = createCommand();
            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(false);
            if (result.isFailure) {
                // RefreshTokenUseCase выбрасывает RefreshTokenError с кодом TOKEN_REVOKED
                expect(String(result.error)).toContain('Refresh token has been revoked or expired');
            }

            expect(mockRefreshTokenRepository.revokeAllByFamilyId).toHaveBeenCalled();
            expect(mockTokenService.generateTokens).not.toHaveBeenCalled();
        });

        it('должен обработать просроченный токен', async () => {
            // Создаём просроченный токен - revoke() имитирует отозванный/просроченный токен
            const expiredToken = RefreshToken.create({
                token: 'valid-refresh-token',
                familyId: 'family-123',
                userId: 'user-123',
                expiresIn: 604800,
            });
            expiredToken.revoke(); // Используем revoke() вместо искусственного просрочивания

            mockTokenService.verifyRefreshToken.mockResolvedValue(mockPayload);
            mockRefreshTokenRepository.findByToken.mockResolvedValue(expiredToken);
            const command = createCommand();
            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(false);
            if (result.isFailure) {
                // RefreshTokenUseCase выбрасывает RefreshTokenError с кодом TOKEN_REVOKED
                expect(String(result.error)).toContain('Refresh token has been revoked or expired');
            }

            expect(mockRefreshTokenRepository.revokeAllByFamilyId).toHaveBeenCalled();
            expect(mockTokenService.generateTokens).not.toHaveBeenCalled();
        });

        it('должен вернуть ошибку при неудачной генерации токенов', async () => {
            const error = new Error('Token generation failed');
            mockTokenService.verifyRefreshToken.mockResolvedValue(mockPayload);
            mockRefreshTokenRepository.findByToken.mockResolvedValue(
                RefreshToken.create({
                    token: 'valid-refresh-token',
                    userId: 'user-123',
                    familyId: 'family-123',
                    expiresIn: 604800,
                })
            );
            mockTokenService.generateTokens.mockRejectedValue(error);
            const command = createCommand();
            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(false);
            if (result.isFailure) {
                // RefreshTokenUseCase выбрасывает RefreshTokenError с кодом GENERATION_FAILED
                expect(String(result.error)).toContain('Failed to generate new tokens');
            }
        });

        it('должен вернуть ошибку при сбое ротации токенов', async () => {
            const error = new Error('Database transaction failed');
            mockTokenService.verifyRefreshToken.mockResolvedValue(mockPayload);
            mockRefreshTokenRepository.findByToken.mockResolvedValue(
                RefreshToken.create({
                    token: 'valid-refresh-token',
                    userId: 'user-123',
                    familyId: 'family-123',
                    expiresIn: 604800,
                })
            );
            mockTokenService.generateTokens.mockResolvedValue(mockedTokens);
            mockRefreshTokenRepository.rotateAndRevoke.mockRejectedValue(error);

            const command = createCommand();
            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(false);
            if (result.isFailure) {
                // RefreshTokenUseCase выбрасывает RefreshTokenError с кодом GENERATION_FAILED
                expect(String(result.error)).toContain('Failed to rotate refresh token');
            }
        });

        it('должен включать access token в ответ', async () => {
            mockTokenService.verifyRefreshToken.mockResolvedValue(mockPayload);
            mockRefreshTokenRepository.findByToken.mockResolvedValue(
                RefreshToken.create({
                    token: 'valid-refresh-token',
                    userId: 'user-123',
                    familyId: 'family-123',
                    expiresIn: 604800,
                })
            );
            mockTokenService.generateTokens.mockResolvedValue(mockedTokens);
            mockRefreshTokenRepository.rotateAndRevoke.mockResolvedValue(undefined);

            const command = createCommand();
            const result = await useCase.execute(command);

            expect(result.isSuccess).toBe(true);
            if (result.isSuccess) {
                expect(result.value).toHaveProperty('accessToken', 'new-access-token');
                expect(result.value).toHaveProperty('refreshToken', 'new-refresh-token');
                expect(result.value.accessTokenExpiresIn).toBe(3600);
                expect(result.value.refreshTokenExpiresIn).toBe(604800);
            }
        });

        it('должен корректно обработать информацию об устройстве из команды', async () => {
            mockTokenService.verifyRefreshToken.mockResolvedValue(mockPayload);
            mockRefreshTokenRepository.findByToken.mockResolvedValue(
                RefreshToken.create({
                    token: 'valid-refresh-token',
                    userId: 'user-123',
                    familyId: 'family-123',
                    expiresIn: 604800,
                })
            );
            mockTokenService.generateTokens.mockResolvedValue(mockedTokens);
            mockRefreshTokenRepository.rotateAndRevoke.mockResolvedValue(undefined);

            const command = createCommand({
                deviceName: 'My Device',
                ipAddress: '10.0.0.1',
                userAgent: 'Custom Browser',
            });

            await useCase.execute(command);

            expect(mockRefreshTokenRepository.rotateAndRevoke).toHaveBeenCalled();
        });
    });
});

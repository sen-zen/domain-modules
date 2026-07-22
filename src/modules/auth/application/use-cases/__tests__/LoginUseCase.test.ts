import { Email } from '@core/domain/value-objects/Email';
import { LoginCommand } from '@auth/application/commands/LoginCommand';
import { LoginUseCase } from '../LoginUseCase';
import { vi, describe, it, beforeEach, expect } from 'vitest';

interface MockTokens {
    accessToken: string;
    refreshToken: string;
    familyId?: string;
}

describe('LoginUseCase', () => {
    let mockUserRepository: any;
    let mockRefreshTokenRepository: any;
    let mockTokenService: any;

    beforeEach(() => {
        mockUserRepository = {
            findAuthData: async (email: string) => null,
            findById: async (id: string) => null,
            findByEmail: async (email: string) => null,
            delete: async () => { },
        };

        mockTokenService = {
            getExpiresIn: () => ({
                accessTokenExpiresIn: { seconds: 3600 },
                refreshTokenExpiresIn: { seconds: 7200 },
            }),
            generateTokens: (userId: string): Promise<MockTokens> => Promise.resolve({
                accessToken: 'test-access-token-' + userId,
                refreshToken: 'test-refresh-token',
                familyId: 'family-test-id',
            }),
        };

        mockRefreshTokenRepository = {
            save: vi.fn().mockResolvedValue(undefined),
            findByUserIdAndFamilyId: vi.fn().mockResolvedValue(null),
        };
    });

    it('должен успешно выполнить логин с правильными данными', async () => {
        const useCase = new LoginUseCase(mockTokenService as any, mockUserRepository, mockRefreshTokenRepository);

        // Mock findAuthData для успешного кейса - возвращаем User объект в формате для verify()
        // Используем UUID для ID вместо Email.create для корректных тестов
        mockUserRepository.findAuthData = async (email: string) => {
            if (email === 'test@example.com') {
                return {
                    id: 'user-test-id-uuid', // Используем строку как UUID
                    email: Email.create('test@example.com'),
                    passwordHash: {
                        verify: () => true,
                    },
                    name: null,
                    isVerified: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
            }
            return null;
        };

        const command = LoginCommand.create({
            email: 'test@example.com',
            password: 'securePassword123!',
            rememberMe: false,
            userAgent: 'test-agent',
            ipAddress: '127.0.0.1',
            deviceName: 'TestDevice'
        });

        const result = await useCase.execute(command);

        expect(result.isSuccess).toBe(true);
        if (result.isSuccess) {
            expect(result.value.accessToken).toBeDefined();
            expect(result.value.refreshToken).toBeDefined();
            expect(result.value.expiresIn).toBe(7200);
            expect(result.value.user.email).toBe('test@example.com');
        }
    });

    it('должен отлавливать ошибку Invalid email в Result.error', async () => {
        const useCase = new LoginUseCase(mockTokenService as any, mockUserRepository, mockRefreshTokenRepository);
        const command = LoginCommand.create({
            email: 'invalid-email',
            password: 'securePassword123!',
            rememberMe: false,
            userAgent: 'test-agent',
            ipAddress: '127.0.0.1',
            deviceName: 'TestDevice'
        });

        const result = await useCase.execute(command);

        expect(result.isSuccess).toBe(false);
        if (result.isFailure) {
            // Error может быть строкой или объектом
            expect(String(result.error)).toContain('Invalid email address');
        }
    });

    it('должен отлавливать ошибку UnauthorizedError: Invalid credentials при неверном пароле', async () => {
        const useCase = new LoginUseCase(mockTokenService as any, mockUserRepository, mockRefreshTokenRepository);

        // Mock findAuthData для успешного кейса с неправильным verify() результатом
        mockUserRepository.findAuthData = async (email: string) => {
            if (email === 'test@example.com') {
                return {
                    id: 'user-test-id-uuid',
                    email: Email.create('test@example.com'),
                    passwordHash: {
                        verify: () => false, // Невалидный пароль (verify() возвращает false)
                    },
                    name: null,
                    isVerified: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
            }
            return null;
        };

        const command = LoginCommand.create({
            email: 'test@example.com',
            password: 'wrongPassword123!',
            rememberMe: false,
            userAgent: 'test-agent',
            ipAddress: '127.0.0.1',
            deviceName: 'TestDevice'
        });

        const result = await useCase.execute(command);

        expect(result.isSuccess).toBe(false);
        if (result.isFailure) {
            // LoginUseCase выбрасывает UnauthorizedError с сообщением 'Invalid credentials'
            expect(String(result.error)).toContain('UnauthorizedError: Invalid credentials');
        }
    });

    it('должен возвращать ошибку NotFoundError если пользователь не найден', async () => {
        const useCase = new LoginUseCase(mockTokenService as any, mockUserRepository, mockRefreshTokenRepository);

        // Mock findAuthData для случая когда пользователь не найден
        mockUserRepository.findAuthData = async (email: string) => null;

        const command = LoginCommand.create({
            email: 'nonexistent@example.com',
            password: 'any-password',
            rememberMe: false,
            userAgent: 'test-agent',
            ipAddress: '127.0.0.1',
            deviceName: 'TestDevice'
        });

        const result = await useCase.execute(command);

        expect(result.isSuccess).toBe(false);
        if (result.isFailure) {
            // NotFoundError может быть строкой или объектом с кодом
            expect(String(result.error)).toContain('User not found');
        }
    });

    it('должен создавать новый refresh token при успешном входе', async () => {
        const useCase = new LoginUseCase(mockTokenService as any, mockUserRepository, mockRefreshTokenRepository);

        // Mock findAuthData для успешного кейса
        mockUserRepository.findAuthData = async (email: string) => {
            if (email === 'test@example.com') {
                return {
                    id: 'user-test-id-uuid',
                    email: Email.create('test@example.com'),
                    passwordHash: {
                        verify: () => true,
                    },
                    name: null,
                    isVerified: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
            }
            return null;
        };

        const command = LoginCommand.create({
            email: 'test@example.com',
            password: 'securePassword123!',
            rememberMe: false,
            userAgent: 'test-agent',
            ipAddress: '127.0.0.1',
            deviceName: 'TestDevice'
        });

        const result = await useCase.execute(command);

        expect(result.isSuccess).toBe(true);

        // Проверка что refreshTokenRepository.save был вызван
        expect(mockRefreshTokenRepository.save).toHaveBeenCalled();
    });
});
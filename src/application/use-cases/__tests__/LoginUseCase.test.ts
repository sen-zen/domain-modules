import { User, Password } from '../../../index';
import { LoginCommand } from '../../commands/LoginCommand';
import { LoginUseCase } from '../LoginUseCase';

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
            findAuthData: (email: string) => Promise.resolve(null),
            findById: (id: string) => Promise.resolve(null),
            findByEmail: (email: string) => Promise.resolve(null),
            delete: () => Promise.resolve()
        };
        mockRefreshTokenRepository = {
            save: () => Promise.resolve(),
            findByUserIdAndFamilyId: () => Promise.resolve(null)
        };

        // Используем объект для корректного вызова getExpiresIn() в тестах (не async как в production)
        // LoginUseCase ожидает: const refreshExpires = expires.refreshTokenExpiresIn; и затем refreshExpires.seconds
        mockTokenService = {
            getExpiresIn: () => ({
                accessTokenExpiresIn: { seconds: 3600 },
                refreshTokenExpiresIn: { seconds: 7200 } // 2 часа для refresh token
            }),
            generateTokens: (userId: string): Promise<MockTokens> => Promise.resolve({
                accessToken: 'test-access-token-' + userId,
                refreshToken: 'test-refresh-token',
                familyId: 'family-test-id'
            })
        };

        // Генерируем реальный хеш через bcrypt для корректного verify() API contract
        const testPassword = Password.create('securePassword123!');
        const passwordHash = testPassword.value;

        // Mock findAuthData для успешного кейса с правильным passwordHash и API-compatible User object (для verify())
        mockUserRepository.findAuthData = async (email: string) => {
            if (email === 'test@example.com') {
                const user = User.reconstitute({
                    id: 'test-user-id',
                    email: 'test@example.com',
                    username: null,
                    passwordHash: passwordHash,
                    avatar: null,
                    profilePictureUrl: null,
                    bio: null,
                    languageCode: 'ru',
                    countryCode: null,
                    subscriptionStatus: false,
                    verificationToken: null,
                    verificationTokenExpiresAt: null,
                    roleId: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                return user;
            }
            return null;
        };
    });

    it('должен успешно выполнить логин с правильными данными', async () => {
        const useCase = new LoginUseCase(mockTokenService as any, mockUserRepository, mockRefreshTokenRepository);

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
        }
    });

    it('должен отлавливать ошибку Invalid email в Result.error.error', async () => {
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
            const error = result.error;
            expect(error?.toString()).toContain('Invalid email address');
        }
    });

    it('должен отлавливать ошибку UnauthorizedError: Invalid credentials при неверном пароле', async () => {
        const useCase = new LoginUseCase(mockTokenService as any, mockUserRepository, mockRefreshTokenRepository);
        const command = LoginCommand.create({
            email: 'test@example.com',
            password: 'wrongPassword123!', // Неверный пароль (не совпадает с hash в DB)
            rememberMe: false,
            userAgent: 'test-agent',
            ipAddress: '127.0.0.1',
            deviceName: 'TestDevice'
        });

        const result = await useCase.execute(command);

        expect(result.isSuccess).toBe(false);
        if (result.isFailure) {
            const error = result.error;
            // LoginUseCase выбрасывает UnauthorizedError с сообщением 'Invalid credentials'
            expect(error?.toString()).toContain('UnauthorizedError: Invalid credentials');
        }
    });
});

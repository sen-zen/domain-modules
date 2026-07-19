import { RefreshTokenUseCase } from '../RefreshTokenUseCase';
import { RefreshTokenCommand } from '../../../application/commands/RefreshTokenCommand';
import { RefreshToken } from '../../../domain/entities/RefreshToken';
import { UnauthorizedError, NotFoundError } from '../../../../../errors';
import type { ITokenService } from '../../../domain/services/ITokenService';
import type { IRefreshTokenRepository } from '../../../domain/repositories/IRefreshTokenRepository';

describe('RefreshTokenUseCase', () => {
    let useCase: RefreshTokenUseCase;
    let mockRefreshTokenRepository: any;
    let mockTokenService: any;

    beforeEach(() => {
        // Создание моков для сервисов
        mockTokenService = {
            generateTokens: vi.fn(),
            verifyRefreshToken: vi.fn(),
            getAccessTokenExpiresIn: vi.fn(),
            getRefreshTokenExpiresIn: vi.fn(),
        };

        mockRefreshTokenRepository = {
            findByToken: vi.fn(),
            updateLastUsed: vi.fn(),
            rotateAndRevoke: vi.fn(),
            revokeAllByFamilyId: vi.fn(),
        };

        useCase = new RefreshTokenUseCase(
            mockTokenService as unknown as ITokenService,
            mockRefreshTokenRepository as unknown as IRefreshTokenRepository
        );
    });

    describe('execute - выполнение обновления токена', () => {
        // Тестовые данные
        const mockRefreshToken = 'valid-refresh-token';
        const mockUserId = 'user-123';
        const mockFamilyId = 'family-123';
        const mockAccessToken = 'new-access-token';
        const mockNewRefreshToken = 'new-refresh-token';
        const mockRefreshTokenId = 'refresh-token-id';

        // Payload для верификации токена
        const mockPayload = {
            sub: mockUserId,
            familyId: mockFamilyId,
        };

        // Результат генерации токенов
        const mockTokens = {
            accessToken: mockAccessToken,
            refreshToken: mockNewRefreshToken,
            familyId: mockFamilyId,
            refreshTokenId: mockRefreshTokenId,
        };

        // Создание сущности RefreshToken
        const mockRefreshTokenEntity = RefreshToken.create({
            token: mockRefreshToken,
            familyId: mockFamilyId,
            userId: mockUserId,
            expiresIn: 604800,
        });

        /**
         * Вспомогательная функция для создания команды
         */
        const createCommand = (overrides = {}) => {
            return RefreshTokenCommand.create({
                refreshToken: mockRefreshToken,
                deviceName: 'Test Device',
                ipAddress: '192.168.1.1',
                userAgent: 'Mozilla/5.0',
                ...overrides,
            });
        };

        it('должен успешно обновить токены', async () => {
            // Arrange - подготовка данных
            mockTokenService.verifyRefreshToken.mockResolvedValue(mockPayload);
            mockRefreshTokenRepository.findByToken.mockResolvedValue(mockRefreshTokenEntity);
            mockTokenService.generateTokens.mockResolvedValue(mockTokens);
            mockTokenService.getRefreshTokenExpiresIn.mockReturnValue({ seconds: 604800 });
            mockTokenService.getAccessTokenExpiresIn.mockReturnValue({ seconds: 900 });
            mockRefreshTokenRepository.rotateAndRevoke.mockResolvedValue(undefined);
            mockRefreshTokenRepository.updateLastUsed.mockResolvedValue(undefined);

            const command = createCommand();

            // Act - выполнение
            const result = await useCase.execute(command);

            // Assert - проверка результата
            expect(result.isSuccess).toBe(true);
            expect(result.value).toEqual({
                accessToken: mockAccessToken,
                refreshToken: mockNewRefreshToken,
                expiresIn: 900,
            });

            // Проверка вызовов методов
            expect(mockTokenService.verifyRefreshToken).toHaveBeenCalledWith(mockRefreshToken);
            expect(mockRefreshTokenRepository.findByToken).toHaveBeenCalledWith(mockRefreshToken);
            expect(mockTokenService.generateTokens).toHaveBeenCalledWith(mockUserId, mockFamilyId);
            expect(mockRefreshTokenRepository.rotateAndRevoke).toHaveBeenCalled();
            expect(mockRefreshTokenRepository.updateLastUsed).toHaveBeenCalledWith(mockRefreshTokenEntity.id);
        });

        it('должен вернуть ошибку при невалидном refresh токене', async () => {
            // Arrange
            mockTokenService.verifyRefreshToken.mockResolvedValue(null);

            const command = createCommand();

            // Act
            const result = await useCase.execute(command);

            // Assert
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBeInstanceOf(UnauthorizedError);
            expect(result.errorMessage).toBe('Invalid or expired refresh token');

            expect(mockRefreshTokenRepository.findByToken).not.toHaveBeenCalled();
            expect(mockTokenService.generateTokens).not.toHaveBeenCalled();
        });

        it('должен вернуть ошибку при ошибке верификации токена', async () => {
            // Arrange
            const error = new Error('Token verification failed');
            mockTokenService.verifyRefreshToken.mockRejectedValue(error);

            const command = createCommand();

            // Act
            const result = await useCase.execute(command);

            // Assert
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBeInstanceOf(UnauthorizedError);
            expect(result.errorMessage).toBe('Invalid or expired refresh token');

            expect(mockRefreshTokenRepository.findByToken).not.toHaveBeenCalled();
            expect(mockTokenService.generateTokens).not.toHaveBeenCalled();
        });

        it('должен вернуть ошибку если токен не найден в репозитории', async () => {
            // Arrange
            mockTokenService.verifyRefreshToken.mockResolvedValue(mockPayload);
            mockRefreshTokenRepository.findByToken.mockResolvedValue(null);

            const command = createCommand();

            // Act
            const result = await useCase.execute(command);

            // Assert
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBeInstanceOf(NotFoundError);
            expect(result.errorMessage).toContain('Refresh token');

            expect(mockTokenService.generateTokens).not.toHaveBeenCalled();
            expect(mockRefreshTokenRepository.rotateAndRevoke).not.toHaveBeenCalled();
        });

        it('должен вернуть ошибку при ошибке поиска токена в БД', async () => {
            // Arrange
            const error = new Error('Database connection failed');
            mockTokenService.verifyRefreshToken.mockResolvedValue(mockPayload);
            mockRefreshTokenRepository.findByToken.mockRejectedValue(error);

            const command = createCommand();

            // Act
            const result = await useCase.execute(command);

            // Assert
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBeInstanceOf(NotFoundError);
            expect(result.errorMessage).toContain('Refresh token');

            expect(mockTokenService.generateTokens).not.toHaveBeenCalled();
        });

        it('должен обработать отозванный токен', async () => {
            // Arrange - создаем отозванный токен
            const revokedToken = RefreshToken.create({
                token: mockRefreshToken,
                familyId: mockFamilyId,
                userId: mockUserId,
                expiresIn: 604800,
            });
            revokedToken.revoke();

            mockTokenService.verifyRefreshToken.mockResolvedValue(mockPayload);
            mockRefreshTokenRepository.findByToken.mockResolvedValue(revokedToken);

            const command = createCommand();

            // Act
            const result = await useCase.execute(command);

            // Assert
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBeInstanceOf(UnauthorizedError);
            expect(result.errorMessage).toBe('Refresh token has been revoked or expired');
            expect(mockTokenService.generateTokens).not.toHaveBeenCalled();
            expect(mockRefreshTokenRepository.rotateAndRevoke).not.toHaveBeenCalled();
            expect(mockRefreshTokenRepository.revokeAllByFamilyId).toHaveBeenCalledWith(mockFamilyId);
        });

        it('должен обработать просроченный токен', async () => {
            // Arrange - создаем просроченный токен
            const expiredToken = RefreshToken.create({
                token: mockRefreshToken,
                familyId: mockFamilyId,
                userId: mockUserId,
                expiresIn: 1,
            });
            // Принудительно делаем токен просроченным
            vi.spyOn(expiredToken, 'isActive', 'get').mockReturnValue(false);

            mockTokenService.verifyRefreshToken.mockResolvedValue(mockPayload);
            mockRefreshTokenRepository.findByToken.mockResolvedValue(expiredToken);

            const command = createCommand();

            // Act
            const result = await useCase.execute(command);

            // Assert
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBeInstanceOf(UnauthorizedError);
            expect(result.errorMessage).toBe('Refresh token has been revoked or expired');

            expect(mockTokenService.generateTokens).not.toHaveBeenCalled();
        });

        it('должен вернуть ошибку при неудачной генерации токенов', async () => {
            // Arrange
            const error = new Error('Token generation failed');
            mockTokenService.verifyRefreshToken.mockResolvedValue(mockPayload);
            mockRefreshTokenRepository.findByToken.mockResolvedValue(mockRefreshTokenEntity);
            mockTokenService.generateTokens.mockRejectedValue(error);

            const command = createCommand();

            // Act
            const result = await useCase.execute(command);

            // Assert
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe(error);
            expect(mockRefreshTokenRepository.rotateAndRevoke).not.toHaveBeenCalled();
        });

        it('должен вернуть ошибку при сбое ротации токенов', async () => {
            // Arrange
            const error = new Error('Database transaction failed');
            mockTokenService.verifyRefreshToken.mockResolvedValue(mockPayload);
            mockRefreshTokenRepository.findByToken.mockResolvedValue(mockRefreshTokenEntity);
            mockTokenService.generateTokens.mockResolvedValue(mockTokens);
            mockTokenService.getRefreshTokenExpiresIn.mockReturnValue({ seconds: 604800 });
            mockRefreshTokenRepository.rotateAndRevoke.mockRejectedValue(error);

            const command = createCommand();

            // Act
            const result = await useCase.execute(command);

            // Assert
            expect(result.isSuccess).toBe(false);
            expect(result.error).toBe(error);
            expect(mockRefreshTokenRepository.updateLastUsed).not.toHaveBeenCalled();
        });

        it('должен включать refresh токен в ответ', async () => {
            // Arrange
            mockTokenService.verifyRefreshToken.mockResolvedValue(mockPayload);
            mockRefreshTokenRepository.findByToken.mockResolvedValue(mockRefreshTokenEntity);
            mockTokenService.generateTokens.mockResolvedValue(mockTokens);
            mockTokenService.getRefreshTokenExpiresIn.mockReturnValue({ seconds: 604800 });
            mockTokenService.getAccessTokenExpiresIn.mockReturnValue({ seconds: 900 });
            mockRefreshTokenRepository.rotateAndRevoke.mockResolvedValue(undefined);
            mockRefreshTokenRepository.updateLastUsed.mockResolvedValue(undefined);

            const command = createCommand();

            // Act
            const result = await useCase.execute(command);

            // Assert
            expect(result.isSuccess).toBe(true);
            expect(result.value).toHaveProperty('accessToken', mockAccessToken);
            expect(result.value).toHaveProperty('refreshToken', mockNewRefreshToken);
            expect(result.value).toHaveProperty('expiresIn', 900);
        });

        it('должен корректно обработать информацию об устройстве из команды', async () => {
            // Arrange
            mockTokenService.verifyRefreshToken.mockResolvedValue(mockPayload);
            mockRefreshTokenRepository.findByToken.mockResolvedValue(mockRefreshTokenEntity);
            mockTokenService.generateTokens.mockResolvedValue(mockTokens);
            mockTokenService.getRefreshTokenExpiresIn.mockReturnValue({ seconds: 604800 });
            mockTokenService.getAccessTokenExpiresIn.mockReturnValue({ seconds: 900 });
            mockRefreshTokenRepository.rotateAndRevoke.mockResolvedValue(undefined);
            mockRefreshTokenRepository.updateLastUsed.mockResolvedValue(undefined);

            const command = createCommand({
                deviceName: 'My Device',
                ipAddress: '10.0.0.1',
                userAgent: 'Custom Browser',
            });

            // Act
            await useCase.execute(command);

            // Assert - проверяем, что токен создан с правильными данными
            expect(mockRefreshTokenRepository.rotateAndRevoke).toHaveBeenCalled();

            const callArgs = mockRefreshTokenRepository.rotateAndRevoke.mock.calls[0];
            const newToken = callArgs[1];

            expect(newToken).toBeInstanceOf(RefreshToken);
            expect(newToken.deviceName).toBe('My Device');
            expect(newToken.ipAddress).toBe('10.0.0.1');
            expect(newToken.userAgent).toBe('Custom Browser');
        });
    });
});
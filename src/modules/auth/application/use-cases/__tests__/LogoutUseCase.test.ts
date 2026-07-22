import { LogoutUseCase } from '../LogoutUseCase';
import type { IRefreshTokenRepository } from '../../../domain/repositories/IRefreshTokenRepository';
import { UserId } from '@user/domain/value-objects/UserId';
import { vi, describe, it, beforeEach, expect } from 'vitest';

describe('LogoutUseCase', () => {
    let useCase: LogoutUseCase;
    let mockRefreshTokenRepository: Partial<IRefreshTokenRepository>;

    beforeEach(() => {
        mockRefreshTokenRepository = {
            revokeAllByUserId: vi.fn(),
        };

        useCase = new LogoutUseCase(mockRefreshTokenRepository as IRefreshTokenRepository);
    });

    describe('execute', () => {
        it('должен отозвать все refresh токены пользователя', async () => {
            const userId = UserId.create('user-123');

            await useCase.execute(userId);

            expect(mockRefreshTokenRepository.revokeAllByUserId).toHaveBeenCalledWith(userId);
        });

        it('должен работать с разными userId', async () => {
            const testCases = [
                { id: 'user-1', name: 'Первый пользователь' },
                { id: 'user-2', name: 'Второй пользователь' },
                { id: 'admin-user', name: 'Администратор' },
            ];

            for (const testCase of testCases) {
                const userId = UserId.create(testCase.id);
                await useCase.execute(userId);

                expect(mockRefreshTokenRepository.revokeAllByUserId).toHaveBeenCalledWith(userId);
            }
        });

        it('должен обрабатывать пустой результат отозва', async () => {
            mockRefreshTokenRepository.revokeAllByUserId = vi.fn().mockResolvedValue(undefined);

            const userId = UserId.create('test-user');
            await useCase.execute(userId);

            expect(mockRefreshTokenRepository.revokeAllByUserId).toHaveBeenCalled();
        });

        it('должен обрабатывать ошибку при отзыве токенов', async () => {
            const error = new Error('Database connection failed');
            mockRefreshTokenRepository.revokeAllByUserId = vi.fn().mockRejectedValue(error);

            const userId = UserId.create('test-user');

            await expect(useCase.execute(userId)).rejects.toThrow(error);
        });

        it('должен очищать все токены пользователя', async () => {
            mockRefreshTokenRepository.revokeAllByUserId = vi.fn().mockResolvedValue({ deleted: 5 });

            const userId = UserId.create('user-123');

            await useCase.execute(userId);

            expect(mockRefreshTokenRepository.revokeAllByUserId).toHaveBeenCalled();
        });

        it('должен быть асинхронной операцией', async () => {
            mockRefreshTokenRepository.revokeAllByUserId = vi.fn().mockResolvedValue(undefined);

            const userId = UserId.create('test-user');

            await expect(useCase.execute(userId)).resolves.toBeUndefined();
        });
    });

    describe('интеграционные сценарии', () => {
        it('должен корректно завершать процесс выхода из системы', async () => {
            mockRefreshTokenRepository.revokeAllByUserId = vi.fn()
                .mockResolvedValue({ deleted: 3 }); // Удалено 3 токена

            const userId = UserId.create('user-123');

            await useCase.execute(userId);

            expect(mockRefreshTokenRepository.revokeAllByUserId).toHaveBeenCalled();
        });

        it('должен безопасно обрабатывать вызов при отсутствии ошибок', async () => {
            mockRefreshTokenRepository.revokeAllByUserId = vi.fn().mockResolvedValue(undefined);

            const userId = UserId.create('test-user');

            await expect(useCase.execute(userId)).resolves.toBeUndefined();
        });
    });
});

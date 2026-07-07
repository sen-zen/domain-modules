import { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository';
import { UserId } from '../../domain/value-objects/UserId';

export class LogoutUseCase {
    constructor(
        private readonly refreshTokenRepository: IRefreshTokenRepository
    ) { }

    async execute(userId: UserId): Promise<void> {
        await this.refreshTokenRepository.revokeAllByUserId(userId);
    }
}
import { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository';
import { UserId } from '../../../user/domain/value-objects/UserId';
import { Component } from '@/decorators/Component';

@Component({ dependencies: ['IRefreshTokenRepository'] })
export class LogoutUseCase {
    constructor(
        private readonly refreshTokenRepository: IRefreshTokenRepository
    ) { }

    async execute(userId: UserId): Promise<void> {
        await this.refreshTokenRepository.revokeAllByUserId(userId);
    }
}
import type { IRefreshTokenRepository } from '@auth/domain/repositories/IRefreshTokenRepository';
import { UserId } from '@user/domain/value-objects/UserId';
import { AuthComponent } from '@auth/decorator';

@AuthComponent({
    dependencies: ['RefreshTokenRepository']
})
export class LogoutUseCase {
    constructor(
        private readonly refreshTokenRepository: IRefreshTokenRepository
    ) { }

    async execute(userId: UserId): Promise<void> {
        await this.refreshTokenRepository.revokeAllByUserId(userId);
    }
}

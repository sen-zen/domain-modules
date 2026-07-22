import type { ITokenService } from '@auth/domain/services/ITokenService';
import type { IRefreshTokenRepository } from '@auth/domain/repositories/IRefreshTokenRepository';
import { RefreshToken } from '@auth/domain/entities/RefreshToken';
import { RefreshTokenCommand } from '@auth/application/commands/RefreshTokenCommand';
import { RefreshTokenError } from '@/errors';
import { Result } from '@/utils/result';
import { UseCase } from '@core/application';
import { AuthComponent } from '@auth/decorator';

export type RefreshTokenResponse = {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresIn: number;
    refreshTokenExpiresIn: number;
};

@AuthComponent({
    dependencies: [
        'TokenService',
        'RefreshTokenRepository'
    ]
})
export class RefreshTokenUseCase extends UseCase<RefreshTokenCommand, RefreshTokenResponse> {
    constructor(
        private readonly tokenService: ITokenService,
        private readonly refreshTokenRepository: IRefreshTokenRepository
    ) { super() }

    async execute(command: RefreshTokenCommand): Promise<Result<RefreshTokenResponse>> {
        const payloadResult = await this.tryCatchAsync(() => this.tokenService.verifyRefreshToken(command.refreshToken));

        if (payloadResult.isFailure || !payloadResult.value) {
            return this.fail(new RefreshTokenError(
                'Invalid or expired refresh token',
                'INVALID_TOKEN',
                { error: payloadResult.error }
            ));
        }

        const payload = payloadResult.value;
        const storedTokenResult = await this.tryCatchAsync(() => this.refreshTokenRepository.findByToken(command.refreshToken));

        if (storedTokenResult.isFailure || !storedTokenResult.value) {
            return this.fail(new RefreshTokenError(
                'Failed to find refresh token',
                "TOKEN_NOT_FOUND",
                {
                    familyId: payload.familyId,
                    error: storedTokenResult.error
                }
            ));
        }

        const storedToken = storedTokenResult.value;
        if (!storedToken.isActive) {
            // Если токен отозван или истек - отзываем всю семью (безопасность)
            await this.refreshTokenRepository.revokeAllByFamilyId(payload.familyId);

            return this.fail(new RefreshTokenError(
                'Refresh token has been revoked or expired',
                'TOKEN_REVOKED',
                {
                    familyId: payload.familyId,
                    userId: payload.sub,
                    tokenId: storedToken.id
                }
            ));
        }

        const tokensResult = await this.tryCatchAsync(() => this.tokenService.generateTokens(
            payload.sub,
            payload.familyId
        ));

        if (tokensResult.isFailure || !tokensResult.value) {
            return this.fail(new RefreshTokenError(
                'Failed to generate new tokens',
                'GENERATION_FAILED',
                {
                    userId: payload.sub,
                    familyId: payload.familyId,
                    originalError: tokensResult.error
                }
            ));
        }

        const tokens = tokensResult.value;
        const newRefreshToken = RefreshToken.create({
            token: tokens.refreshToken,
            familyId: tokens.familyId,
            userId: storedToken.userId,
            expiresIn: this.tokenService.getRefreshTokenExpiresIn().seconds,
            deviceName: command.deviceName,
            ipAddress: command.ipAddress,
            userAgent: command.userAgent,
        });

        const saveResult = await this.tryCatchAsync(() => this.refreshTokenRepository.rotateAndRevoke(
            storedToken.id,
            newRefreshToken
        ));

        if (saveResult.isFailure) {
            return this.fail(new RefreshTokenError(
                'Failed to rotate refresh token',
                'GENERATION_FAILED',
                {
                    oldTokenId: storedToken.id,
                    newTokenId: newRefreshToken.id,
                    originalError: saveResult.error
                }
            ));
        }

        try {
            await this.refreshTokenRepository.updateLastUsed(storedToken.id);
        } catch { }

        return Result.ok({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            accessTokenExpiresIn: this.tokenService.getAccessTokenExpiresIn().seconds,
            refreshTokenExpiresIn: this.tokenService.getRefreshTokenExpiresIn().seconds
        });
    }
}

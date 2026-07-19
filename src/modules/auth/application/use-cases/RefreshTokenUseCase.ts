import { ITokenService } from '../../domain/services/ITokenService';
import { RefreshToken } from '../../domain/entities/RefreshToken';
import { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository';
import { RefreshTokenCommand } from '../commands/RefreshTokenCommand';
import { UnauthorizedError, NotFoundError } from '../../../../errors';
import { Result } from '../../../../utils/result';
import { UseCase } from '../../../core/application';

export type RefreshTokenResponse = {
    accessToken: string;
};

export class RefreshTokenUseCase extends UseCase<RefreshTokenCommand, RefreshTokenResponse> {
    constructor(
        private readonly tokenService: ITokenService,
        private readonly refreshTokenRepository: IRefreshTokenRepository
    ) { super() }

    async execute(command: RefreshTokenCommand): Promise<Result<RefreshTokenResponse>> {
        const payloadResult = await this.tryCatchAsync(() => this.tokenService.verifyRefreshToken(command.refreshToken));

        if (payloadResult.isFailure || !payloadResult.value) {
            return this.fail(new UnauthorizedError('Invalid or expired refresh token'));
        }

        const payload = payloadResult.value;
        const storedTokenResult = await this.tryCatchAsync(() => this.refreshTokenRepository.findByToken(command.refreshToken));

        if (storedTokenResult.isFailure || !storedTokenResult.value) {
            return this.fail(new NotFoundError('Refresh token', 'token', { familyId: payload.familyId }));
        }

        const storedToken = storedTokenResult.value;
        if (!storedToken.isActive) {
            // Если токен отозван или истек - отзываем всю семью (безопасность)
            await this.refreshTokenRepository.revokeAllByFamilyId(payload.familyId);
            return this.fail(new UnauthorizedError('Refresh token has been revoked or expired'));
        }

        const tokensResult = await this.tryCatchAsync(() => this.tokenService.generateTokens(
            payload.sub,
            payload.familyId
        ));

        if (tokensResult.isFailure || !tokensResult.value) {
            return this.fail(tokensResult.error ?? 'Failed to generate tokens');
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
            return this.fail(saveResult.error);
        }

        await this.refreshTokenRepository.updateLastUsed(storedToken.id);

        return Result.ok({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: this.tokenService.getAccessTokenExpiresIn().seconds,
        });
    }
}

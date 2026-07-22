import { Result } from '@/utils/result';
import { UseCase } from '@core/application';
import { RefreshTokenError } from '@/errors';

import { AuthComponent } from '../../decorator';
import { RefreshTokenCommand, ValidateSessionCommand } from '../commands';

import type { ITokenService } from '@auth/domain/services/ITokenService';
import type { RefreshTokenUseCase } from '@auth/application/use-cases';
import type { AccessTokenPayload, RefreshTokenPayload } from '@auth/types';

type SessionValidationState =
    "UNAUTHENTICATED" |     // Нет токенов или все невалидны
    "AUTHENTICATED" |       // Access token валиде
    "REFRESHED" |           // Access token обновлён через refresh token
    "REFRESH_EXPIRED" |     // Refresh token истёк 
    "REFRESH_INVALID" |     // Refresh токен невал
    "TOKEN_STOLEN"          // Токен скомпрометирован

export type ValidateSessionUseCaseResponse =
    {
        isAuthenticated: false;
        state: Exclude<SessionValidationState, 'AUTHENTICATED' | 'REFRESHED'>;
    } | {
        isAuthenticated: true;
        state: "AUTHENTICATED";
        userId: string;
        accessToken: string;
        accessTokenPayload: AccessTokenPayload;
    } | {
        isAuthenticated: true;
        state: "REFRESHED";
        userId: string;
        accessTokenPayload: AccessTokenPayload;
        refreshTokenPayload?: RefreshTokenPayload;
        newTokens: {
            accessToken: string;
            accessTokenExpiresIn: number;
            refreshToken: string;
            refreshTokenExpiresIn: number;
        };
    }

@AuthComponent({
    dependencies: [
        'TokenService',
        'RefreshTokenUseCase'
    ]
})
export class ValidateSessionUseCase extends UseCase<ValidateSessionCommand, ValidateSessionUseCaseResponse> {
    constructor(
        private tokenService: ITokenService,
        private refreshTokensUseCase: RefreshTokenUseCase,
    ) { super() }

    async execute(input: ValidateSessionCommand): Promise<Result<ValidateSessionUseCaseResponse>> {
        let isValidToken = false;
        let tokenPayload = null;

        if (input.accessToken) {
            try {
                tokenPayload = await this.tokenService.verifyAccessToken(input.accessToken);
                isValidToken = !(await this.tokenService.isTokenExpired(input.accessToken));
            } catch (error) {
                isValidToken = false;
            }

            if (isValidToken && tokenPayload) {
                return this.ok({
                    isAuthenticated: true,
                    state: "AUTHENTICATED",
                    userId: tokenPayload.sub,
                    accessToken: input.accessToken,
                    accessTokenPayload: tokenPayload,
                });
            }
        }

        if (!input.refreshToken || input.isRefreshRoute) {
            return this.ok({
                isAuthenticated: false,
                state: "UNAUTHENTICATED",
            });
        }

        try {
            const refreshTokenPayload = await this.tokenService.verifyRefreshToken(input.refreshToken);
            const isRefreshTokenExpired = await this.tokenService.isTokenExpired(input.refreshToken);

            if (isRefreshTokenExpired) {
                return this.ok({
                    isAuthenticated: false,
                    state: "REFRESH_EXPIRED"
                });
            }

            const refreshTokenCommand = RefreshTokenCommand.create({ refreshToken: input.refreshToken });
            const refreshResult = await this.refreshTokensUseCase.execute(refreshTokenCommand);

            if (refreshResult.isFailure) {
                const error = refreshResult.error;

                if (error instanceof RefreshTokenError) {
                    switch (error.code) {
                        case 'TOKEN_NOT_FOUND':
                        case 'INVALID_TOKEN':
                            return this.ok({ isAuthenticated: false, state: "REFRESH_INVALID" });
                        case 'TOKEN_STOLEN':
                            return this.ok({ isAuthenticated: false, state: "TOKEN_STOLEN" });
                        case 'TOKEN_REVOKED':
                            return this.ok({ isAuthenticated: false, state: "REFRESH_EXPIRED" });
                        case 'GENERATION_FAILED':
                            return this.ok({ isAuthenticated: false, state: "UNAUTHENTICATED" });
                    }
                }

                return this.ok({
                    isAuthenticated: false,
                    state: "UNAUTHENTICATED"
                });
            }

            const accessTokenPayload = await this.tokenService.verifyAccessToken(refreshResult.value.accessToken);

            return this.ok({
                isAuthenticated: true,
                state: "REFRESHED",
                userId: accessTokenPayload.sub,
                accessTokenPayload: accessTokenPayload,
                refreshTokenPayload: refreshTokenPayload,
                newTokens: {
                    accessToken: refreshResult.value.accessToken,
                    accessTokenExpiresIn: refreshResult.value.accessTokenExpiresIn,
                    refreshToken: refreshResult.value.refreshToken,
                    refreshTokenExpiresIn: refreshResult.value.refreshTokenExpiresIn,
                }
            })
        } catch (error) {
            return this.ok({
                isAuthenticated: false,
                state: 'REFRESH_INVALID'
            });
        }
    }
}

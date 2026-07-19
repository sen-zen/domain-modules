import { Result } from '@/utils/result';
import { NotFoundError } from '@/errors';
import { UseCase } from '@core/application';
import { UserId } from '@user/domain/value-objects/UserId';
import type { ITokenService } from '@auth/domain/services/ITokenService';
import type { UserDomainRepository } from '@user/domain/repositories/IUserRepository';

export type GetCurrentUserResponse = {
    user: {
        id: string;
        email: string;
        username: string;
        avatar: string | null;
        isVerified: boolean;
    } | null;
};

export class GetCurrentUserUseCase extends UseCase<string | undefined, GetCurrentUserResponse> {
    constructor(
        private readonly tokenService: ITokenService,
        private readonly userRepository: UserDomainRepository
    ) {
        super();
    }

    async execute(accessToken?: string): Promise<Result<GetCurrentUserResponse>> {
        if (!accessToken) {
            return this.ok({ user: null });
        }

        const payloadResult = await this.tryCatchAsync(() =>
            this.tokenService.verifyAccessToken(accessToken)
        );

        if (payloadResult.isFailure || !payloadResult.value) {
            return this.ok({ user: null });
        }

        const payload = payloadResult.value;
        const userResult = await this.tryCatchAsync(async () => {
            const user = await this.userRepository.findById(
                UserId.create(payload.sub)
            );
            if (!user) {
                throw new NotFoundError('User', payload.sub);
            }
            return user;
        });

        if (userResult.isFailure) {
            return this.fail(userResult.error);
        }

        const user = userResult.value;

        return this.ok({
            user: {
                id: user.id.value,
                email: user.email.value,
                username: user.username || '',
                avatar: user.avatar || null,
                isVerified: user.isVerified,
            },
        });
    }
}

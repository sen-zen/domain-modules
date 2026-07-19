import { UseCase } from '../../../core/application/UseCase';
import { LoginCommand } from '../commands/LoginCommand';

import { Email } from '../../../core/domain/value-objects/Email';
import { Password } from '../../../core/domain/value-objects/Password';
import { RefreshToken } from '../../domain/entities/RefreshToken';
import { NotFoundError, UnauthorizedError } from '../../../../errors';

import type { Result } from '../../../../utils/result';
import type { ITokenService } from '../../domain/services/ITokenService';
import type { IUserRepository } from '../../domain/repositories/IUserRepository';
import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository';

type UserLoginResponse = {
    id: string;
    email: string;
    name: string | null;
    isVerified: boolean;
    isBlocked: boolean;
}

export type LoginResponse = {
    user: UserLoginResponse,
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
}

export class LoginUseCase extends UseCase<LoginCommand, LoginResponse> {
    constructor(
        private readonly tokenService: ITokenService,
        private readonly userRepository: IUserRepository,
        private readonly refreshTokenRepository: IRefreshTokenRepository
    ) { super() }

    async execute(command: LoginCommand): Promise<Result<LoginResponse>> {
        const emailResult = this.tryCatch(() => Email.create(command.email));
        if (emailResult.isFailure) {
            return this.fail(emailResult.error);
        }

        const passwordResult = this.tryCatch(() => Password.create(command.password));
        if (passwordResult.isFailure) {
            return this.fail(passwordResult.error);
        }

        const email = emailResult.value;
        const user = await this.userRepository.findAuthData(email.value);

        if (!user) {
            return this.fail(new NotFoundError('User', undefined, { email: command.email }));
        }

        if (!user.passwordHash.verify(command.password)) {
            return this.fail(new UnauthorizedError('Invalid credentials'));
        }

        const expires = this.tokenService.getExpiresIn();
        const tokens = await this.tokenService.generateTokens(user.id.value);

        const refreshToken = tokens.refreshToken;
        const familyId = tokens.familyId;
        const refreshExpires = expires.refreshTokenExpiresIn;

        await this.refreshTokenRepository.save(RefreshToken.create({
            token: refreshToken,
            familyId: familyId,
            userId: user.id,
            expiresIn: refreshExpires,
            userAgent: command.userAgent,
            ipAddress: command.ipAddress,
            deviceName: command.deviceName
        }));

        return this.ok({
            user: {
                id: user.id.value,
                email: user.email.value,
                name: user.name,
                isBlocked: false,
                isVerified: user.isVerified
            },
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: refreshExpires.seconds,
        });
    }
}

import type {
    IUserRepository,
} from '@user/domain';
import type {
    GetCurrentUserUseCase,
} from '@user/application';

import type {
    ITokenService,
    IRefreshTokenRepository
} from '@auth/domain';
import type {
    LoginUseCase,
    LogoutUseCase,
    RefreshTokenUseCase,
    ValidateSessionUseCase
} from '@auth/application';


export interface ComponentRegistry {
    // компоненты
    GetCurrentUserUseCase: GetCurrentUserUseCase;
    LoginUseCase: LoginUseCase;
    LogoutUseCase: LogoutUseCase;
    RefreshTokenUseCase: RefreshTokenUseCase;
    ValidateSessionUseCase: ValidateSessionUseCase;

    // Repositories
    UserRepository: IUserRepository;
    RefreshTokenRepository: IRefreshTokenRepository;

    // Services
    TokenService: ITokenService;
}

export type ComponentName = keyof ComponentRegistry;
export type ComponentType<K extends ComponentName> = ComponentRegistry[K];

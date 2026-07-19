import { Module } from "../../decorators/Module";

import {
    LoginUseCase,
    LogoutUseCase,
    RefreshTokenUseCase
} from "./application/use-cases";

import { PrismaRefreshTokenRepository } from "./infrastructure/repositories";
import { JWTTokenService } from "./infrastructure/services";

@Module({
    name: 'AuthModule',
    description: 'Authentication and authorization module',
    version: '1.0.0',

    dependencies: ["CoreModule"],
    useCases: [
        { class: LoginUseCase },
        { class: LogoutUseCase },
        { class: RefreshTokenUseCase }
    ],
    repositories: [
        { class: PrismaRefreshTokenRepository }
    ],
    services: [{ class: JWTTokenService }],
    config: {}
})
export class AuthModule { }

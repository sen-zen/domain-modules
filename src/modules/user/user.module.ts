import { Module } from "../../decorators/Module";
import { GetCurrentUserUseCase } from "./application";
import { PrismaUserRepository } from "./infrastructure";

@Module({
    name: 'UserModule',
    description: 'User management module',
    version: '1.0.0',

    dependencies: ["CoreModule"],
    useCases: [
        { class: GetCurrentUserUseCase }
    ],
    repositories: [
        { class: PrismaUserRepository }
    ],
    config: {}
})
export class UserModule { }

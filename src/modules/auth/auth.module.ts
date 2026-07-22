import { Module } from "@/decorators/Module";

export const AUTH_MODULE_NAME = 'AuthModule';

@Module({
    name: AUTH_MODULE_NAME,
    description: 'Модуль авторизации и аутентификации',
    version: '1.0.0',

    dependencies: ["CoreModule"]
})
export class AuthModule { }

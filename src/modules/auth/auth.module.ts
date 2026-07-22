import { Module } from "@/decorators/Module";

export const AUTH_MODULE_NAME = 'AuthModule';

@Module({
    name: 'AuthModule',
    description: 'Модуль авторизации и аутентификации',
    version: '1.0.0',

    dependencies: ["CoreModule"],
    components: ['./application'],
})
export class AuthModule { }

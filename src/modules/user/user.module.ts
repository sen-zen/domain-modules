import { Module } from "../../decorators/Module";

export const USER_MODULE_NAME = "UserModule";

@Module({
    name: USER_MODULE_NAME,
    description: 'User management module',
    version: '1.0.0',

    dependencies: ["CoreModule"],
})
export class UserModule { }

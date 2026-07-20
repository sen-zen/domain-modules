import { Module } from "../../decorators/Module";

@Module({
    name: 'UserModule',
    description: 'User management module',
    version: '1.0.0',

    dependencies: ["CoreModule"],
    config: {}
})
export class UserModule { }

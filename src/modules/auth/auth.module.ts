import { Module } from "../../decorators/Module";

@Module({
    name: 'AuthModule',
    description: 'Authentication and authorization module',
    version: '1.0.0',

    dependencies: ["CoreModule"],
    config: {}
})
export class AuthModule { }

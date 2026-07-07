/**
 * Команда для входа пользователя
 */
export class LoginCommand {
    constructor(
        public readonly email: string,
        public readonly password: string,
        public readonly userAgent?: string,
        public readonly ipAddress?: string,
        public readonly deviceName?: string
    ) { }

    static fromObject(data: {
        email: string;
        password: string;
        userAgent?: string;
        ipAddress?: string;
        deviceName?: string;
    }): LoginCommand {
        return new LoginCommand(
            data.email,
            data.password,
            data.userAgent,
            data.ipAddress,
            data.deviceName
        );
    }

    toObject(): {
        email: string;
        password: string;
        userAgent?: string;
        ipAddress?: string;
        deviceName?: string;
    } {
        return {
            email: this.email,
            password: this.password,
            userAgent: this.userAgent,
            ipAddress: this.ipAddress,
            deviceName: this.deviceName,
        };
    }
}

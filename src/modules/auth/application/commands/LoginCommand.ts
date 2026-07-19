
type LoginCommandData = {
    email: string;
    password: string;
    rememberMe?: boolean;
    userAgent?: string;
    ipAddress?: string;
    deviceName?: string;
}

export class LoginCommand {
    private constructor(
        public readonly email: LoginCommandData['email'],
        public readonly password: LoginCommandData['password'],
        public readonly rememberMe: LoginCommandData['rememberMe'],
        public readonly userAgent: LoginCommandData['userAgent'],
        public readonly ipAddress: LoginCommandData['ipAddress'],
        public readonly deviceName: LoginCommandData['deviceName']
    ) { }

    static create(data: LoginCommandData): LoginCommand {
        return new LoginCommand(
            data.email,
            data.password,
            data.rememberMe,
            data.userAgent,
            data.ipAddress,
            data.deviceName
        );
    }

    toObject(): LoginCommandData {
        return {
            email: this.email,
            password: this.password,
            userAgent: this.userAgent,
            ipAddress: this.ipAddress,
            deviceName: this.deviceName,
        };
    }
}

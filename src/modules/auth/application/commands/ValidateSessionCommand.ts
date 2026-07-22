type Nullable<T> = T | null;

type ValidateSessionData = {
    accessToken?: string;
    refreshToken?: string;
    isRefreshRoute?: boolean;
    userAgent?: Nullable<string>;
    ipAddress?: Nullable<string>;
    deviceName?: Nullable<string>;
}

export class ValidateSessionCommand {
    private constructor(
        public readonly accessToken: ValidateSessionData['accessToken'],
        public readonly refreshToken: ValidateSessionData['refreshToken'],
        public readonly isRefreshRoute: ValidateSessionData['isRefreshRoute'],
        public readonly userAgent: ValidateSessionData['userAgent'],
        public readonly ipAddress: ValidateSessionData['ipAddress'],
        public readonly deviceName: ValidateSessionData['deviceName']
    ) { }

    static create(data: ValidateSessionData): ValidateSessionCommand {
        return new ValidateSessionCommand(
            data.accessToken,
            data.refreshToken,
            data.isRefreshRoute,
            data.userAgent,
            data.ipAddress,
            data.deviceName
        )
    }

    toObject(): ValidateSessionData {
        return {
            accessToken: this.accessToken,
            refreshToken: this.refreshToken,
            isRefreshRoute: this.isRefreshRoute,
            userAgent: this.userAgent,
            ipAddress: this.ipAddress,
            deviceName: this.deviceName
        }
    }
}

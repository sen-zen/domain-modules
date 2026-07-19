type RefreshTokenData = {
    refreshToken: string;
    userAgent?: string;
    ipAddress?: string;
    deviceName?: string;
}

export class RefreshTokenCommand {
    private constructor(
        public readonly refreshToken: RefreshTokenData['refreshToken'],
        public readonly userAgent: RefreshTokenData['userAgent'],
        public readonly ipAddress: RefreshTokenData['ipAddress'],
        public readonly deviceName: RefreshTokenData['deviceName']
    ) {
        if (!refreshToken || refreshToken.length === 0) {
            throw new Error('Refresh token is required');
        }
    }

    static create(data: RefreshTokenData): RefreshTokenCommand {
        return new RefreshTokenCommand(
            data.refreshToken,
            data.userAgent,
            data.ipAddress,
            data.deviceName
        )
    }

    toObject(): RefreshTokenData {
        return {
            refreshToken: this.refreshToken
        }
    }
};

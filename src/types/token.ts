export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    familyId: string;
}

export interface TokenPayload {
    sub: string;
    type: 'access' | 'refresh';
    exp: number;
    iat: number;
    jti: string;
    iss: string;
    aud: string;
}

export interface AccessTokenPayload extends TokenPayload {
    type: 'access';
}

export interface RefreshTokenPayload extends TokenPayload {
    type: 'refresh';
    familyId: string;
}

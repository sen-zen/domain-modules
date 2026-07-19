import { RefreshToken } from '@auth/domain/entities/RefreshToken';

import { UserId } from '@user/domain/value-objects/UserId';
import { Email } from '@core/domain/value-objects/Email';
import { Password } from '@core/domain/value-objects/Password';

export interface UserPrimitives {
    id: string;
    email: string;
    username: string | null;
    passwordHash: string | null;
    avatar: string | null;
    profilePictureUrl: string | null;
    bio: string | null;
    languageCode: string;
    countryCode: string | null;
    subscriptionStatus: boolean;
    verificationToken: string | null;
    verificationTokenExpiresAt: Date | null;
    roleId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export class User {
    private constructor(
        public readonly id: UserId,
        private _email: Email,
        private _username: string | null = null,
        private _passwordHash: Password | null = null,
        private _avatar: string | null = null,
        private _profilePictureUrl: string | null = null,
        private _bio: string | null = null,
        private _languageCode: string = "ru",
        private _countryCode: string | null = null,
        private _subscriptionStatus: boolean,
        private _verificationToken: string | null = null,
        private _verificationTokenExpiresAt: Date | null = null,
        private _roleId: string | null = null,
        public readonly createdAt: Date,
        public readonly updatedAt: Date,
        private _refreshTokens: RefreshToken[] = []
    ) { }

    static create(data: {
        email: string;
        username?: string;
        password?: string;
        languageCode?: string;
    }): User {
        const now = new Date();
        const email = Email.create(data.email);
        const password = data.password ? Password.create(data.password) : null;

        return new User(
            UserId.generate(),
            email,
            data.username,
            password,
            null,
            null,
            null,
            data.languageCode,
            null,
            false,
            null,
            null,
            null,
            now,
            now,
            []
        );
    }

    static reconstitute(primitives: UserPrimitives): User {
        return new User(
            UserId.create(primitives.id),
            Email.create(primitives.email),
            primitives.username,
            primitives.passwordHash ? Password.fromHash(primitives.passwordHash) : null,
            primitives.avatar,
            primitives.profilePictureUrl,
            primitives.bio,
            primitives.languageCode,
            primitives.countryCode,
            primitives.subscriptionStatus,
            primitives.verificationToken,
            primitives.verificationTokenExpiresAt,
            primitives.roleId,
            primitives.createdAt,
            primitives.updatedAt,
            []
        );
    }

    /**
     * Возвращает passwordHash как Password object для API compatibility
     * Используется внутри домена и внешних клиентов, возвращающих объект с методом verify()
     */
    get passwordHash(): Password | null {
        return this._passwordHash;
    }

    get email(): Email {
        return this._email;
    }

    get username(): string | null {
        return this._username;
    }

    get avatar(): string | null {
        return this._avatar;
    }

    get profilePictureUrl(): string | null {
        return this._profilePictureUrl;
    }

    get bio(): string | null {
        return this._bio;
    }

    get languageCode(): string {
        return this._languageCode;
    }

    get countryCode(): string | null {
        return this._countryCode;
    }

    get subscriptionStatus(): boolean {
        return this._subscriptionStatus;
    }

    get verificationToken(): string | null {
        return this._verificationToken;
    }

    get roleId(): string | null {
        return this._roleId;
    }

    get isSubscribed(): boolean {
        return this._subscriptionStatus;
    }

    get isVerified(): boolean {
        return this._verificationToken === null;
    }

    changeEmail(newEmail: string): void {
        this._email = Email.create(newEmail);
    }

    changeUsername(newUsername: string): void {
        if (newUsername.length < 3) {
            throw new Error('Username must be at least 3 characters');
        }
        this._username = newUsername;
    }

    changePassword(newPassword: string): void {
        this._passwordHash = Password.create(newPassword);
    }

    updateProfile(data: {
        avatar?: string;
        profilePictureUrl?: string;
        bio?: string;
        languageCode?: string;
        countryCode?: string;
    }): void {
        if (data.avatar !== undefined) this._avatar = data.avatar;
        if (data.profilePictureUrl !== undefined) this._profilePictureUrl = data.profilePictureUrl;
        if (data.bio !== undefined) this._bio = data.bio;
        if (data.languageCode !== undefined) this._languageCode = data.languageCode;
        if (data.countryCode !== undefined) this._countryCode = data.countryCode;
    }

    isVerifiedWithEmail(email: string): boolean {
        return this._email.equals(Email.create(email)) && this.isVerified;
    }

    /**
     * Устанавливает verificationToken для email верификации
     */
    setVerificationToken(token: string, expiresAt: Date): void {
        this._verificationToken = token;
        this._verificationTokenExpiresAt = expiresAt;
    }

    verifyEmail(): void {
        if (this.isVerified) return;
        this._verificationToken = null;
        this._verificationTokenExpiresAt = null;
    }

    activateSubscription(): void {
        this._subscriptionStatus = true;
    }

    deactivateSubscription(): void {
        this._subscriptionStatus = false;
    }

    assignRole(roleId: string): void {
        this._roleId = roleId;
    }

    addRefreshToken(token: RefreshToken): void {
        this._refreshTokens.push(token);
    }

    canLogin(): boolean {
        return this.isVerified && this._passwordHash !== null;
    }

    private domainEvents: any[] = [];

    addDomainEvent(event: any): void {
        this.domainEvents.push(event);
    }

    clearEvents(): void {
        this.domainEvents = [];
    }

    getEvents(): any[] {
        return [...this.domainEvents];
    }

    toPrimitives(): UserPrimitives {
        return {
            id: this.id.value,
            email: this._email.value,
            username: this._username,
            passwordHash: this._passwordHash ? this._passwordHash.value : null,
            avatar: this._avatar,
            profilePictureUrl: this._profilePictureUrl,
            bio: this._bio,
            languageCode: this._languageCode,
            countryCode: this._countryCode,
            subscriptionStatus: this._subscriptionStatus,
            verificationToken: this._verificationToken,
            verificationTokenExpiresAt: this._verificationTokenExpiresAt,
            roleId: this._roleId,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

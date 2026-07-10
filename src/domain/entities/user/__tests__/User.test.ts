import { describe, it, expect } from 'vitest';
import { User } from '../User';

describe('User', () => {
    describe('create', () => {
        it('должен создавать пользователя без passwordHash если не задан пароль', () => {
            const user = User.create({ email: 'test@example.com' });
            expect(user.email.value).toBe('test@example.com');
            expect(user.passwordHash).toBeNull();
            expect(user.isVerified).toBe(true);
        });

        it('должен создавать пользователя с passwordHash если задан пароль', () => {
            const user = User.create({ email: 'test@example.com', password: 'securePassword123!' });
            expect(user.email.value).toBe('test@example.com');
            expect(user.canLogin()).toBe(true);
        });

        it('должен генерировать уникальный ID пользователя', () => {
            const user1 = User.create({ email: 'test1@example.com' });
            const user2 = User.create({ email: 'test2@example.com' });
            expect(user1.id.value).not.toBe(user2.id.value);
        });
    });

    describe('reconstitute', () => {
        it('должен восстановить пользователя из Primitives', () => {
            const primitives = User.reconstitute({
                id: '550e8400-e29b-41d4-a716-446655440000',
                email: 'test@example.com',
                username: 'alex',
                passwordHash: '$2b$10$sodiumSaltHashedPasswordHere',
                avatar: null, profilePictureUrl: null, bio: null,
                languageCode: 'ru', countryCode: null, subscriptionStatus: false,
                verificationToken: null, verificationTokenExpiresAt: null, roleId: null,
                createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
            });
            expect(primitives.username).toBe('alex');
            expect(primitives.languageCode).toBe('ru');
        });
    });

    describe('getters', () => {
        it('должен возвращать email через getter', () => {
            const user = User.create({ email: 'test@example.com' });
            expect(user.email.value).toBe('test@example.com');
        });

        it('должен возвращать isVerified если verificationToken null', () => {
            const user = User.create({ email: 'test@example.com' });
            expect(user.isVerified).toBe(true);
        });

        it('должен возвращать subscriptionStatus', () => {
            const user = User.create({ email: 'test@example.com' });
            expect(user.subscriptionStatus).toBe(false);
            expect(user.isSubscribed).toBe(false);
        });
    });

    describe('changeEmail', () => {
        it('должен изменять email пользователя', () => {
            const user = User.create({ email: 'old@example.com' });
            user.changeEmail('new@example.com');
            expect(user.email.value).toBe('new@example.com');
        });
    });

    describe('changeUsername', () => {
        it('должен проверять длину username (min 3 chars)', () => {
            const user = User.create({ email: 'test@example.com' });
            expect(() => user.changeUsername('ab')).toThrow('Username must be at least 3 characters');
            user.changeUsername('valid_username');
            expect(user.username).toBe('valid_username');
        });
    });

    describe('changePassword', () => {
        it('должен хешировать новый пароль', () => {
            const user = User.create({ email: 'test@example.com' });
            const beforeHash = user.passwordHash;
            user.changePassword('newSecurePass123!');
            const afterHash = user.passwordHash;
            expect(beforeHash).toBeNull();
            expect(afterHash).toBeDefined();
            expect((afterHash!.value as string).length).toBeGreaterThan(0);
        });
    });

    describe('updateProfile', () => {
        it('должен обновлять avatar и bio', () => {
            const user = User.create({ email: 'test@example.com' });
            user.updateProfile({ avatar: 'https://cdn.example.com/avatar.jpg', bio: 'Chef with 10 years experience' });
            expect(user.avatar).toBe('https://cdn.example.com/avatar.jpg');
            expect(user.bio).toBe('Chef with 10 years experience');
        });

        it('должен позволять частичное обновление профиля', () => {
            const user = User.create({ email: 'test@example.com' });
            user.updateProfile({ bio: 'New bio' });
            expect(user.avatar).toBeNull();
            expect(user.bio).toBe('New bio');
        });
    });

    describe('setVerificationToken', () => {
        it('должен установить verificationToken с expiry', () => {
            const user = User.create({ email: 'test@example.com' });
            const expiresAt = new Date(Date.now() + 86400000);
            user.setVerificationToken('verify_token_abc123', expiresAt);
            expect(user.verificationToken).toBe('verify_token_abc123');
        });
    });

    describe('verifyEmail', () => {
        it('должен сбрасывать verificationToken после подтверждения', () => {
            const user = User.create({ email: 'test@example.com' });
            user.setVerificationToken('token123', new Date(Date.now() + 86400000));
            expect(user.verificationToken).toBe('token123');
            user.verifyEmail();
            expect(user.verificationToken).toBeNull();
            expect(user.isVerified).toBe(true);
        });
    });

    describe('activation/deactivation subscription', () => {
        it('должен активировать подписку', () => {
            const user = User.create({ email: 'test@example.com' });
            expect(user.subscriptionStatus).toBe(false);
            user.activateSubscription();
            expect(user.subscriptionStatus).toBe(true);
            expect(user.isSubscribed).toBe(true);
        });

        it('должен деактивировать подписку', () => {
            const user = User.create({ email: 'test@example.com' });
            user.activateSubscription();
            expect(user.subscriptionStatus).toBe(true);
            user.deactivateSubscription();
            expect(user.subscriptionStatus).toBe(false);
        });
    });

    describe('role assignment', () => {
        it('должен назначать роль пользователю', () => {
            const user = User.create({ email: 'test@example.com' });
            user.assignRole('PREMIUM_USER');
            expect(user.roleId).toBe('PREMIUM_USER');
        });
    });

    describe('canLogin', () => {
        it('должен возвращать true только если email верифицирован и есть passwordHash', () => {
            const user = User.create({ email: 'test@example.com', password: 'securePassword' });
            expect(user.canLogin()).toBe(true);

            const noPassUser = User.create({ email: 'test@example.com' });
            noPassUser.changeEmail('verified@example.com');
            expect(noPassUser.canLogin()).toBe(false);
        });
    });

    describe('toPrimitives', () => {
        it('должен преобразовать пользователя в Primitives для сериализации', () => {
            const user = User.create({ email: 'test@example.com', username: 'alex', password: 'securePassword123!', languageCode: 'ru' });
            const primitives = user.toPrimitives();
            expect(primitives.email).toBe('test@example.com');
            expect(primitives.username).toBe('alex');
            expect(primitives.languageCode).toBe('ru');
        });

        it('должен включать passwordHash в primitives если она существует', () => {
            const user = User.reconstitute({
                id: 'user-123', email: 'test@example.com', username: null,
                passwordHash: '$2b$10$sodiumSaltHashedPasswordHere', avatar: null, profilePictureUrl: null, bio: null,
                languageCode: 'ru', countryCode: null, subscriptionStatus: false,
                verificationToken: null, verificationTokenExpiresAt: null, roleId: null,
                createdAt: new Date(), updatedAt: new Date()
            } as any);
            const primitives = user.toPrimitives();
            expect(primitives.passwordHash).toBe('$2b$10$sodiumSaltHashedPasswordHere');
        });
    });
});

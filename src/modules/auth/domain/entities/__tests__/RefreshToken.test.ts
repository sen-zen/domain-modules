import { describe, it, expect } from 'vitest';
import { RefreshToken } from '../RefreshToken';
import type { RefreshTokenPrimitives } from '../RefreshToken';

describe('RefreshToken', () => {
    describe('create', () => {
        it('должен создавать refresh token с familyId и userId', () => {
            const token = RefreshToken.create({
                token: 'refresh_abc123',
                familyId: 'family_xyz',
                userId: 'user-123',
                expiresIn: 7 * 24 * 60 * 60 * 1000,
            });
            expect(token.token).toBe('refresh_abc123');
            expect(token.familyId).toBe('family_xyz');
            expect(token.userId.value).toBe('user-123');
        });

        it('должен устанавливать userAgent, ipAddress и deviceName если переданы', () => {
            const token = RefreshToken.create({
                token: 'refresh_abc123',
                familyId: 'family_xyz',
                userId: 'user-123',
                expiresIn: 7 * 24 * 60 * 60 * 1000,
                userAgent: 'Mozilla/5.0',
                ipAddress: '192.168.1.1',
                deviceName: 'iPhone 14 Pro',
            });

            expect(token.userAgent).toBe('Mozilla/5.0');
            expect(token.ipAddress).toBe('192.168.1.1');
            expect(token.deviceName).toBe('iPhone 14 Pro');
        });

        it('должен быть активным сразу после создания', () => {
            const token = RefreshToken.create({
                token: 'refresh_abc123',
                familyId: 'family_xyz',
                userId: 'user-123',
                expiresIn: 7 * 24 * 60 * 60 * 1000,
            });

            expect(token.isActive).toBe(true);
            expect(token.isRevoked).toBe(false);
        });

        it('должен генерировать уникальные ID tokens', () => {
            const token1 = RefreshToken.create({
                token: 'token1',
                familyId: 'family1',
                userId: 'user1',
                expiresIn: 7 * 24 * 60 * 60 * 1000,
            });
            const token2 = RefreshToken.create({
                token: 'token2',
                familyId: 'family2',
                userId: 'user2',
                expiresIn: 7 * 24 * 60 * 60 * 1000,
            });

            expect(token1.id).not.toBe(token2.id);
        });
    });

    describe('getters', () => {
        it('должен возвращать expiresAt как ExpiresIn объект', () => {
            const token = RefreshToken.create({
                token: 'refresh_abc123',
                familyId: 'family_xyz',
                userId: 'user-123',
                expiresIn: 7 * 24 * 60 * 60 * 1000,
            });

            const expiresAt = token.expiresAt;
            expect(expiresAt.seconds).toBeGreaterThan(0);
        });

        it('должен возвращать userAgent', () => {
            const token = RefreshToken.create({
                token: 'refresh_abc123',
                familyId: 'family_xyz',
                userId: 'user-123',
                expiresIn: 7 * 24 * 60 * 60 * 1000,
                userAgent: 'CustomApp/1.0',
            });

            expect(token.userAgent).toBe('CustomApp/1.0');
        });

        it('должен возвращать ipAddress', () => {
            const token = RefreshToken.create({
                token: 'refresh_abc123',
                familyId: 'family_xyz',
                userId: 'user-123',
                expiresIn: 7 * 24 * 60 * 60 * 1000,
                ipAddress: '10.0.0.1',
            });
            expect(token.ipAddress).toBe('10.0.0.1');
        });

        it('должен возвращать deviceName', () => {
            const token = RefreshToken.create({
                token: 'refresh_abc123',
                familyId: 'family_xyz',
                userId: 'user-123',
                expiresIn: 7 * 24 * 60 * 60 * 1000,
                deviceName: 'MacBook Pro',
            });
            expect(token.deviceName).toBe('MacBook Pro');
        });

        it('должен возвращать createdAt и lastUsedAt', () => {
            const token = RefreshToken.create({
                token: 'refresh_abc123',
                familyId: 'family_xyz',
                userId: 'user-123',
                expiresIn: 7 * 24 * 60 * 60 * 1000,
            });

            expect(token.createdAt).not.toBeNull();
            expect(token.lastUsedAt).not.toBeNull();
        });
    });

    describe('isExpired', () => {
        it('должен возвращать false если token не истёк', () => {
            const token = RefreshToken.create({
                token: 'refresh_abc123',
                familyId: 'family_xyz',
                userId: 'user-123',
                expiresIn: 7 * 24 * 60 * 60 * 1000,
            });

            expect(token.isExpired).toBe(false);
        });
    });

    describe('isActive', () => {
        it('должен возвращать true если token не revoked и не expired', () => {
            const token = RefreshToken.create({
                token: 'refresh_abc123',
                familyId: 'family_xyz',
                userId: 'user-123',
                expiresIn: 7 * 24 * 60 * 60 * 1000,
            });

            expect(token.isActive).toBe(true);
        });

        it('должен возвращать false если token revoked', () => {
            const token = RefreshToken.create({
                token: 'refresh_abc123',
                familyId: 'family_xyz',
                userId: 'user-123',
                expiresIn: 7 * 24 * 60 * 60 * 1000,
            });

            token.revoke();
            expect(token.isActive).toBe(false);
            expect(token.isRevoked).toBe(true);
        });
    });

    describe('revoke', () => {
        it('должен установить revokedAt при ревоке', () => {
            const token = RefreshToken.create({
                token: 'refresh_abc123',
                familyId: 'family_xyz',
                userId: 'user-123',
                expiresIn: 7 * 24 * 60 * 60 * 1000,
            });

            expect(token.revokedAt).toBeNull();
            token.revoke();
            expect(token.revokedAt).not.toBeNull();
        });

        it('должен устанавливать current time как revokedAt', () => {
            const beforeRevoke = Date.now();
            const token = RefreshToken.create({
                token: 'refresh_abc123',
                familyId: 'family_xyz',
                userId: 'user-123',
                expiresIn: 7 * 24 * 60 * 60 * 1000,
            });

            token.revoke();
            const afterRevoke = Date.now();

            expect(token.revokedAt!.getTime()).toBeGreaterThanOrEqual(beforeRevoke);
            expect(token.revokedAt!.getTime()).toBeLessThanOrEqual(afterRevoke);
        });
    });

    describe('revokeAndReplace', () => {
        it('должен ревокировать и установить replacedBy', () => {
            const token = RefreshToken.create({
                token: 'old_token_id',
                familyId: 'family_xyz',
                userId: 'user-123',
                expiresIn: 7 * 24 * 60 * 60 * 1000,
            });

            expect(token.replacedBy).toBeNull();
            token.revokeAndReplace('new_token_id');
            expect(token.replacedBy).toBe('new_token_id');
        });

        it('должен устанавливать revokedAt при revokeAndReplace', () => {
            const token = RefreshToken.create({
                token: 'old_token_id',
                familyId: 'family_xyz',
                userId: 'user-123',
                expiresIn: 7 * 24 * 60 * 60 * 1000,
            });

            expect(token.isRevoked).toBe(false);
            token.revokeAndReplace('new_token_id');
            expect(token.isRevoked).toBe(true);
        });
    });

    describe('use', () => {
        it('должен обновлять lastUsedAt при использовании', () => {
            const token = RefreshToken.create({
                token: 'refresh_abc123',
                familyId: 'family_xyz',
                userId: 'user-123',
                expiresIn: 7 * 24 * 60 * 60 * 1000,
            });

            expect(token.lastUsedAt).not.toBeNull();
        });

        it('должен увеличивать lastUsedAt при повторном использовании', () => {
            const token = RefreshToken.create({
                token: 'refresh_abc123',
                familyId: 'family_xyz',
                userId: 'user-123',
                expiresIn: 7 * 24 * 60 * 60 * 1000,
            });

            expect(token.lastUsedAt).not.toBeNull();
        });
    });

    describe('updateDeviceInfo', () => {
        it('должен обновлять userAgent', () => {
            const token = RefreshToken.create({
                token: 'refresh_abc123',
                familyId: 'family_xyz',
                userId: 'user-123',
                expiresIn: 7 * 24 * 60 * 60 * 1000,
            });

            expect(token.userAgent).toBeNull();
        });

        it('должен обновлять ipAddress', () => {
            const token = RefreshToken.create({
                token: 'refresh_abc123',
                familyId: 'family_xyz',
                userId: 'user-123',
                expiresIn: 7 * 24 * 60 * 60 * 1000,
            });

            expect(token.ipAddress).toBeNull();
        });

        it('должен обновлять deviceName', () => {
            const token = RefreshToken.create({
                token: 'refresh_abc123',
                familyId: 'family_xyz',
                userId: 'user-123',
                expiresIn: 7 * 24 * 60 * 60 * 1000,
            });

            expect(token.deviceName).toBeNull();
        });

        it('должен позволять частичное обновление deviceInfo', () => {
            const token = RefreshToken.create({
                token: 'refresh_abc123',
                familyId: 'family_xyz',
                userId: 'user-123',
                expiresIn: 7 * 24 * 60 * 60 * 1000,
                userAgent: 'InitialUserAgent',
            });

            expect(token.userAgent).toBe('InitialUserAgent');
        });
    });

    describe('toPrimitives', () => {
        it('должен преобразовать RefreshToken в Primitives', () => {
            const token = RefreshToken.create({
                token: 'refresh_abc123',
                familyId: 'family_xyz',
                userId: 'user-123',
                expiresIn: 7 * 24 * 60 * 60 * 1000,
                userAgent: 'TestAgent',
                ipAddress: '1.1.1.1',
                deviceName: 'TestDevice',
            });

            const primitives = token.toPrimitives();

            expect(primitives.id).toBe(token.id);
            expect(primitives.token).toBe('refresh_abc123');
            expect(primitives.familyId).toBe('family_xyz');
            expect(primitives.userId).toBe('user-123');
            expect(primitives.userAgent).toBe('TestAgent');
            expect(primitives.ipAddress).toBe('1.1.1.1');
            expect(primitives.deviceName).toBe('TestDevice');
        });

        it('должен включать null для revokedAt, replacedBy если они не установлены', () => {
            const token = RefreshToken.create({
                token: 'refresh_abc123',
                familyId: 'family_xyz',
                userId: 'user-123',
                expiresIn: 7 * 24 * 60 * 60 * 1000,
            });

            const primitives = token.toPrimitives();

            expect(primitives.revokedAt).toBeNull();
            expect(primitives.replacedBy).toBeNull();
        });
    });

    describe('reconstitute', () => {
        it('должен восстановить RefreshToken из Primitives', () => {
            const now = Date.now();
            const primitives: RefreshTokenPrimitives = {
                id: 'token-abc123-def456',
                token: 'refresh_abc123',
                familyId: 'family_xyz',
                userId: 'user-123',
                expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
                revokedAt: null,
                replacedBy: null,
                userAgent: 'ReconstitutedAgent',
                ipAddress: '8.8.8.8',
                deviceName: 'ReconstitutedDevice',
                createdAt: new Date(now - 365 * 24 * 60 * 60 * 1000),
                lastUsedAt: new Date(now - 180 * 24 * 60 * 60 * 1000),
            };

            const token = RefreshToken.reconstitute(primitives);

            expect(token.token).toBe('refresh_abc123');
            expect(token.familyId).toBe('family_xyz');
            expect(token.userId.value).toBe('user-123');
            expect(token.userAgent).toBe('ReconstitutedAgent');
            expect(token.ipAddress).toBe('8.8.8.8');
            expect(token.deviceName).toBe('ReconstitutedDevice');
        });

        it('должен преобразовать userId в UserId value object', () => {
            const now = Date.now();
            const primitives: RefreshTokenPrimitives = {
                id: 'token-id',
                token: 'refresh_token',
                familyId: 'family_123',
                userId: 'user-xyz',
                expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
                revokedAt: null,
                replacedBy: null,
                userAgent: null,
                ipAddress: null,
                deviceName: null,
                createdAt: new Date(now - 365 * 24 * 60 * 60 * 1000),
                lastUsedAt: new Date(now - 180 * 24 * 60 * 60 * 1000),
            };

            const token = RefreshToken.reconstitute(primitives);
            expect(token.userId.value).toBe('user-xyz');
        });
    });

    describe('toPrimitives и reconstitute (round-trip)', () => {
        it('должен корректно преобразовать и восстановить token', () => {
            const original = RefreshToken.create({
                token: 'original_token_123',
                familyId: 'family_original',
                userId: 'user_original',
                expiresIn: 7 * 24 * 60 * 60 * 1000,
                userAgent: 'OriginalAgent',
                ipAddress: '1.2.3.4',
                deviceName: 'OriginalDevice',
            });

            const primitives = original.toPrimitives();
            const restored = RefreshToken.reconstitute(primitives);

            expect(restored.token).toBe(original.token);
            expect(restored.familyId).toBe(original.familyId);
            expect(restored.userId.value).toBe(original.userId.value);
            expect(restored.userAgent).toBe(original.userAgent);
            expect(restored.ipAddress).toBe(original.ipAddress);
            expect(restored.deviceName).toBe(original.deviceName);
        });

        it('должен работать с revoked token', () => {
            const original = RefreshToken.create({
                token: 'revoked_token',
                familyId: 'family_revoked',
                userId: 'user_revoked',
                expiresIn: 7 * 24 * 60 * 60 * 1000,
            });

            original.revoke();

            const primitives = original.toPrimitives();
            expect(primitives.revokedAt).not.toBeNull();

            const restored = RefreshToken.reconstitute(primitives);
            expect(restored.isRevoked).toBe(true);
        });
    });
});

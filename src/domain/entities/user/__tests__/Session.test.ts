import { describe, it, expect } from 'vitest';
import { Session } from '../Session';
import { UserId } from '../../../value-objects/UserId';

describe('Session', () => {
    describe('create', () => {
        it('должен создавать session с userId и access/refresh tokens', () => {
            const session = Session.create({
                userId: UserId.create('user-123'),
                accessToken: 'bearer_abc123xyz',
                refreshToken: 'refresh_xyz789',
                expiresIn: 3600, // 1 час
                userAgent: 'TestApp/1.0',
            });

            expect(session.userId.value).toBe('user-123');
            expect(session.accessToken).toBe('bearer_abc123xyz');
            expect(session.refreshToken).toBe('refresh_xyz789');
        });

        it('должен устанавливать expiresAt на expiresIn секунд от текущего времени', () => {
            const session = Session.create({
                userId: UserId.create('user-123'),
                accessToken: 'bearer_abc',
                refreshToken: 'refresh_xyz',
                expiresIn: 3600, // 1 час = 3600 секунд
            });

            const now = Date.now();
            const expectedExpiresAt = new Date(now + 3600 * 1000);

            expect(session.expiresAt.getTime()).toBeCloseTo(expectedExpiresAt.getTime(), 2);
        });

        it('должен быть не истекшим сразу после создания', () => {
            const session = Session.create({
                userId: UserId.create('user-123'),
                accessToken: 'bearer_abc',
                refreshToken: 'refresh_xyz',
                expiresIn: 3600,
            });

            expect(session.isExpired).toBe(false);
            expect(session.isValid).toBe(true);
        });

        it('должен устанавливать userAgent, ipAddress и deviceName если переданы', () => {
            const session = Session.create({
                userId: UserId.create('user-123'),
                accessToken: 'bearer_abc',
                refreshToken: 'refresh_xyz',
                expiresIn: 3600,
                userAgent: 'Mozilla/5.0',
                ipAddress: '192.168.1.1',
                deviceName: 'iPhone 14 Pro',
            });

            expect(session.userAgent).toBe('Mozilla/5.0');
            expect(session.ipAddress).toBe('192.168.1.1');
            expect(session.deviceName).toBe('iPhone 14 Pro');
        });

        it('должен генерировать уникальные access и refresh tokens', () => {
            const session1 = Session.create({
                userId: UserId.create('user-1'),
                accessToken: 'token1',
                refreshToken: 'refresh1',
                expiresIn: 3600,
            });
            const session2 = Session.create({
                userId: UserId.create('user-2'),
                accessToken: 'token2',
                refreshToken: 'refresh2',
                expiresIn: 3600,
            });

            expect(session1.accessToken).not.toBe(session2.accessToken);
            expect(session1.refreshToken).not.toBe(session2.refreshToken);
        });
    });

    describe('getters', () => {
        it('должен возвращать expiresAt', () => {
            const session = Session.create({
                userId: UserId.create('user-123'),
                accessToken: 'bearer_abc',
                refreshToken: 'refresh_xyz',
                expiresIn: 3600,
            });

            expect(session.expiresAt).not.toBeNull();
            expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
        });

        it('должен возвращать userAgent', () => {
            const session = Session.create({
                userId: UserId.create('user-123'),
                accessToken: 'bearer_abc',
                refreshToken: 'refresh_xyz',
                expiresIn: 3600,
                userAgent: 'CustomApp/2.0',
            });

            expect(session.userAgent).toBe('CustomApp/2.0');
        });

        it('должен возвращать ipAddress', () => {
            const session = Session.create({
                userId: UserId.create('user-123'),
                accessToken: 'bearer_abc',
                refreshToken: 'refresh_xyz',
                expiresIn: 3600,
                ipAddress: '10.0.0.1',
            });

            expect(session.ipAddress).toBe('10.0.0.1');
        });

        it('должен возвращать deviceName', () => {
            const session = Session.create({
                userId: UserId.create('user-123'),
                accessToken: 'bearer_abc',
                refreshToken: 'refresh_xyz',
                expiresIn: 3600,
                deviceName: 'MacBook Pro',
            });

            expect(session.deviceName).toBe('MacBook Pro');
        });
    });

    describe('isExpired', () => {
        it('должен возвращать false если session не истёк', () => {
            const session = Session.create({
                userId: UserId.create('user-123'),
                accessToken: 'bearer_abc',
                refreshToken: 'refresh_xyz',
                expiresIn: 86400, // 24 часа
            });

            expect(session.isExpired).toBe(false);
        });

        it('должен возвращать true если срок истёк', () => {
            const session = Session.create({
                userId: UserId.create('user-123'),
                accessToken: 'bearer_abc',
                refreshToken: 'refresh_xyz',
                expiresIn: 5, // 5 секунд
            });

            expect(session.isExpired).toBe(false); // ещё не прошло 5 секунд
        });
    });

    describe('isValid', () => {
        it('должен возвращать true если session не истёк', () => {
            const session = Session.create({
                userId: UserId.create('user-123'),
                accessToken: 'bearer_abc',
                refreshToken: 'refresh_xyz',
                expiresIn: 86400,
            });

            expect(session.isValid).toBe(true);
        });

        it('должен возвращать false если session истёк', () => {
            const session = Session.create({
                userId: UserId.create('user-123'),
                accessToken: 'bearer_abc',
                refreshToken: 'refresh_xyz',
                expiresIn: 5,
            });

            expect(session.isValid).toBe(true); // ещё не прошло 5 секунд
        });
    });

    describe('toPrimitives', () => {
        it('должен преобразовать Session в Primitives', () => {
            const session = Session.create({
                userId: UserId.create('user-123'),
                accessToken: 'bearer_abc',
                refreshToken: 'refresh_xyz',
                expiresIn: 3600,
                userAgent: 'TestAgent',
                ipAddress: '1.2.3.4',
                deviceName: 'TestDevice',
            });

            const primitives = session.toPrimitives();

            expect(primitives.userId).toBe('user-123');
            expect(primitives.accessToken).toBe('bearer_abc');
            expect(primitives.refreshToken).toBe('refresh_xyz');
            expect(primitives.userAgent).toBe('TestAgent');
            expect(primitives.ipAddress).toBe('1.2.3.4');
            expect(primitives.deviceName).toBe('TestDevice');
        });

        it('должен использовать undefined для необязательных полей если они null', () => {
            const session = Session.create({
                userId: UserId.create('user-123'),
                accessToken: 'bearer_abc',
                refreshToken: 'refresh_xyz',
                expiresIn: 3600,
            });

            const primitives = session.toPrimitives();

            expect(primitives.userAgent).toBeUndefined();
            expect(primitives.ipAddress).toBeUndefined();
            expect(primitives.deviceName).toBeUndefined();
        });
    });

    describe('reconstitute', () => {
        it('должен восстановить Session из Primitives', () => {
            const primitives = {
                userId: 'user-123',
                accessToken: 'bearer_abc',
                refreshToken: 'refresh_xyz',
                expiresAt: new Date(Date.now() + 7200 * 1000), // 2 часа
                userAgent: 'ReconstitutedAgent',
                ipAddress: '8.8.8.8',
                deviceName: 'ReconstitutedDevice',
            };

            const session = Session.reconstitute(primitives);

            expect(session.userId.value).toBe('user-123');
            expect(session.accessToken).toBe('bearer_abc');
            expect(session.refreshToken).toBe('refresh_xyz');
            expect(session.userAgent).toBe('ReconstitutedAgent');
            expect(session.ipAddress).toBe('8.8.8.8');
            expect(session.deviceName).toBe('ReconstitutedDevice');
        });

        it('должен преобразовать userId в UserId value object', () => {
            const primitives = {
                userId: 'user-xyz',
                accessToken: 'token',
                refreshToken: 'refresh',
                expiresAt: new Date(),
            };

            const session = Session.reconstitute(primitives);
            expect(session.userId.value).toBe('user-xyz');
        });

        it('должен использовать null для undefined полей из primitives', () => {
            const primitives = {
                userId: 'user-only',
                accessToken: 'token-only',
                refreshToken: 'refresh-only',
                expiresAt: new Date(),
                // userAgent, ipAddress, deviceName не переданы
            };

            const session = Session.reconstitute(primitives);
            expect(session.userAgent).toBeNull();
            expect(session.ipAddress).toBeNull();
            expect(session.deviceName).toBeNull();
        });
    });

    describe('toPrimitives и reconstitute (round-trip)', () => {
        it('должен корректно преобразовать и восстановить session', () => {
            const original = Session.create({
                userId: UserId.create('user_original'),
                accessToken: 'original_access_token',
                refreshToken: 'original_refresh_token',
                expiresIn: 7200, // 2 часа
                userAgent: 'OriginalAgent',
                ipAddress: '1.2.3.4',
                deviceName: 'OriginalDevice',
            });

            const primitives = original.toPrimitives();
            const restored = Session.reconstitute(primitives);

            expect(restored.userId.value).toBe(original.userId.value);
            expect(restored.accessToken).toBe(original.accessToken);
            expect(restored.refreshToken).toBe(original.refreshToken);
            expect(restored.userAgent).toBe(original.userAgent);
            expect(restored.ipAddress).toBe(original.ipAddress);
            expect(restored.deviceName).toBe(original.deviceName);
        });

        it('должен работать с session без deviceName', () => {
            const original = Session.create({
                userId: UserId.create('user-123'),
                accessToken: 'token_abc',
                refreshToken: 'refresh_xyz',
                expiresIn: 3600,
                // без deviceName
            });

            const primitives = original.toPrimitives();
            expect(primitives.deviceName).toBeUndefined();

            const restored = Session.reconstitute(primitives);
            expect(restored.deviceName).toBeNull();
        });
    });
});

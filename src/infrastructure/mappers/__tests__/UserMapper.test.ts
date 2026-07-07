import { UserMapper } from '../UserMapper';
import { User } from '../../../domain/entities/user/User';

describe('UserMapper', () => {
    const mockPrismaUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashed_password',
        avatar: null,
        profilePictureUrl: null,
        bio: null,
        languageCode: 'ru',
        countryCode: null,
        subscriptionStatus: false,
        verificationToken: null,
        verificationTokenExpiresAt: null,
        roleId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    describe('toDomain', () => {
        it('should convert Prisma user to Domain user', () => {
            const domainUser = UserMapper.toDomain(mockPrismaUser);

            expect(domainUser).toBeInstanceOf(User);
            expect(domainUser.id.value).toBe(mockPrismaUser.id);
            expect(domainUser.email.value).toBe(mockPrismaUser.email);
            expect(domainUser.username).toBe(mockPrismaUser.username);
        });

        it('should throw error if email is missing', () => {
            const invalidUser = { ...mockPrismaUser, email: '' };
            expect(() => UserMapper.toDomain(invalidUser)).toThrow('User email is required');
        });
    });

    describe('toPrisma', () => {
        it('should convert Domain user to Prisma user', () => {
            const domainUser = User.reconstitute({
                id: mockPrismaUser.id,
                email: mockPrismaUser.email,
                username: mockPrismaUser.username || '',
                passwordHash: mockPrismaUser.passwordHash || '',
                avatar: mockPrismaUser.avatar,
                profilePictureUrl: mockPrismaUser.profilePictureUrl,
                bio: mockPrismaUser.bio,
                languageCode: mockPrismaUser.languageCode,
                countryCode: mockPrismaUser.countryCode,
                subscriptionStatus: mockPrismaUser.subscriptionStatus,
                verificationToken: mockPrismaUser.verificationToken,
                verificationTokenExpiresAt: mockPrismaUser.verificationTokenExpiresAt,
                roleId: mockPrismaUser.roleId,
                createdAt: mockPrismaUser.createdAt,
                updatedAt: mockPrismaUser.updatedAt,
            });

            const prismaUser = UserMapper.toPrisma(domainUser);

            expect(prismaUser.id).toBe(mockPrismaUser.id);
            expect(prismaUser.email).toBe(mockPrismaUser.email);
            expect(prismaUser.username).toBe(mockPrismaUser.username);
        });
    });

    describe('toPublicDto', () => {
        it('should return only public fields', () => {
            const publicDto = UserMapper.toPublicDto(mockPrismaUser);

            expect(publicDto).toHaveProperty('id');
            expect(publicDto).toHaveProperty('username');
            expect(publicDto).toHaveProperty('avatar');
            expect(publicDto).toHaveProperty('bio');
            expect(publicDto).not.toHaveProperty('email');
            expect(publicDto).not.toHaveProperty('passwordHash');
            expect(publicDto).not.toHaveProperty('verificationToken');
        });
    });
});
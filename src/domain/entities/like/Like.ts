import { RecipeId } from '../../value-objects/RecipeId';
import { UserId } from '../../value-objects/UserId';

export type LikeType = 'LIKE' | 'SAVE';

export interface LikePrimitives {
    id: string;
    type: LikeType;
    recipeId: string;
    userId: string;
    createdAt: Date;
}

export class Like {
    private constructor(
        public readonly id: string,
        private _type: LikeType,
        private _recipeId: RecipeId,
        private _userId: UserId,
        public readonly createdAt: Date
    ) { }

    static create(data: {
        type: LikeType;
        recipeId: RecipeId;
        userId: UserId;
    }): Like {
        if (!['LIKE', 'SAVE'].includes(data.type)) {
            throw new Error('Invalid like type. Must be "LIKE" or "SAVE"');
        }

        return new Like(
            crypto.randomUUID(),
            data.type,
            data.recipeId,
            data.userId,
            new Date()
        );
    }

    static reconstitute(primitives: LikePrimitives): Like {
        return new Like(
            primitives.id,
            primitives.type as LikeType,
            RecipeId.create(primitives.recipeId),
            UserId.create(primitives.userId),
            primitives.createdAt
        );
    }

    get type(): LikeType {
        return this._type;
    }

    get recipeId(): RecipeId {
        return this._recipeId;
    }

    get userId(): UserId {
        return this._userId;
    }

    isLike(): boolean {
        return this._type === 'LIKE';
    }

    isSave(): boolean {
        return this._type === 'SAVE';
    }

    toPrimitives(): LikePrimitives {
        return {
            id: this.id,
            type: this._type,
            recipeId: this._recipeId.value,
            userId: this._userId.value,
            createdAt: this.createdAt,
        };
    }
}

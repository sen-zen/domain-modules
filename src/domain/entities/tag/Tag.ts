// packages/core/src/server/domain/entities/tag/Tag.ts
export interface TagPrimitives {
    id: string;
    nameRu: string | null;
    nameEn: string | null;
}

export class Tag {
    private constructor(
        public readonly id: string,
        private _nameRu: string | null,
        private _nameEn: string | null
    ) { }
}

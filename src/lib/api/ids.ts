export type PageId = string & { readonly __brand: "PageId" };
export type SpaceId = string & { readonly __brand: "SpaceId" };
export type UserId = string & { readonly __brand: "UserId" };
export type TagId = string & { readonly __brand: "TagId" };
export type CommentId = string & { readonly __brand: "CommentId" };

export const asPageId = (raw: string): PageId => raw as PageId;
export const asSpaceId = (raw: string): SpaceId => raw as SpaceId;
export const asUserId = (raw: string): UserId => raw as UserId;
export const asTagId = (raw: string): TagId => raw as TagId;
export const asCommentId = (raw: string): CommentId => raw as CommentId;

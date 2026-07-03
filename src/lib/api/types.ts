import type { UserId } from "./ids";
import type { components as CompositionComponentsType } from "./schema.composition";
import type { components as SpaceComponentsType } from "./schema.space";
import type { components as UserComponentsType } from "./schema.user";

export type { components as CompositionComponents } from "./schema.composition";
export type { components as SpaceComponents } from "./schema.space";
export type { components as UserComponents } from "./schema.user";

type CompositionSchemas = CompositionComponentsType["schemas"];
type PageSchemas = SpaceComponentsType["schemas"];
type UserSchemas = UserComponentsType["schemas"];

export type Page = PageSchemas["PageGetResponse"];
export type PageSearchResult = PageSchemas["PageSearchResponse"];
export type PageSummary = PageSearchResult["items"][number];
export type PageCreateRequest = PageSchemas["PageRegisterRequest"];
export type PageCreateResult = PageSchemas["PageRegisterResponse"];
export type PageUpdateRequest = PageSchemas["PageEditRequest"];
export type PageUpdateResult = PageSchemas["PageEditResponse"];
export type PageInboundLinkListResult = PageSchemas["PageInboundLinkListResponse"];
export type PageInboundLink = PageInboundLinkListResult["items"][number];

export type Space = PageSchemas["SpaceGetResponse"];
export type SpaceListResult = PageSchemas["SpaceListResponse"];
export type SpaceSummary = SpaceListResult["items"][number];
export type SpaceCreateRequest = PageSchemas["SpaceRegisterRequest"];
export type SpaceCreateResult = PageSchemas["SpaceRegisterResponse"];

export type PopularTagListResult = PageSchemas["TagPopularityListResponse"];
export type PopularTag = PopularTagListResult["items"][number];

export type TagListResult = PageSchemas["TagListResponse"];
export type Tag = TagListResult["items"][number];
export type TagRegisterRequest = PageSchemas["TagRegisterRequest"];
export type TagRegisterResult = PageSchemas["TagRegisterResponse"];

export type PageTagListResult = PageSchemas["PageTagListResponse"];
export type PageTag = PageTagListResult["items"][number];
export type PageTagAttachRequest = PageSchemas["PageTagAttachRequest"];

export type CommentListResult = CompositionSchemas["CommentListResponse"];
export type CommentSummary = CommentListResult["items"][number];
export type CommentRegisterRequest = CompositionSchemas["CommentRegisterRequest"];
export type CommentRegisterResult = CompositionSchemas["CommentRegisterResponse"];
export type CommentEditRequest = CompositionSchemas["CommentEditRequest"];
export type CommentEditResult = CompositionSchemas["CommentEditResponse"];

export type LoginInput = UserSchemas["AuthLoginRequest"];

export type UserSummary = {
  userId: UserId;
  handle: string;
};

export type UserSearchResult = {
  items: UserSummary[];
};

export type Role = "USER" | "ADMIN";

/*
todo    :: backend openapi3.json 재빌드 + `pnpm api:gen` 후 `Me` 와 `Role` 둘 다 schema 산출 (`UserSchemas["UserMeRetrievingResponse"]` 등) 로 교체. 그 전까지 백엔드가 새 role (예: GUEST) 추가하면 silent drift 위험.
 author :: crispin
 date   :: 2026-06-05T17:02:48KST
 ticket :: LAB-87
 */
export type Me = {
  userId: string;
  handle: string;
  email: string;
  role: Role;
};

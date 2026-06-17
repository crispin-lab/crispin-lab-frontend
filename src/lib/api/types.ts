import type { components as SpaceComponentsType } from "./schema.space";
import type { components as UserComponentsType } from "./schema.user";

export type { components as UserComponents } from "./schema.user";
export type { components as SpaceComponents } from "./schema.space";

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

export type LoginInput = UserSchemas["AuthLoginRequest"];

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

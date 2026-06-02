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

export type Space = PageSchemas["SpaceGetResponse"];
export type SpaceListResult = PageSchemas["SpaceListResponse"];
export type SpaceSummary = SpaceListResult["items"][number];
export type SpaceCreateRequest = PageSchemas["SpaceRegisterRequest"];
export type SpaceCreateResult = PageSchemas["SpaceRegisterResponse"];

export type LoginInput = UserSchemas["AuthLoginRequest"];
